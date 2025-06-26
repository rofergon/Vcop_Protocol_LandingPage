/**
 * @fileoverview hook_repayposition.ts
 * @description Hook de React para pagar deuda de posiciones usando wagmi v2 + viem v2
 * @version 2025 - Compatible con wagmi v2.x y viem v2.x
 * 
 * Replica la funcionalidad de repayLoan() en FlexibleLoanManager.sol
 */

import { useState, useCallback, useEffect } from 'react'
import { 
  useAccount, 
  useReadContract, 
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  useChainId,
  type Address,
  type Hash
} from 'wagmi'
import { 
  formatUnits, 
  parseUnits,
  type Abi
} from 'viem'

// ===================================
// 🔧 TIPOS Y INTERFACES
// ===================================

export interface LoanPosition {
  borrower: Address
  collateralAsset: Address
  loanAsset: Address
  collateralAmount: bigint
  loanAmount: bigint
  interestRate: bigint
  createdAt: bigint
  lastInterestUpdate: bigint
  isActive: boolean
}

export interface RepaymentCalculation {
  totalDebt: bigint
  principal: bigint
  accruedInterest: bigint
  protocolFee: bigint
  netRepayAmount: bigint
  willClosePosition: boolean
}

export interface RepaymentParams {
  positionId: bigint
  repayAmount: bigint // 0 = repay all debt
  isPartialRepay: boolean
}

// ===================================
// 📋 ABIs DE CONTRATOS
// ===================================

const FLEXIBLE_LOAN_MANAGER_ABI = [
  // READ FUNCTIONS
  {
    inputs: [{ name: 'positionId', type: 'uint256' }],
    name: 'getPosition',
    outputs: [{
      components: [
        { name: 'borrower', type: 'address' },
        { name: 'collateralAsset', type: 'address' },
        { name: 'loanAsset', type: 'address' },
        { name: 'collateralAmount', type: 'uint256' },
        { name: 'loanAmount', type: 'uint256' },
        { name: 'interestRate', type: 'uint256' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'lastInterestUpdate', type: 'uint256' },
        { name: 'isActive', type: 'bool' }
      ],
      name: '',
      type: 'tuple'
    }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'positionId', type: 'uint256' }],
    name: 'getTotalDebt',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'positionId', type: 'uint256' }],
    name: 'getAccruedInterest',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'protocolFee',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  // WRITE FUNCTIONS
  {
    inputs: [
      { name: 'positionId', type: 'uint256' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'repayLoan',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'positionId', type: 'uint256' }],
    name: 'updateInterest',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

const ASSET_HANDLER_ABI = [
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'isAssetSupported',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

// ===================================
// 🎯 HOOK PRINCIPAL: useRepayPosition
// ===================================

export function useRepayPosition() {
  const { address } = useAccount()
  const chainId = useChainId()
  
  // Estados del hook
  const [contractAddresses, setContractAddresses] = useState<{
    flexibleLoanManager?: Address
    feeCollector?: Address
  }>({})
  
  const [repaymentData, setRepaymentData] = useState<RepaymentCalculation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ===================================
  // 📡 LECTURA DE CONFIGURACIÓN
  // ===================================

  // Cargar direcciones de contratos
  useEffect(() => {
    const loadContractAddresses = async () => {
      try {
        // Leer desde deployed-addresses-mock.json o archivo similar
        const response = await fetch('/deployed-addresses-mock.json')
        const data = await response.json()
        
        setContractAddresses({
          flexibleLoanManager: data.coreLending?.flexibleLoanManager,
          feeCollector: data.coreLending?.feeCollector
        })
      } catch (err) {
        console.error('Error loading contract addresses:', err)
        setError('Failed to load contract addresses')
      }
    }

    loadContractAddresses()
  }, [chainId])

  // ===================================
  // 🔍 FUNCIONES DE LECTURA
  // ===================================

  // Obtener información de la posición
  const { data: positionData, refetch: refetchPosition } = useReadContract({
    address: contractAddresses.flexibleLoanManager,
    abi: FLEXIBLE_LOAN_MANAGER_ABI,
    functionName: 'getPosition',
    args: undefined, // Se establece dinámicamente
    query: { enabled: false }
  })

  // Obtener deuda total
  const { data: totalDebt, refetch: refetchTotalDebt } = useReadContract({
    address: contractAddresses.flexibleLoanManager,
    abi: FLEXIBLE_LOAN_MANAGER_ABI,
    functionName: 'getTotalDebt',
    args: undefined,
    query: { enabled: false }
  })

  // Obtener interés acumulado
  const { data: accruedInterest, refetch: refetchAccruedInterest } = useReadContract({
    address: contractAddresses.flexibleLoanManager,
    abi: FLEXIBLE_LOAN_MANAGER_ABI,
    functionName: 'getAccruedInterest',
    args: undefined,
    query: { enabled: false }
  })

  // Obtener comisión del protocolo
  const { data: protocolFee } = useReadContract({
    address: contractAddresses.flexibleLoanManager,
    abi: FLEXIBLE_LOAN_MANAGER_ABI,
    functionName: 'protocolFee'
  })

  // Verificar si el contrato está pausado
  const { data: isPaused } = useReadContract({
    address: contractAddresses.flexibleLoanManager,
    abi: FLEXIBLE_LOAN_MANAGER_ABI,
    functionName: 'paused'
  })

  // ===================================
  // 💰 FUNCIONES DE BALANCE Y ALLOWANCE
  // ===================================

  // Balance del token de préstamo del usuario
  const { data: userTokenBalance, refetch: refetchBalance } = useBalance({
    address: address,
    token: undefined // Se establece dinámicamente
  })

  // Allowance del token para el LoanManager
  const { data: tokenAllowance, refetch: refetchAllowance } = useReadContract({
    address: undefined, // Token address - se establece dinámicamente
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: undefined,
    query: { enabled: false }
  })

  // ===================================
  // ✍️ FUNCIONES DE ESCRITURA
  // ===================================

  // Hook para aprobar tokens
  const { 
    writeContract: writeApprove,
    isPending: isApproving,
    data: approveHash
  } = useWriteContract()

  // Hook para repagar préstamo
  const { 
    writeContract: writeRepay,
    isPending: isRepaying,
    data: repayHash
  } = useWriteContract()

  // Esperar confirmaciones de transacciones
  const { isLoading: isConfirmingApprove } = useWaitForTransactionReceipt({
    hash: approveHash
  })

  const { isLoading: isConfirmingRepay } = useWaitForTransactionReceipt({
    hash: repayHash
  })

  // ===================================
  // 🧮 FUNCIONES DE CÁLCULO
  // ===================================

  /**
   * Calcula los detalles del repago para una posición
   */
  const calculateRepayment = useCallback(async (
    positionId: bigint,
    requestedAmount?: bigint
  ): Promise<RepaymentCalculation | null> => {
    if (!contractAddresses.flexibleLoanManager) return null

    try {
      setIsLoading(true)
      
      // Obtener datos de la posición
      const position = await refetchPosition({
        args: [positionId]
      }) as { data: LoanPosition }

      if (!position.data || !position.data.isActive) {
        throw new Error('Position not found or inactive')
      }

      // Obtener deuda total y interés acumulado
      const [debtResult, interestResult] = await Promise.all([
        refetchTotalDebt({ args: [positionId] }),
        refetchAccruedInterest({ args: [positionId] })
      ])

      const totalDebt = debtResult.data as bigint
      const interest = interestResult.data as bigint
      const principal = totalDebt - interest

      // Determinar cantidad a repagar
      const repayAmount = requestedAmount && requestedAmount > 0n 
        ? (requestedAmount > totalDebt ? totalDebt : requestedAmount)
        : totalDebt

      // Calcular distribución del pago
      const interestPayment = repayAmount > interest ? interest : repayAmount
      const principalPayment = repayAmount - interestPayment

      // Calcular comisión del protocolo (solo sobre intereses)
      const feeAmount = protocolFee 
        ? (interestPayment * BigInt(protocolFee)) / 1000000n
        : 0n

      const willClose = repayAmount >= totalDebt

      const calculation: RepaymentCalculation = {
        totalDebt,
        principal: principalPayment,
        accruedInterest: interestPayment,
        protocolFee: feeAmount,
        netRepayAmount: repayAmount,
        willClosePosition: willClose
      }

      setRepaymentData(calculation)
      return calculation

    } catch (err) {
      console.error('Error calculating repayment:', err)
      setError(err instanceof Error ? err.message : 'Calculation failed')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [contractAddresses.flexibleLoanManager, protocolFee, refetchPosition, refetchTotalDebt, refetchAccruedInterest])

  /**
   * Verifica si el usuario tiene suficiente balance y allowance
   */
  const checkBalanceAndAllowance = useCallback(async (
    tokenAddress: Address,
    amount: bigint
  ): Promise<{ hasBalance: boolean; hasAllowance: boolean; needsApproval: boolean }> => {
    if (!address || !contractAddresses.flexibleLoanManager) {
      return { hasBalance: false, hasAllowance: false, needsApproval: true }
    }

    try {
      // Obtener balance del usuario
      const balanceResult = await refetchBalance()
      const balance = balanceResult.data?.value || 0n

      // Obtener allowance actual
      const allowanceResult = await refetchAllowance({
        address: tokenAddress,
        args: [address, contractAddresses.flexibleLoanManager]
      })
      const allowance = allowanceResult.data as bigint || 0n

      const hasBalance = balance >= amount
      const hasAllowance = allowance >= amount
      const needsApproval = !hasAllowance

      return { hasBalance, hasAllowance, needsApproval }

    } catch (err) {
      console.error('Error checking balance/allowance:', err)
      return { hasBalance: false, hasAllowance: false, needsApproval: true }
    }
  }, [address, contractAddresses.flexibleLoanManager, refetchBalance, refetchAllowance])

  // ===================================
  // 🚀 FUNCIONES PRINCIPALES
  // ===================================

  /**
   * Aprobar tokens para el repago
   */
  const approveRepayment = useCallback(async (
    tokenAddress: Address,
    amount: bigint
  ): Promise<Hash | null> => {
    if (!contractAddresses.flexibleLoanManager) {
      setError('LoanManager address not loaded')
      return null
    }

    try {
      setError(null)
      
      // ⚠️ CRÍTICO: El contrato hace transferencias SEPARADAS:
      // 1. FlexibleLoanManager transferFrom para comisión del protocolo
      // 2. AssetHandler transferFrom para principal
      // Por tanto, necesitamos aprobar al LoanManager que maneja todo el flujo
      
      // Aprobar con un buffer del 10% para intereses que puedan acumularse
      const approvalAmount = amount + (amount * 10n) / 100n

      writeApprove({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contractAddresses.flexibleLoanManager, approvalAmount]
      })

      return approveHash || null

    } catch (err) {
      console.error('Error approving repayment:', err)
      setError(err instanceof Error ? err.message : 'Approval failed')
      return null
    }
  }, [contractAddresses.flexibleLoanManager, writeApprove, approveHash])

  /**
   * 🚨 NUEVO: Obtener la dirección del AssetHandler para un token específico
   */
  const getAssetHandlerAddress = useCallback(async (
    tokenAddress: Address
  ): Promise<Address | null> => {
    if (!contractAddresses.flexibleLoanManager) return null

    try {
      // El FlexibleLoanManager tiene una función _getAssetHandler que no es pública
      // Pero podemos intentar llamar a cada AssetHandler para ver cuál soporta el token
      
      // Primero, intentamos obtener los handlers desde el JSON de configuración
      const response = await fetch('/deployed-addresses-mock.json')
      const data = await response.json()
      
      const assetHandlers = [
        data.coreLending?.vaultBasedHandler,
        data.coreLending?.flexibleAssetHandler,
        data.coreLending?.mintableBurnableHandler
      ].filter(Boolean)

      // Verificar cuál handler soporta este token
      for (const handlerAddress of assetHandlers) {
        try {
          // Llamar a isAssetSupported en cada handler usando refetch
          const result = await refetchAllowance({
            address: handlerAddress as Address,
            abi: ASSET_HANDLER_ABI,
            functionName: 'isAssetSupported',
            args: [tokenAddress]
          })
          
          if (result) {
            return handlerAddress as Address
          }
        } catch {
          continue
        }
      }

      return null
    } catch (err) {
      console.error('Error getting asset handler address:', err)
      return null
    }
  }, [contractAddresses.flexibleLoanManager])

  /**
   * 🚨 NUEVO: Aprobación inteligente que considera el AssetHandler
   */
  const approveRepaymentIntelligent = useCallback(async (
    tokenAddress: Address,
    totalAmount: bigint,
    calculation: RepaymentCalculation
  ): Promise<{ success: boolean; loanManagerHash?: Hash; assetHandlerHash?: Hash }> => {
    if (!contractAddresses.flexibleLoanManager) {
      setError('LoanManager address not loaded')
      return { success: false }
    }

    try {
      setError(null)
      
      // 1. Obtener dirección del AssetHandler
      const assetHandlerAddress = await getAssetHandlerAddress(tokenAddress)
      if (!assetHandlerAddress) {
        throw new Error('Could not determine asset handler for token')
      }

      // 2. Calcular montos específicos con buffer
      const protocolFeeAmount = calculation.protocolFee + (calculation.protocolFee * 5n) / 100n
      const principalAmount = calculation.principal + (calculation.principal * 5n) / 100n
      
      // 3. Aprobar al LoanManager para la comisión del protocolo
      let loanManagerHash: Hash | undefined
      if (protocolFeeAmount > 0n) {
        writeApprove({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [contractAddresses.flexibleLoanManager, protocolFeeAmount]
        })
        loanManagerHash = approveHash || undefined
      }

      // 4. Aprobar al AssetHandler para el principal
      let assetHandlerHash: Hash | undefined
      if (principalAmount > 0n) {
        // Necesitamos esperar un poco para la segunda transacción
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        writeApprove({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [assetHandlerAddress, principalAmount]
        })
        assetHandlerHash = approveHash || undefined
      }

      return { 
        success: true, 
        loanManagerHash, 
        assetHandlerHash 
      }

    } catch (err) {
      console.error('Error in intelligent approval:', err)
      setError(err instanceof Error ? err.message : 'Intelligent approval failed')
      return { success: false }
    }
  }, [contractAddresses.flexibleLoanManager, writeApprove, approveHash, getAssetHandlerAddress])

  /**
   * ✅ VERSIÓN SIMPLIFICADA: Solo aprobar al LoanManager con monto total
   * El LoanManager maneja internamente las transferencias
   */
  const approveRepaymentSimple = useCallback(async (
    tokenAddress: Address,
    totalAmount: bigint
  ): Promise<Hash | null> => {
    if (!contractAddresses.flexibleLoanManager) {
      setError('LoanManager address not loaded')
      return null
    }

    try {
      setError(null)
      
      // 🎯 SOLUCIÓN SIMPLE: El FlexibleLoanManager maneja todo internamente
      // Solo necesitamos aprobar el monto total al LoanManager
      // El LoanManager hará las transferencias necesarias:
      // 1. transferFrom(user, feeCollector, fee) - comisión protocolo
      // 2. Llamará a assetHandler.repay() que hará su propio transferFrom
      
      const approvalAmount = totalAmount + (totalAmount * 10n) / 100n

      writeApprove({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contractAddresses.flexibleLoanManager, approvalAmount]
      })

      return approveHash || null

    } catch (err) {
      console.error('Error approving repayment:', err)
      setError(err instanceof Error ? err.message : 'Approval failed')
      return null
    }
  }, [contractAddresses.flexibleLoanManager, writeApprove, approveHash])

  /**
   * Ejecutar el repago del préstamo
   */
  const executeRepayment = useCallback(async (
    params: RepaymentParams
  ): Promise<Hash | null> => {
    if (!contractAddresses.flexibleLoanManager) {
      setError('LoanManager address not loaded')
      return null
    }

    if (isPaused) {
      setError('Contract is currently paused')
      return null
    }

    try {
      setError(null)

      // Validaciones básicas
      if (params.positionId <= 0n) {
        throw new Error('Invalid position ID')
      }

      if (params.repayAmount <= 0n && params.isPartialRepay) {
        throw new Error('Repay amount must be greater than 0 for partial repay')
      }

      // Para repago completo, enviar 0 (el contrato manejará automáticamente)
      const amountToSend = params.isPartialRepay ? params.repayAmount : 0n

      writeRepay({
        address: contractAddresses.flexibleLoanManager,
        abi: FLEXIBLE_LOAN_MANAGER_ABI,
        functionName: 'repayLoan',
        args: [params.positionId, amountToSend]
      })

      return repayHash || null

    } catch (err) {
      console.error('Error executing repayment:', err)
      setError(err instanceof Error ? err.message : 'Repayment failed')
      return null
    }
  }, [contractAddresses.flexibleLoanManager, isPaused, writeRepay, repayHash])

  /**
   * Proceso completo de repago (aprobar + ejecutar)
   */
  const repayPosition = useCallback(async (
    positionId: bigint,
    loanTokenAddress: Address,
    repayAmount?: bigint // Si no se especifica, paga toda la deuda
  ): Promise<{ success: boolean; approveHash?: Hash; repayHash?: Hash }> => {
    try {
      setIsLoading(true)
      setError(null)

      // 1. Calcular detalles del repago
      const calculation = await calculateRepayment(positionId, repayAmount)
      if (!calculation) {
        throw new Error('Failed to calculate repayment details')
      }

      const isPartialRepay = repayAmount && repayAmount < calculation.totalDebt
      const finalAmount = isPartialRepay ? repayAmount : calculation.totalDebt

      // 2. Verificar balance y allowance
      const { hasBalance, needsApproval } = await checkBalanceAndAllowance(
        loanTokenAddress, 
        finalAmount
      )

      if (!hasBalance) {
        throw new Error('Insufficient token balance for repayment')
      }

      // 3. Aprobar tokens si es necesario
      let approveHash: Hash | undefined
      if (needsApproval) {
        approveHash = await approveRepayment(loanTokenAddress, finalAmount) || undefined
        if (!approveHash) {
          throw new Error('Token approval failed')
        }
        
        // Esperar confirmación de aprobación
        // En un caso real, podrías querer esperar la confirmación aquí
      }

      // 4. Ejecutar repago
      const repayHash = await executeRepayment({
        positionId,
        repayAmount: finalAmount,
        isPartialRepay: Boolean(isPartialRepay)
      })

      if (!repayHash) {
        throw new Error('Repayment execution failed')
      }

      return { 
        success: true, 
        approveHash: approveHash,
        repayHash: repayHash
      }

    } catch (err) {
      console.error('Error in repayPosition:', err)
      setError(err instanceof Error ? err.message : 'Repayment process failed')
      return { success: false }
    } finally {
      setIsLoading(false)
    }
  }, [calculateRepayment, checkBalanceAndAllowance, approveRepayment, executeRepayment])

  // ===================================
  // 📊 ESTADOS Y RETORNO
  // ===================================

  const isProcessing = isLoading || isApproving || isRepaying || isConfirmingApprove || isConfirmingRepay

  return {
    // 🔍 Funciones de lectura/cálculo
    calculateRepayment,
    checkBalanceAndAllowance,
    
    // 🚀 Funciones principales
    approveRepayment,
    executeRepayment,
    repayPosition,
    
    // 📊 Estados
    repaymentData,
    isLoading: isProcessing,
    error,
    
    // 🔄 Estados de transacciones
    isApproving,
    isRepaying,
    isConfirmingApprove,
    isConfirmingRepay,
    
    // 📡 Datos de contratos
    contractAddresses,
    isPaused,
    protocolFee,
    
    // 🔄 Funciones de refetch
    refetchPosition,
    refetchTotalDebt,
    refetchAccruedInterest,
    refetchBalance,
    refetchAllowance,
    
    // Hash de transacciones
    approveHash,
    repayHash
  }
}

// ===================================
// 🎯 HOOK SIMPLIFICADO: useQuickRepay
// ===================================

/**
 * Hook simplificado para repago rápido de posiciones
 */
export function useQuickRepay() {
  const {
    repayPosition,
    calculateRepayment,
    isLoading,
    error,
    repaymentData
  } = useRepayPosition()

  /**
   * Repago completo de una posición (paga toda la deuda)
   */
  const repayFullPosition = useCallback(async (
    positionId: bigint,
    loanTokenAddress: Address
  ) => {
    return repayPosition(positionId, loanTokenAddress)
  }, [repayPosition])

  /**
   * Repago parcial de una posición
   */
  const repayPartialPosition = useCallback(async (
    positionId: bigint,
    loanTokenAddress: Address,
    amount: bigint
  ) => {
    return repayPosition(positionId, loanTokenAddress, amount)
  }, [repayPosition])

  return {
    repayFullPosition,
    repayPartialPosition,
    calculateRepayment,
    repaymentData,
    isLoading,
    error
  }
}

// ===================================
// 🛠️ UTILIDADES Y HELPERS
// ===================================

/**
 * Convierte entre diferentes unidades de tokens
 */
export const formatRepaymentAmount = (
  amount: bigint,
  decimals: number = 18,
  symbol: string = 'TOKEN'
): string => {
  return `${formatUnits(amount, decimals)} ${symbol}`
}

/**
 * Calcula el porcentaje de repago
 */
export const calculateRepaymentPercentage = (
  repayAmount: bigint,
  totalDebt: bigint
): number => {
  if (totalDebt === 0n) return 0
  return Number((repayAmount * 100n) / totalDebt)
}

/**
 * Estima el gas necesario para el repago
 */
export const estimateRepayGas = (isPartialRepay: boolean): bigint => {
  // Estimación basada en si es repago parcial o completo
  return isPartialRepay ? 150000n : 200000n // Más gas para repago completo (devuelve collateral)
}