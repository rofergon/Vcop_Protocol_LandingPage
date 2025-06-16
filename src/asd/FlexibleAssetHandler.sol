// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "v4-core/lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "v4-core/lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "v4-core/lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IAssetHandler} from "../interfaces/IAssetHandler.sol";

// Interface for mintable/burnable tokens
interface IMintableBurnable {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function decimals() external view returns (uint8);
}

/**
 * @title FlexibleAssetHandler
 * @notice Universal asset handler with ZERO ratio restrictions
 * @dev Combines mintable/burnable and vault-based functionality with maximum flexibility
 */
contract FlexibleAssetHandler is IAssetHandler, Ownable {
    using SafeERC20 for IERC20;
    
    // Vault for non-mintable assets
    struct VaultInfo {
        uint256 totalDeposits;
        uint256 totalBorrowed;
        uint256 totalReserves;
        mapping(address => uint256) userDeposits;
        address[] depositors;
    }
    
    // Asset configurations - ULTRA FLEXIBLE
    mapping(address => AssetConfig) public assetConfigs;
    address[] public supportedAssets;
    
    // Vault management for non-mintable assets
    mapping(address => VaultInfo) public vaults;
    
    // Protocol statistics
    mapping(address => uint256) public totalMinted;
    mapping(address => uint256) public totalBurned;
    mapping(address => uint256) public totalBorrowed;
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Configures an asset with ZERO restrictions on ratios
     */
    function configureAsset(
        address token,
        AssetType assetType,
        uint256 suggestionCollateralRatio,    // ✅ Just a suggestion, not enforced
        uint256 suggestionLiquidationRatio,   // ✅ Just a suggestion, not enforced
        uint256 maxLoanAmount,
        uint256 interestRate
    ) external onlyOwner {
        require(token != address(0), "Invalid token address");
        
        uint256 decimals = 18; // Default
        if (assetType == AssetType.MINTABLE_BURNABLE) {
            try IMintableBurnable(token).decimals() returns (uint8 d) {
                decimals = d;
            } catch {
                // Use default if decimals() call fails
            }
        } else {
            // For ERC20 tokens, try to get decimals via low-level call
            (bool success, bytes memory data) = token.staticcall(abi.encodeWithSignature("decimals()"));
            if (success && data.length > 0) {
                decimals = abi.decode(data, (uint8));
            }
            // Use default if call fails
        }
        
        // Add to supported assets if new
        if (assetConfigs[token].token == address(0)) {
            supportedAssets.push(token);
        }
        
        // ✅ NO RATIO RESTRICTIONS! Store as suggestions only
        assetConfigs[token] = AssetConfig({
            token: token,
            assetType: assetType,
            decimals: decimals,
            collateralRatio: suggestionCollateralRatio,    // Just a suggestion
            liquidationRatio: suggestionLiquidationRatio,  // Just a suggestion
            maxLoanAmount: maxLoanAmount,
            interestRate: interestRate,
            isActive: true
        });
        
        emit AssetConfigured(token, assetType, suggestionCollateralRatio);
    }
    
    /**
     * @dev Provides liquidity to vault-based assets - NO RESTRICTIONS
     */
    function provideLiquidity(address token, uint256 amount, address provider) external override {
        AssetConfig memory config = assetConfigs[token];
        require(config.isActive, "Asset not active");
        
        if (config.assetType == AssetType.MINTABLE_BURNABLE) {
            revert("Not applicable for mintable/burnable assets");
        }
        
        // Transfer tokens to this contract
        IERC20(token).safeTransferFrom(provider, address(this), amount);
        
        // Update vault info
        VaultInfo storage vault = vaults[token];
        
        // Add to depositors list if first deposit
        if (vault.userDeposits[provider] == 0) {
            vault.depositors.push(provider);
        }
        
        vault.userDeposits[provider] += amount;
        vault.totalDeposits += amount;
        vault.totalReserves += amount;
        
        emit LiquidityProvided(token, provider, amount);
    }
    
    /**
     * @dev Withdraws liquidity - FLEXIBLE (allows partial withdrawals)
     */
    function withdrawLiquidity(address token, uint256 amount, address provider) external override {
        AssetConfig memory config = assetConfigs[token];
        require(config.isActive, "Asset not active");
        
        if (config.assetType == AssetType.MINTABLE_BURNABLE) {
            revert("Not applicable for mintable/burnable assets");
        }
        
        VaultInfo storage vault = vaults[token];
        require(vault.userDeposits[provider] >= amount, "Insufficient deposit");
        
        // ✅ FLEXIBLE: Allow withdrawal even if it affects utilization
        // Just ensure we have enough reserves
        require(vault.totalReserves >= amount, "Insufficient vault reserves");
        
        // Update vault info
        vault.userDeposits[provider] -= amount;
        vault.totalDeposits -= amount;
        vault.totalReserves -= amount;
        
        // Transfer tokens back to provider
        IERC20(token).safeTransfer(provider, amount);
        
        emit LiquidityWithdrawn(token, provider, amount);
    }
    
    /**
     * @dev Lends assets - ULTRA FLEXIBLE
     */
    function lend(address token, uint256 amount, address borrower) external override {
        AssetConfig memory config = assetConfigs[token];
        require(config.isActive, "Asset not active");
        require(amount > 0, "Amount must be positive");
        
        if (config.assetType == AssetType.MINTABLE_BURNABLE) {
            // ✅ MINTABLE: No limits beyond maxLoanAmount
            require(
                totalBorrowed[token] + amount <= config.maxLoanAmount,
                "Exceeds maximum loan amount"
            );
            
            // Mint tokens to borrower
            IMintableBurnable(token).mint(borrower, amount);
            
            // Update statistics
            totalMinted[token] += amount;
            totalBorrowed[token] += amount;
            
        } else {
            // ✅ VAULT-BASED: Only check if we have reserves
            VaultInfo storage vault = vaults[token];
            require(vault.totalReserves >= amount, "Insufficient vault liquidity");
            
            // Update vault info
            vault.totalBorrowed += amount;
            vault.totalReserves -= amount;
            
            // Transfer tokens to borrower
            IERC20(token).safeTransfer(borrower, amount);
            
            // Update total borrowed
            totalBorrowed[token] += amount;
        }
        
        emit TokensLent(token, borrower, amount);
    }
    
    /**
     * @dev Repays assets
     */
    function repay(address token, uint256 amount, address borrower) external override {
        AssetConfig memory config = assetConfigs[token];
        require(config.isActive, "Asset not active");
        require(amount > 0, "Amount must be positive");
        
        if (config.assetType == AssetType.MINTABLE_BURNABLE) {
            // Burn tokens from borrower
            IMintableBurnable(token).burn(borrower, amount);
            
            // Update statistics
            totalBurned[token] += amount;
            totalBorrowed[token] = totalBorrowed[token] > amount ? totalBorrowed[token] - amount : 0;
            
        } else {
            // Transfer tokens from borrower to this contract
            IERC20(token).safeTransferFrom(borrower, address(this), amount);
            
            // Update vault info
            VaultInfo storage vault = vaults[token];
            vault.totalBorrowed = vault.totalBorrowed > amount ? vault.totalBorrowed - amount : 0;
            vault.totalReserves += amount;
            
            // Update total borrowed
            totalBorrowed[token] = totalBorrowed[token] > amount ? totalBorrowed[token] - amount : 0;
        }
        
        emit TokensRepaid(token, borrower, amount);
    }
    
    /**
     * @dev Gets available liquidity
     */
    function getAvailableLiquidity(address token) external view override returns (uint256) {
        AssetConfig memory config = assetConfigs[token];
        if (!config.isActive) {
            return 0;
        }
        
        if (config.assetType == AssetType.MINTABLE_BURNABLE) {
            // Return remaining mintable amount
            return config.maxLoanAmount > totalBorrowed[token] 
                ? config.maxLoanAmount - totalBorrowed[token]
                : 0;
        } else {
            // Return vault reserves
            return vaults[token].totalReserves;
        }
    }
    
    /**
     * @dev Gets total borrowed amount
     */
    function getTotalBorrowed(address token) external view override returns (uint256) {
        return totalBorrowed[token];
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
     * @dev Sets asset active status
     */
    function setAssetStatus(address token, bool isActive) external onlyOwner {
        require(assetConfigs[token].token != address(0), "Asset not configured");
        assetConfigs[token].isActive = isActive;
    }
    
    /**
     * @dev Updates suggestion ratios (NOT ENFORCED)
     */
    function updateSuggestionRatios(
        address token, 
        uint256 newCollateralRatio, 
        uint256 newLiquidationRatio
    ) external onlyOwner {
        require(assetConfigs[token].token != address(0), "Asset not configured");
        
        // ✅ NO VALIDATION! Just update suggestions
        assetConfigs[token].collateralRatio = newCollateralRatio;
        assetConfigs[token].liquidationRatio = newLiquidationRatio;
        
        emit SuggestionRatiosUpdated(token, newCollateralRatio, newLiquidationRatio);
    }
    
    /**
     * @dev Gets list of all supported assets
     */
    function getSupportedAssets() external view returns (address[] memory) {
        return supportedAssets;
    }
    
    /**
     * @dev Gets vault info for an asset
     */
    function getVaultInfo(address token) external view returns (
        uint256 totalDeposits,
        uint256 vaultTotalBorrowed,
        uint256 totalReserves,
        uint256 utilizationRate
    ) {
        VaultInfo storage vault = vaults[token];
        totalDeposits = vault.totalDeposits;
        vaultTotalBorrowed = vault.totalBorrowed;
        totalReserves = vault.totalReserves;
        
        // Calculate utilization rate
        if (totalDeposits > 0) {
            utilizationRate = (vault.totalBorrowed * 1000000) / totalDeposits;
        } else {
            utilizationRate = 0;
        }
    }
    
    /**
     * @dev Gets user's liquidity position
     */
    function getUserLiquidityPosition(address token, address user) external view returns (
        uint256 deposited,
        uint256 shareOfVault,
        uint256 estimatedEarnings
    ) {
        VaultInfo storage vault = vaults[token];
        deposited = vault.userDeposits[user];
        
        if (vault.totalDeposits > 0) {
            shareOfVault = (deposited * 1000000) / vault.totalDeposits;
        } else {
            shareOfVault = 0;
        }
        
        // Estimated earnings based on share of interest
        // This is a simplified calculation
        estimatedEarnings = 0; // TODO: Implement based on interest collected
    }
    
    /**
     * @dev Gets protocol statistics for an asset
     */
    function getAssetStats(address token) external view returns (
        uint256 minted,
        uint256 burned,
        uint256 borrowed,
        uint256 netSupply
    ) {
        minted = totalMinted[token];
        burned = totalBurned[token];
        borrowed = totalBorrowed[token];
        netSupply = minted > burned ? minted - burned : 0;
    }
    
    /**
     * @dev Emergency function to pause/unpause an asset
     */
    function emergencyPause(address token) external onlyOwner {
        assetConfigs[token].isActive = false;
        emit AssetPaused(token);
    }
    
    /**
     * @dev Get all depositors for a vault (for governance/yield distribution)
     */
    function getVaultDepositors(address token) external view returns (address[] memory) {
        return vaults[token].depositors;
    }
    
    // Additional events
    event SuggestionRatiosUpdated(address indexed token, uint256 collateralRatio, uint256 liquidationRatio);
    event AssetPaused(address indexed token);
}