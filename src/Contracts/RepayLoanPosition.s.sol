// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {FlexibleLoanManager} from "../../src/core/FlexibleLoanManager.sol";
import {ILoanManager} from "../../src/interfaces/ILoanManager.sol";
import {IAssetHandler} from "../../src/interfaces/IAssetHandler.sol";
import {IERC20} from "v4-core/lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

// Interface for mintable tokens
interface IMintable {
    function mint(address to, uint256 amount) external;
}

/**
 * @title RepayLoanPosition
 * @notice Script para repagar préstamos (completo o parcial)
 * @dev Lee direcciones dinámicamente desde deployed-addresses-mock.json
 */
contract RepayLoanPosition is Script {
    
    // Direcciones leídas desde variables de entorno (configuradas por Makefile)
    address public loanManager;
    address public loanToken;       // Token de deuda (USDC por defecto)
    
    // Parámetros del repago
    uint256 public positionId;
    uint256 public repayAmount;     // 0 = repago completo
    bool public repayAll = false;   // Flag para repago completo
    
    function run() external {
        // Leer direcciones desde variables de entorno
        loanManager = vm.envAddress("LOAN_MANAGER_ADDRESS");
        loanToken = vm.envAddress("LOAN_TOKEN_ADDRESS");
        
        // Leer parámetros del repago
        positionId = vm.envUint("POSITION_ID");
        
        // Intentar leer el monto de repago (opcional)
        try vm.envUint("REPAY_AMOUNT") returns (uint256 amount) {
            repayAmount = amount;
            repayAll = (amount == 0);
        } catch {
            repayAll = true; // Por defecto repagar todo
            repayAmount = 0;
        }
        
        console.log("=== Repaying Loan Position ===");
        console.log("Loan Manager:", loanManager);
        console.log("Loan Token:", loanToken);
        console.log("Position ID:", positionId);
        console.log("Repay All:", repayAll);
        if (!repayAll) {
            console.log("Repay Amount:", repayAmount);
        }
        
        // Verificar que la posición existe y está activa
        checkPositionStatus();
        
        // Calcular monto real de repago
        uint256 actualRepayAmount = calculateRepayAmount();
        console.log("Actual Repay Amount:", actualRepayAmount);
        
        // Asegurar que tenemos suficientes tokens
        ensureSufficientTokens(actualRepayAmount);
        
        // Ejecutar el repago
        executeRepayment(actualRepayAmount);
        
        // Verificar estado final
        checkFinalStatus();
        
        console.log("\n=== Repayment Completed Successfully! ===");
    }
    
    /**
     * @dev Verifica el estado actual de la posición
     */
    function checkPositionStatus() internal view {
        console.log("\n=== Checking Position Status ===");
        
        ILoanManager loanMgr = ILoanManager(loanManager);
        ILoanManager.LoanPosition memory position = loanMgr.getPosition(positionId);
        
        require(position.isActive, "Position is not active");
        require(position.borrower != address(0), "Position does not exist");
        
        console.log("Position Details:");
        console.log("  Borrower:", position.borrower);
        console.log("  Collateral Asset:", position.collateralAsset);
        console.log("  Loan Asset:", position.loanAsset);
        console.log("  Collateral Amount:", position.collateralAmount);
        console.log("  Original Loan Amount:", position.loanAmount);
        console.log("  Interest Rate:", position.interestRate);
        console.log("  Created At:", position.createdAt);
        console.log("  Is Active:", position.isActive);
        
        // Mostrar deuda actual
        uint256 totalDebt = loanMgr.getTotalDebt(positionId);
        uint256 accruedInterest = loanMgr.getAccruedInterest(positionId);
        
        console.log("Current Debt Status:");
        console.log("  Principal:", position.loanAmount);
        console.log("  Accrued Interest:", accruedInterest);
        console.log("  Total Debt:", totalDebt);
        
        // Verificar que el loan token coincide
        require(position.loanAsset == loanToken, "Loan token mismatch");
    }
    
    /**
     * @dev Calcula el monto real a repagar
     */
    function calculateRepayAmount() internal view returns (uint256) {
        ILoanManager loanMgr = ILoanManager(loanManager);
        uint256 totalDebt = loanMgr.getTotalDebt(positionId);
        
        if (repayAll || repayAmount == 0) {
            console.log("Repaying full debt amount");
            return totalDebt;
        } else {
            console.log("Repaying specified amount");
            require(repayAmount <= totalDebt, "Repay amount exceeds total debt");
            return repayAmount;
        }
    }
    
    /**
     * @dev Asegura que tenemos suficientes tokens para el repago
     */
    function ensureSufficientTokens(uint256 requiredAmount) internal {
        console.log("\n=== Ensuring Sufficient Tokens ===");
        
        IERC20 token = IERC20(loanToken);
        uint256 currentBalance = token.balanceOf(msg.sender);
        
        console.log("Current token balance:", currentBalance);
        console.log("Required amount:", requiredAmount);
        
        if (currentBalance < requiredAmount) {
            uint256 shortage = requiredAmount - currentBalance;
            console.log("Insufficient balance. Shortage:", shortage);
            console.log("Attempting to mint required tokens...");
            
            vm.startBroadcast();
            
            try IMintable(loanToken).mint(msg.sender, shortage) {
                console.log("Successfully minted", shortage, "tokens");
            } catch Error(string memory reason) {
                console.log("Failed to mint tokens:", reason);
                console.log("You may need to manually obtain tokens");
                revert("Insufficient tokens for repayment");
            }
            
            vm.stopBroadcast();
            
            // Verificar balance final
            uint256 finalBalance = token.balanceOf(msg.sender);
            console.log("Final token balance:", finalBalance);
            require(finalBalance >= requiredAmount, "Still insufficient tokens after minting");
        } else {
            console.log("Sufficient tokens available");
        }
    }
    
    /**
     * @dev Ejecuta el repago del préstamo
     */
    function executeRepayment(uint256 amountToRepay) internal {
        console.log("\n=== Executing Repayment ===");
        
        vm.startBroadcast();
        
        // 🔧 FIXED: Detectar el asset handler correcto para el token de préstamo
        address correctHandler = _detectAssetHandler(loanToken);
        console.log("Detected asset handler:", correctHandler);
        
        IERC20 token = IERC20(loanToken);
        
        // 💡 DOUBLE APPROVAL: Aprobar tokens tanto al asset handler como al loan manager
        // El loan manager necesita allowance para cobrar fees de interés
        // El asset handler necesita allowance para el repago principal
        
        uint256 allowanceToHandler = token.allowance(msg.sender, correctHandler);
        uint256 allowanceToManager = token.allowance(msg.sender, loanManager);
        
        // Aprobar al asset handler para el repago principal
        if (allowanceToHandler < amountToRepay) {
            console.log("Approving token transfer to asset handler...");
            token.approve(correctHandler, amountToRepay);
            console.log("Approved", amountToRepay, "tokens to asset handler:", correctHandler);
        } else {
            console.log("Sufficient allowance exists for asset handler");
        }
        
        // Aprobar al loan manager para fees de interés (cantidad generosa)
        uint256 feeAllowance = amountToRepay / 10; // 10% buffer para fees
        if (allowanceToManager < feeAllowance) {
            console.log("Approving token transfer to loan manager for fees...");
            token.approve(loanManager, feeAllowance);
            console.log("Approved", feeAllowance, "tokens to loan manager:", loanManager);
        } else {
            console.log("Sufficient allowance exists for loan manager fees");
        }
        
        // Ejecutar el repago a través del loan manager (que internamente usa el asset handler)
        console.log("Executing repayment of", amountToRepay, "tokens...");
        ILoanManager loanMgr = ILoanManager(loanManager);
        loanMgr.repayLoan(positionId, amountToRepay);
        
        console.log("Repayment executed successfully!");
        
        vm.stopBroadcast();
    }
    
    /**
     * @dev Detecta qué asset handler maneja el token especificado
     */
    function _detectAssetHandler(address token) internal view returns (address) {
        // Leer las direcciones de los asset handlers desde variables de entorno
        address flexibleHandler = vm.envAddress("FLEXIBLE_ASSET_HANDLER_ADDRESS");
        address vaultHandler = vm.envAddress("VAULT_BASED_HANDLER_ADDRESS");
        address mintableHandler = vm.envAddress("MINTABLE_BURNABLE_HANDLER_ADDRESS");
        
        // Probar cada handler para ver cuál soporta el token
        try IAssetHandler(flexibleHandler).isAssetSupported(token) returns (bool supported) {
            if (supported) {
                console.log("Token managed by FlexibleAssetHandler");
                return flexibleHandler;
            }
        } catch {
            console.log("FlexibleAssetHandler check failed");
        }
        
        try IAssetHandler(vaultHandler).isAssetSupported(token) returns (bool supported) {
            if (supported) {
                console.log("Token managed by VaultBasedHandler");
                return vaultHandler;
            }
        } catch {
            console.log("VaultBasedHandler check failed");
        }
        
        try IAssetHandler(mintableHandler).isAssetSupported(token) returns (bool supported) {
            if (supported) {
                console.log("Token managed by MintableBurnableHandler");
                return mintableHandler;
            }
        } catch {
            console.log("MintableBurnableHandler check failed");
        }
        
        revert("No asset handler found for loan token");
    }
    
    /**
     * @dev Verifica el estado final después del repago
     */
    function checkFinalStatus() internal view {
        console.log("\n=== Final Status Check ===");
        
        ILoanManager loanMgr = ILoanManager(loanManager);
        ILoanManager.LoanPosition memory position = loanMgr.getPosition(positionId);
        
        console.log("Position Status After Repayment:");
        console.log("  Is Active:", position.isActive);
        console.log("  Remaining Loan Amount:", position.loanAmount);
        
        if (position.isActive) {
            uint256 remainingDebt = loanMgr.getTotalDebt(positionId);
            uint256 remainingInterest = loanMgr.getAccruedInterest(positionId);
            
            console.log("  Remaining Total Debt:", remainingDebt);
            console.log("  Remaining Interest:", remainingInterest);
            
            // Mostrar ratio de colateralización si aún tiene deuda
            if (remainingDebt > 0) {
                uint256 ratio = loanMgr.getCollateralizationRatio(positionId);
                console.log("  Collateralization Ratio:", ratio);
                
                bool canLiquidate = loanMgr.canLiquidate(positionId);
                console.log("  Can be liquidated:", canLiquidate);
            }
        } else {
            console.log("  Position fully repaid and closed!");
            console.log("  Collateral returned to borrower");
        }
        
        // Mostrar balance final del usuario
        IERC20 token = IERC20(loanToken);
        uint256 finalBalance = token.balanceOf(msg.sender);
        console.log("  User's final token balance:", finalBalance);
    }
    
    /**
     * @dev Función auxiliar para repagar una posición específica con monto específico
     */
    function repaySpecificAmount(uint256 _positionId, uint256 _amount) external {
        positionId = _positionId;
        repayAmount = _amount;
        repayAll = (_amount == 0);
        
        // Leer direcciones desde variables de entorno
        loanManager = vm.envAddress("LOAN_MANAGER_ADDRESS");
        loanToken = vm.envAddress("LOAN_TOKEN_ADDRESS");
        
        console.log("Repaying position", _positionId, "with amount", _amount);
        
        checkPositionStatus();
        uint256 actualAmount = calculateRepayAmount();
        ensureSufficientTokens(actualAmount);
        executeRepayment(actualAmount);
        checkFinalStatus();
    }
    
    /**
     * @dev Función para obtener información de deuda sin ejecutar repago
     */
    function getDebtInfo(uint256 _positionId) external {
        positionId = _positionId;
        loanManager = vm.envAddress("LOAN_MANAGER_ADDRESS");
        
        console.log("=== Debt Information for Position", _positionId, "===");
        
        ILoanManager loanMgr = ILoanManager(loanManager);
        ILoanManager.LoanPosition memory position = loanMgr.getPosition(positionId);
        
        if (!position.isActive) {
            console.log("Position is not active or does not exist");
            return;
        }
        
        uint256 totalDebt = loanMgr.getTotalDebt(positionId);
        uint256 accruedInterest = loanMgr.getAccruedInterest(positionId);
        
        console.log("Borrower:", position.borrower);
        console.log("Original Loan Amount:", position.loanAmount);
        console.log("Accrued Interest:", accruedInterest);
        console.log("Total Debt to Repay:", totalDebt);
        console.log("Loan Asset:", position.loanAsset);
        
        // Calcular información útil
        if (position.loanAmount > 0) {
            uint256 interestPercentage = (accruedInterest * 100) / position.loanAmount;
            console.log("Interest Percentage:", interestPercentage, "%");
        }
        
        // Mostrar tiempo transcurrido
        uint256 timeElapsed = block.timestamp - position.createdAt;
        console.log("Days since creation:", timeElapsed / 86400);
    }
    
    /**
     * @dev Función para ver todas las posiciones de un usuario
     */
    function getUserPositions() external {
        loanManager = vm.envAddress("LOAN_MANAGER_ADDRESS");
        address user = msg.sender;
        
        console.log("=== User Positions for", user, "===");
        
        FlexibleLoanManager loanMgr = FlexibleLoanManager(loanManager);
        uint256[] memory positions = loanMgr.getUserPositions(user);
        
        console.log("Total positions:", positions.length);
        
        for (uint256 i = 0; i < positions.length; i++) {
            uint256 pid = positions[i];
            ILoanManager.LoanPosition memory position = loanMgr.getPosition(pid);
            
            if (position.isActive) {
                uint256 totalDebt = loanMgr.getTotalDebt(pid);
                console.log("");
                console.log("Position ID:", pid);
                console.log("  Collateral:", position.collateralAmount, "of", position.collateralAsset);
                console.log("  Total Debt:", totalDebt, "of", position.loanAsset);
                console.log("  Status: Active");
            }
        }
    }
} 