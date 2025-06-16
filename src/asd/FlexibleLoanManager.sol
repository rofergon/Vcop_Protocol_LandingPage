// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "v4-core/lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "v4-core/lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "v4-core/lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {ILoanManager} from "../interfaces/ILoanManager.sol";
import {IAssetHandler} from "../interfaces/IAssetHandler.sol";
import {IGenericOracle} from "../interfaces/IGenericOracle.sol";

/**
 * @title FlexibleLoanManager
 * @notice ULTRA-FLEXIBLE loan manager - NO ratio limits, only prevents negative values
 * @dev Allows ANY ratio as long as math doesn't break. All risk management in frontend.
 */
contract FlexibleLoanManager is ILoanManager, Ownable {
    using SafeERC20 for IERC20;
    
    // Asset handlers for different types of assets
    mapping(IAssetHandler.AssetType => address) public assetHandlers;
    
    // Oracle for price feeds
    IGenericOracle public oracle;
    
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
    
    constructor(address _oracle, address _feeCollector) Ownable(msg.sender) {
        oracle = IGenericOracle(_oracle);
        feeCollector = _feeCollector;
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
     * @dev FLEXIBLE liquidation check - uses asset handler thresholds but can be overridden
     */
    function canLiquidate(uint256 positionId) public view override returns (bool) {
        LoanPosition memory position = positions[positionId];
        if (!position.isActive) {
            return false;
        }
        
        // Try to get asset handler configuration for guidance
        try this.getCollateralizationRatio(positionId) returns (uint256 currentRatio) {
            // Get liquidation threshold from asset handler
            IAssetHandler collateralHandler = _getAssetHandler(position.collateralAsset);
            IAssetHandler.AssetConfig memory config = collateralHandler.getAssetConfig(position.collateralAsset);
            
            // ✅ FLEXIBLE: Use asset config as guideline, but allow very low ratios
            // Only liquidate if EXTREMELY undercollateralized (e.g., debt > 99% of collateral value)
            return currentRatio < (config.liquidationRatio / 2); // Allow much riskier positions
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
        address collateralAsset,
        address loanAsset,
        uint256 collateralAmount
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
     * @dev Gets the value of an asset amount in USD (or common base)
     */
    function _getAssetValue(address asset, uint256 amount) internal view returns (uint256) {
        try oracle.getPrice(asset, address(0)) returns (uint256 price) {
            return (amount * price) / 1e18; // Assuming 18 decimals
        } catch {
            return amount; // Fallback to 1:1 if oracle fails
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
    
    // Events
    event LoanIncreased(uint256 indexed positionId, uint256 additionalAmount);
    
    /**
     * @dev Emergency withdrawal function (only owner, only if paused)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(paused, "Only available when paused");
        IERC20(token).safeTransfer(msg.sender, amount);
    }
} 