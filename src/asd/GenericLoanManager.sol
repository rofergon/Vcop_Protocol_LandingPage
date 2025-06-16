// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "v4-core/lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "v4-core/lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "v4-core/lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {ILoanManager} from "../interfaces/ILoanManager.sol";
import {IAssetHandler} from "../interfaces/IAssetHandler.sol";
import {IGenericOracle} from "../interfaces/IGenericOracle.sol";

/**
 * @title GenericLoanManager
 * @notice Manages loans with flexible collateral and loan asset combinations
 */
contract GenericLoanManager is ILoanManager, Ownable {
    using SafeERC20 for IERC20;
    
    // Asset handlers for different types of assets
    mapping(IAssetHandler.AssetType => address) public assetHandlers;
    
    // Oracle for price feeds
    IGenericOracle public oracle;
    
    // Loan positions
    mapping(uint256 => LoanPosition) public positions;
    mapping(address => uint256[]) public userPositions;
    uint256 public nextPositionId = 1;
    
    // Risk parameters
    uint256 public constant LIQUIDATION_BONUS = 50000; // 5% bonus for liquidators
    uint256 public constant MAX_LTV = 800000; // 80% maximum loan-to-value
    
    // Protocol fees
    uint256 public protocolFee = 5000; // 0.5% (6 decimals: 0.5% = 5000)
    address public feeCollector;
    
    // Interest management
    mapping(uint256 => uint256) public accruedInterest;
    
    constructor(address _oracle, address _feeCollector) Ownable(msg.sender) {
        oracle = IGenericOracle(_oracle);
        feeCollector = _feeCollector;
    }
    
    /**
     * @dev Sets asset handler for a specific asset type
     */
    function setAssetHandler(IAssetHandler.AssetType assetType, address handler) external onlyOwner {
        require(handler != address(0), "Invalid handler address");
        assetHandlers[assetType] = handler;
    }
    
    /**
     * @dev Creates a new loan position
     */
    function createLoan(LoanTerms calldata terms) external override returns (uint256 positionId) {
        require(terms.collateralAmount > 0, "Invalid collateral amount");
        require(terms.loanAmount > 0, "Invalid loan amount");
        require(terms.collateralAsset != terms.loanAsset, "Collateral and loan assets must be different");
        
        // Get asset handlers
        IAssetHandler collateralHandler = _getAssetHandler(terms.collateralAsset);
        IAssetHandler loanHandler = _getAssetHandler(terms.loanAsset);
        
        // Verify assets are supported
        require(collateralHandler.isAssetSupported(terms.collateralAsset), "Collateral asset not supported");
        require(loanHandler.isAssetSupported(terms.loanAsset), "Loan asset not supported");
        
        // Calculate loan-to-value ratio
        uint256 ltvRatio = _calculateLTV(terms.collateralAsset, terms.loanAsset, terms.collateralAmount, terms.loanAmount);
        require(ltvRatio <= terms.maxLoanToValue, "LTV exceeds maximum");
        require(ltvRatio <= MAX_LTV, "LTV exceeds protocol maximum");
        
        // Check collateral requirements
        IAssetHandler.AssetConfig memory collateralConfig = collateralHandler.getAssetConfig(terms.collateralAsset);
        uint256 requiredCollateralValue = (terms.loanAmount * collateralConfig.collateralRatio) / 1000000;
        uint256 providedCollateralValue = _getAssetValue(terms.collateralAsset, terms.collateralAmount);
        require(providedCollateralValue >= requiredCollateralValue, "Insufficient collateral");
        
        // Check liquidity availability
        require(
            loanHandler.getAvailableLiquidity(terms.loanAsset) >= terms.loanAmount,
            "Insufficient liquidity"
        );
        
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
     * @dev Adds collateral to an existing position
     */
    function addCollateral(uint256 positionId, uint256 amount) external override {
        LoanPosition storage position = positions[positionId];
        require(position.isActive, "Position not active");
        require(position.borrower == msg.sender, "Not position owner");
        require(amount > 0, "Invalid amount");
        
        // Transfer additional collateral
        IERC20(position.collateralAsset).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update position
        position.collateralAmount += amount;
        
        emit CollateralAdded(positionId, amount);
    }
    
    /**
     * @dev Withdraws collateral from a position (if ratio allows)
     */
    function withdrawCollateral(uint256 positionId, uint256 amount) external override {
        LoanPosition storage position = positions[positionId];
        require(position.isActive, "Position not active");
        require(position.borrower == msg.sender, "Not position owner");
        require(amount <= position.collateralAmount, "Insufficient collateral");
        
        // Update interest before checking ratios
        updateInterest(positionId);
        
        // Check if withdrawal maintains adequate collateralization
        uint256 remainingCollateral = position.collateralAmount - amount;
        uint256 totalDebt = getTotalDebt(positionId);
        
        IAssetHandler collateralHandler = _getAssetHandler(position.collateralAsset);
        IAssetHandler.AssetConfig memory config = collateralHandler.getAssetConfig(position.collateralAsset);
        
        uint256 minCollateralValue = (totalDebt * config.collateralRatio) / 1000000;
        uint256 remainingCollateralValue = _getAssetValue(position.collateralAsset, remainingCollateral);
        
        require(remainingCollateralValue >= minCollateralValue, "Withdrawal would breach collateral ratio");
        
        // Update position and transfer collateral
        position.collateralAmount = remainingCollateral;
        IERC20(position.collateralAsset).safeTransfer(msg.sender, amount);
        
        emit CollateralWithdrawn(positionId, amount);
    }
    
    /**
     * @dev Repays part or all of the loan
     */
    function repayLoan(uint256 positionId, uint256 amount) external override {
        LoanPosition storage position = positions[positionId];
        require(position.isActive, "Position not active");
        require(amount > 0, "Invalid amount");
        
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
     * @dev Liquidates an undercollateralized position
     */
    function liquidatePosition(uint256 positionId) external override {
        LoanPosition storage position = positions[positionId];
        require(position.isActive, "Position not active");
        
        // Update interest before liquidation check
        updateInterest(positionId);
        
        require(canLiquidate(positionId), "Position not liquidatable");
        
        uint256 totalDebt = getTotalDebt(positionId);
        uint256 collateralValue = _getAssetValue(position.collateralAsset, position.collateralAmount);
        
        // Calculate liquidation amounts
        uint256 debtToRepay = totalDebt;
        uint256 liquidationBonus = (collateralValue * LIQUIDATION_BONUS) / 1000000;
        uint256 liquidatorReward = collateralValue > debtToRepay + liquidationBonus 
            ? debtToRepay + liquidationBonus 
            : collateralValue;
        
        // Liquidator repays debt
        IAssetHandler loanHandler = _getAssetHandler(position.loanAsset);
        loanHandler.repay(position.loanAsset, debtToRepay, msg.sender);
        
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
     * @dev Gets current collateralization ratio
     */
    function getCollateralizationRatio(uint256 positionId) external view override returns (uint256) {
        LoanPosition memory position = positions[positionId];
        if (!position.isActive || position.loanAmount == 0) {
            return type(uint256).max;
        }
        
        uint256 collateralValue = _getAssetValue(position.collateralAsset, position.collateralAmount);
        uint256 totalDebt = getTotalDebt(positionId);
        
        return (collateralValue * 1000000) / totalDebt;
    }
    
    /**
     * @dev Checks if position can be liquidated
     */
    function canLiquidate(uint256 positionId) public view override returns (bool) {
        LoanPosition memory position = positions[positionId];
        if (!position.isActive) {
            return false;
        }
        
        IAssetHandler collateralHandler = _getAssetHandler(position.collateralAsset);
        IAssetHandler.AssetConfig memory config = collateralHandler.getAssetConfig(position.collateralAsset);
        
        uint256 currentRatio = this.getCollateralizationRatio(positionId);
        return currentRatio < config.liquidationRatio;
    }
    
    /**
     * @dev Gets maximum borrowable amount for given collateral
     */
    function getMaxBorrowAmount(
        address collateralAsset,
        address loanAsset,
        uint256 collateralAmount
    ) external view override returns (uint256) {
        IAssetHandler collateralHandler = _getAssetHandler(collateralAsset);
        IAssetHandler.AssetConfig memory config = collateralHandler.getAssetConfig(collateralAsset);
        
        uint256 collateralValue = _getAssetValue(collateralAsset, collateralAmount);
        uint256 maxLoanValue = (collateralValue * 1000000) / config.collateralRatio;
        
        // Convert to loan asset units
        uint256 loanAssetPrice = oracle.getPrice(loanAsset, collateralAsset);
        return (maxLoanValue * 1000000) / loanAssetPrice;
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
     * @dev Gets the value of an asset amount in terms of a base currency
     */
    function _getAssetValue(address asset, uint256 amount) internal view returns (uint256) {
        // Use a stable reference (like USD) for value calculations
        // For simplicity, we'll use the oracle price directly
        return amount; // This should be expanded to use proper price conversion
    }
    
    /**
     * @dev Calculates loan-to-value ratio
     */
    function _calculateLTV(
        address collateralAsset,
        address loanAsset,
        uint256 collateralAmount,
        uint256 loanAmount
    ) internal view returns (uint256) {
        uint256 collateralValue = _getAssetValue(collateralAsset, collateralAmount);
        uint256 loanValue = _getAssetValue(loanAsset, loanAmount);
        
        return (loanValue * 1000000) / collateralValue;
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
     * @dev Sets fee collector
     */
    function setFeeCollector(address _collector) external onlyOwner {
        require(_collector != address(0), "Invalid address");
        feeCollector = _collector;
    }
} 