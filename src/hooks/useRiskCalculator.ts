import { useMemo } from 'react';

// Risk levels enum (matching RiskCalculator.sol but adapted for ultra-flexible system)
export enum RiskLevel {
  ULTRA_SAFE = 'ULTRA_SAFE',       // > 300%
  HEALTHY = 'HEALTHY',             // 200% - 300%
  MODERATE = 'MODERATE',           // 150% - 200%
  AGGRESSIVE = 'AGGRESSIVE',       // 110% - 150%
  EXTREME = 'EXTREME',             // 101% - 110%
  DANGER_ZONE = 'DANGER_ZONE'     // ≤ 100% (technically liquidatable but system allows it)
}

// Risk thresholds adapted for FlexibleLoanManager (ultra-flexible)
const ULTRA_SAFE_RATIO = 3000000;   // 300%
const HEALTHY_RATIO = 2000000;      // 200%
const MODERATE_RATIO = 1500000;     // 150%
const AGGRESSIVE_RATIO = 1100000;   // 110%
const EXTREME_RATIO = 1010000;      // 101%
// Note: System allows even ratios below 100%!

// Mock price data (in a real implementation, this would come from oracles)
const MOCK_PRICES = {
  'ETH': 2500,    // USD per ETH
  'WBTC': 45000,  // USD per WBTC
  'USDC': 1,      // USD per USDC
  'VCOP': 1,      // USD per VCOP
} as const;

// Asset volatility estimates (annualized)
const ASSET_VOLATILITY = {
  'ETH': 0.8,     // 80%
  'WBTC': 0.9,    // 90%
  'USDC': 0.01,   // 1%
  'VCOP': 0.02,   // 2%
} as const;

// Asset configurations - These are SUGGESTIONS ONLY (not enforced by FlexibleAssetHandler)
const ASSET_SUGGESTIONS = {
  'ETH': {
    suggestedCollateralRatio: 1500000,    // 150% (just a suggestion)
    suggestedLiquidationRatio: 1100000,   // 110% (just a suggestion)
    maxLoanAmount: '1000000',             // This IS enforced
  },
  'WBTC': {
    suggestedCollateralRatio: 1500000,    // 150% (just a suggestion)
    suggestedLiquidationRatio: 1100000,   // 110% (just a suggestion)
    maxLoanAmount: '2000000',             // This IS enforced
  },
  'USDC': {
    suggestedCollateralRatio: 1200000,    // 120% (just a suggestion)
    suggestedLiquidationRatio: 1050000,   // 105% (just a suggestion)
    maxLoanAmount: '5000000',             // This IS enforced
  },
  'VCOP': {
    suggestedCollateralRatio: 1200000,    // 120% (just a suggestion)
    suggestedLiquidationRatio: 1050000,   // 105% (just a suggestion)
    maxLoanAmount: '10000000',            // This IS enforced (mintable)
  }
} as const;

export interface RiskMetrics {
  collateralizationRatio: number;        // Current collateral ratio (6 decimals)
  suggestedLiquidationThreshold: number; // SUGGESTED liquidation threshold (6 decimals)
  healthFactor: number;                  // Health factor (6 decimals, 1.0 = 1000000)
  maxWithdrawableByMath: number;         // Max withdrawable by pure math (could be all)
  maxBorrowableByLiquidity: number;      // Max borrowable limited only by liquidity
  theoreticalLiquidationPrice: number;   // Price at which SUGGESTED liquidation occurs
  riskLevel: RiskLevel;                  // Current risk level
  timeToSuggestedLiquidation: number;    // Time to reach suggested liquidation (hours)
  isTheoreticallyLiquidatable: boolean;  // Would be liquidatable under suggested rules
  priceDropToSuggestedLiquidation: number; // % price drop to suggested liquidation
  volatilityRisk: number;                // Annualized volatility
  systemFlexibilityNote: string;         // Warning about system flexibility
}

export interface PriceImpact {
  priceDropFor10PercentRisk: number;     // Price drop for 10% of suggested liquidation
  priceDropFor50PercentRisk: number;     // Price drop for 50% of suggested liquidation
  priceDropFor90PercentRisk: number;     // Price drop for 90% of suggested liquidation
  currentVolatility: number;             // Estimated price volatility
}

interface LoanPosition {
  collateralAsset: string;
  loanAsset: string;
  collateralAmount: string;
  loanAmount: string;
  interestRate: string;
}

export function useRiskCalculator(position: Partial<LoanPosition>) {
  const riskMetrics = useMemo((): RiskMetrics | null => {
    if (!position.collateralAsset || !position.loanAsset || 
        !position.collateralAmount || !position.loanAmount) {
      return null;
    }

    const collateralSymbol = getAssetSymbol(position.collateralAsset);
    const loanSymbol = getAssetSymbol(position.loanAsset);
    
    if (!collateralSymbol || !loanSymbol) return null;

    // Calculate values in USD
    const collateralAmountNum = parseFloat(position.collateralAmount);
    const loanAmountNum = parseFloat(position.loanAmount);
    const interestRate = parseFloat(position.interestRate || '5');

    const collateralPrice = MOCK_PRICES[collateralSymbol as keyof typeof MOCK_PRICES];
    const loanPrice = MOCK_PRICES[loanSymbol as keyof typeof MOCK_PRICES];

    const collateralValue = collateralAmountNum * collateralPrice;
    const loanValue = loanAmountNum * loanPrice;

    if (loanValue === 0) return null;

    // Get asset suggestions (NOT enforced by FlexibleAssetHandler)
    const suggestions = ASSET_SUGGESTIONS[collateralSymbol as keyof typeof ASSET_SUGGESTIONS];
    if (!suggestions) return null;

    // Calculate collateralization ratio (6 decimals)
    const collateralizationRatio = Math.floor((collateralValue * 1000000) / loanValue);
    
    // Calculate health factor based on SUGGESTED liquidation ratio
    const healthFactor = Math.floor((collateralizationRatio * 1000000) / suggestions.suggestedLiquidationRatio);
    
    // Determine risk level (ultra-flexible classification)
    const riskLevel = determineFlexibleRiskLevel(collateralizationRatio);
    
    // Calculate theoretical liquidation price (based on suggestions)
    const theoreticalLiquidationPrice = (loanValue * suggestions.suggestedLiquidationRatio) / (collateralAmountNum * 1000000);
    
    // FlexibleLoanManager allows withdrawing ANY amount (only prevents negative values)
    // So max withdrawable is technically ALL collateral minus epsilon
    const maxWithdrawableByMath = collateralAmountNum * 0.999; // Keep tiny amount for math safety
    
    // Max borrowable is limited ONLY by available liquidity (no ratio restrictions)
    // Estimate available liquidity (in reality this would come from asset handler)
    const estimatedAvailableLiquidity = parseFloat(suggestions.maxLoanAmount) * 0.8; // 80% utilization
    const maxBorrowableByLiquidity = estimatedAvailableLiquidity;

    // Calculate time to suggested liquidation (simplified)
    const timeToSuggestedLiquidation = estimateTimeToSuggestedLiquidation(collateralizationRatio, interestRate, suggestions.suggestedLiquidationRatio);

    // Calculate price drop needed for suggested liquidation
    const priceDropToSuggestedLiquidation = collateralPrice > theoreticalLiquidationPrice 
      ? ((collateralPrice - theoreticalLiquidationPrice) / collateralPrice) * 100
      : 0;

    // Get volatility
    const volatilityRisk = ASSET_VOLATILITY[collateralSymbol as keyof typeof ASSET_VOLATILITY] * 100;

    // System flexibility note
    const systemFlexibilityNote = collateralizationRatio < suggestions.suggestedLiquidationRatio 
      ? "⚠️ VCOP's FlexibleLoanManager allows this ratio, but it's beyond suggested safety limits"
      : "✅ Position follows suggested guidelines, but VCOP allows much more aggressive ratios";

    return {
      collateralizationRatio,
      suggestedLiquidationThreshold: suggestions.suggestedLiquidationRatio,
      healthFactor,
      maxWithdrawableByMath,
      maxBorrowableByLiquidity,
      theoreticalLiquidationPrice,
      riskLevel,
      timeToSuggestedLiquidation,
      isTheoreticallyLiquidatable: collateralizationRatio <= suggestions.suggestedLiquidationRatio,
      priceDropToSuggestedLiquidation,
      volatilityRisk,
      systemFlexibilityNote
    };
  }, [position.collateralAsset, position.loanAsset, position.collateralAmount, position.loanAmount, position.interestRate]);

  const priceImpact = useMemo((): PriceImpact | null => {
    if (!riskMetrics || !position.collateralAsset) return null;

    const collateralSymbol = getAssetSymbol(position.collateralAsset);
    if (!collateralSymbol) return null;

    const currentPrice = MOCK_PRICES[collateralSymbol as keyof typeof MOCK_PRICES];
    const suggestedLiquidationPrice = riskMetrics.theoreticalLiquidationPrice;
    const volatility = ASSET_VOLATILITY[collateralSymbol as keyof typeof ASSET_VOLATILITY];

    return {
      priceDropFor10PercentRisk: calculatePriceDropForRisk(currentPrice, suggestedLiquidationPrice, 10),
      priceDropFor50PercentRisk: calculatePriceDropForRisk(currentPrice, suggestedLiquidationPrice, 50),
      priceDropFor90PercentRisk: calculatePriceDropForRisk(currentPrice, suggestedLiquidationPrice, 90),
      currentVolatility: volatility * 100
    };
  }, [riskMetrics, position.collateralAsset]);

  return {
    riskMetrics,
    priceImpact,
    // Utility functions
    formatCollateralizationRatio: (ratio: number) => (ratio / 10000).toFixed(2) + '%',
    formatHealthFactor: (hf: number) => (hf / 1000000).toFixed(2),
    getRiskLevelColor,
    getRiskLevelBgColor,
    isUltraSafe: (ratio: number) => ratio >= ULTRA_SAFE_RATIO,
    isHealthy: (ratio: number) => ratio >= HEALTHY_RATIO,
    isModerate: (ratio: number) => ratio >= MODERATE_RATIO,
    isAggressive: (ratio: number) => ratio >= AGGRESSIVE_RATIO,
    isExtreme: (ratio: number) => ratio >= EXTREME_RATIO,
    isDangerZone: (ratio: number) => ratio < EXTREME_RATIO,
  };
}

// Helper functions

function getAssetSymbol(address: string): string | null {
  // For demo purposes, we'll use simplified mapping
  const addressToSymbol: Record<string, string> = {
    'ETH': 'ETH',
    'WBTC': 'WBTC',
    'USDC': 'USDC',
    'VCOP': 'VCOP',
  };
  
  return addressToSymbol[address] || address;
}

function determineFlexibleRiskLevel(collateralizationRatio: number): RiskLevel {
  if (collateralizationRatio >= ULTRA_SAFE_RATIO) return RiskLevel.ULTRA_SAFE;
  if (collateralizationRatio >= HEALTHY_RATIO) return RiskLevel.HEALTHY;
  if (collateralizationRatio >= MODERATE_RATIO) return RiskLevel.MODERATE;
  if (collateralizationRatio >= AGGRESSIVE_RATIO) return RiskLevel.AGGRESSIVE;
  if (collateralizationRatio >= EXTREME_RATIO) return RiskLevel.EXTREME;
  return RiskLevel.DANGER_ZONE;
}

function estimateTimeToSuggestedLiquidation(collateralizationRatio: number, interestRate: number, suggestedLiquidationRatio: number): number {
  if (collateralizationRatio <= suggestedLiquidationRatio) return 0;
  
  // Simplified calculation: estimate based on interest accrual rate
  const timeToReachSuggestedLiquidation = ((collateralizationRatio - suggestedLiquidationRatio) * 365 * 24) / 
                                         (interestRate * suggestedLiquidationRatio / 1000000);
  
  return Math.max(0, timeToReachSuggestedLiquidation);
}

function calculatePriceDropForRisk(currentPrice: number, suggestedLiquidationPrice: number, riskPercentage: number): number {
  if (suggestedLiquidationPrice >= currentPrice) return 0;
  
  const maxDrop = currentPrice - suggestedLiquidationPrice;
  const dropPercentage = (maxDrop / currentPrice) * 100;
  
  return (dropPercentage * riskPercentage) / 100;
}

export function getRiskLevelColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case RiskLevel.ULTRA_SAFE: return 'text-green-800';
    case RiskLevel.HEALTHY: return 'text-green-600';
    case RiskLevel.MODERATE: return 'text-blue-600';
    case RiskLevel.AGGRESSIVE: return 'text-yellow-600';
    case RiskLevel.EXTREME: return 'text-orange-600';
    case RiskLevel.DANGER_ZONE: return 'text-red-600';
    default: return 'text-gray-600';
  }
}

export function getRiskLevelBgColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case RiskLevel.ULTRA_SAFE: return 'bg-green-200';
    case RiskLevel.HEALTHY: return 'bg-green-100';
    case RiskLevel.MODERATE: return 'bg-blue-100';
    case RiskLevel.AGGRESSIVE: return 'bg-yellow-100';
    case RiskLevel.EXTREME: return 'bg-orange-100';
    case RiskLevel.DANGER_ZONE: return 'bg-red-100';
    default: return 'bg-gray-100';
  }
}