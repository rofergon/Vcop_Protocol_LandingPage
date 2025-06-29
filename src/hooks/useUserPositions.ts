/**
 * @fileoverview useUserPositions.ts
 * @description Hook de React para gestionar las posiciones del usuario usando Permit2 + wagmi v2 + viem v2
 * @version 2025 - Compatible con wagmi v2.x, viem v2.x y Permit2
 * 
 * Funcionalidades:
 * - Obtener posiciones del usuario
 * - Calcular métricas de cada posición
 * - Repagar deuda usando Permit2 (UNA SOLA FIRMA)
 * - Refrescar datos en tiempo real
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { 
  useAccount, 
  useReadContract, 
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  useChainId,
  useBlockNumber,
  useWalletClient,
  usePublicClient
} from 'wagmi'
import { 
  formatUnits, 
  parseUnits,
  type Address,
  type Hash
} from 'viem'
import { base } from 'wagmi/chains'

// ABIs
import FLEXIBLE_LOAN_MANAGER_ABI from '../Abis/FlexibleLoanManager.json'
import VAULT_BASED_HANDLER_ABI from '../Abis/VaultBasedHandler.json'

// 🔥 MIGRACIÓN: Usar hook centralizado en lugar de carga directa
import { useContractAddresses, type ContractAddresses } from './useContractAddresses'

// Permit2 Contract Address (Same across all chains)
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as Address

// Permit2 ABI (minimal functions needed)
const PERMIT2_ABI = [
  {
    type: 'function',
    name: 'permitTransferFrom',
    inputs: [
      {
        name: 'permit',
        type: 'tuple',
        components: [
          {
            name: 'permitted',
            type: 'tuple',
            components: [
              { name: 'token', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ]
          },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' }
        ]
      },
      {
        name: 'transferDetails',
        type: 'tuple',
        components: [
          { name: 'to', type: 'address' },
          { name: 'requestedAmount', type: 'uint256' }
        ]
      },
      { name: 'owner', type: 'address' },
      { name: 'signature', type: 'bytes' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const

// ERC20 ABI (solo para aprobación inicial a Permit2)
const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  }
] as const

// ===================================
// 🏗️ INTERFACES Y TIPOS
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

export interface PositionData {
  positionId: bigint
  position: LoanPosition
  totalDebt: bigint
  accruedInterest: bigint
  collateralizationRatio: bigint
  isAtRisk: boolean
  riskLevel: bigint
  healthFactor: string
  collateralValueFormatted: string
  debtValueFormatted: string
}

export interface RepaymentResult {
  success: boolean
  txHash?: Hash
  error?: string
  message?: string
}

// Permit2 Types
export interface PermitTransferFrom {
  permitted: {
    token: Address
    amount: bigint
  }
  nonce: bigint
  deadline: bigint
}

export interface SignatureTransferDetails {
  to: Address
  requestedAmount: bigint
}

// ===================================
// 🎯 HOOK PRINCIPAL: useUserPositions
// ===================================

export function useUserPositions() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: blockNumber } = useBlockNumber({ watch: true })
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  // 🔥 REFACTORIZACIÓN: Usar hook centralizado
  const { 
    addresses: contractAddresses, 
    isLoading: addressesLoading,
    error: addressesError,
    getAssetSymbol: getAssetSymbolFromHook,
    isReady: addressesReady
  } = useContractAddresses()

  // Estados del hook (sin contractAddresses local)
  const [positionsData, setPositionsData] = useState<PositionData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transactionStep, setTransactionStep] = useState<'idle' | 'approving' | 'repaying'>('idle')

  // 🔥 OPTIMIZACIÓN: Combinar errores
  const combinedError = error || addressesError

  // ===================================
  // 🔍 LECTURA DE POSICIONES DEL USUARIO
  // ===================================

  // 🔥 OPTIMIZACIÓN: Obtener IDs de posiciones del usuario con menos frecuencia
  const { 
    data: userPositionIds, 
    refetch: refetchPositionIds,
    isLoading: isLoadingIds 
  } = useReadContract({
    address: contractAddresses?.flexibleLoanManager,
    abi: FLEXIBLE_LOAN_MANAGER_ABI as any,
    functionName: 'getUserPositions',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(contractAddresses?.flexibleLoanManager && address && addressesReady),
      refetchOnWindowFocus: false,
      staleTime: 30000, // 🔥 Cache durante 30 segundos
      gcTime: 300000, // 🔥 Mantener en cache por 5 minutos
      retry: 2, // 🔥 Solo 2 reintentos
      retryDelay: 3000 // 🔥 3 segundos entre reintentos
    }
  })
  
  // ===================================
  // 📊 LECTURA DE DATOS DE POSICIONES
  // ===================================

  // Crear contratos para leer datos de todas las posiciones
  const positionContracts = useMemo(() => {
    if (!userPositionIds || !contractAddresses?.flexibleLoanManager || !Array.isArray(userPositionIds)) return []

    const contracts: any[] = []
    
    for (const positionId of userPositionIds) {
      // Datos básicos de la posición
      contracts.push({
        address: contractAddresses.flexibleLoanManager,
        abi: FLEXIBLE_LOAN_MANAGER_ABI as any,
        functionName: 'getPosition',
        args: [positionId]
      })
      
      // Deuda total
      contracts.push({
        address: contractAddresses.flexibleLoanManager,
        abi: FLEXIBLE_LOAN_MANAGER_ABI as any,
        functionName: 'getTotalDebt',
        args: [positionId]
      })
      
      // Interés acumulado
      contracts.push({
        address: contractAddresses.flexibleLoanManager,
        abi: FLEXIBLE_LOAN_MANAGER_ABI as any,
        functionName: 'getAccruedInterest',
        args: [positionId]
      })
      
      // Ratio de colateralización
      contracts.push({
        address: contractAddresses.flexibleLoanManager,
        abi: FLEXIBLE_LOAN_MANAGER_ABI as any,
        functionName: 'getCollateralizationRatio',
        args: [positionId]
      })
      
      // Estado de riesgo
      contracts.push({
        address: contractAddresses.flexibleLoanManager,
        abi: FLEXIBLE_LOAN_MANAGER_ABI as any,
        functionName: 'isPositionAtRisk',
        args: [positionId]
      })
    }
    
    return contracts
  }, [userPositionIds, contractAddresses?.flexibleLoanManager])

  // 🔥 OPTIMIZACIÓN: Leer todos los datos de las posiciones con cache inteligente
  const { 
    data: positionContractData, 
    refetch: refetchPositionData,
    isLoading: isLoadingData 
  } = useReadContracts({
    contracts: positionContracts,
    query: {
      enabled: positionContracts.length > 0,
      refetchOnWindowFocus: false,
      staleTime: 15000, // 🔥 Cache durante 15 segundos
      gcTime: 180000, // 🔥 Mantener en cache por 3 minutos
      retry: 1, // 🔥 Solo 1 reintento para múltiples contratos
      retryDelay: 5000, // 🔥 5 segundos entre reintentos
      refetchOnMount: false // 🔥 No refetch automático al montar
    }
  })

  // ===================================
  // 🧮 PROCESAMIENTO DE DATOS
  // ===================================

  // Procesar datos de las posiciones
  useEffect(() => {
    if (!userPositionIds || !positionContractData || !Array.isArray(userPositionIds) || !Array.isArray(positionContractData)) {
      setPositionsData([])
      return
    }

    const processedPositions: PositionData[] = []

    for (let i = 0; i < userPositionIds.length; i++) {
      const positionId = userPositionIds[i]
      const dataIndex = i * 5 // 5 llamadas por posición

      try {
        const position = positionContractData[dataIndex]?.result as LoanPosition
        const totalDebt = positionContractData[dataIndex + 1]?.result as bigint
        const accruedInterest = positionContractData[dataIndex + 2]?.result as bigint
        const collateralizationRatio = positionContractData[dataIndex + 3]?.result as bigint
        const riskData = positionContractData[dataIndex + 4]?.result as [boolean, bigint]

        if (position && position.isActive) {
          // Calcular health factor
          const healthFactor = calculateHealthFactor(collateralizationRatio)
          
          // 🔧 FIX: Determinar decimales correctos basándose en el tipo de asset
          const getAssetDecimals = (assetAddress: Address): number => {
            const addressLower = assetAddress.toLowerCase()
            if (addressLower === contractAddresses?.mockUSDC?.toLowerCase()) {
              return 6 // USDC tiene 6 decimales
            }
            if (addressLower === contractAddresses?.mockWBTC?.toLowerCase()) {
              return 8 // WBTC tiene 8 decimales
            }
            return 18 // ETH, VCOP y otros tokens típicamente tienen 18 decimales
          }
          
          // Formatear valores con decimales correctos
          const collateralDecimals = getAssetDecimals(position.collateralAsset)
          const loanDecimals = getAssetDecimals(position.loanAsset)
          
          const collateralValueFormatted = formatUnits(position.collateralAmount, collateralDecimals)
          const debtValueFormatted = formatUnits(totalDebt || 0n, loanDecimals)

          console.log(`🔍 Position ${positionId} formatting:`, {
            collateralAsset: position.collateralAsset,
            loanAsset: position.loanAsset,
            collateralDecimals,
            loanDecimals,
            collateralRaw: position.collateralAmount.toString(),
            collateralFormatted: collateralValueFormatted,
            debtRaw: (totalDebt || 0n).toString(),
            debtFormatted: debtValueFormatted
          })

          processedPositions.push({
            positionId,
            position,
            totalDebt: totalDebt || 0n,
            accruedInterest: accruedInterest || 0n,
            collateralizationRatio: collateralizationRatio || 0n,
            isAtRisk: riskData?.[0] || false,
            riskLevel: riskData?.[1] || 0n,
            healthFactor,
            collateralValueFormatted,
            debtValueFormatted
          })
        }
      } catch (err) {
        console.error(`Error processing position ${positionId}:`, err)
      }
    }

    setPositionsData(processedPositions)
  }, [userPositionIds, positionContractData])

  // ===================================
  // ✍️ FUNCIONES DE ESCRITURA
  // ===================================

  // Hook para transacciones
  const { 
    writeContractAsync,
    isPending,
    error: txError,
    reset: resetTx
  } = useWriteContract()

  // ===================================
  // 🚀 FUNCIONES PERMIT2
  // ===================================

  /**
   * Verificar si el usuario ya aprobó Permit2
   */
  const checkPermit2Approval = useCallback(async (tokenAddress: Address): Promise<boolean> => {
    if (!address || !publicClient) return false

    try {
      const allowance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, PERMIT2_ADDRESS]
      }) as bigint

      // Consideramos que está aprobado si tiene al menos 1000 tokens de allowance
      const minApproval = parseUnits('1000', 6) // Para USDC
      return allowance >= minApproval
    } catch (error) {
      console.error('Error checking Permit2 approval:', error)
      return false
    }
  }, [address, publicClient])

  /**
   * Aprobar Permit2 (solo se hace una vez por token)
   */
  const approvePermit2 = useCallback(async (tokenAddress: Address): Promise<boolean> => {
    if (!address) return false

    try {
      console.log('🔄 Approving Permit2 for token:', tokenAddress)
      
      // Aprobar cantidad máxima a Permit2
      const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
      
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [PERMIT2_ADDRESS, maxApproval]
      })

      console.log('✅ Permit2 approval successful! Hash:', hash)
      return true
    } catch (error) {
      console.error('💥 Error approving Permit2:', error)
      return false
    }
  }, [address, writeContractAsync])

  /**
   * Crear firma Permit2 para transferencia
   */
  const createPermit2Signature = useCallback(async (
    tokenAddress: Address,
    amount: bigint,
    spender: Address
  ): Promise<{ permit: PermitTransferFrom; signature: `0x${string}` } | null> => {
    if (!address || !walletClient) return null

    try {
      console.log('🔄 Creating Permit2 signature...')
      
      // Generar nonce único (timestamp actual)
      const nonce = BigInt(Math.floor(Date.now() / 1000))
      
      // Deadline: 30 minutos desde ahora
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800)

      const permit: PermitTransferFrom = {
        permitted: {
          token: tokenAddress,
          amount: amount
        },
        nonce: nonce,
        deadline: deadline
      }

      // Crear el mensaje EIP-712 para Permit2
      const domain = {
        name: 'Permit2',
        chainId: chainId,
        verifyingContract: PERMIT2_ADDRESS
      }

      const types = {
        PermitTransferFrom: [
          { name: 'permitted', type: 'TokenPermissions' },
          { name: 'spender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' }
        ],
        TokenPermissions: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ]
      }

      const message = {
        permitted: {
          token: tokenAddress,
          amount: amount
        },
        spender: spender,
        nonce: nonce,
        deadline: deadline
      }

      // Firmar el mensaje
      const signature = await walletClient.signTypedData({
        domain,
        types,
        primaryType: 'PermitTransferFrom',
        message
      })

      console.log('✅ Permit2 signature created successfully')
      return { permit, signature }
    } catch (error) {
      console.error('💥 Error creating Permit2 signature:', error)
      return null
    }
  }, [address, walletClient, chainId])

  /**
   * 🔥 OPTIMIZACIÓN: Refrescar datos con throttling para evitar spam de solicitudes
   */
  const refreshPositions = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // 🔥 OPTIMIZACIÓN: Batch las solicitudes con delay para evitar saturar RPC
      await refetchPositionIds()
      
      // Esperar un poco antes de la segunda solicitud
      await new Promise(resolve => setTimeout(resolve, 500))
      
      await refetchPositionData()
    } catch (error) {
      console.error('Error refreshing positions:', error)
      setError('Failed to refresh positions')
    } finally {
      setIsLoading(false)
    }
  }, [refetchPositionIds, refetchPositionData])

  // 🔥 OPTIMIZACIÓN: Throttle para refreshPositions (máximo una vez cada 3 segundos)
  const throttledRefreshPositions = useCallback(
    (() => {
      let lastCall = 0
      return async () => {
        const now = Date.now()
        if (now - lastCall >= 3000) { // 3 segundos de throttle
          lastCall = now
          await refreshPositions()
        } else {
          console.log('🔥 Refresh throttled - too many requests')
        }
      }
    })(),
    [refreshPositions]
  )

  /**
   * Detecta qué asset handler maneja un token específico
   */
  const detectAssetHandler = useCallback(async (tokenAddress: Address): Promise<Address | null> => {
    if (!contractAddresses) return null

    try {
      const handlers = [
        contractAddresses.vaultBasedHandler,
        // Agregar otros handlers aquí cuando estén disponibles
      ]

      for (const handlerAddress of handlers) {
        if (!handlerAddress) continue
        
        try {
          const isSupported = await publicClient?.readContract({
            address: handlerAddress,
            abi: VAULT_BASED_HANDLER_ABI as any,
            functionName: 'isAssetSupported',
            args: [tokenAddress]
          })
          
          if (isSupported) {
            console.log(`🎯 Token ${tokenAddress} is handled by:`, handlerAddress)
            return handlerAddress
          }
        } catch (error) {
          console.log(`Handler ${handlerAddress} check failed:`, error)
          continue
        }
      }

      return null
    } catch (error) {
      console.error('Error detecting asset handler:', error)
      return null
    }
  }, [contractAddresses, publicClient])

  /**
   * Repagar completamente una posición con UX optimizada (menos clicks)
   */
  const repayFullPosition = useCallback(async (
    positionId: bigint,
    loanAssetAddress: Address
  ): Promise<RepaymentResult> => {
    if (!contractAddresses?.flexibleLoanManager || !address) {
      return { success: false, error: 'Contract addresses not loaded or wallet not connected' }
    }

    try {
      setError(null)
      resetTx()
      
      // 1. Get position data and verify it exists
      const positionData = positionsData.find(p => p.positionId === positionId)
      if (!positionData) {
        return { success: false, error: 'Position not found' }
      }

      // Check if position is still active
      if (!positionData.position.isActive) {
        // If position is inactive, it means it's already repaid and ready for collateral withdrawal
        return { 
          success: false, 
          error: 'This position has already been repaid. You can now withdraw your collateral using the "Withdraw Collateral" button.' 
        }
      }

      const { totalDebt, accruedInterest, position } = positionData
      
      console.log('🔄 Starting CORRECT repayment flow according to FlexibleLoanManager.sol...')
      console.log('💰 Total debt:', formatUnits(totalDebt, 6), 'USDC')
      console.log('💸 Accrued interest:', formatUnits(accruedInterest, 6), 'USDC')

      // 2. Detect asset handler for loan token
      const assetHandler = await detectAssetHandler(loanAssetAddress)
      if (!assetHandler) {
        throw new Error('No asset handler found for loan token')
      }
      console.log('✅ Asset handler detected:', assetHandler)

      // 3. Calculate payment breakdown
      const protocolFee = 5000n // 0.5%
      const interestFee = (accruedInterest * protocolFee) / 1000000n
      const principalPayment = position.loanAmount

      console.log('📊 Payment breakdown:')
      console.log('  Interest fee (to FlexibleLoanManager):', formatUnits(interestFee, 6), 'USDC')
      console.log('  Principal (to AssetHandler):', formatUnits(principalPayment, 6), 'USDC')

      // 4. Check allowances
      const [loanManagerAllowance, assetHandlerAllowance] = await Promise.all([
        publicClient?.readContract({
          address: loanAssetAddress,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, contractAddresses.flexibleLoanManager]
        }) as Promise<bigint>,
        publicClient?.readContract({
          address: loanAssetAddress,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, assetHandler]
        }) as Promise<bigint>
      ])

      console.log('🔍 Current allowances:')
      console.log('  FlexibleLoanManager:', formatUnits(loanManagerAllowance, 6), 'USDC')
      console.log('  AssetHandler:', formatUnits(assetHandlerAllowance, 6), 'USDC')

      // 5. Approve if needed (with 10% buffer)
      const approvalPromises = []
      let approvalsNeeded = 0

      const bufferMultiplier = 110n // 110% buffer
      const safeInterestFee = (interestFee * bufferMultiplier) / 100n
      const safePrincipalAmount = (principalPayment * bufferMultiplier) / 100n

      if (!loanManagerAllowance || loanManagerAllowance < safeInterestFee) {
        approvalPromises.push(
          writeContractAsync({
            address: loanAssetAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [contractAddresses.flexibleLoanManager, safeInterestFee]
          })
        )
        approvalsNeeded++
      }

      if (!assetHandlerAllowance || assetHandlerAllowance < safePrincipalAmount) {
        approvalPromises.push(
          writeContractAsync({
            address: loanAssetAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [assetHandler, safePrincipalAmount]
          })
        )
        approvalsNeeded++
      }

      if (approvalPromises.length > 0) {
        console.log(`ℹ️  You will need to sign ${approvalsNeeded} approval transaction(s) + 1 repayment transaction`)
        setTransactionStep('approving')
        
        try {
          await Promise.all(approvalPromises)
          await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for approvals to propagate
        } catch (approveError: any) {
          if (approveError?.message?.includes('User rejected') || 
              approveError?.message?.includes('User denied')) {
            setTransactionStep('idle')
            return { success: false, error: 'Approval cancelled by user' }
          }
          throw approveError
        }
      } else {
        console.log('✅ Sufficient allowances already exist, skipping approvals!')
        console.log('ℹ️  You will only need to sign 1 repayment transaction')
      }

      // 6. Check user balance before repayment
      console.log('💰 Checking user balance before repayment...')
      const userBalance = await publicClient?.readContract({
        address: loanAssetAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address]
      }) as bigint

      console.log('💰 User balance:', formatUnits(userBalance, 6), 'USDC')
      console.log('💸 Required:', formatUnits(totalDebt, 6), 'USDC')

      if (!userBalance || userBalance < totalDebt) {
        return { 
          success: false, 
          error: `Insufficient balance. Required: ${formatUnits(totalDebt, 6)} USDC, Available: ${formatUnits(userBalance, 6)} USDC` 
        }
      }

      // 7. Simulate repayment transaction first
      console.log('🔍 Simulating repayment transaction first...')
      try {
        await publicClient?.simulateContract({
          address: contractAddresses.flexibleLoanManager,
          abi: FLEXIBLE_LOAN_MANAGER_ABI,
          functionName: 'repayLoan',
          args: [positionId, totalDebt],
          account: address
        })
      } catch (simError: any) {
        console.error('Transaction simulation failed:', simError)
        return {
          success: false,
          error: 'Transaction simulation failed - position may not be active or insufficient balance'
        }
      }

      // 8. Execute repayment
      setTransactionStep('repaying')
      console.log('🔄 Executing repayment...')

      const repayHash = await writeContractAsync({
        address: contractAddresses.flexibleLoanManager,
        abi: FLEXIBLE_LOAN_MANAGER_ABI,
        functionName: 'repayLoan',
        args: [positionId, totalDebt]
      })

      console.log('✅ Repayment successful! Transaction:', repayHash)
      setTransactionStep('idle')

              // 9. Wait for transaction and refresh data
        await publicClient?.waitForTransactionReceipt({ hash: repayHash })
        
        // 10. 🔥 OPTIMIZACIÓN: Usar refresh normal con delay para evitar spam
        setTimeout(() => {
          refreshPositions()
        }, 2000) // Esperar 2 segundos antes de refrescar

      // 11. Check if position is now inactive (fully repaid)
      const updatedPosition = positionsData.find(p => p.positionId === positionId)
      if (updatedPosition && !updatedPosition.position.isActive) {
        return { 
          success: true, 
          txHash: repayHash,
          message: '✅ Loan successfully repaid! You can now withdraw your collateral using the "Withdraw Collateral" button.'
        }
      }

      return { success: true, txHash: repayHash }

    } catch (error: any) {
      console.error('💥 Repayment error:', error)
      setTransactionStep('idle')
      
      // Handle specific error cases
      if (error?.message?.includes('User rejected') || 
          error?.message?.includes('User denied')) {
        return { success: false, error: 'Transaction cancelled by user' }
      }
      
      if (error?.message?.includes('execution reverted')) {
        return { 
          success: false, 
          error: 'Transaction failed - position may be inactive or already repaid' 
        }
      }
      
      return { 
        success: false, 
        error: error?.message || 'Unknown error during repayment' 
      }
    }
  }, [
    address, 
    contractAddresses, 
    positionsData, 
    publicClient, 
    writeContractAsync,
    refreshPositions,
    resetTx,
    setError,
    setTransactionStep,
    detectAssetHandler
  ])

  /**
   * Repagar parcialmente una posición con UX optimizada
   */
  const repayPartialPosition = useCallback(async (
    positionId: bigint,
    loanAssetAddress: Address,
    amount: bigint
  ): Promise<RepaymentResult> => {
    if (!contractAddresses?.flexibleLoanManager || !address) {
      return { success: false, error: 'Contract addresses not loaded or wallet not connected' }
    }

    try {
      setError(null)
      resetTx()
      
      // Encontrar la posición para obtener los intereses acumulados
      const positionData = positionsData.find(p => p.positionId === positionId)
      if (!positionData) {
        return { success: false, error: 'Position not found' }
      }

      const accruedInterest = positionData.accruedInterest
      
      console.log('🔄 Starting CORRECT partial repayment flow...')
      console.log('💰 Repay amount:', formatUnits(amount, 6), 'USDC')

      setTransactionStep('approving')

      // Detectar asset handler
      const assetHandler = await detectAssetHandler(loanAssetAddress)
      if (!assetHandler) {
        throw new Error('No asset handler found for loan token')
      }

      // Calcular distribución del pago parcial según lógica de FlexibleLoanManager
      const protocolFee = 5000n // 0.5%
      const interestPayment = amount > accruedInterest ? accruedInterest : amount
      const principalPayment = amount - interestPayment
      const interestFee = (interestPayment * protocolFee) / 1000000n

      console.log('📊 Partial payment breakdown:')
      console.log('  Interest fee:', formatUnits(interestFee, 6), 'USDC')
      console.log('  Principal:', formatUnits(principalPayment, 6), 'USDC')

      // Verificar allowances y aprobar solo si es necesario
      const [loanManagerAllowance, assetHandlerAllowance] = await Promise.all([
        publicClient?.readContract({
          address: loanAssetAddress,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, contractAddresses.flexibleLoanManager]
        }) as Promise<bigint>,
        publicClient?.readContract({
          address: loanAssetAddress,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, assetHandler]
        }) as Promise<bigint>
      ])

      const approvalPromises = []
      let approvalsNeeded = 0

      const bufferMultiplier = 120n // 120% buffer
      const safeInterestFee = (interestFee * bufferMultiplier) / 100n
      const safePrincipalAmount = (principalPayment * bufferMultiplier) / 100n
      
      if (!loanManagerAllowance || loanManagerAllowance < safeInterestFee) {
        approvalPromises.push(
          writeContractAsync({
            address: loanAssetAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [contractAddresses.flexibleLoanManager, safeInterestFee]
          })
        )
        approvalsNeeded++
      }

      if (!assetHandlerAllowance || assetHandlerAllowance < safePrincipalAmount) {
        approvalPromises.push(
          writeContractAsync({
            address: loanAssetAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [assetHandler, safePrincipalAmount]
          })
        )
        approvalsNeeded++
      }

      if (approvalPromises.length > 0) {
        console.log(`ℹ️  You will need to sign ${approvalsNeeded} approval transaction(s) + 1 repayment transaction`)
        
        try {
          await Promise.all(approvalPromises)
          await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (approvalError: any) {
          if (approvalError?.message?.includes('User rejected') || 
              approvalError?.message?.includes('User denied') ||
              approvalError?.name === 'UserRejectedRequestError') {
            console.log('❌ User cancelled approval transaction')
            setTransactionStep('idle')
            return { success: false, error: 'Transaction cancelled by user' }
          }
          throw approvalError
        }
      } else {
        console.log('ℹ️  You will only need to sign 1 repayment transaction')
      }

      // Ejecutar repago parcial
      setTransactionStep('repaying')
      
      try {
        const repayHash = await writeContractAsync({
          address: contractAddresses.flexibleLoanManager,
          abi: FLEXIBLE_LOAN_MANAGER_ABI,
          functionName: 'repayLoan',
          args: [positionId, amount]
        })

        console.log('🎉 Partial repayment successful! Hash:', repayHash)
        setTransactionStep('idle')
        
        // 🔥 OPTIMIZACIÓN: Usar refresh normal con delay
        setTimeout(() => {
          refreshPositions()
        }, 2000)
        
        return { success: true, txHash: repayHash }
      } catch (repayError: any) {
        if (repayError?.message?.includes('User rejected') || 
            repayError?.message?.includes('User denied') ||
            repayError?.name === 'UserRejectedRequestError') {
          console.log('❌ User cancelled repayment transaction')
          setTransactionStep('idle')
          return { success: false, error: 'Repayment cancelled by user' }
        }
        throw repayError
      }

    } catch (error: any) {
      setTransactionStep('idle')
      
      let errorMessage = 'Partial repayment failed'
      
      if (error?.message?.includes('User rejected') || 
          error?.message?.includes('User denied') ||
          error?.name === 'UserRejectedRequestError') {
        errorMessage = 'Transaction cancelled by user'
        console.log('❌ User cancelled transaction')
      } else if (error?.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient USDC balance for repayment'
        console.error('💰 Insufficient funds error:', error)
      } else if (error?.message?.includes('execution reverted')) {
        errorMessage = 'Transaction failed - please check your position status'
        console.error('🔄 Transaction reverted:', error)
      } else {
        console.error('💥 Unexpected partial repayment error:', error)
        errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      }
      
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [
    contractAddresses,
    address,
    positionsData,
    writeContractAsync,
    resetTx,
    refreshPositions,
    publicClient,
    detectAssetHandler
  ])

  const isProcessing = isLoading || isLoadingIds || isLoadingData || 
                      isPending || transactionStep !== 'idle' || addressesLoading

  return {
    // 📊 Datos
    positions: positionsData,
    contractAddresses,
    
    // 🔄 Estados
    isLoading: isProcessing,
    error: combinedError || txError?.message,
    
    // 🚀 Funciones - Usando versión throttled para refresh
    repayFullPosition,
    repayPartialPosition,
    refreshPositions: throttledRefreshPositions, // 🔥 OPTIMIZACIÓN: Usar versión throttled
    getAssetSymbol: getAssetSymbolFromHook, // 🔥 REFACTORIZACIÓN: Usar función del hook centralizado
    
    // 🔄 Estados de transacciones
    isApproving: transactionStep === 'approving',
    isRepaying: transactionStep === 'repaying',
    
    // Hash de transacciones y errores
    lastTxHash: null,
    txError
  }
}

// ===================================
// 🧮 FUNCIONES AUXILIARES
// ===================================

function calculateHealthFactor(ratio: bigint): string {
  if (ratio === 0n) return "0.00"
  
  // Convertir de ratio (base 1000000) a factor de salud
  const healthFactor = Number(ratio) / 1000000
  return healthFactor.toFixed(2)
}

// 🔥 DEPRECATED: Esta función ahora está centralizada en useContractAddresses
// Se mantiene solo para compatibilidad retroactiva
export function getAssetSymbol(assetAddress: Address, contractAddresses?: ContractAddresses): string {
  console.warn('⚠️ getAssetSymbol is deprecated. Use useContractAddresses().getAssetSymbol() instead')
  
  if (!contractAddresses) {
    // Fallback para direcciones hardcodeadas (compatibilidad)
    const symbolMap: Record<string, string> = {
      '0x4f34BF3352A701AEc924CE34d6CfC373eABb186c': 'ETH',
      '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359': 'USDC',
      '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174': 'USDC.e',
      '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39': 'LINK'
    }
    return symbolMap[assetAddress.toLowerCase()] || 'Unknown'
  }

  // 🔧 FIX: Usar direcciones dinámicas del contrato
  const addressLower = assetAddress.toLowerCase()
  
  if (addressLower === contractAddresses.mockETH?.toLowerCase()) {
    return 'ETH'
  }
  if (addressLower === contractAddresses.mockUSDC?.toLowerCase()) {
    return 'USDC'
  }
  if (addressLower === contractAddresses.mockWBTC?.toLowerCase()) {
    return 'WBTC'
  }
  if (addressLower === contractAddresses.vcopToken?.toLowerCase()) {
    return 'VCOP'
  }
  
  // Fallback para direcciones no reconocidas
  return 'Unknown'
}

export function formatNumber(value: string | number, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num)
}

export function getRiskColor(riskLevel: bigint): string {
  if (riskLevel === 0n) return 'text-green-600'
  if (riskLevel === 1n) return 'text-yellow-600'
  return 'text-red-600'
}

export function getRiskBgColor(riskLevel: bigint): string {
  if (riskLevel === 0n) return 'bg-green-100'
  if (riskLevel === 1n) return 'bg-yellow-100'
  return 'bg-red-100'
} 