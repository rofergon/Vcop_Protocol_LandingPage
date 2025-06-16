// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "v4-core/lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "v4-core/lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "v4-core/lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IAssetHandler} from "../interfaces/IAssetHandler.sol";

/**
 * @title VaultBasedHandler
 * @notice Handles external assets that require vault-based lending (like ETH, WBTC)
 */
contract VaultBasedHandler is IAssetHandler, Ownable {
    using SafeERC20 for IERC20;
    
    // Liquidity provider information
    struct LiquidityProvider {
        uint256 totalProvided;
        uint256 totalWithdrawn;
        uint256 earnedInterest;
        uint256 lastUpdateTimestamp;
    }
    
    // Vault information for each asset
    struct VaultInfo {
        uint256 totalLiquidity;      // Total liquidity provided
        uint256 totalBorrowed;       // Total amount currently borrowed
        uint256 totalInterestAccrued; // Total interest accrued
        uint256 utilizationRate;     // Current utilization rate (borrowed/liquidity)
        uint256 lastUpdateTimestamp;
    }
    
    // Asset configurations
    mapping(address => AssetConfig) public assetConfigs;
    address[] public supportedAssets;
    
    // Vault data
    mapping(address => VaultInfo) public vaultInfo;
    
    // Liquidity providers: token => provider => LiquidityProvider
    mapping(address => mapping(address => LiquidityProvider)) public liquidityProviders;
    mapping(address => address[]) public assetProviders; // Track providers per asset
    
    // Interest calculation parameters
    uint256 public constant SECONDS_PER_YEAR = 365 * 24 * 3600;
    uint256 public baseInterestRate = 50000; // 5% base rate (6 decimals: 5% = 50000)
    uint256 public utilizationMultiplier = 200000; // 20% multiplier
    
    // Events
    event InterestAccrued(address indexed token, uint256 amount);
    event UtilizationRateUpdated(address indexed token, uint256 newRate);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Configures a vault-based asset
     */
    function configureAsset(
        address token,
        uint256 collateralRatio,
        uint256 liquidationRatio,
        uint256 maxLoanAmount,
        uint256 interestRate
    ) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(collateralRatio >= 1000000, "Ratio must be at least 100%");
        require(liquidationRatio < collateralRatio, "Liquidation ratio must be below collateral ratio");
        
        IERC20 erc20Token = IERC20(token);
        
        // Add to supported assets if new
        if (assetConfigs[token].token == address(0)) {
            supportedAssets.push(token);
        }
        
        assetConfigs[token] = AssetConfig({
            token: token,
            assetType: AssetType.VAULT_BASED,
            decimals: 18, // Most tokens use 18, can be overridden
            collateralRatio: collateralRatio,
            liquidationRatio: liquidationRatio,
            maxLoanAmount: maxLoanAmount,
            interestRate: interestRate,
            isActive: true
        });
        
        emit AssetConfigured(token, AssetType.VAULT_BASED, collateralRatio);
    }
    
    /**
     * @dev Provides liquidity to the vault
     */
    function provideLiquidity(address token, uint256 amount, address provider) external override {
        AssetConfig memory config = assetConfigs[token];
        require(config.isActive, "Asset not active");
        require(config.assetType == AssetType.VAULT_BASED, "Invalid asset type");
        require(amount > 0, "Amount must be greater than zero");
        
        // Transfer tokens to vault
        IERC20(token).safeTransferFrom(provider, address(this), amount);
        
        // Update provider information
        LiquidityProvider storage providerInfo = liquidityProviders[token][provider];
        if (providerInfo.totalProvided == 0) {
            assetProviders[token].push(provider);
        }
        
        // Accrue interest before updating
        _accrueInterest(token);
        
        providerInfo.totalProvided += amount;
        providerInfo.lastUpdateTimestamp = block.timestamp;
        
        // Update vault information
        VaultInfo storage vault = vaultInfo[token];
        vault.totalLiquidity += amount;
        vault.lastUpdateTimestamp = block.timestamp;
        
        // Update utilization rate
        _updateUtilizationRate(token);
        
        emit LiquidityProvided(token, provider, amount);
    }
    
    /**
     * @dev Withdraws provided liquidity
     */
    function withdrawLiquidity(address token, uint256 amount, address provider) external override {
        AssetConfig memory config = assetConfigs[token];
        require(config.isActive, "Asset not active");
        require(config.assetType == AssetType.VAULT_BASED, "Invalid asset type");
        
        LiquidityProvider storage providerInfo = liquidityProviders[token][provider];
        require(providerInfo.totalProvided >= amount, "Insufficient provided liquidity");
        
        VaultInfo storage vault = vaultInfo[token];
        uint256 availableLiquidity = vault.totalLiquidity - vault.totalBorrowed;
        require(availableLiquidity >= amount, "Insufficient available liquidity");
        
        // Accrue interest before updating
        _accrueInterest(token);
        
        // Calculate and distribute earned interest
        uint256 interest = _calculateProviderInterest(token, provider);
        if (interest > 0) {
            providerInfo.earnedInterest += interest;
        }
        
        // Update provider information
        providerInfo.totalProvided -= amount;
        providerInfo.totalWithdrawn += amount;
        providerInfo.lastUpdateTimestamp = block.timestamp;
        
        // Update vault information
        vault.totalLiquidity -= amount;
        vault.lastUpdateTimestamp = block.timestamp;
        
        // Transfer tokens back to provider
        IERC20(token).safeTransfer(provider, amount);
        
        // Update utilization rate
        _updateUtilizationRate(token);
        
        emit LiquidityWithdrawn(token, provider, amount);
    }
    
    /**
     * @dev Lends tokens from the vault
     */
    function lend(address token, uint256 amount, address borrower) external override {
        AssetConfig memory config = assetConfigs[token];
        require(config.isActive, "Asset not active");
        require(config.assetType == AssetType.VAULT_BASED, "Invalid asset type");
        
        VaultInfo storage vault = vaultInfo[token];
        uint256 availableLiquidity = vault.totalLiquidity - vault.totalBorrowed;
        require(availableLiquidity >= amount, "Insufficient vault liquidity");
        
        // Check lending limits
        require(
            vault.totalBorrowed + amount <= config.maxLoanAmount,
            "Exceeds maximum loan amount"
        );
        
        // Accrue interest before updating
        _accrueInterest(token);
        
        // Update vault statistics
        vault.totalBorrowed += amount;
        vault.lastUpdateTimestamp = block.timestamp;
        
        // Transfer tokens to borrower
        IERC20(token).safeTransfer(borrower, amount);
        
        // Update utilization rate
        _updateUtilizationRate(token);
        
        emit TokensLent(token, borrower, amount);
    }
    
    /**
     * @dev Repays borrowed tokens to the vault
     */
    function repay(address token, uint256 amount, address borrower) external override {
        AssetConfig memory config = assetConfigs[token];
        require(config.isActive, "Asset not active");
        require(config.assetType == AssetType.VAULT_BASED, "Invalid asset type");
        
        // Transfer tokens from borrower to vault
        IERC20(token).safeTransferFrom(borrower, address(this), amount);
        
        // Accrue interest before updating
        _accrueInterest(token);
        
        // Update vault statistics
        VaultInfo storage vault = vaultInfo[token];
        vault.totalBorrowed = vault.totalBorrowed > amount ? vault.totalBorrowed - amount : 0;
        vault.lastUpdateTimestamp = block.timestamp;
        
        // Update utilization rate
        _updateUtilizationRate(token);
        
        emit TokensRepaid(token, borrower, amount);
    }
    
    /**
     * @dev Gets available liquidity for lending
     */
    function getAvailableLiquidity(address token) external view override returns (uint256) {
        VaultInfo memory vault = vaultInfo[token];
        return vault.totalLiquidity > vault.totalBorrowed 
            ? vault.totalLiquidity - vault.totalBorrowed 
            : 0;
    }
    
    /**
     * @dev Gets total borrowed amount
     */
    function getTotalBorrowed(address token) external view override returns (uint256) {
        return vaultInfo[token].totalBorrowed;
    }
    
    /**
     * @dev Gets asset configuration
     */
    function getAssetConfig(address token) external view override returns (AssetConfig memory) {
        return assetConfigs[token];
    }
    
    /**
     * @dev Checks if asset is supported
     */
    function isAssetSupported(address token) external view override returns (bool) {
        return assetConfigs[token].isActive;
    }
    
    /**
     * @dev Gets asset type
     */
    function getAssetType(address token) external view override returns (AssetType) {
        return assetConfigs[token].assetType;
    }
    
    /**
     * @dev Accrues interest for all liquidity providers
     */
    function _accrueInterest(address token) internal {
        VaultInfo storage vault = vaultInfo[token];
        
        if (vault.totalBorrowed == 0 || vault.lastUpdateTimestamp == block.timestamp) {
            return;
        }
        
        uint256 timeElapsed = block.timestamp - vault.lastUpdateTimestamp;
        uint256 currentRate = _getCurrentInterestRate(token);
        
        // Calculate interest: principal * rate * time / seconds_per_year
        uint256 interest = (vault.totalBorrowed * currentRate * timeElapsed) / (SECONDS_PER_YEAR * 1000000);
        
        if (interest > 0) {
            vault.totalInterestAccrued += interest;
            emit InterestAccrued(token, interest);
        }
    }
    
    /**
     * @dev Calculates interest earned by a specific provider
     */
    function _calculateProviderInterest(address token, address provider) internal view returns (uint256) {
        VaultInfo memory vault = vaultInfo[token];
        LiquidityProvider memory providerInfo = liquidityProviders[token][provider];
        
        if (vault.totalLiquidity == 0 || providerInfo.totalProvided == 0) {
            return 0;
        }
        
        // Provider's share of total interest = (provider_liquidity / total_liquidity) * total_interest
        uint256 providerShare = (providerInfo.totalProvided * vault.totalInterestAccrued) / vault.totalLiquidity;
        return providerShare > providerInfo.earnedInterest ? providerShare - providerInfo.earnedInterest : 0;
    }
    
    /**
     * @dev Updates utilization rate for an asset
     */
    function _updateUtilizationRate(address token) internal {
        VaultInfo storage vault = vaultInfo[token];
        
        if (vault.totalLiquidity == 0) {
            vault.utilizationRate = 0;
        } else {
            vault.utilizationRate = (vault.totalBorrowed * 1000000) / vault.totalLiquidity;
        }
        
        emit UtilizationRateUpdated(token, vault.utilizationRate);
    }
    
    /**
     * @dev Calculates current interest rate based on utilization
     */
    function _getCurrentInterestRate(address token) internal view returns (uint256) {
        VaultInfo memory vault = vaultInfo[token];
        
        // Interest rate = base_rate + (utilization_rate * multiplier)
        uint256 variableRate = (vault.utilizationRate * utilizationMultiplier) / 1000000;
        return baseInterestRate + variableRate;
    }
    
    /**
     * @dev Gets vault statistics
     */
    function getVaultStats(address token) external view returns (
        uint256 totalLiquidity,
        uint256 totalBorrowed,
        uint256 totalInterestAccrued,
        uint256 utilizationRate,
        uint256 currentInterestRate
    ) {
        VaultInfo memory vault = vaultInfo[token];
        return (
            vault.totalLiquidity,
            vault.totalBorrowed,
            vault.totalInterestAccrued,
            vault.utilizationRate,
            _getCurrentInterestRate(token)
        );
    }
    
    /**
     * @dev Gets provider information
     */
    function getProviderInfo(address token, address provider) external view returns (
        uint256 totalProvided,
        uint256 totalWithdrawn,
        uint256 earnedInterest,
        uint256 pendingInterest
    ) {
        LiquidityProvider memory providerInfo = liquidityProviders[token][provider];
        uint256 pending = _calculateProviderInterest(token, provider);
        
        return (
            providerInfo.totalProvided,
            providerInfo.totalWithdrawn,
            providerInfo.earnedInterest,
            pending
        );
    }
    
    /**
     * @dev Sets interest rate parameters
     */
    function setInterestRateParams(uint256 _baseRate, uint256 _multiplier) external onlyOwner {
        baseInterestRate = _baseRate;
        utilizationMultiplier = _multiplier;
    }
} 