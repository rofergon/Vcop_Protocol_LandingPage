// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "v4-core/lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "v4-core/lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "v4-core/lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "v4-core/lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {ILoanManager} from "../interfaces/ILoanManager.sol";
import {IAssetHandler} from "../interfaces/IAssetHandler.sol";
import {IGenericOracle} from "../interfaces/IGenericOracle.sol";
import {IRewardable} from "../interfaces/IRewardable.sol";
import {ILoanAutomation} from "../automation/interfaces/ILoanAutomation.sol";
import {IPriceRegistry} from "../interfaces/IPriceRegistry.sol";
import {IEmergencyRegistry} from "../interfaces/IEmergencyRegistry.sol";
import {RewardDistributor} from "./RewardDistributor.sol";
import {VaultBasedHandler} from "./VaultBasedHandler.sol";

/**
 * @title FlexibleLoanManager
 * @notice ULTRA-FLEXIBLE loan manager - NO ratio limits, only prevents negative values
 * @dev Allows ANY ratio as long as math doesn't break. All risk management in frontend.
 */
contract FlexibleLoanManager is ILoanManager, IRewardable, ILoanAutomation, Ownable {
    using SafeERC20 for IERC20;
    
    // Asset handlers for different types of assets
    mapping(IAssetHandler.AssetType => address) public assetHandlers;
    
    // Oracle for price feeds
    IGenericOracle public oracle;
    
    // Dynamic price registry (replaces hardcoded addresses)
    IPriceRegistry public priceRegistry;
    
    // ⚡ NEW: Emergency registry for centralized liquidation coordination
    IEmergencyRegistry public emergencyRegistry;
    
    // Loan positions
    mapping(uint256 => LoanPosition) public positions;
    mapping(address => uint256[]) public userPositions;
    uint256 public nextPositionId = 1;
    
    // Minimal protocol parameters (only for extreme cases)
    uint256 public liquidationBonus = 50000; // 5% bonus for liquidators (configurable)
    
    // Protocol fees
    uint256 public protocolFee = 5000; // 0.5% (6 decimals: 0.5% = 5000)
    address public feeCollector;
    
    // Interest management
    mapping(uint256 => uint256) public accruedInterest;
    
    // Emergency pause (only for bugs/exploits)
    bool public paused = false;
    
    // Automation settings
    bool public automationEnabled = true;
    address public authorizedAutomationContract;
    
    // Reward system
    RewardDistributor public rewardDistributor;
    bytes32 public constant REWARD_POOL_ID = keccak256("FLEXIBLE_LOAN_COLLATERAL");
    
    constructor(
        address _oracle, 
        address _feeCollector, 
        address _priceRegistry,
        address _emergencyRegistry
    ) Ownable(msg.sender) {
        oracle = IGenericOracle(_oracle);
        feeCollector = _feeCollector;
        if (_priceRegistry != address(0)) {
            priceRegistry = IPriceRegistry(_priceRegistry);
        }
        if (_emergencyRegistry != address(0)) {
            emergencyRegistry = IEmergencyRegistry(_emergencyRegistry);
        }
    }
    
    /**
     * @dev Emergency pause mechanism (only for security)
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    /**
     * @dev Sets asset handler for a specific asset type
     */
    function setAssetHandler(IAssetHandler.AssetType assetType, address handler) external onlyOwner {
        require(handler != address(0), "Invalid handler address");
        assetHandlers[assetType] = handler;
    }
    
    /**
     * @dev Creates a new loan position - ULTRA FLEXIBLE
     * No ratio limits! Only basic validations to prevent math errors.
     */
    function createLoan(LoanTerms calldata terms) external override whenNotPaused returns (uint256 positionId) {
        // ✅ ONLY BASIC MATH VALIDATIONS
        require(terms.collateralAmount > 0, "Collateral amount must be positive");
        require(terms.loanAmount > 0, "Loan amount must be positive");
        require(terms.collateralAsset != terms.loanAsset, "Assets must be different");
        require(terms.interestRate < 1000000000, "Interest rate too high (prevents overflow)");
        
        // ✅ VERIFY ASSETS ARE SUPPORTED
        IAssetHandler collateralHandler = _getAssetHandler(terms.collateralAsset);
        IAssetHandler loanHandler = _getAssetHandler(terms.loanAsset);
        
        require(collateralHandler.isAssetSupported(terms.collateralAsset), "Collateral asset not supported");
        require(loanHandler.isAssetSupported(terms.loanAsset), "Loan asset not supported");
        
        // ✅ CHECK LIQUIDITY AVAILABILITY ONLY
        require(
            loanHandler.getAvailableLiquidity(terms.loanAsset) >= terms.loanAmount,
            "Insufficient liquidity"
        );
        
        // ✅ NO RATIO CHECKS! User can create ANY ratio they want
        // Frontend will warn about risky ratios, but contracts allow them
        
        // Transfer collateral from user
        IERC20(terms.collateralAsset).safeTransferFrom(msg.sender, address(this), terms.collateralAmount);
        
        // Update rewards for collateral deposit
        _updateCollateralRewards(msg.sender, terms.collateralAmount, true);
        
        // Create position
        positionId = nextPositionId++;
        positions[positionId] = LoanPosition({
            borrower: msg.sender,
            collateralAsset: terms.collateralAsset,
            loanAsset: terms.loanAsset,
            collateralAmount: terms.collateralAmount,
            loanAmount: terms.loanAmount,
            interestRate: terms.interestRate,
            createdAt: block.timestamp,
            lastInterestUpdate: block.timestamp,
            isActive: true
        });
        
        userPositions[msg.sender].push(positionId);
        
        // Execute loan through asset handler
        loanHandler.lend(terms.loanAsset, terms.loanAmount, msg.sender);
        
        emit LoanCreated(
            positionId,
            msg.sender,
            terms.collateralAsset,
            terms.loanAsset,
            terms.collateralAmount,
            terms.loanAmount
        );
    }
    
    /**
     * @dev Adds collateral to an existing position - NO LIMITS
     */
    function addCollateral(uint256 positionId, uint256 amount) external override whenNotPaused {
        LoanPosition storage position = positions[positionId];
        require(position.isActive, "Position not active");
        require(position.borrower == msg.sender, "Not position owner");
        require(amount > 0, "Amount must be positive");
        
        // Transfer additional collateral
        IERC20(position.collateralAsset).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update rewards for additional collateral
        _updateCollateralRewards(msg.sender, amount, true);
        
        // Update position
        position.collateralAmount += amount;
        
        emit CollateralAdded(positionId, amount);
    }
    
    /**
     * @dev Withdraws collateral from a position - ULTRA FLEXIBLE
     * Only prevents withdrawing more than available. NO ratio checks!
     */
    function withdrawCollateral(uint256 positionId, uint256 amount) external override whenNotPaused {
        LoanPosition storage position = positions[positionId];
        require(position.isActive, "Position not active");
        require(position.borrower == msg.sender, "Not position owner");
        require(amount <= position.collateralAmount, "Amount exceeds available collateral");
        require(amount > 0, "Amount must be positive");
        
        // ✅ NO RATIO CHECKS! User can withdraw to ANY ratio
        // Frontend will warn about liquidation risk, but contract allows it
        
        // Update rewards for collateral withdrawal
        _updateCollateralRewards(msg.sender, amount, false);
        
        // Update position and transfer collateral
        position.collateralAmount -= amount;
        IERC20(position.collateralAsset).safeTransfer(msg.sender, amount);
        
        emit CollateralWithdrawn(positionId, amount);
    }
    
    /**
     * @dev Increase loan amount - ULTRA FLEXIBLE
     * User can borrow more up to available liquidity, ANY ratio allowed
     */
    function increaseLoan(uint256 positionId, uint256 additionalAmount) external whenNotPaused {
        LoanPosition storage position = positions[positionId];
        require(position.isActive, "Position not active");
        require(position.borrower == msg.sender, "Not position owner");
        require(additionalAmount > 0, "Amount must be positive");
        
        // Update interest before increasing loan
        updateInterest(positionId);
        
        // ✅ ONLY CHECK LIQUIDITY AVAILABILITY
        IAssetHandler loanHandler = _getAssetHandler(position.loanAsset);
        require(
            loanHandler.getAvailableLiquidity(position.loanAsset) >= additionalAmount,
            "Insufficient liquidity"
        );
        
        // ✅ NO RATIO CHECKS! User can leverage to ANY level
        
        // Update position
        position.loanAmount += additionalAmount;
        
        // Execute additional loan
        loanHandler.lend(position.loanAsset, additionalAmount, msg.sender);
        
        emit LoanIncreased(positionId, additionalAmount);
    }
    
    /**
     * @dev Repays part or all of the loan
     */
    function repayLoan(uint256 positionId, uint256 amount) external override whenNotPaused {
        LoanPosition storage position = positions[positionId];
        require(position.isActive, "Position not active");
        require(amount > 0, "Amount must be positive");
        
        // Update interest before repayment
        updateInterest(positionId);
        
        uint256 totalDebt = getTotalDebt(positionId);
        uint256 repayAmount = amount > totalDebt ? totalDebt : amount;
        
        // Calculate interest and principal portions
        uint256 currentInterest = accruedInterest[positionId];
        uint256 interestPayment = repayAmount > currentInterest ? currentInterest : repayAmount;
        uint256 principalPayment = repayAmount - interestPayment;
        
        // Process interest payment (protocol fee)
        if (interestPayment > 0) {
            uint256 fee = (interestPayment * protocolFee) / 1000000;
            if (fee > 0) {
                IERC20(position.loanAsset).safeTransferFrom(msg.sender, feeCollector, fee);
            }
            accruedInterest[positionId] -= interestPayment;
        }
        
        // Process principal repayment through asset handler
        if (principalPayment > 0) {
            IAssetHandler loanHandler = _getAssetHandler(position.loanAsset);
            loanHandler.repay(position.loanAsset, principalPayment, msg.sender);
            position.loanAmount -= principalPayment;
        }
        
        // If fully repaid, return collateral and close position
        if (position.loanAmount == 0 && accruedInterest[positionId] == 0) {
            IERC20(position.collateralAsset).safeTransfer(msg.sender, position.collateralAmount);
            position.isActive = false;
        }
        
        emit LoanRepaid(positionId, repayAmount);
    }
    
    /**
     * @dev Liquidates a position - FLEXIBLE CONDITIONS
     * Uses asset handler's liquidation threshold, but still allows low ratios
     */
    function liquidatePosition(uint256 positionId) external override whenNotPaused {
        LoanPosition storage position = positions[positionId];
        require(position.isActive, "Position not active");
        
        // Update interest before liquidation check
        updateInterest(positionId);
        
        // ✅ FLEXIBLE LIQUIDATION - Use asset config but allow override
        require(canLiquidate(positionId), "Position not liquidatable by current rules");
        
        uint256 totalDebt = getTotalDebt(positionId);
        uint256 collateralValue = _getAssetValue(position.collateralAsset, position.collateralAmount);
        
        // Calculate liquidation amounts
        uint256 debtValue = _getAssetValue(position.loanAsset, totalDebt);
        uint256 liquidationBonusAmount = (collateralValue * liquidationBonus) / 1000000;
        uint256 liquidatorReward = collateralValue > debtValue + liquidationBonusAmount 
            ? debtValue + liquidationBonusAmount 
            : collateralValue;
        
        // Liquidator repays debt
        IAssetHandler loanHandler = _getAssetHandler(position.loanAsset);
        loanHandler.repay(position.loanAsset, totalDebt, msg.sender);
        
        // Transfer collateral to liquidator
        uint256 collateralToLiquidator = (liquidatorReward * position.collateralAmount) / collateralValue;
        IERC20(position.collateralAsset).safeTransfer(msg.sender, collateralToLiquidator);
        
        // Return remaining collateral to borrower (if any)
        uint256 remainingCollateral = position.collateralAmount - collateralToLiquidator;
        if (remainingCollateral > 0) {
            IERC20(position.collateralAsset).safeTransfer(position.borrower, remainingCollateral);
        }
        
        // Close position
        position.isActive = false;
        accruedInterest[positionId] = 0;
        
        emit PositionLiquidated(positionId, msg.sender);
    }
    
    /**
     * @dev ⚡ ENHANCED: Centralized liquidation check with emergency coordination
     */
    function canLiquidate(uint256 positionId) public view override returns (bool) {
        LoanPosition memory position = positions[positionId];
        if (!position.isActive) {
            return false;
        }
        
        // ⚡ PRIORITY 1: Check emergency registry first (centralized control)
        if (address(emergencyRegistry) != address(0)) {
            (bool isEmergency, uint256 emergencyRatio) = emergencyRegistry.isAssetInEmergency(position.collateralAsset);
            
            if (isEmergency) {
                // 🚨 EMERGENCY MODE: Use emergency ratio for liquidation
                try this.getCollateralizationRatio(positionId) returns (uint256 currentRatio) {
                    return currentRatio < emergencyRatio;
                } catch {
                    // If ratio calculation fails during emergency, assume liquidatable
                    return true;
                }
            }
        }
        
        // ⚡ PRIORITY 2: Normal liquidation check using asset handler
        try this.getCollateralizationRatio(positionId) returns (uint256 currentRatio) {
            // Get liquidation threshold from asset handler
            IAssetHandler collateralHandler = _getAssetHandler(position.collateralAsset);
            IAssetHandler.AssetConfig memory config = collateralHandler.getAssetConfig(position.collateralAsset);
            
            // ⚡ ENHANCED: Use emergency registry for effective ratio calculation
            uint256 effectiveRatio = config.liquidationRatio;
            if (address(emergencyRegistry) != address(0)) {
                effectiveRatio = emergencyRegistry.getEffectiveLiquidationRatio(
                    position.collateralAsset, 
                    config.liquidationRatio
                );
            }
            
            // ✅ ENHANCED: Additional safety check for minimum ratio
            require(effectiveRatio > 0, "Invalid liquidation ratio");
            
            // Use effective threshold (considers emergency states)
            return currentRatio < effectiveRatio;
        } catch {
            // If ratio calculation fails, don't allow liquidation
            return false;
        }
    }
    
    /**
     * @dev Updates interest for a position
     */
    function updateInterest(uint256 positionId) public override {
        LoanPosition storage position = positions[positionId];
        require(position.isActive, "Position not active");
        
        if (position.lastInterestUpdate == block.timestamp) {
            return; // Already updated this block
        }
        
        uint256 timeElapsed = block.timestamp - position.lastInterestUpdate;
        uint256 interestAmount = (position.loanAmount * position.interestRate * timeElapsed) / (365 * 24 * 3600 * 1000000);
        
        accruedInterest[positionId] += interestAmount;
        position.lastInterestUpdate = block.timestamp;
        
        emit InterestUpdated(positionId, interestAmount);
    }
    
    /**
     * @dev Gets position details
     */
    function getPosition(uint256 positionId) external view override returns (LoanPosition memory) {
        return positions[positionId];
    }
    
    /**
     * @dev Gets current collateralization ratio - NO MINIMUM ENFORCED
     */
    function getCollateralizationRatio(uint256 positionId) external view override returns (uint256) {
        LoanPosition memory position = positions[positionId];
        if (!position.isActive || position.loanAmount == 0) {
            return type(uint256).max;
        }
        
        uint256 collateralValue = _getAssetValue(position.collateralAsset, position.collateralAmount);
        uint256 totalDebt = getTotalDebt(positionId);
        uint256 debtValue = _getAssetValue(position.loanAsset, totalDebt);
        
        if (debtValue == 0) return type(uint256).max;
        
        return (collateralValue * 1000000) / debtValue;
    }
    
    /**
     * @dev Gets maximum borrowable amount - BASED ON LIQUIDITY ONLY
     */
    function getMaxBorrowAmount(
        address /* collateralAsset */,
        address loanAsset,
        uint256 /* collateralAmount */
    ) external view override returns (uint256) {
        // ✅ NO RATIO LIMITS! Return available liquidity only
        IAssetHandler loanHandler = _getAssetHandler(loanAsset);
        return loanHandler.getAvailableLiquidity(loanAsset);
    }
    
    /**
     * @dev Gets accrued interest for a position
     */
    function getAccruedInterest(uint256 positionId) external view override returns (uint256) {
        LoanPosition memory position = positions[positionId];
        if (!position.isActive) {
            return 0;
        }
        
        uint256 currentAccrued = accruedInterest[positionId];
        uint256 timeElapsed = block.timestamp - position.lastInterestUpdate;
        uint256 newInterest = (position.loanAmount * position.interestRate * timeElapsed) / (365 * 24 * 3600 * 1000000);
        
        return currentAccrued + newInterest;
    }
    
    /**
     * @dev Gets total debt (principal + interest) for a position
     */
    function getTotalDebt(uint256 positionId) public view override returns (uint256) {
        LoanPosition memory position = positions[positionId];
        if (!position.isActive) {
            return 0;
        }
        
        return position.loanAmount + this.getAccruedInterest(positionId);
    }
    
    /**
     * @dev Gets asset handler for a given asset
     */
    function _getAssetHandler(address asset) internal view returns (IAssetHandler) {
        // Try each asset type to find the correct handler
        for (uint i = 0; i < 3; i++) {
            IAssetHandler.AssetType assetType = IAssetHandler.AssetType(i);
            address handlerAddress = assetHandlers[assetType];
            
            if (handlerAddress != address(0)) {
                IAssetHandler handler = IAssetHandler(handlerAddress);
                if (handler.isAssetSupported(asset)) {
                    return handler;
                }
            }
        }
        
        revert("No handler found for asset");
    }
    
    /**
     * @dev Gets the value of an asset amount in USD (DYNAMIC VERSION)
     */
    function _getAssetValue(address asset, uint256 amount) internal view returns (uint256) {
        // 🎯 PRIORITY 1: Use dynamic price registry if available
        if (address(priceRegistry) != address(0)) {
            try priceRegistry.calculateAssetValue(asset, amount) returns (uint256 value) {
                if (value > 0) {
                    return value;
                }
            } catch {
                // Price registry failed, continue to oracle
            }
        }
        
        // 🎯 PRIORITY 2: Try oracle for real-time prices
        if (address(oracle) != address(0)) {
            try oracle.getPrice(asset, address(0)) returns (uint256 price) {
                if (price > 0) {
                    // 🔧 FIX: Use correct decimals instead of assuming 18
                    uint256 decimals = _getTokenDecimals(asset);
                    return (amount * price) / (10 ** decimals);
                }
            } catch {
                // Oracle failed, continue to fallback
            }
        }
        
        // 🎯 PRIORITY 3: Emergency fallback - assume 1:1 ratio
        // This should only happen in extreme cases
        return amount;
    }
    
    /**
     * @dev Gets token decimals, with fallback to 18
     */
    function _getTokenDecimals(address token) internal view returns (uint256) {
        try IERC20Metadata(token).decimals() returns (uint8 decimals) {
            return decimals;
        } catch {
            return 18; // Default fallback
        }
    }
    
    /**
     * @dev Gets user's positions
     */
    function getUserPositions(address user) external view returns (uint256[] memory) {
        return userPositions[user];
    }
    
    /**
     * @dev Sets protocol fee
     */
    function setProtocolFee(uint256 _fee) external onlyOwner {
        require(_fee <= 100000, "Fee too high"); // Max 10%
        protocolFee = _fee;
    }
    
    /**
     * @dev Sets liquidation bonus
     */
    function setLiquidationBonus(uint256 _bonus) external onlyOwner {
        require(_bonus <= 200000, "Bonus too high"); // Max 20%
        liquidationBonus = _bonus;
    }
    
    /**
     * @dev Sets fee collector
     */
    function setFeeCollector(address _collector) external onlyOwner {
        require(_collector != address(0), "Invalid address");
        feeCollector = _collector;
    }
    
    /**
     * @dev Sets price registry (for dynamic pricing)
     */
    function setPriceRegistry(address _priceRegistry) external onlyOwner {
        priceRegistry = IPriceRegistry(_priceRegistry);
    }
    
    /**
     * @dev ⚡ NEW: Sets emergency registry (for centralized emergency coordination)
     */
    function setEmergencyRegistry(address _emergencyRegistry) external onlyOwner {
        emergencyRegistry = IEmergencyRegistry(_emergencyRegistry);
    }
    
    /**
     * @dev ⚡ NEW: Emergency function to activate emergency mode for multiple assets
     * This coordinates with VaultBasedHandler emergency modes!
     */
    function activateEmergencyMode(
        address[] calldata assets,
        string calldata reason
    ) external onlyOwner {
        require(address(emergencyRegistry) != address(0), "Emergency registry not set");
        
        // Activate emergency mode in the centralized registry
        for (uint256 i = 0; i < assets.length; i++) {
            emergencyRegistry.setAssetEmergencyLevel(
                assets[i],
                IEmergencyRegistry.EmergencyLevel.EMERGENCY,
                2000000, // 200% ratio - makes most positions liquidatable
                reason
            );
        }
    }
    
    /**
     * @dev ⚡ NEW: Emergency function to resolve emergency mode for multiple assets
     */
    function resolveEmergencyMode(
        address[] calldata assets,
        string calldata reason
    ) external onlyOwner {
        require(address(emergencyRegistry) != address(0), "Emergency registry not set");
        
        // Resolve emergency mode in the centralized registry
        for (uint256 i = 0; i < assets.length; i++) {
            emergencyRegistry.setAssetEmergencyLevel(
                assets[i],
                IEmergencyRegistry.EmergencyLevel.NONE,
                0,
                reason
            );
        }
    }
    
    // Events
    event LoanIncreased(uint256 indexed positionId, uint256 additionalAmount);
    
    /**
     * @dev Emergency withdrawal function (only owner, only if paused)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(paused, "Only available when paused");
        IERC20(token).safeTransfer(msg.sender, amount);
    }
    
    // ========== REWARD SYSTEM IMPLEMENTATION ==========
    
    /**
     * @dev Updates rewards for a user based on their collateral activity
     */
    function updateUserRewards(address user, uint256 amount, bool isIncrease) external override {
        require(msg.sender == address(this), "Only self can update rewards");
        if (address(rewardDistributor) != address(0)) {
            rewardDistributor.updateStake(REWARD_POOL_ID, user, amount, isIncrease);
            emit RewardsUpdated(user, amount, REWARD_POOL_ID);
        }
    }
    
    /**
     * @dev Gets pending rewards for a user
     */
    function getPendingRewards(address user) external view override returns (uint256) {
        if (address(rewardDistributor) == address(0)) return 0;
        return rewardDistributor.pendingRewards(REWARD_POOL_ID, user);
    }
    
    /**
     * @dev Claims rewards for the caller
     */
    function claimRewards() external override returns (uint256) {
        require(address(rewardDistributor) != address(0), "Reward distributor not set");
        
        uint256 pending = rewardDistributor.pendingRewards(REWARD_POOL_ID, msg.sender);
        if (pending > 0) {
            rewardDistributor.claimRewards(REWARD_POOL_ID);
            emit RewardsClaimed(msg.sender, pending, REWARD_POOL_ID);
        }
        return pending;
    }
    
    /**
     * @dev Gets the reward pool ID for this contract
     */
    function getRewardPoolId() external pure override returns (bytes32) {
        return REWARD_POOL_ID;
    }
    
    /**
     * @dev Gets reward distributor address
     */
    function getRewardDistributor() external view override returns (address) {
        return address(rewardDistributor);
    }
    
    /**
     * @dev Sets the reward distributor (only owner)
     */
    function setRewardDistributor(address distributor) external override onlyOwner {
        rewardDistributor = RewardDistributor(distributor);
    }
    
    /**
     * @dev Internal function to update rewards when collateral changes
     */
    function _updateCollateralRewards(address user, uint256 amount, bool isIncrease) internal {
        if (address(rewardDistributor) != address(0)) {
            rewardDistributor.updateStake(REWARD_POOL_ID, user, amount, isIncrease);
            emit RewardsUpdated(user, amount, REWARD_POOL_ID);
        }
    }
    
    // ========== AUTOMATION INTERFACE IMPLEMENTATION ==========
    
    /**
     * @dev Gets the total number of active positions
     */
    function getTotalActivePositions() external view override returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i < nextPositionId; i++) {
            if (positions[i].isActive) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @dev Gets positions in a specific range for batch processing
     */
    function getPositionsInRange(uint256 startIndex, uint256 endIndex) 
        external view override returns (uint256[] memory positionIds) {
        
        require(startIndex <= endIndex, "Invalid range");
        
        // Count active positions in range first
        uint256 count = 0;
        for (uint256 i = startIndex; i <= endIndex && i < nextPositionId; i++) {
            if (positions[i].isActive) {
                count++;
            }
        }
        
        // Create array with exact size
        positionIds = new uint256[](count);
        uint256 index = 0;
        
        // Fill array with active position IDs
        for (uint256 i = startIndex; i <= endIndex && i < nextPositionId; i++) {
            if (positions[i].isActive) {
                positionIds[index] = i;
                index++;
            }
        }
    }
    
    /**
     * @dev Checks if a position is at risk of liquidation
     */
    function isPositionAtRisk(uint256 positionId) 
        external view override returns (bool isAtRisk, uint256 riskLevel) {
        
        if (!positions[positionId].isActive) {
            return (false, 0);
        }
        
        try this.getCollateralizationRatio(positionId) returns (uint256 currentRatio) {
            // Get liquidation threshold
            LoanPosition memory position = positions[positionId];
            IAssetHandler collateralHandler = _getAssetHandler(position.collateralAsset);
            IAssetHandler.AssetConfig memory config = collateralHandler.getAssetConfig(position.collateralAsset);
            
            uint256 liquidationThreshold = config.liquidationRatio;
            
            if (currentRatio <= liquidationThreshold) {
                // Position is liquidatable
                riskLevel = 100; // Critical risk
                isAtRisk = true;
            } else if (currentRatio <= liquidationThreshold + 200000) { // Within 20% of liquidation
                // Position is at high risk
                riskLevel = 85;
                isAtRisk = true;
            } else if (currentRatio <= liquidationThreshold + 500000) { // Within 50% of liquidation
                // Position is at moderate risk
                riskLevel = 60;
                isAtRisk = false; // Not yet liquidatable, just monitor
            } else {
                // Position is safe
                riskLevel = 10;
                isAtRisk = false;
            }
        } catch {
            // If ratio calculation fails, assume at risk for safety
            return (true, 100);
        }
    }
    
    /**
     * @dev Performs automated liquidation of a position
     */
    function automatedLiquidation(uint256 positionId) 
        external override returns (bool success, uint256 liquidatedAmount) {
        
        require(automationEnabled, "Automation disabled");
        require(msg.sender == authorizedAutomationContract, "Unauthorized automation caller");
        
        // Check if position can be liquidated
        require(canLiquidate(positionId), "Position not liquidatable");
        
        LoanPosition storage position = positions[positionId];
        uint256 totalDebt = getTotalDebt(positionId);
        
        try this.liquidatePosition(positionId) {
            success = true;
            liquidatedAmount = totalDebt;
        } catch {
            success = false;
            liquidatedAmount = 0;
        }
    }
    
    /**
     * @dev 🤖 NEW: Vault-funded automated liquidation
     * Uses VaultBasedHandler liquidity to fund liquidations automatically
     */
    function vaultFundedAutomatedLiquidation(uint256 positionId) 
        external override(ILoanManager, ILoanAutomation) returns (bool success, uint256 liquidatedAmount) {
        
        require(automationEnabled, "Automation disabled");
        require(msg.sender == authorizedAutomationContract, "Unauthorized automation caller");
        
        // Check if position can be liquidated
        require(canLiquidate(positionId), "Position not liquidatable");
        
        LoanPosition storage position = positions[positionId];
        require(position.isActive, "Position not active");
        
        // Update interest before liquidation
        updateInterest(positionId);
        
        uint256 totalDebt = getTotalDebt(positionId);
        uint256 collateralValue = _getAssetValue(position.collateralAsset, position.collateralAmount);
        
        // Get the vault handler for the loan asset
        IAssetHandler loanHandler = _getAssetHandler(position.loanAsset);
        require(
            loanHandler.getAssetType(position.loanAsset) == IAssetHandler.AssetType.VAULT_BASED,
            "Loan asset must be vault-based for automation funding"
        );
        
        // Cast to VaultBasedHandler to access automation functions
        VaultBasedHandler vaultHandler = VaultBasedHandler(address(loanHandler));
        
        // Try to get funding from vault
        bool fundingSuccess = vaultHandler.automationRepay(
            position.loanAsset,
            totalDebt,
            position.collateralAsset,
            position.collateralAmount,
            position.borrower
        );
        
        if (!fundingSuccess) {
            return (false, 0); // Vault doesn't have enough liquidity
        }
        
        // Calculate liquidation amounts
        uint256 debtValue = _getAssetValue(position.loanAsset, totalDebt);
        uint256 liquidationBonusAmount = (collateralValue * liquidationBonus) / 1000000;
        uint256 liquidatorReward = collateralValue > debtValue + liquidationBonusAmount 
            ? debtValue + liquidationBonusAmount 
            : collateralValue;
        
        // Transfer collateral to vault handler (it provided the funding)
        uint256 collateralToVault = (liquidatorReward * position.collateralAmount) / collateralValue;
        IERC20(position.collateralAsset).safeTransfer(address(vaultHandler), collateralToVault);
        
        // Return remaining collateral to borrower (if any)
        uint256 remainingCollateral = position.collateralAmount - collateralToVault;
        if (remainingCollateral > 0) {
            IERC20(position.collateralAsset).safeTransfer(position.borrower, remainingCollateral);
        }
        
        // Close position
        position.isActive = false;
        accruedInterest[positionId] = 0;
        
        // Note: Vault already received the collateral directly above
        // No need to call automationRecovery as the transfer was direct
        
        emit PositionLiquidated(positionId, msg.sender);
        
        return (true, totalDebt);
    }
    
    /**
     * @dev Gets position health data for automation
     */
    function getPositionHealthData(uint256 positionId) 
        external view override returns (
            address borrower,
            uint256 collateralValue,
            uint256 debtValue,
            uint256 healthFactor
        ) {
        
        LoanPosition memory position = positions[positionId];
        if (!position.isActive) {
            return (address(0), 0, 0, 0);
        }
        
        borrower = position.borrower;
        collateralValue = _getAssetValue(position.collateralAsset, position.collateralAmount);
        
        uint256 totalDebt = getTotalDebt(positionId);
        debtValue = _getAssetValue(position.loanAsset, totalDebt);
        
        // Calculate health factor (higher is better)
        if (debtValue == 0) {
            healthFactor = type(uint256).max;
        } else {
            healthFactor = (collateralValue * 1000000) / debtValue;
        }
    }
    
    /**
     * @dev Checks if automation is enabled
     */
    function isAutomationEnabled() external view override returns (bool) {
        return automationEnabled;
    }
    
    /**
     * @dev Sets the authorized automation contract
     */
    function setAutomationContract(address automationContract) external override onlyOwner {
        authorizedAutomationContract = automationContract;
    }
    
    /**
     * @dev Enables or disables automation
     */
    function setAutomationEnabled(bool enabled) external onlyOwner {
        automationEnabled = enabled;
    }
} 