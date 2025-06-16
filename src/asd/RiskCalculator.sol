// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IGenericOracle} from "../interfaces/IGenericOracle.sol";
import {IAssetHandler} from "../interfaces/IAssetHandler.sol";
import {ILoanManager} from "../interfaces/ILoanManager.sol";

/**
 * @title RiskCalculator
 * @notice Comprehensive on-chain risk calculation system for loan positions
 * @dev Provides real-time risk metrics, health factors, and liquidation thresholds
 */
contract RiskCalculator {
    
    // Oracle for price feeds
    IGenericOracle public immutable oracle;
    
    // Loan manager for position data
    ILoanManager public immutable loanManager;
    
    // Risk thresholds (6 decimal precision)
    uint256 public constant HEALTHY_RATIO = 2000000;      // 200% - Very healthy
    uint256 public constant WARNING_RATIO = 1500000;     // 150% - Warning zone
    uint256 public constant DANGER_RATIO = 1200000;      // 120% - Danger zone
    uint256 public constant CRITICAL_RATIO = 1100000;    // 110% - Critical zone
    
    // Risk levels enum
    enum RiskLevel {
        HEALTHY,     // > 200%
        WARNING,     // 150% - 200%
        DANGER,      // 120% - 150%
        CRITICAL,    // 110% - 120%
        LIQUIDATABLE // < 110%
    }
    
    // Comprehensive risk metrics
    struct RiskMetrics {
        uint256 collateralizationRatio;    // Current collateral ratio (6 decimals)
        uint256 liquidationThreshold;      // Liquidation threshold (6 decimals)
        uint256 healthFactor;              // Health factor (6 decimals, 1.0 = 1000000)
        uint256 maxWithdrawable;          // Max collateral withdrawable
        uint256 maxBorrowable;            // Max additional borrowable
        uint256 liquidationPrice;         // Price at which position gets liquidated
        RiskLevel riskLevel;              // Current risk level
        uint256 timeToLiquidation;        // Estimated time to liquidation (seconds)
        bool isLiquidatable;              // Can be liquidated now
    }
    
    // Price impact analysis
    struct PriceImpact {
        uint256 priceDropFor10PercentLiquidation;  // Price drop needed for 10% liquidation risk
        uint256 priceDropFor50PercentLiquidation;  // Price drop needed for 50% liquidation risk
        uint256 priceDropFor90PercentLiquidation;  // Price drop needed for 90% liquidation risk
        uint256 currentVolatility;                 // Estimated price volatility
    }
    
    constructor(address _oracle, address _loanManager) {
        oracle = IGenericOracle(_oracle);
        loanManager = ILoanManager(_loanManager);
    }
    
    /**
     * @dev Calculates comprehensive risk metrics for a position
     * @param positionId The ID of the loan position
     * @return metrics Complete risk analysis
     */
    function calculateRiskMetrics(uint256 positionId) external view returns (RiskMetrics memory metrics) {
        ILoanManager.LoanPosition memory position = loanManager.getPosition(positionId);
        require(position.isActive, "Position not active");
        
        // Get asset handlers to fetch configurations
        IAssetHandler collateralHandler = _getAssetHandler(position.collateralAsset);
        IAssetHandler.AssetConfig memory collateralConfig = collateralHandler.getAssetConfig(position.collateralAsset);
        
        // Calculate current values using oracle
        uint256 collateralValue = _getAssetValueInUSD(position.collateralAsset, position.collateralAmount);
        uint256 totalDebt = loanManager.getTotalDebt(positionId);
        uint256 debtValue = _getAssetValueInUSD(position.loanAsset, totalDebt);
        
        // Basic metrics
        metrics.collateralizationRatio = debtValue > 0 ? (collateralValue * 1000000) / debtValue : type(uint256).max;
        metrics.liquidationThreshold = collateralConfig.liquidationRatio;
        metrics.healthFactor = (metrics.collateralizationRatio * 1000000) / metrics.liquidationThreshold;
        
        // Advanced calculations
        metrics.maxWithdrawable = _calculateMaxWithdrawable(position, collateralValue, debtValue, collateralConfig);
        metrics.maxBorrowable = _calculateMaxBorrowable(position, collateralValue, debtValue, collateralConfig);
        metrics.liquidationPrice = _calculateLiquidationPrice(positionId, position, collateralConfig);
        metrics.riskLevel = _determineRiskLevel(metrics.collateralizationRatio);
        metrics.timeToLiquidation = _estimateTimeToLiquidation(position, metrics.collateralizationRatio);
        metrics.isLiquidatable = loanManager.canLiquidate(positionId);
        
        return metrics;
    }
    
    /**
     * @dev Analyzes price impact scenarios for liquidation risk
     * @param positionId The ID of the loan position
     * @return impact Price impact analysis
     */
    function analyzePriceImpact(uint256 positionId) external view returns (PriceImpact memory impact) {
        ILoanManager.LoanPosition memory position = loanManager.getPosition(positionId);
        require(position.isActive, "Position not active");
        
        IAssetHandler collateralHandler = _getAssetHandler(position.collateralAsset);
        IAssetHandler.AssetConfig memory collateralConfig = collateralHandler.getAssetConfig(position.collateralAsset);
        
        uint256 currentPrice = oracle.getPrice(position.collateralAsset, position.loanAsset);
        uint256 liquidationPrice = _calculateLiquidationPrice(positionId, position, collateralConfig);
        
        // Calculate price drops needed for different liquidation scenarios
        impact.priceDropFor10PercentLiquidation = _calculatePriceDropForLiquidationRisk(currentPrice, liquidationPrice, 10);
        impact.priceDropFor50PercentLiquidation = _calculatePriceDropForLiquidationRisk(currentPrice, liquidationPrice, 50);
        impact.priceDropFor90PercentLiquidation = _calculatePriceDropForLiquidationRisk(currentPrice, liquidationPrice, 90);
        impact.currentVolatility = _estimateVolatility(position.collateralAsset);
        
        return impact;
    }
    
    /**
     * @dev Calculates multiple positions risk for a user (portfolio risk)
     * @param user Address of the user
     * @return totalCollateralValue Total collateral value across all positions
     * @return totalDebtValue Total debt value across all positions
     * @return averageHealthFactor Average health factor
     * @return positionsAtRisk Number of positions at risk
     */
    function calculatePortfolioRisk(address user) external view returns (
        uint256 totalCollateralValue,
        uint256 totalDebtValue,
        uint256 averageHealthFactor,
        uint256 positionsAtRisk
    ) {
        uint256[] memory userPositions = loanManager.getUserPositions(user);
        uint256 totalHealthFactorWeighted = 0;
        
        for (uint i = 0; i < userPositions.length; i++) {
            uint256 positionId = userPositions[i];
            ILoanManager.LoanPosition memory position = loanManager.getPosition(positionId);
            
            if (!position.isActive) continue;
            
            uint256 collateralValue = _getAssetValueInUSD(position.collateralAsset, position.collateralAmount);
            uint256 totalDebt = loanManager.getTotalDebt(positionId);
            uint256 debtValue = _getAssetValueInUSD(position.loanAsset, totalDebt);
            
            totalCollateralValue += collateralValue;
            totalDebtValue += debtValue;
            
            // Calculate health factor for this position
            uint256 collateralizationRatio = debtValue > 0 ? (collateralValue * 1000000) / debtValue : type(uint256).max;
            
            IAssetHandler collateralHandler = _getAssetHandler(position.collateralAsset);
            IAssetHandler.AssetConfig memory config = collateralHandler.getAssetConfig(position.collateralAsset);
            uint256 healthFactor = (collateralizationRatio * 1000000) / config.liquidationRatio;
            
            // Weight by debt value
            totalHealthFactorWeighted += (healthFactor * debtValue);
            
            // Check if position is at risk
            if (collateralizationRatio < WARNING_RATIO) {
                positionsAtRisk++;
            }
        }
        
        // Calculate average health factor weighted by debt
        averageHealthFactor = totalDebtValue > 0 ? totalHealthFactorWeighted / totalDebtValue : type(uint256).max;
    }
    
    /**
     * @dev Real-time liquidation monitoring - checks if position should be liquidated
     * @param positionId The ID of the loan position
     * @return shouldLiquidate Whether position should be liquidated
     * @return liquidationValue Expected value from liquidation
     * @return liquidatorProfit Expected profit for liquidator
     */
    function checkLiquidationStatus(uint256 positionId) external view returns (
        bool shouldLiquidate,
        uint256 liquidationValue,
        uint256 liquidatorProfit
    ) {
        ILoanManager.LoanPosition memory position = loanManager.getPosition(positionId);
        require(position.isActive, "Position not active");
        
        shouldLiquidate = loanManager.canLiquidate(positionId);
        
        if (shouldLiquidate) {
            uint256 collateralValue = _getAssetValueInUSD(position.collateralAsset, position.collateralAmount);
            uint256 totalDebt = loanManager.getTotalDebt(positionId);
            uint256 debtValue = _getAssetValueInUSD(position.loanAsset, totalDebt);
            
            // Liquidation bonus (typically 5%)
            uint256 liquidationBonus = (collateralValue * 50000) / 1000000; // 5%
            liquidationValue = debtValue + liquidationBonus;
            liquidatorProfit = liquidationValue > debtValue ? liquidationBonus : 0;
        }
    }
    
    /**
     * @dev Estimates interest accrual and future health factor
     * @param positionId The ID of the loan position
     * @param timeInSeconds Time to project into the future
     * @return futureHealthFactor Projected health factor
     * @return additionalInterest Interest that will accrue
     */
    function projectFutureRisk(uint256 positionId, uint256 timeInSeconds) external view returns (
        uint256 futureHealthFactor,
        uint256 additionalInterest
    ) {
        ILoanManager.LoanPosition memory position = loanManager.getPosition(positionId);
        require(position.isActive, "Position not active");
        
        // Calculate additional interest that will accrue
        additionalInterest = (position.loanAmount * position.interestRate * timeInSeconds) / (365 * 24 * 3600 * 1000000);
        
        uint256 currentAccruedInterest = loanManager.getAccruedInterest(positionId);
        uint256 futureTotalDebt = position.loanAmount + currentAccruedInterest + additionalInterest;
        
        // Calculate future health factor
        uint256 collateralValue = _getAssetValueInUSD(position.collateralAsset, position.collateralAmount);
        uint256 futureDebtValue = _getAssetValueInUSD(position.loanAsset, futureTotalDebt);
        
        uint256 futureCollateralizationRatio = (collateralValue * 1000000) / futureDebtValue;
        
        IAssetHandler collateralHandler = _getAssetHandler(position.collateralAsset);
        IAssetHandler.AssetConfig memory config = collateralHandler.getAssetConfig(position.collateralAsset);
        
        futureHealthFactor = (futureCollateralizationRatio * 1000000) / config.liquidationRatio;
    }
    
    /**
     * @dev Gets real-time prices and price trends for risk assessment
     * @param asset Address of the asset
     * @return currentPrice Current price in USD (6 decimals)
     * @return priceChange24h Price change in last 24h (6 decimals, can be negative)
     * @return volatility Estimated volatility (6 decimals)
     */
    function getPriceMetrics(address asset) external view returns (
        uint256 currentPrice,
        int256 priceChange24h,
        uint256 volatility
    ) {
        // Get current price from oracle
        currentPrice = _getAssetValueInUSD(asset, 1e18); // Price per 1 token
        
        // For now, return placeholders - these would be calculated from historical data
        priceChange24h = 0; // TODO: Implement 24h price change calculation
        volatility = _estimateVolatility(asset);
    }
    
    // Internal helper functions
    
    function _getAssetValueInUSD(address asset, uint256 amount) internal view returns (uint256) {
        // For now, simplified - should use a USD reference token
        // This would need to be implemented with proper USD conversion
        try oracle.getPrice(asset, address(0)) returns (uint256 price) {
            return (amount * price) / 1e18; // Assuming 18 decimals
        } catch {
            // Fallback or revert
            return amount; // Placeholder
        }
    }
    
    function _getAssetHandler(address asset) internal view returns (IAssetHandler) {
        // This would need to query the loan manager for the appropriate handler
        // Placeholder implementation
        revert("Handler lookup not implemented");
    }
    
    function _calculateMaxWithdrawable(
        ILoanManager.LoanPosition memory position,
        uint256 collateralValue,
        uint256 debtValue,
        IAssetHandler.AssetConfig memory config
    ) internal pure returns (uint256) {
        if (debtValue == 0) return position.collateralAmount;
        
        uint256 minCollateralValue = (debtValue * config.collateralRatio) / 1000000;
        if (collateralValue <= minCollateralValue) return 0;
        
        uint256 excessCollateralValue = collateralValue - minCollateralValue;
        return (excessCollateralValue * position.collateralAmount) / collateralValue;
    }
    
    function _calculateMaxBorrowable(
        ILoanManager.LoanPosition memory position,
        uint256 collateralValue,
        uint256 debtValue,
        IAssetHandler.AssetConfig memory config
    ) internal pure returns (uint256) {
        uint256 maxDebtValue = (collateralValue * 1000000) / config.collateralRatio;
        if (maxDebtValue <= debtValue) return 0;
        
        return maxDebtValue - debtValue;
    }
    
    function _calculateLiquidationPrice(
        uint256 positionId,
        ILoanManager.LoanPosition memory position,
        IAssetHandler.AssetConfig memory config
    ) internal view returns (uint256) {
        uint256 totalDebt = loanManager.getTotalDebt(positionId);
        uint256 debtValue = _getAssetValueInUSD(position.loanAsset, totalDebt);
        
        // Price at which collateral value equals liquidation threshold
        return (debtValue * config.liquidationRatio) / (position.collateralAmount * 1000000);
    }
    
    function _determineRiskLevel(uint256 collateralizationRatio) internal pure returns (RiskLevel) {
        if (collateralizationRatio >= HEALTHY_RATIO) return RiskLevel.HEALTHY;
        if (collateralizationRatio >= WARNING_RATIO) return RiskLevel.WARNING;
        if (collateralizationRatio >= DANGER_RATIO) return RiskLevel.DANGER;
        if (collateralizationRatio >= CRITICAL_RATIO) return RiskLevel.CRITICAL;
        return RiskLevel.LIQUIDATABLE;
    }
    
    function _estimateTimeToLiquidation(
        ILoanManager.LoanPosition memory position,
        uint256 currentRatio
    ) internal view returns (uint256) {
        if (currentRatio <= CRITICAL_RATIO) return 0;
        
        // Estimate based on interest accrual rate
        uint256 timeToReachCritical = ((currentRatio - CRITICAL_RATIO) * 365 * 24 * 3600 * 1000000) / 
                                     (position.interestRate * CRITICAL_RATIO);
        
        return timeToReachCritical;
    }
    
    function _calculatePriceDropForLiquidationRisk(
        uint256 currentPrice,
        uint256 liquidationPrice,
        uint256 riskPercentage
    ) internal pure returns (uint256) {
        if (liquidationPrice >= currentPrice) return 0;
        
        uint256 maxDrop = currentPrice - liquidationPrice;
        return (maxDrop * riskPercentage) / 100;
    }
    
    function _estimateVolatility(address asset) internal pure returns (uint256) {
        // Placeholder - would be calculated from historical price data
        return 200000; // 20% annualized volatility
    }
} 