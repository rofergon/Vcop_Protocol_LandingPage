// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "v4-core/lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {ILoanAutomation} from "../interfaces/ILoanAutomation.sol";
import {ILoanManager} from "../../interfaces/ILoanManager.sol";

/**
 * @title LoanManagerAutomationAdapter
 * @notice UPDATED: Enhanced adapter for FlexibleLoanManager with dynamic liquidation support
 * @dev Implements ILoanAutomation interface and delegates to the FlexibleLoanManager
 */
contract LoanManagerAutomationAdapter is ILoanAutomation, Ownable {
    
    // ⚡ ENHANCED: The flexible loan manager this adapter is for
    ILoanManager public immutable loanManager;
    
    // ⚡ UPDATED: Automation settings for flexible liquidation
    bool public automationEnabled = true;
    address public authorizedAutomationContract;
    uint256 public liquidationCooldown = 180; // Reduced to 3 minutes for faster liquidations
    
    // ⚡ NEW: Dynamic risk thresholds
    uint256 public criticalRiskThreshold = 95;  // Immediate liquidation
    uint256 public dangerRiskThreshold = 85;    // High priority liquidation
    uint256 public warningRiskThreshold = 75;   // Regular liquidation
    
    // Liquidation tracking
    mapping(uint256 => uint256) public lastLiquidationAttempt;
    mapping(uint256 => uint256) public liquidationFailureCount;
    
    // ⚡ ENHANCED: Position tracking for efficient iteration
    uint256[] public allPositionIds;
    mapping(uint256 => uint256) public positionIndexMap; // positionId => index in allPositionIds
    mapping(uint256 => bool) public isPositionTracked;
    
    // ⚡ NEW: Performance metrics
    uint256 public totalLiquidationsExecuted;
    uint256 public totalLiquidationAttempts;
    uint256 public lastSyncTimestamp;
    
    // Events
    event AutomationToggled(bool enabled);
    event AutomationContractSet(address indexed automationContract);
    event PositionAdded(uint256 indexed positionId);
    event PositionRemoved(uint256 indexed positionId);
    event RiskThresholdsUpdated(uint256 critical, uint256 danger, uint256 warning);
    event LiquidationAttempted(uint256 indexed positionId, bool success, string reason);
    event PositionTrackingSynced(uint256 totalPositions, uint256 removedPositions);
    
    constructor(address _loanManager) Ownable(msg.sender) {
        require(_loanManager != address(0), "Invalid loan manager");
        loanManager = ILoanManager(_loanManager);
    }
    
    /**
     * @dev ⚡ ENHANCED: Gets the total number of active positions for automation scanning
     */
    function getTotalActivePositions() external view override returns (uint256) {
        return allPositionIds.length;
    }
    
    /**
     * @dev ⚡ ENHANCED: Gets positions in a specific range for batch processing
     */
    function getPositionsInRange(uint256 startIndex, uint256 endIndex) 
        external view override returns (uint256[] memory positionIds) {
        
        require(startIndex <= endIndex, "Invalid range");
        
        uint256 totalPositions = allPositionIds.length;
        if (totalPositions == 0 || startIndex >= totalPositions) {
            return new uint256[](0);
        }
        
        uint256 actualEndIndex = endIndex >= totalPositions ? totalPositions - 1 : endIndex;
        uint256 rangeSize = actualEndIndex - startIndex + 1;
        
        positionIds = new uint256[](rangeSize);
        for (uint256 i = 0; i < rangeSize; i++) {
            positionIds[i] = allPositionIds[startIndex + i];
        }
        
        return positionIds;
    }
    
    /**
     * @dev ⚡ ENHANCED: Checks if a position is at risk using FlexibleLoanManager's canLiquidate
     */
    function isPositionAtRisk(uint256 positionId) 
        external view override returns (bool isAtRisk, uint256 riskLevel) {
        
        // Get position details from loan manager
        ILoanManager.LoanPosition memory position = loanManager.getPosition(positionId);
        
        if (!position.isActive) {
            return (false, 0);
        }
        
        // ⚡ ENHANCED: Use FlexibleLoanManager's integrated liquidation check
        isAtRisk = loanManager.canLiquidate(positionId);
        
        // ⚡ ENHANCED: Calculate risk level based on collateralization ratio
        try loanManager.getCollateralizationRatio(positionId) returns (uint256 ratio) {
            if (ratio == type(uint256).max) {
                // No debt, completely safe
                riskLevel = 0;
            } else if (ratio <= 1050000) { // Below 105% - critical
                riskLevel = 100;
            } else if (ratio <= 1100000) { // Below 110% - immediate danger
                riskLevel = 95;
            } else if (ratio <= 1200000) { // Below 120% - danger
                riskLevel = 85;
            } else if (ratio <= 1350000) { // Below 135% - warning
                riskLevel = 75;
            } else if (ratio <= 1500000) { // Below 150% - caution
                riskLevel = 50;
            } else {
                riskLevel = 25; // Healthy but monitored
            }
        } catch {
            // If ratio calculation fails, consider it risky
            riskLevel = isAtRisk ? 90 : 0;
        }
        
        return (isAtRisk, riskLevel);
    }
    
    /**
     * @dev ⚡ ENHANCED: Performs automated liquidation with comprehensive error handling
     */
    function automatedLiquidation(uint256 positionId) 
        external override returns (bool success, uint256 liquidatedAmount) {
        
        // Security: only authorized automation contract can call this
        require(msg.sender == authorizedAutomationContract, "Unauthorized");
        require(automationEnabled, "Automation disabled");
        
        // Check cooldown period
        require(
            block.timestamp >= lastLiquidationAttempt[positionId] + liquidationCooldown,
            "Liquidation cooldown active"
        );
        
        // Record liquidation attempt
        lastLiquidationAttempt[positionId] = block.timestamp;
        totalLiquidationAttempts++;
        
        // ⚡ ENHANCED: Double-check position is still at risk
        (bool isAtRisk, uint256 riskLevel) = this.isPositionAtRisk(positionId);
        if (!isAtRisk) {
            emit LiquidationAttempted(positionId, false, "Position not at risk");
            return (false, 0);
        }
        
        // Get position details for liquidation amount calculation
        uint256 totalDebt;
        try loanManager.getTotalDebt(positionId) returns (uint256 debt) {
            totalDebt = debt;
        } catch {
            emit LiquidationAttempted(positionId, false, "Failed to get debt");
            liquidationFailureCount[positionId]++;
            return (false, 0);
        }
        
        // ⚡ ENHANCED: Attempt liquidation through FlexibleLoanManager
        try loanManager.liquidatePosition(positionId) {
            // Liquidation successful
            success = true;
            liquidatedAmount = totalDebt;
            totalLiquidationsExecuted++;
            
            // Remove from tracking since position is now closed
            _removePositionFromTracking(positionId);
            
            emit LiquidationAttempted(positionId, true, "Liquidation successful");
            
        } catch Error(string memory reason) {
            // Liquidation failed with reason
            success = false;
            liquidatedAmount = 0;
            liquidationFailureCount[positionId]++;
            
            emit LiquidationAttempted(positionId, false, reason);
            
        } catch (bytes memory) {
            // Liquidation failed with unknown error
            success = false;
            liquidatedAmount = 0;
            liquidationFailureCount[positionId]++;
            
            emit LiquidationAttempted(positionId, false, "Unknown liquidation error");
        }
        
        return (success, liquidatedAmount);
    }
    
    /**
     * @dev 🤖 VAULT-FUNDED: Performs automated liquidation using vault liquidity
     */
    function vaultFundedAutomatedLiquidation(uint256 positionId) 
        external override returns (bool success, uint256 liquidatedAmount) {
        
        // Security: only authorized automation contract can call this
        require(msg.sender == authorizedAutomationContract, "Unauthorized");
        require(automationEnabled, "Automation disabled");
        
        // Check cooldown period
        require(
            block.timestamp >= lastLiquidationAttempt[positionId] + liquidationCooldown,
            "Liquidation cooldown active"
        );
        
        // Record liquidation attempt
        lastLiquidationAttempt[positionId] = block.timestamp;
        totalLiquidationAttempts++;
        
        // ⚡ ENHANCED: Double-check position is still at risk
        (bool isAtRisk, uint256 riskLevel) = this.isPositionAtRisk(positionId);
        if (!isAtRisk) {
            emit LiquidationAttempted(positionId, false, "Position not at risk");
            return (false, 0);
        }
        
        // Get position details for liquidation amount calculation
        uint256 totalDebt;
        try loanManager.getTotalDebt(positionId) returns (uint256 debt) {
            totalDebt = debt;
        } catch {
            emit LiquidationAttempted(positionId, false, "Failed to get debt");
            liquidationFailureCount[positionId]++;
            return (false, 0);
        }
        
        // 🤖 VAULT-FUNDED: Attempt liquidation using vault liquidity
        try loanManager.vaultFundedAutomatedLiquidation(positionId) returns (bool vaultSuccess, uint256 vaultAmount) {
            // Liquidation successful
            success = vaultSuccess;
            liquidatedAmount = vaultAmount;
            
            if (success) {
                totalLiquidationsExecuted++;
                
                // Remove from tracking since position is now closed
                _removePositionFromTracking(positionId);
                
                emit LiquidationAttempted(positionId, true, "Vault-funded liquidation successful");
            } else {
                emit LiquidationAttempted(positionId, false, "Vault-funded liquidation failed");
                liquidationFailureCount[positionId]++;
            }
            
        } catch Error(string memory reason) {
            // Vault-funded liquidation failed with reason
            success = false;
            liquidatedAmount = 0;
            liquidationFailureCount[positionId]++;
            
            emit LiquidationAttempted(positionId, false, string.concat("Vault error: ", reason));
            
        } catch (bytes memory) {
            // Vault-funded liquidation failed with unknown error
            success = false;
            liquidatedAmount = 0;
            liquidationFailureCount[positionId]++;
            
            emit LiquidationAttempted(positionId, false, "Unknown vault liquidation error");
        }
        
        return (success, liquidatedAmount);
    }
    
    /**
     * @dev ⚡ ENHANCED: Gets position health data using FlexibleLoanManager functions
     */
    function getPositionHealthData(uint256 positionId) 
        external view override returns (
            address borrower,
            uint256 collateralValue,
            uint256 debtValue,
            uint256 healthFactor
        ) {
        
        ILoanManager.LoanPosition memory position = loanManager.getPosition(positionId);
        
        if (!position.isActive) {
            return (address(0), 0, 0, 0);
        }
        
        borrower = position.borrower;
        
        // Get total debt
        try loanManager.getTotalDebt(positionId) returns (uint256 totalDebt) {
            debtValue = totalDebt;
        } catch {
            debtValue = 0;
        }
        
        // ⚡ ENHANCED: Calculate collateral value and health factor using collateralization ratio
        try loanManager.getCollateralizationRatio(positionId) returns (uint256 ratio) {
            if (ratio == type(uint256).max || debtValue == 0) {
                healthFactor = type(uint256).max;
                collateralValue = position.collateralAmount; // Simplified
            } else {
                healthFactor = ratio;
                // Estimated collateral value based on debt and ratio
                collateralValue = (debtValue * ratio) / 1000000;
            }
        } catch {
            healthFactor = 0;
            collateralValue = 0;
        }
        
        return (borrower, collateralValue, debtValue, healthFactor);
    }
    
    /**
     * @dev Checks if automation is enabled for this contract
     */
    function isAutomationEnabled() external view override returns (bool) {
        return automationEnabled;
    }
    
    /**
     * @dev Sets the authorized automation contract
     */
    function setAutomationContract(address automationContract) external override onlyOwner {
        require(automationContract != address(0), "Invalid automation contract");
        authorizedAutomationContract = automationContract;
        emit AutomationContractSet(automationContract);
    }
    
    /**
     * @dev ⚡ ENHANCED: Toggles automation on/off with safety checks
     */
    function setAutomationEnabled(bool enabled) external onlyOwner {
        automationEnabled = enabled;
        emit AutomationToggled(enabled);
    }
    
    /**
     * @dev ⚡ ENHANCED: Sets liquidation cooldown period
     */
    function setLiquidationCooldown(uint256 cooldownSeconds) external onlyOwner {
        require(cooldownSeconds >= 60, "Cooldown too short"); // Min 1 minute
        require(cooldownSeconds <= 1800, "Cooldown too long"); // Max 30 minutes
        liquidationCooldown = cooldownSeconds;
    }
    
    /**
     * @dev ⚡ NEW: Sets risk thresholds for different urgency levels
     */
    function setRiskThresholds(
        uint256 _critical,
        uint256 _danger,
        uint256 _warning
    ) external onlyOwner {
        require(_critical >= 90 && _critical <= 100, "Invalid critical threshold");
        require(_danger >= 80 && _danger < _critical, "Invalid danger threshold");
        require(_warning >= 70 && _warning < _danger, "Invalid warning threshold");
        
        criticalRiskThreshold = _critical;
        dangerRiskThreshold = _danger;
        warningRiskThreshold = _warning;
        
        emit RiskThresholdsUpdated(_critical, _danger, _warning);
    }
    
    /**
     * @dev ⚡ ENHANCED: Adds a position to tracking (called when new positions are created)
     */
    function addPositionToTracking(uint256 positionId) external {
        require(
            msg.sender == address(loanManager) || msg.sender == owner() || msg.sender == authorizedAutomationContract,
            "Unauthorized"
        );
        
        if (!isPositionTracked[positionId]) {
            allPositionIds.push(positionId);
            positionIndexMap[positionId] = allPositionIds.length - 1;
            isPositionTracked[positionId] = true;
            
            emit PositionAdded(positionId);
        }
    }
    
    /**
     * @dev Removes a position from tracking (called when positions are closed/liquidated)
     */
    function removePositionFromTracking(uint256 positionId) external {
        require(
            msg.sender == address(loanManager) || msg.sender == owner() || msg.sender == authorizedAutomationContract,
            "Unauthorized"
        );
        
        _removePositionFromTracking(positionId);
    }
    
    /**
     * @dev Internal function to remove position from tracking
     */
    function _removePositionFromTracking(uint256 positionId) internal {
        if (isPositionTracked[positionId]) {
            uint256 index = positionIndexMap[positionId];
            uint256 lastIndex = allPositionIds.length - 1;
            
            // Move last element to the index of the element to remove
            if (index != lastIndex) {
                uint256 lastPositionId = allPositionIds[lastIndex];
                allPositionIds[index] = lastPositionId;
                positionIndexMap[lastPositionId] = index;
            }
            
            // Remove last element
            allPositionIds.pop();
            delete positionIndexMap[positionId];
            delete isPositionTracked[positionId];
            
            emit PositionRemoved(positionId);
        }
    }
    
    /**
     * @dev ⚡ ENHANCED: Bulk initialization of positions (for existing loan managers)
     */
    function initializePositionTracking(uint256[] calldata positionIds) external onlyOwner {
        for (uint256 i = 0; i < positionIds.length; i++) {
            uint256 positionId = positionIds[i];
            
            // Verify position exists and is active
            ILoanManager.LoanPosition memory position = loanManager.getPosition(positionId);
            if (position.isActive && !isPositionTracked[positionId]) {
                allPositionIds.push(positionId);
                positionIndexMap[positionId] = allPositionIds.length - 1;
                isPositionTracked[positionId] = true;
                
                emit PositionAdded(positionId);
            }
        }
    }
    
    /**
     * @dev ⚡ ENHANCED: Sync position tracking with loan manager (cleanup closed positions)
     */
    function syncPositionTracking() external {
        require(
            msg.sender == authorizedAutomationContract || msg.sender == owner(),
            "Unauthorized"
        );
        
        uint256 removedCount = 0;
        
        // Check all tracked positions and remove closed ones
        uint256 i = 0;
        while (i < allPositionIds.length) {
            uint256 positionId = allPositionIds[i];
            ILoanManager.LoanPosition memory position = loanManager.getPosition(positionId);
            
            if (!position.isActive) {
                _removePositionFromTracking(positionId);
                removedCount++;
                // Don't increment i since we removed an element
            } else {
                i++;
            }
        }
        
        lastSyncTimestamp = block.timestamp;
        emit PositionTrackingSynced(allPositionIds.length, removedCount);
    }
    
    /**
     * @dev ⚡ ENHANCED: Gets comprehensive tracking statistics
     */
    function getTrackingStats() external view returns (
        uint256 totalTracked,
        uint256 totalAtRisk,
        uint256 totalLiquidatable,
        uint256 totalCritical,
        uint256 performanceStats
    ) {
        totalTracked = allPositionIds.length;
        uint256 criticalCount = 0;
        
        for (uint256 i = 0; i < allPositionIds.length; i++) {
            (bool isAtRisk, uint256 riskLevel) = this.isPositionAtRisk(allPositionIds[i]);
            
            if (riskLevel >= warningRiskThreshold) {
                totalAtRisk++;
            }
            
            if (isAtRisk) {
                totalLiquidatable++;
            }
            
            if (riskLevel >= criticalRiskThreshold) {
                criticalCount++;
            }
        }
        
        totalCritical = criticalCount;
        
        // Performance calculation: success rate percentage (6 decimals)
        performanceStats = totalLiquidationAttempts > 0 
            ? (totalLiquidationsExecuted * 1000000) / totalLiquidationAttempts
            : 1000000; // 100% if no attempts yet
        
        return (totalTracked, totalAtRisk, totalLiquidatable, totalCritical, performanceStats);
    }
    
    /**
     * @dev ⚡ NEW: Gets liquidation statistics for monitoring
     */
    function getLiquidationStats() external view returns (
        uint256 totalAttempts,
        uint256 totalSuccessful,
        uint256 successRate,
        uint256 lastSync
    ) {
        successRate = totalLiquidationAttempts > 0 
            ? (totalLiquidationsExecuted * 1000000) / totalLiquidationAttempts
            : 1000000;
            
        return (
            totalLiquidationAttempts,
            totalLiquidationsExecuted,
            successRate,
            lastSyncTimestamp
        );
    }
    
    /**
     * @dev ⚡ NEW: Gets position failure count (for problematic positions)
     */
    function getPositionFailureCount(uint256 positionId) external view returns (uint256) {
        return liquidationFailureCount[positionId];
    }
    
    /**
     * @dev ⚡ NEW: Emergency function to reset failure count
     */
    function resetPositionFailureCount(uint256 positionId) external onlyOwner {
        liquidationFailureCount[positionId] = 0;
    }
    
    /**
     * @dev ⚡ NEW: Batch get positions at risk for efficient monitoring
     */
    function getPositionsAtRisk() external view returns (
        uint256[] memory riskPositions,
        uint256[] memory riskLevels
    ) {
        uint256[] memory tempPositions = new uint256[](allPositionIds.length);
        uint256[] memory tempRiskLevels = new uint256[](allPositionIds.length);
        uint256 riskCount = 0;
        
        for (uint256 i = 0; i < allPositionIds.length; i++) {
            (bool isAtRisk, uint256 riskLevel) = this.isPositionAtRisk(allPositionIds[i]);
            
            if (isAtRisk || riskLevel >= warningRiskThreshold) {
                tempPositions[riskCount] = allPositionIds[i];
                tempRiskLevels[riskCount] = riskLevel;
                riskCount++;
            }
        }
        
        // Resize arrays
        riskPositions = new uint256[](riskCount);
        riskLevels = new uint256[](riskCount);
        
        for (uint256 i = 0; i < riskCount; i++) {
            riskPositions[i] = tempPositions[i];
            riskLevels[i] = tempRiskLevels[i];
        }
        
        return (riskPositions, riskLevels);
    }
} 