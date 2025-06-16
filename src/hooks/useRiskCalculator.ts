import { useMemo } from 'react';

// Risk levels enum (matching RiskCalculator.sol)
export enum RiskLevel {
  HEALTHY = 'HEALTHY',     // > 200%
  WARNING = 'WARNING',     // 150% - 200%
  DANGER = 'DANGER',       // 120% - 150%
  CRITICAL = 'CRITICAL',   // 110% - 120%
  LIQUIDATABLE = 'LIQUIDATABLE' // < 110%
}

// Risk thresholds (6 decimal precision, matching contract)
const HEALTHY_RATIO = 2000000;      // 200%
const WARNING_RATIO = 1500000;      // 150%
const DANGER_RATIO = 1200000;       // 120%
const CRITICAL_RATIO = 1100000;     // 110%

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

// Asset configurations (matching FlexibleAssetHandler.sol suggestions)
const ASSET_CONFIGS = {
  'ETH': {
    collateralRatio: 1500000,    // 150% (suggestion)
    liquidationRatio: 1100000,   // 110%
    maxLoanAmount: '1000000',    // 1M USD equivalent
  },
  'WBTC': {
    collateralRatio: 1500000,    // 150%
    liquidationRatio: 1100000,   // 110%
    maxLoanAmount: '2000000',    // 2M USD equivalent
  },
  'USDC': {
    collateralRatio: 1200000,    // 120%
    liquidationRatio: 1050000,   // 105%
    maxLoanAmount: '5000000',    // 5M USD
  },
  'VCOP': {
    collateralRatio: 1200000,    // 120%
    liquidationRatio: 1050000,   // 105%
    maxLoanAmount: '10000000',   // 10M USD (mintable)
  }
} as const;

export interface RiskMetrics {
  collateralizationRatio: number;    // Current collateral ratio (6 decimals)
  liquidationThreshold: number;      // Liquidation threshold (6 decimals)
  healthFactor: number;              // Health factor (6 decimals, 1.0 = 1000000)
  maxWithdrawable: number;          // Max collateral withdrawable
  maxBorrowable: number;            // Max additional borrowable (USD value)
  liquidationPrice: number;         // Price at which position gets liquidated
  riskLevel: RiskLevel;             // Current risk level
  timeToLiquidation: number;        // Estimated time to liquidation (hours)
  isLiquidatable: boolean;          // Can be liquidated now
  priceDropToLiquidation: number;   // % price drop needed for liquidation
  volatilityRisk: number;           // Annualized volatility
}

export interface PriceImpact {
  priceDropFor10PercentLiquidation: number;  // Price drop for 10% liquidation risk
  priceDropFor50PercentLiquidation: number;  // Price drop for 50% liquidation risk
  priceDropFor90PercentLiquidation: number;  // Price drop for 90% liquidation risk
  currentVolatility: number;                 // Estimated price volatility
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

    // Get asset configuration
    const config = ASSET_CONFIGS[collateralSymbol as keyof typeof ASSET_CONFIGS];
    if (!config) return null;

    // Calculate collateralization ratio (6 decimals)
    const collateralizationRatio = Math.floor((collateralValue * 1000000) / loanValue);
    
    // Calculate health factor
    const healthFactor = Math.floor((collateralizationRatio * 1000000) / config.liquidationRatio);
    
    // Determine risk level
    const riskLevel = determineRiskLevel(collateralizationRatio);
    
    // Calculate liquidation price
    const liquidationPrice = (loanValue * config.liquidationRatio) / (collateralAmountNum * 1000000);
    
    // Calculate max withdrawable (in collateral units)
    const minCollateralValue = (loanValue * config.collateralRatio) / 1000000;
    const maxWithdrawable = collateralValue > minCollateralValue 
      ? ((collateralValue - minCollateralValue) * collateralAmountNum) / collateralValue
      : 0;

    // Calculate max borrowable (in USD)
    const maxDebtValue = (collateralValue * 1000000) / config.collateralRatio;
    const maxBorrowable = maxDebtValue > loanValue ? maxDebtValue - loanValue : 0;

    // Calculate time to liquidation (simplified)
    const timeToLiquidation = estimateTimeToLiquidation(collateralizationRatio, interestRate);

    // Calculate price drop needed for liquidation
    const priceDropToLiquidation = collateralPrice > liquidationPrice 
      ? ((collateralPrice - liquidationPrice) / collateralPrice) * 100
      : 0;

    // Get volatility
    const volatilityRisk = ASSET_VOLATILITY[collateralSymbol as keyof typeof ASSET_VOLATILITY] * 100;

    return {
      collateralizationRatio,
      liquidationThreshold: config.liquidationRatio,
      healthFactor,
      maxWithdrawable,
      maxBorrowable,
      liquidationPrice,
      riskLevel,
      timeToLiquidation,
      isLiquidatable: collateralizationRatio <= config.liquidationRatio,
      priceDropToLiquidation,
      volatilityRisk
    };
  }, [position.collateralAsset, position.loanAsset, position.collateralAmount, position.loanAmount, position.interestRate]);

  const priceImpact = useMemo((): PriceImpact | null => {
    if (!riskMetrics || !position.collateralAsset) return null;

    const collateralSymbol = getAssetSymbol(position.collateralAsset);
    if (!collateralSymbol) return null;

    const currentPrice = MOCK_PRICES[collateralSymbol as keyof typeof MOCK_PRICES];
    const liquidationPrice = riskMetrics.liquidationPrice;
    const volatility = ASSET_VOLATILITY[collateralSymbol as keyof typeof ASSET_VOLATILITY];

    return {
      priceDropFor10PercentLiquidation: calculatePriceDropForRisk(currentPrice, liquidationPrice, 10),
      priceDropFor50PercentLiquidation: calculatePriceDropForRisk(currentPrice, liquidationPrice, 50),
      priceDropFor90PercentLiquidation: calculatePriceDropForRisk(currentPrice, liquidationPrice, 90),
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
    isHealthy: (hf: number) => hf >= 2000000,
    isAtRisk: (hf: number) => hf < 1500000,
    isCritical: (hf: number) => hf < 1200000,
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

function determineRiskLevel(collateralizationRatio: number): RiskLevel {
  if (collateralizationRatio >= HEALTHY_RATIO) return RiskLevel.HEALTHY;
  if (collateralizationRatio >= WARNING_RATIO) return RiskLevel.WARNING;
  if (collateralizationRatio >= DANGER_RATIO) return RiskLevel.DANGER;
  if (collateralizationRatio >= CRITICAL_RATIO) return RiskLevel.CRITICAL;
  return RiskLevel.LIQUIDATABLE;
}

function estimateTimeToLiquidation(collateralizationRatio: number, interestRate: number): number {
  if (collateralizationRatio <= CRITICAL_RATIO) return 0;
  
  // Simplified calculation: estimate based on interest accrual rate
  const timeToReachCritical = ((collateralizationRatio - CRITICAL_RATIO) * 365 * 24) / 
                             (interestRate * CRITICAL_RATIO / 1000000);
  
  return Math.max(0, timeToReachCritical);
}

function calculatePriceDropForRisk(currentPrice: number, liquidationPrice: number, riskPercentage: number): number {
  if (liquidationPrice >= currentPrice) return 0;
  
  const maxDrop = currentPrice - liquidationPrice;
  const dropPercentage = (maxDrop / currentPrice) * 100;
  
  return (dropPercentage * riskPercentage) / 100;
}

export function getRiskLevelColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case RiskLevel.HEALTHY: return 'text-green-600';
    case RiskLevel.WARNING: return 'text-yellow-600';
    case RiskLevel.DANGER: return 'text-orange-600';
    case RiskLevel.CRITICAL: return 'text-red-600';
    case RiskLevel.LIQUIDATABLE: return 'text-red-800';
    default: return 'text-gray-600';
  }
}

export function getRiskLevelBgColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case RiskLevel.HEALTHY: return 'bg-green-100';
    case RiskLevel.WARNING: return 'bg-yellow-100';
    case RiskLevel.DANGER: return 'bg-orange-100';
    case RiskLevel.CRITICAL: return 'bg-red-100';
    case RiskLevel.LIQUIDATABLE: return 'bg-red-200';
    default: return 'bg-gray-100';
  }
}