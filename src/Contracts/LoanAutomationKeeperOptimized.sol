// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// CORRECTO: Import AutomationCompatible completo (no solo la interfaz)
import {AutomationCompatible} from "lib/chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import {Ownable} from "v4-core/lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {ILoanAutomation} from "../interfaces/ILoanAutomation.sol";
import {IAutomationRegistry} from "../interfaces/IAutomationRegistry.sol";

/**
 * @title LoanAutomationKeeperOptimized 
 * @notice  OPTIMIZED: Chainlink Custom Logic Automation para liquidación de préstamos
 * @dev Correcta implementación según documentación oficial de Chainlink
 * 
 * KEY OPTIMIZATIONS:
 * -  Extiende AutomationCompatible (no solo interfaz) para detección UI
 * -  Lógica simplificada pero efectiva 
 * -  Foco en liquidaciones críticas
 * -  Configuración flexible
 * -  Métricas de rendimiento
 */
contract LoanAutomationKeeperOptimized is AutomationCompatible, Ownable {
    
    // Registry para múltiples loan managers
    IAutomationRegistry public automationRegistry;
    
    //  CONFIGURACIÓN OPTIMIZADA
    uint256 public minRiskThreshold = 85;        // Umbral de riesgo para liquidación
    uint256 public maxPositionsPerBatch = 20;    // Batch optimizado para gas
    uint256 public maxGasPerUpkeep = 2000000;    // Gas máximo por upkeep
    bool public emergencyPause = false;
    
    // PRIORIZACIÓN: Managers con diferentes prioridades
    mapping(address => uint256) public managerPriority; // Mayor número = mayor prioridad
    mapping(address => bool) public registeredManagers;
    address[] public managersList;
    
    //  MÉTRICAS DE RENDIMIENTO
    uint256 public totalLiquidations;
    uint256 public totalUpkeeps;
    uint256 public lastExecutionTimestamp;
    uint256 public totalGasUsed;
    
    //  OPTIMIZACIÓN: Cooldown para evitar spam
    mapping(uint256 => uint256) public lastLiquidationAttempt;
    uint256 public liquidationCooldown = 300; // 5 minutos
    
    //  SEGURIDAD: Chainlink Forwarder
    address public chainlinkForwarder;
    bool public forwarderRestricted = false;
    
    // Events simplificados pero informativos
    event UpkeepPerformed(
        address indexed loanManager,
        uint256 positionsChecked, 
        uint256 liquidationsExecuted, 
        uint256 gasUsed
    );
    event LiquidationExecuted(
        address indexed loanManager, 
        uint256 indexed positionId, 
        uint256 amount
    );
    event ManagerRegistered(address indexed manager, uint256 priority);
    event EmergencyPaused(bool paused);
    event ForwarderSet(address indexed forwarder);
    event ForwarderRestrictionToggled(bool restricted);
    
    constructor(address _automationRegistry) Ownable(msg.sender) {
        require(_automationRegistry != address(0), "Invalid registry address");
        automationRegistry = IAutomationRegistry(_automationRegistry);
    }
    
    /**
     * @dev  CHAINLINK AUTOMATION: checkUpkeep function
     * @param checkData ABI-encoded: (loanManager, startIndex, batchSize)
     * @return upkeepNeeded True si se necesita ejecutar liquidaciones
     * @return performData Datos para performUpkeep
     * 
     * 🔧 IMPORTANT FIX: Este función corrige un problema de mapeo de índices donde:
     * - Los position IDs en FlexibleLoanManager comienzan en 1, no en 0
     * - El startIndex=0 en checkData se convierte automáticamente a startPositionId=1
     * - Esto evita que getPositionsInRange(0,0) regrese un array vacío cuando existe posición ID 1
     */
    function checkUpkeep(
        bytes calldata checkData
    ) external view override returns (bool upkeepNeeded, bytes memory performData) {
        
        //  Emergency pause check
        if (emergencyPause) {
            return (false, bytes(""));
        }
        
        //  Decode checkData
        if (checkData.length == 0) {
            return (false, bytes(""));
        }
        
        try this.decodeCheckData(checkData) returns (
            address loanManager,
            uint256 startIndex,
            uint256 batchSize
        ) {
            // Validar manager está activo (si el registry lo soporta)
            try automationRegistry.isManagerActive(loanManager) returns (bool isActive) {
                if (!isActive) {
                    return (false, bytes(""));
                }
            } catch {
                // Registry no soporta isManagerActive (registry oficial Chainlink), continuar
            }
            
            if (!registeredManagers[loanManager]) {
                return (false, bytes(""));
            }
            
            ILoanAutomation loanAutomation = ILoanAutomation(loanManager);
            
            // Verificar automation habilitada
            if (!loanAutomation.isAutomationEnabled()) {
                return (false, bytes(""));
            }
            
            //  Obtener posiciones
            uint256 totalPositions = loanAutomation.getTotalActivePositions();
            if (totalPositions == 0) {
                return (false, bytes(""));
            }
            
            // ✅ FIXED: Corregir lógica de índices para IDs de posición que comienzan en 1
            // startIndex en checkData debe interpretarse como startPositionId
            uint256 startPositionId = startIndex == 0 ? 1 : startIndex; // IDs comienzan en 1
            
            // OPTIMIZACIÓN: Calcular batch size dinámico
            uint256 optimalBatchSize = _calculateOptimalBatchSize(batchSize, totalPositions);
            uint256 endPositionId = startPositionId + optimalBatchSize - 1;
            
            // ✅ FIXED: No limitar por totalPositions, sino por el rango máximo razonable
            // El loan manager se encarga de filtrar posiciones inactivas
            if (endPositionId > startPositionId + 100) { // Máximo 100 posiciones por batch
                endPositionId = startPositionId + 100;
            }
            
            //  Obtener posiciones en rango (ahora con IDs correctos)
            uint256[] memory positions = loanAutomation.getPositionsInRange(startPositionId, endPositionId);
            
            // Si no hay posiciones en este rango, probar con rango más amplio
            if (positions.length == 0 && startPositionId == 1) {
                // Fallback: buscar en un rango más amplio desde el ID 1
                positions = loanAutomation.getPositionsInRange(1, 50);
            }
            
            //  BUSCAR POSICIONES LIQUIDABLES
            uint256[] memory liquidatablePositions = new uint256[](positions.length);
            uint256[] memory riskLevels = new uint256[](positions.length);
            uint256 liquidatableCount = 0;
            
            for (uint256 i = 0; i < positions.length; i++) {
                uint256 positionId = positions[i];
                
                //  Check cooldown
                if (block.timestamp < lastLiquidationAttempt[positionId] + liquidationCooldown) {
                    continue;
                }
                
                (bool isAtRisk, uint256 riskLevel) = loanAutomation.isPositionAtRisk(positionId);
                
                if (isAtRisk && riskLevel >= minRiskThreshold) {
                    liquidatablePositions[liquidatableCount] = positionId;
                    riskLevels[liquidatableCount] = riskLevel;
                    liquidatableCount++;
                }
            }
            
            if (liquidatableCount == 0) {
                return (false, bytes(""));
            }
            
            //  Preparar performData
            uint256[] memory finalPositions = new uint256[](liquidatableCount);
            uint256[] memory finalRiskLevels = new uint256[](liquidatableCount);
            
            for (uint256 i = 0; i < liquidatableCount; i++) {
                finalPositions[i] = liquidatablePositions[i];
                finalRiskLevels[i] = riskLevels[i];
            }
            
            performData = abi.encode(
                loanManager,
                finalPositions,
                finalRiskLevels,
                block.timestamp
            );
            
            return (true, performData);
            
        } catch {
            return (false, bytes(""));
        }
    }
    
    /**
     * @dev CHAINLINK AUTOMATION: performUpkeep function
     * @param performData Datos de checkUpkeep
     */
    function performUpkeep(bytes calldata performData) external override {
        
        require(!emergencyPause, "Emergency paused");
        
        // SEGURIDAD: Solo permitir llamadas del Chainlink Forwarder
        if (forwarderRestricted) {
            require(msg.sender == chainlinkForwarder, "Only Chainlink Forwarder allowed");
        }
        
        uint256 gasStart = gasleft();
        
        //  Decode performData
        (
            address loanManager,
            uint256[] memory positions,
            uint256[] memory riskLevels,
            uint256 timestamp
        ) = abi.decode(performData, (address, uint256[], uint256[], uint256));
        
        // Validaciones de seguridad (si el registry lo soporta)
        try automationRegistry.isManagerActive(loanManager) returns (bool isActive) {
            require(isActive, "Manager not active");
        } catch {
            // Registry no soporta isManagerActive (registry oficial Chainlink), continuar
        }
        require(registeredManagers[loanManager], "Manager not registered");
        require(block.timestamp - timestamp <= 300, "Data too old"); // Max 5 min
        
        ILoanAutomation loanAutomation = ILoanAutomation(loanManager);
        require(loanAutomation.isAutomationEnabled(), "Automation disabled");
        
        //  OPTIMIZACIÓN: Ordenar por risk level (mayor primero)
        _sortByRiskLevel(positions, riskLevels);
        
        //  EJECUTAR LIQUIDACIONES
        uint256 liquidationsExecuted = 0;
        uint256 positionsChecked = positions.length;
        
        for (uint256 i = 0; i < positions.length; i++) {
            uint256 positionId = positions[i];
            
            //  Gas check para evitar out-of-gas
            if (gasleft() < 200000) { // Reserve gas para finalizacion
                break;
            }
            
            // Re-verificar que position sigue siendo liquidable
            (bool isAtRisk, uint256 currentRisk) = loanAutomation.isPositionAtRisk(positionId);
            
            if (isAtRisk && currentRisk >= minRiskThreshold) {
                // 🤖 VAULT-FUNDED LIQUIDATION: Uses vault liquidity instead of requiring keeper to have tokens
                try loanAutomation.vaultFundedAutomatedLiquidation(positionId) returns (bool success, uint256 amount) {
                    if (success) {
                        liquidationsExecuted++;
                        lastLiquidationAttempt[positionId] = block.timestamp;
                        emit LiquidationExecuted(loanManager, positionId, amount);
                    }
                } catch {
                    // Continue con la siguiente posición si falla una
                    continue;
                }
            }
        }
        
        //  Actualizar estadísticas
        totalLiquidations += liquidationsExecuted;
        totalUpkeeps++;
        lastExecutionTimestamp = block.timestamp;
        uint256 gasUsed = gasStart - gasleft();
        totalGasUsed += gasUsed;
        
        emit UpkeepPerformed(loanManager, positionsChecked, liquidationsExecuted, gasUsed);
    }
    
    // ========== OPTIMIZACIONES INTERNAS ==========
    
    /**
     * @dev Detecta si estamos usando un registry personalizado vs Chainlink oficial
     */
    function _isCustomRegistry() internal view returns (bool) {
        // Direcciones oficiales de Chainlink en Base Sepolia
        // Si es el registry oficial, NO hacemos validación isManagerActive
        return address(automationRegistry) != 0x91D4a4C3D448c7f3CB477332B1c7D420a5810aC3;
    }
    
    /**
     * @dev Calcula batch size óptimo basado en condiciones
     * 🔧 FIXED: No limitar por totalPositions ya que esto es el conteo de posiciones activas,
     * no el rango máximo de IDs que podemos buscar
     */
    function _calculateOptimalBatchSize(
        uint256 requestedSize, 
        uint256 totalPositions
    ) internal view returns (uint256) {
        
        uint256 optimalSize = requestedSize > 0 ? requestedSize : maxPositionsPerBatch;
        
        // ✅ REMOVED: No limitar por totalPositions ya que los IDs pueden ser dispersos
        // Los IDs de posición pueden ser mucho más altos que el número de posiciones activas
        // La función getPositionsInRange se encarga de filtrar posiciones activas
        
        // Mínimo de 1, máximo razonable para evitar gas excesivo
        if (optimalSize == 0) {
            optimalSize = 1;
        }
        if (optimalSize > 100) { // Límite máximo razonable
            optimalSize = 100;
        }
        
        return optimalSize;
    }
    
    /**
     * @dev  Ordena posiciones por nivel de riesgo (mayor primero)
     */
    function _sortByRiskLevel(uint256[] memory positions, uint256[] memory riskLevels) internal pure {
        uint256 length = positions.length;
        
        // Bubble sort simple para arrays pequeños
        for (uint256 i = 0; i < length - 1; i++) {
            for (uint256 j = 0; j < length - i - 1; j++) {
                if (riskLevels[j] < riskLevels[j + 1]) {
                    // Swap risk levels
                    (riskLevels[j], riskLevels[j + 1]) = (riskLevels[j + 1], riskLevels[j]);
                    // Swap corresponding positions
                    (positions[j], positions[j + 1]) = (positions[j + 1], positions[j]);
                }
            }
        }
    }
    
    // ========== CONFIGURACIÓN ==========
    
    /**
     * @dev  Registra un loan manager para automatización
     */
    function registerLoanManager(address loanManager, uint256 priority) external onlyOwner {
        require(loanManager != address(0), "Invalid manager");
        require(!registeredManagers[loanManager], "Already registered");
        require(priority <= 100, "Priority too high");
        
        registeredManagers[loanManager] = true;
        managerPriority[loanManager] = priority;
        managersList.push(loanManager);
        
        emit ManagerRegistered(loanManager, priority);
    }
    
    /**
     * @dev  Desregistra un loan manager
     */
    function unregisterLoanManager(address loanManager) external onlyOwner {
        require(registeredManagers[loanManager], "Not registered");
        
        registeredManagers[loanManager] = false;
        delete managerPriority[loanManager];
        
        // Remove from array
        for (uint256 i = 0; i < managersList.length; i++) {
            if (managersList[i] == loanManager) {
                managersList[i] = managersList[managersList.length - 1];
                managersList.pop();
                break;
            }
        }
    }
    
    /**
     * @dev  Configuración de parámetros
     */
    function setMinRiskThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold >= 50 && _threshold <= 100, "Invalid threshold");
        minRiskThreshold = _threshold;
    }
    
    function setMaxPositionsPerBatch(uint256 _maxPositions) external onlyOwner {
        require(_maxPositions >= 5 && _maxPositions <= 50, "Invalid batch size");
        maxPositionsPerBatch = _maxPositions;
    }
    
    function setLiquidationCooldown(uint256 _cooldown) external onlyOwner {
        require(_cooldown >= 60 && _cooldown <= 1800, "Invalid cooldown"); // 1min - 30min
        liquidationCooldown = _cooldown;
    }
    
    function setEmergencyPause(bool _paused) external onlyOwner {
        emergencyPause = _paused;
        emit EmergencyPaused(_paused);
    }
    
    /**
     * @dev Configura la dirección del Chainlink Forwarder (obtenida después del registro)
     */
    function setChainlinkForwarder(address _forwarder) external onlyOwner {
        require(_forwarder != address(0), "Invalid forwarder address");
        chainlinkForwarder = _forwarder;
        emit ForwarderSet(_forwarder);
    }
    
    /**
     * @dev Activa/desactiva la restricción del Forwarder para seguridad
     */
    function setForwarderRestriction(bool _restricted) external onlyOwner {
        forwarderRestricted = _restricted;
        emit ForwarderRestrictionToggled(_restricted);
    }
    
    // ========== UTILIDADES ==========
    
    /**
     * @dev  Helper para decodificar checkData
     */
    function decodeCheckData(bytes calldata checkData) external pure returns (
        address loanManager,
        uint256 startIndex,
        uint256 batchSize
    ) {
        return abi.decode(checkData, (address, uint256, uint256));
    }
    
    /**
     * @dev  Genera checkData para registración
     */
    function generateCheckData(
        address loanManager,
        uint256 startIndex,
        uint256 batchSize
    ) external pure returns (bytes memory) {
        return abi.encode(loanManager, startIndex, batchSize);
    }
    
    /**
     * @dev ✅ NEW: Genera checkData optimizado para automation
     * @param loanManager Address del loan manager
     * @param startPositionId ID de posición inicial (usar 0 para auto-start desde 1)
     * @param batchSize Tamaño de batch (usar 0 para batch automático)
     */
    function generateOptimizedCheckData(
        address loanManager,
        uint256 startPositionId,
        uint256 batchSize
    ) external pure returns (bytes memory) {
        // Si no se especifica startPositionId, usar 0 (se convertirá a 1 en checkUpkeep)
        uint256 effectiveStartId = startPositionId == 0 ? 0 : startPositionId;
        
        // Si no se especifica batchSize, usar valor por defecto
        uint256 effectiveBatchSize = batchSize == 0 ? 25 : batchSize;
        
        return abi.encode(loanManager, effectiveStartId, effectiveBatchSize);
    }
    
    /**
     * @dev Obtiene estadísticas completas
     */
    function getStats() external view returns (
        uint256 totalLiquidationsCount,
        uint256 totalUpkeepsCount,
        uint256 lastExecution,
        uint256 averageGasUsed,
        uint256 registeredManagersCount
    ) {
        uint256 avgGas = totalUpkeeps > 0 ? totalGasUsed / totalUpkeeps : 0;
        
        return (
            totalLiquidations,
            totalUpkeeps,
            lastExecutionTimestamp,
            avgGas,
            managersList.length
        );
    }
    
    /**
     * @dev 📋 Obtiene managers registrados
     */
    function getRegisteredManagers() external view returns (
        address[] memory managers,
        uint256[] memory priorities
    ) {
        managers = new address[](managersList.length);
        priorities = new uint256[](managersList.length);
        
        for (uint256 i = 0; i < managersList.length; i++) {
            managers[i] = managersList[i];
            priorities[i] = managerPriority[managersList[i]];
        }
        
        return (managers, priorities);
    }
} 