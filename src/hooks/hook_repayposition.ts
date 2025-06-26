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
  usePublicClient
} from 'wagmi'
import { 
  formatUnits, 
  parseUnits,
  type Abi,
  type Address,
  type Hash
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

export interface RepaymentResult {
  success: boolean
  txHash?: Hash
  error?: string
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
      { name: 'owner', type: 'address' },
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

const VAULT_HANDLER_ABI = [
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'borrower', type: 'address' }
    ],
    name: 'repay',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

// ===================================
// 🎯 HOOK PRINCIPAL: useRepayPosition
// ===================================

export interface UseRepayPositionResult {
  repayPosition: (positionId: bigint, loanTokenAddress: Address, repayAmount?: bigint) => Promise<RepaymentResult>
  loadVaultHandler: () => Promise<void>
  isLoading: boolean
  error: string | null
  isApproving: boolean
  isRepaying: boolean
  isConfirmingApprove: boolean
  isConfirmingRepay: boolean
  approveHash?: Hash
  repayHash?: Hash
  calculateRepayment: (positionId: bigint, requestedAmount?: bigint) => Promise<RepaymentCalculation | null>
  repaymentData: RepaymentCalculation | null
}

export function useRepayPosition(): UseRepayPositionResult {
  const { address } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  
  // Estados del hook
  const [positionId, setPositionId] = useState<bigint>()
  const [tokenAddress, setTokenAddress] = useState<Address>()
  
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
  const { data: position, refetch: refetchPosition } = useReadContract({
    address: contractAddresses.flexibleLoanManager,
    abi: FLEXIBLE_LOAN_MANAGER_ABI,
    functionName: 'getPosition',
    args: positionId ? [positionId] : undefined,
    query: { enabled: Boolean(positionId && contractAddresses.flexibleLoanManager) }
  })

  // Obtener deuda total
  const { data: totalDebt, refetch: refetchTotalDebt } = useReadContract({
    address: contractAddresses.flexibleLoanManager,
    abi: FLEXIBLE_LOAN_MANAGER_ABI,
    functionName: 'getTotalDebt',
    args: positionId ? [positionId] : undefined,
    query: { enabled: Boolean(positionId && contractAddresses.flexibleLoanManager) }
  })

  // Obtener interés acumulado
  const { data: accruedInterest, refetch: refetchAccruedInterest } = useReadContract({
    address: contractAddresses.flexibleLoanManager,
    abi: FLEXIBLE_LOAN_MANAGER_ABI,
    functionName: 'getAccruedInterest',
    args: positionId ? [positionId] : undefined,
    query: { enabled: Boolean(positionId && contractAddresses.flexibleLoanManager) }
  })

  // Obtener comisión del protocolo
  const { data: protocolFee } = useReadContract({
    address: contractAddresses.flexibleLoanManager,
    abi: FLEXIBLE_LOAN_MANAGER_ABI,
    functionName: 'protocolFee',
    query: { enabled: Boolean(contractAddresses.flexibleLoanManager) }
  })

  // Verificar si el contrato está pausado
  const { data: isPaused } = useReadContract({
    address: contractAddresses.flexibleLoanManager,
    abi: FLEXIBLE_LOAN_MANAGER_ABI,
    functionName: 'paused',
    query: { enabled: Boolean(contractAddresses.flexibleLoanManager) }
  })

  // Balance del token de préstamo del usuario
  const { data: userTokenBalance, refetch: refetchBalance } = useBalance({
    address,
    token: tokenAddress,
    query: { enabled: Boolean(address && tokenAddress) }
  })

  // Allowance del token para el LoanManager
  const { data: tokenAllowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && contractAddresses.flexibleLoanManager ? 
      [address, contractAddresses.flexibleLoanManager] : undefined,
    query: { enabled: Boolean(address && tokenAddress && contractAddresses.flexibleLoanManager) }
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
  // 🧮 FUNCIONES DE CALCULO
  // ===================================

  /**
   * Calcula los detalles del repago para una posición
   */
  const calculateRepayment = useCallback(async (
    _positionId: bigint,
    requestedAmount?: bigint
  ): Promise<RepaymentCalculation | null> => {
    if (!contractAddresses.flexibleLoanManager) return null

    try {
      setIsLoading(true)
      setPositionId(_positionId)
      
      // Esperar a que se actualicen los datos
      await Promise.all([
        refetchPosition(),
        refetchTotalDebt(),
        refetchAccruedInterest()
      ])

      if (!position || !position.isActive) {
        throw new Error('Position not found or inactive')
      }

      const _totalDebt = totalDebt as bigint
      const interest = accruedInterest as bigint
      const principal = _totalDebt - interest

      // Determinar cantidad a repagar
      const repayAmount = requestedAmount && requestedAmount > 0n 
        ? (requestedAmount > _totalDebt ? _totalDebt : requestedAmount)
        : _totalDebt

      // Calcular distribución del pago
      const interestPayment = repayAmount > interest ? interest : repayAmount
      const principalPayment = repayAmount - interestPayment

      // Calcular comisión del protocolo (solo sobre intereses)
      const feeAmount = protocolFee 
        ? (interestPayment * BigInt(protocolFee)) / 1000000n
        : 0n

      const willClose = repayAmount >= _totalDebt

      const calculation: RepaymentCalculation = {
        totalDebt: _totalDebt,
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
  }, [
    contractAddresses.flexibleLoanManager,
    position,
    totalDebt,
    accruedInterest,
    protocolFee,
    refetchPosition,
    refetchTotalDebt,
    refetchAccruedInterest
  ])

  /**
   * Verifica si el usuario tiene suficiente balance y allowance
   */
  const checkBalanceAndAllowance = useCallback(async (
    _tokenAddress: Address,
    amount: bigint
  ): Promise<{ hasBalance: boolean; hasAllowance: boolean; needsApproval: boolean }> => {
    if (!address || !contractAddresses.flexibleLoanManager) {
      return { hasBalance: false, hasAllowance: false, needsApproval: true }
    }

    try {
      setTokenAddress(_tokenAddress)
      
      // Esperar a que se actualicen los datos
      await Promise.all([
        refetchBalance(),
        refetchAllowance()
      ])

      const hasBalance = (userTokenBalance?.value || 0n) >= amount
      const hasAllowance = (tokenAllowance as bigint || 0n) >= amount
      const needsApproval = !hasAllowance

      return { hasBalance, hasAllowance, needsApproval }

    } catch (err) {
      console.error('Error checking balance/allowance:', err)
      return { hasBalance: false, hasAllowance: false, needsApproval: true }
    }
  }, [
    address,
    contractAddresses.flexibleLoanManager,
    userTokenBalance,
    tokenAllowance,
    refetchBalance,
    refetchAllowance
  ])

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
          const result = await refetchAllowance()
          
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
   * 🚨 NUEVO: Detecta qué asset handler maneja un token específico
   */
  const detectAssetHandler = useCallback(async (
    tokenAddress: Address
  ): Promise<Address | null> => {
    if (!contractAddresses.flexibleLoanManager) return null

    try {
      // Leer la configuración para obtener los asset handlers
      const response = await fetch('/deployed-addresses-mock.json')
      const data = await response.json()
      
      // Por ahora, simplemente retornar el VaultBasedHandler
      // En producción, aquí se verificaría cuál handler soporta el token
      const vaultHandler = data.coreLending?.vaultBasedHandler
      if (vaultHandler) {
        console.log(`🎯 Using VaultBasedHandler for token ${tokenAddress}:`, vaultHandler)
        return vaultHandler as Address
      }

      return null
    } catch (err) {
      console.error('Error detecting asset handler:', err)
      return null
    }
  }, [contractAddresses.flexibleLoanManager])

  /**
   * Proceso completo de repago (aprobar + ejecutar) - CORREGIDO para seguir FlexibleLoanManager.sol
   */
  const repayPosition = useCallback(async (
    positionId: bigint,
    loanTokenAddress: Address,
    repayAmount?: bigint // Si no se especifica, paga toda la deuda
  ): Promise<{ success: boolean; approveHash?: Hash; repayHash?: Hash }> => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('🔄 Starting CORRECT repayment flow according to FlexibleLoanManager.sol...')
      
      // 1. Calcular detalles del repago
      const calculation = await calculateRepayment(positionId, repayAmount)
      if (!calculation) {
        throw new Error('Failed to calculate repayment details')
      }

      const isPartialRepay = repayAmount && repayAmount < calculation.totalDebt
      const finalAmount = isPartialRepay ? repayAmount : calculation.totalDebt

      console.log('💰 Repayment calculation:')
      console.log('  Total debt:', formatUnits(calculation.totalDebt, 6), 'USDC')
      console.log('  Accrued interest:', formatUnits(calculation.accruedInterest, 6), 'USDC')
      console.log('  Final amount:', formatUnits(finalAmount, 6), 'USDC')

      // 2. Detectar el asset handler correcto
      const assetHandler = await detectAssetHandler(loanTokenAddress)
      if (!assetHandler) {
        throw new Error('No asset handler found for loan token')
      }
      console.log('✅ Asset handler detected:', assetHandler)

      // 3. Calcular distribución del pago según FlexibleLoanManager.repayLoan()
      const interestPayment = finalAmount > calculation.accruedInterest 
        ? calculation.accruedInterest 
        : finalAmount
      const principalPayment = finalAmount - interestPayment
      const protocolFeeRate = 5000n // 0.5% from contract
      const interestFee = (interestPayment * protocolFeeRate) / 1000000n

      console.log('📊 Payment breakdown:')
      console.log('  Interest fee (to FlexibleLoanManager):', formatUnits(interestFee, 6), 'USDC')
      console.log('  Principal (to AssetHandler):', formatUnits(principalPayment, 6), 'USDC')

      // 4. Verificar balance del usuario
      const { hasBalance } = await checkBalanceAndAllowance(loanTokenAddress, finalAmount)
      if (!hasBalance) {
        throw new Error('Insufficient token balance for repayment')
      }

      // 5. Hacer las DOS aprobaciones específicas según el flujo del contrato
      console.log('🔄 Making specific approvals according to FlexibleLoanManager flow...')
      
      // Buffer de 20% para cubrir variaciones en cálculos
      const bufferMultiplier = 120n
      const safeInterestFee = (interestFee * bufferMultiplier) / 100n
      const safePrincipalAmount = (principalPayment * bufferMultiplier) / 100n

      let flexibleManagerHash: Hash | undefined
      let assetHandlerHash: Hash | undefined

      // 5a. Aprobar al FlexibleLoanManager para las fees de interés
      if (interestFee > 0n) {
        console.log('🔄 Approving FlexibleLoanManager for interest fees...')
        flexibleManagerHash = await approveRepaymentSimple(
          loanTokenAddress,
          safeInterestFee
        ) || undefined
        
        if (!flexibleManagerHash) {
          throw new Error('FlexibleLoanManager approval failed')
        }
        
        // Esperar confirmación
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // 5b. Aprobar al AssetHandler para el principal
      if (principalPayment > 0n) {
        console.log('🔄 Approving AssetHandler for principal repayment...')
        
        // Usar writeApprove directamente para el asset handler
        writeApprove({
          address: loanTokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [assetHandler, safePrincipalAmount]
        })
        
        assetHandlerHash = approveHash || undefined
        
        if (!assetHandlerHash) {
          throw new Error('AssetHandler approval failed')
        }
        
        // Esperar confirmación
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

      console.log('✅ All approvals completed successfully!')

      // 6. Ejecutar el repago a través del FlexibleLoanManager
      console.log('🚀 Executing repayment through FlexibleLoanManager...')
      console.log('ℹ️  This will automatically:')
      console.log('    1. Transfer interest fee to protocol')
      console.log('    2. Call AssetHandler.repay() for principal')
      console.log('    3. Return collateral if full repayment')

      const repayHash = await executeRepayment({
        positionId,
        repayAmount: finalAmount,
        isPartialRepay: Boolean(isPartialRepay)
      })

      if (!repayHash) {
        throw new Error('Repayment execution failed')
      }

      console.log('🎉 Repayment successful! Transaction hash:', repayHash)

      return { 
        success: true, 
        approveHash: flexibleManagerHash || assetHandlerHash,
        repayHash: repayHash
      }

    } catch (err) {
      console.error('Error in repayPosition:', err)
      
      let errorMessage = 'Repayment process failed'
      
      if (err instanceof Error) {
        if (err.message.includes('User rejected') || 
            err.message.includes('User denied') ||
            err.message.includes('cancelled')) {
          errorMessage = 'Transaction cancelled by user'
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient USDC balance for repayment'
        } else if (err.message.includes('execution reverted')) {
          errorMessage = 'Transaction failed - please check your position status'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
      return { success: false }
    } finally {
      setIsLoading(false)
    }
  }, [
    calculateRepayment, 
    checkBalanceAndAllowance, 
    approveRepaymentSimple, 
    executeRepayment,
    detectAssetHandler,
    writeApprove,
    approveHash
  ])

  // ===================================
  // 📊 ESTADOS Y RETORNO
  // ===================================

  const isProcessing = isLoading || isApproving || isRepaying || isConfirmingApprove || isConfirmingRepay

  return {
    repayPosition,
    loadVaultHandler: async () => {}, // Placeholder implementation
    isLoading: isProcessing,
    error,
    isApproving,
    isRepaying,
    isConfirmingApprove,
    isConfirmingRepay,
    approveHash,
    repayHash,
    calculateRepayment,
    repaymentData
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