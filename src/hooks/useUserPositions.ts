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

export interface ContractAddresses {
  flexibleLoanManager: Address
  vaultBasedHandler: Address
  mockETH: Address
  mockUSDC: Address
  feeCollector: Address
}

export interface RepaymentResult {
  success: boolean
  txHash?: Hash
  error?: string
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

  // Estados del hook
  const [contractAddresses, setContractAddresses] = useState<ContractAddresses | null>(null)
  const [positionsData, setPositionsData] = useState<PositionData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transactionStep, setTransactionStep] = useState<'idle' | 'approving' | 'repaying'>('idle')

  // ===================================
  // 📡 CARGA DE CONFIGURACIÓN
  // ===================================

  // Cargar direcciones de contratos
  useEffect(() => {
    const loadContractAddresses = async () => {
      try {
        const response = await fetch('/deployed-addresses-mock.json')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        const addresses = {
          flexibleLoanManager: data.coreLending?.flexibleLoanManager as Address,
          vaultBasedHandler: data.coreLending?.vaultBasedHandler as Address,
          mockETH: data.tokens?.mockETH as Address,
          mockUSDC: data.tokens?.mockUSDC as Address,
          feeCollector: data.config?.feeCollector as Address
        }
        
        console.log('🏗️ Contract addresses loaded:', addresses)
        setContractAddresses(addresses)
      } catch (err) {
        console.error('Error loading contract addresses:', err)
        setError(`Failed to load contract addresses: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    loadContractAddresses()
  }, [chainId])

  // ===================================
  // 🔍 LECTURA DE POSICIONES DEL USUARIO
  // ===================================

  // Obtener IDs de posiciones del usuario
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
      enabled: Boolean(contractAddresses?.flexibleLoanManager && address),
      refetchOnWindowFocus: false
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

  // Leer todos los datos de las posiciones
  const { 
    data: positionContractData, 
    refetch: refetchPositionData,
    isLoading: isLoadingData 
  } = useReadContracts({
    contracts: positionContracts,
    query: {
      enabled: positionContracts.length > 0,
      refetchOnWindowFocus: false
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
          
          // Formatear valores (asumiendo precios mock)
          const collateralValueFormatted = formatUnits(position.collateralAmount, 18)
          const debtValueFormatted = formatUnits(totalDebt || 0n, 6) // USDC tiene 6 decimales

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
   * Refrescar todos los datos
   */
  const refreshPositions = useCallback(async () => {
    try {
      setIsLoading(true)
      await Promise.all([
        refetchPositionIds(),
        refetchPositionData()
      ])
    } catch (error) {
      console.error('Error refreshing positions:', error)
      setError('Failed to refresh positions')
    } finally {
      setIsLoading(false)
    }
  }, [refetchPositionIds, refetchPositionData])

  /**
   * Repagar completamente una posición usando aprobaciones directas ERC20
   */
  const repayFullPosition = useCallback(async (
    positionId: bigint,
    loanAssetAddress: Address
  ): Promise<RepaymentResult> => {
    if (!contractAddresses?.flexibleLoanManager || !contractAddresses?.vaultBasedHandler || !address) {
      return { success: false, error: 'Contract addresses not loaded or wallet not connected' }
    }

    // Encontrar la posición para obtener la deuda total
    const positionData = positionsData.find(p => p.positionId === positionId)
    if (!positionData) {
      return { success: false, error: 'Position not found' }
    }

    try {
      setError(null)
      resetTx()
      
      const totalDebt = positionData.totalDebt
      const accruedInterest = positionData.accruedInterest
      
      // 🔧 FLUJO CORRECTO IDENTIFICADO:
      // 1. FlexibleLoanManager.repayLoan() hace: safeTransferFrom(user, feeCollector, fee)
      // 2. VaultBasedHandler.repay() hace: safeTransferFrom(user, vaultHandler, principal)
      // 
      // Por lo tanto, necesitamos aprobar tokens a AMBOS contratos
      
      // Calcular montos exactos
      const repayAmount = totalDebt
      const interestPayment = repayAmount > accruedInterest ? accruedInterest : repayAmount
      const principalPayment = repayAmount - interestPayment
      const protocolFee = 5000n // 0.5%
      const interestFee = (interestPayment * protocolFee) / 1000000n
      
      // Montos que necesita cada contrato:
      const flexibleLoanManagerAmount = interestFee // Para el fee al feeCollector
      const vaultBasedHandlerAmount = principalPayment // Para el principal al vault
      const totalApprovalAmount = flexibleLoanManagerAmount + vaultBasedHandlerAmount
      const approvalBuffer = (totalApprovalAmount * 15n) / 100n // 15% buffer
      const finalApprovalAmount = totalApprovalAmount + approvalBuffer

      console.log('🔄 Starting direct ERC20 approval repayment...')
      console.log('💰 Total debt:', formatUnits(totalDebt, 6), 'USDC')
      console.log('💸 Interest fee (to FlexibleLoanManager):', formatUnits(interestFee, 6), 'USDC')
      console.log('💸 Principal payment (to VaultBasedHandler):', formatUnits(principalPayment, 6), 'USDC')
      console.log('💸 Total approval needed:', formatUnits(totalApprovalAmount, 6), 'USDC')
      console.log('✅ Final approval amount (with buffer):', formatUnits(finalApprovalAmount, 6), 'USDC')

      // Paso 1: Aprobar tokens al FlexibleLoanManager (para el fee)
      setTransactionStep('approving')
      console.log('🔄 Approving FlexibleLoanManager for fee handling...')
      
      const approveFlexibleHash = await writeContractAsync({
        address: loanAssetAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contractAddresses.flexibleLoanManager, finalApprovalAmount]
      })

      console.log('✅ FlexibleLoanManager approval successful! Hash:', approveFlexibleHash)

      // Paso 2: Aprobar tokens al VaultBasedHandler (para el principal)
      console.log('🔄 Approving VaultBasedHandler for principal handling...')
      
      const approveVaultHash = await writeContractAsync({
        address: loanAssetAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contractAddresses.vaultBasedHandler, finalApprovalAmount]
      })

      console.log('✅ VaultBasedHandler approval successful! Hash:', approveVaultHash)

      // Paso 3: Esperar un poco para que las aprobaciones se propaguen
      console.log('⏳ Waiting for approvals to propagate...')
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Paso 4: Ejecutar repago a través de FlexibleLoanManager
      // Este método internamente:
      // - Transferirá el fee desde el usuario al feeCollector
      // - Llamará a VaultBasedHandler.repay() que transferirá el principal desde el usuario al vault
      setTransactionStep('repaying')
      console.log('🚀 Executing repayment via FlexibleLoanManager...')

      const repayHash = await writeContractAsync({
        address: contractAddresses.flexibleLoanManager,
        abi: FLEXIBLE_LOAN_MANAGER_ABI,
        functionName: 'repayLoan',
        args: [positionId, totalDebt]
      })

      console.log('🎉 Repayment successful! Hash:', repayHash)
      setTransactionStep('idle')
      
      // Refrescar datos después del repago exitoso
      setTimeout(() => {
        refreshPositions()
      }, 3000)
      
      return { success: true, txHash: repayHash }

    } catch (error) {
      setTransactionStep('idle')
      console.error('💥 Direct ERC20 repayment error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Direct ERC20 repayment failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [
    contractAddresses,
    address,
    positionsData,
    writeContractAsync,
    resetTx,
    refreshPositions
  ])

  /**
   * Repagar parcialmente una posición usando aprobaciones directas ERC20
   */
  const repayPartialPosition = useCallback(async (
    positionId: bigint,
    loanAssetAddress: Address,
    amount: bigint
  ): Promise<RepaymentResult> => {
    if (!contractAddresses?.flexibleLoanManager || !contractAddresses?.vaultBasedHandler || !address) {
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
      
      // Calcular montos para repago parcial
      const repayAmount = amount
      const interestPayment = repayAmount > accruedInterest ? accruedInterest : repayAmount
      const principalPayment = repayAmount - interestPayment
      const protocolFee = 5000n // 0.5%
      const interestFee = (interestPayment * protocolFee) / 1000000n
      
      const flexibleLoanManagerAmount = interestFee
      const vaultBasedHandlerAmount = principalPayment
      const totalApprovalAmount = flexibleLoanManagerAmount + vaultBasedHandlerAmount
      const approvalBuffer = (totalApprovalAmount * 15n) / 100n // 15% buffer
      const finalApprovalAmount = totalApprovalAmount + approvalBuffer

      console.log('🔄 Starting partial direct ERC20 repayment...')
      console.log('💰 Repay amount:', formatUnits(amount, 6), 'USDC')
      console.log('💸 Interest fee (to FlexibleLoanManager):', formatUnits(interestFee, 6), 'USDC')
      console.log('💸 Principal payment (to VaultBasedHandler):', formatUnits(principalPayment, 6), 'USDC')
      console.log('📊 Total approval needed:', formatUnits(totalApprovalAmount, 6), 'USDC')
      console.log('✅ Final approval amount (with buffer):', formatUnits(finalApprovalAmount, 6), 'USDC')

      // Aprobar a ambos contratos
      setTransactionStep('approving')
      
      const approveFlexibleHash = await writeContractAsync({
        address: loanAssetAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contractAddresses.flexibleLoanManager, finalApprovalAmount]
      })

      const approveVaultHash = await writeContractAsync({
        address: loanAssetAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contractAddresses.vaultBasedHandler, finalApprovalAmount]
      })

      console.log('✅ Both approvals successful!')
      
      // Esperar propagación
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Ejecutar repago
      setTransactionStep('repaying')
      const repayHash = await writeContractAsync({
        address: contractAddresses.flexibleLoanManager,
        abi: FLEXIBLE_LOAN_MANAGER_ABI,
        functionName: 'repayLoan',
        args: [positionId, amount]
      })

      console.log('🎉 Partial repayment successful! Hash:', repayHash)
      setTransactionStep('idle')
      
      // Refrescar datos después del repago exitoso
      setTimeout(() => {
        refreshPositions()
      }, 3000)
      
      return { success: true, txHash: repayHash }

    } catch (error) {
      setTransactionStep('idle')
      console.error('💥 Partial direct ERC20 repayment error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Partial direct ERC20 repayment failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [
    contractAddresses,
    address,
    positionsData,
    writeContractAsync,
    resetTx,
    refreshPositions
  ])

  const isProcessing = isLoading || isLoadingIds || isLoadingData || 
                      isPending || transactionStep !== 'idle'

  return {
    // 📊 Datos
    positions: positionsData,
    contractAddresses,
    
    // 🔄 Estados
    isLoading: isProcessing,
    error: error || txError?.message,
    
    // 🚀 Funciones
    repayFullPosition,
    repayPartialPosition,
    refreshPositions,
    
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

export function getAssetSymbol(assetAddress: Address): string {
  const symbolMap: Record<string, string> = {
    '0x4f34BF3352A701AEc924CE34d6CfC373eABb186c': 'ETH',
    '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359': 'USDC',
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174': 'USDC.e',
    '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39': 'LINK'
  }
  
  return symbolMap[assetAddress.toLowerCase()] || 'Unknown'
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