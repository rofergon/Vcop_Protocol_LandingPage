/**
 * @fileoverview useCreatePosition.ts  
 * @description Hook completo para crear posiciones usando wagmi v2 + viem v2
 * @version 2025 - Compatible con las últimas versiones
 */

import { useState, useCallback, useEffect } from 'react'
import { 
  useAccount, 
  useReadContract, 
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  useChainId
} from 'wagmi'
import { 
  formatUnits, 
  parseUnits,
  type Address,
  type Hash
} from 'viem'

// Importar ABIs
import FlexibleLoanManagerABI from '../Abis/FlexibleLoanManager.json'
import VaultBasedHandlerABI from '../Abis/VaultBasedHandler.json'

// ===================================
// 🔧 TIPOS PRINCIPALES
// ===================================

export interface LoanTerms {
  collateralAsset: Address
  loanAsset: Address  
  collateralAmount: bigint
  loanAmount: bigint
  maxLoanToValue: bigint    // 6 decimals (800000 = 80%)
  interestRate: bigint      // 6 decimals (80000 = 8% APR)
  duration: bigint          // 0 = perpetual loan
}

export interface ContractAddresses {
  flexibleLoanManager: Address
  vaultBasedHandler: Address
  mockETH: Address
  mockUSDC: Address
  mockWBTC: Address
  vcopToken: Address
}

export interface CreatePositionState {
  isLoading: boolean
  error: string | null
  success: boolean
  positionId: bigint | null
  txHash: Hash | null
  step: 'idle' | 'checking' | 'approving' | 'creating' | 'completed'
}

// ===================================
// 📋 ABIs (SIMPLIFICADOS)
// ===================================

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function', 
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const

// ===================================
// 🚀 HOOK PRINCIPAL
// ===================================

export function useCreatePosition({
  addresses,
  autoVerifyBalances = true
}: {
  addresses: ContractAddresses
  autoVerifyBalances?: boolean
}) {
  
  const [state, setState] = useState<CreatePositionState>({
    isLoading: false,
    error: null,
    success: false,
    positionId: null,
    txHash: null,
    step: 'idle'
  })

  // Wagmi v2 hooks
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  
  // Balances usando useBalance de wagmi v2
  const { data: ethBalance, refetch: refetchETHBalance } = useBalance({
    address,
    token: addresses.mockETH,
    query: { enabled: !!address && autoVerifyBalances }
  })
  
  const { data: usdcBalance, refetch: refetchUSDCBalance } = useBalance({
    address, 
    token: addresses.mockUSDC,
    query: { enabled: !!address && autoVerifyBalances }
  })

  // Allowance check
  const { data: ethAllowance, refetch: refetchAllowance } = useReadContract({
    address: addresses.mockETH,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && addresses.flexibleLoanManager ? [address, addresses.flexibleLoanManager] : undefined,
    query: { enabled: !!address }
  })

  // Write contracts usando wagmi v2
  const { 
    writeContract: approve,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError
  } = useWriteContract()

  const {
    writeContract: createLoan,
    data: createLoanHash, 
    isPending: isCreateLoanPending,
    error: createLoanError
  } = useWriteContract()

  // Wait for confirmations
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash
  })

  const { 
    isLoading: isCreateLoanConfirming,
    isSuccess: isCreateLoanSuccess 
  } = useWaitForTransactionReceipt({
    hash: createLoanHash
  })

  // ===================================
  // 🛠️ FUNCIONES UTILITARIAS
  // ===================================

  const updateState = useCallback((updates: Partial<CreatePositionState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      success: false,
      positionId: null,
      txHash: null,
      step: 'idle'
    })
  }, [])

  const checkBalances = useCallback((terms?: Partial<LoanTerms>) => {
    if (!autoVerifyBalances) {
      return { valid: true, message: 'Balance check skipped' }
    }

    // Determinar qué asset es el collateral y cuánto necesitamos
    const collateralAsset = terms?.collateralAsset || addresses.mockETH
    const collateralAmount = terms?.collateralAmount || parseUnits('1', 18)
    
    // Solo validar balance del asset de COLLATERAL (lo que necesitas dar)
    if (collateralAsset === addresses.mockETH) {
      if (!ethBalance) {
        return { valid: false, message: 'ETH balance not loaded' }
      }
      
      if (ethBalance.value < collateralAmount) {
        return {
          valid: false,
          message: `Need ${formatUnits(collateralAmount, 18)} ETH for collateral, have ${formatUnits(ethBalance.value, 18)} ETH`
        }
      }
    } else if (collateralAsset === addresses.mockUSDC) {
      if (!usdcBalance) {
        return { valid: false, message: 'USDC balance not loaded' }
      }
      
      if (usdcBalance.value < collateralAmount) {
        return {
          valid: false,
          message: `Need ${formatUnits(collateralAmount, 6)} USDC for collateral, have ${formatUnits(usdcBalance.value, 6)} USDC`
        }
      }
    }
    
    // NO validamos el balance del loan asset (es lo que recibes)
    return { valid: true, message: 'Collateral balance sufficient' }
  }, [ethBalance, usdcBalance, autoVerifyBalances, addresses])

  // ===================================
  // 🎯 FUNCIÓN PRINCIPAL
  // ===================================

  const createPosition = useCallback(async (customTerms?: Partial<LoanTerms>) => {
    if (!isConnected || !address) {
      updateState({ error: 'Please connect your wallet' })
      return
    }

    try {
      updateState({ 
        isLoading: true, 
        error: null, 
        step: 'checking',
        success: false
      })

      // Step 1: Términos por defecto
      const defaultTerms: LoanTerms = {
        collateralAsset: addresses.mockETH,
        loanAsset: addresses.mockUSDC,
        collateralAmount: parseUnits('1', 18),        // 1 ETH
        loanAmount: parseUnits('2000', 6),            // 2,000 USDC  
        maxLoanToValue: 800000n,                      // 80% LTV
        interestRate: 80000n,                         // 8% APR
        duration: 0n                                  // Perpetual
      }

      const finalTerms = { ...defaultTerms, ...customTerms }

      // Step 2: Verificar balances del collateral únicamente
      const balanceCheck = checkBalances(finalTerms)
      if (!balanceCheck.valid) {
        updateState({ 
          error: balanceCheck.message,
          isLoading: false,
          step: 'idle'
        })
        return
      }

      // Step 3: Verificar allowance y aprobar si es necesario
      const currentAllowance = ethAllowance || 0n
      if (currentAllowance < finalTerms.collateralAmount) {
        updateState({ step: 'approving' })
        
        approve({
          address: addresses.mockETH,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [addresses.flexibleLoanManager, finalTerms.collateralAmount]
        })
      } else {
        // Si ya tiene allowance, crear directamente
        updateState({ step: 'creating' })
        createLoan({
          address: addresses.flexibleLoanManager,
          abi: FlexibleLoanManagerABI,
          functionName: 'createLoan',
          args: [finalTerms]
        })
      }

    } catch (error) {
      updateState({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
        step: 'idle'
      })
    }
  }, [isConnected, address, checkBalances, ethAllowance, approve, createLoan, addresses])

  // ===================================
  // 🔄 EFECTOS PARA MANEJAR FLUJO
  // ===================================

  // Manejar confirmación de approve
  useEffect(() => {
    if (isApproveSuccess && state.step === 'approving') {
      updateState({ step: 'creating' })
      refetchAllowance()

      // Crear el préstamo después del approve
      const terms: LoanTerms = {
        collateralAsset: addresses.mockETH,
        loanAsset: addresses.mockUSDC,
        collateralAmount: parseUnits('1', 18),
        loanAmount: parseUnits('2000', 6),
        maxLoanToValue: 800000n,
        interestRate: 80000n,
        duration: 0n
      }

      createLoan({
        address: addresses.flexibleLoanManager,
        abi: FlexibleLoanManagerABI,
        functionName: 'createLoan',
        args: [terms]
      })
    }
  }, [isApproveSuccess, state.step, createLoan, addresses, refetchAllowance])

  // Manejar confirmación de createLoan
  useEffect(() => {
    if (isCreateLoanSuccess && state.step === 'creating') {
      updateState({ 
        step: 'completed',
        success: true,
        isLoading: false,
        txHash: createLoanHash
      })
    }
  }, [isCreateLoanSuccess, state.step, createLoanHash])

  // Manejar errores
  useEffect(() => {
    if (approveError) {
      updateState({
        error: `Approve failed: ${approveError.message}`,
        isLoading: false,
        step: 'idle'
      })
    }
  }, [approveError])

  useEffect(() => {
    if (createLoanError) {
      updateState({
        error: `Create loan failed: ${createLoanError.message}`,
        isLoading: false,
        step: 'idle'
      })
    }
  }, [createLoanError])

  // ===================================
  // 🎯 RETORNO DEL HOOK
  // ===================================

  return {
    // Estado principal
    ...state,
    
    // Funciones
    createPosition,
    resetState,
    
    // Info de balances
    balanceInfo: {
      eth: ethBalance ? {
        value: ethBalance.value,
        formatted: formatUnits(ethBalance.value, 18),
        sufficient: true // Balance check is done dynamically based on collateral amount
      } : null,
      usdc: usdcBalance ? {
        value: usdcBalance.value,
        formatted: formatUnits(usdcBalance.value, 6),
        sufficient: true // This is the loan asset (what you receive), not needed upfront
      } : null
    },
    
    // Info de allowance
    allowanceInfo: {
      current: ethAllowance || 0n,
      formatted: ethAllowance ? formatUnits(ethAllowance, 18) : '0',
      needsApproval: (ethAllowance || 0n) < parseUnits('1', 18)
    },
    
    // Estados de transacciones
    isApprovePending: isApprovePending || isApproveConfirming,
    isCreateLoanPending: isCreateLoanPending || isCreateLoanConfirming,
    
    // Info de wallet
    isConnected,
    address,
    chainId,
    
    // Funciones de refresh
    refetchBalances: () => {
      refetchETHBalance()
      refetchUSDCBalance()
      refetchAllowance()
    }
  }
}

// ===================================
// 🏠 DIRECCIONES DE BASE SEPOLIA
// ===================================

export const BASE_SEPOLIA_ADDRESSES: ContractAddresses = {
  flexibleLoanManager: '0xAdD8cA97DcbCf7373Da978bc7b61d6Ca31b54F8d',
  vaultBasedHandler: '0xC067Bb15D0f7c134916dC82949a9c4d27e6bbbC4',
  mockETH: '0xDe3fd80E2bcCc96f5FB43ac7481036Db9998f521',
  mockUSDC: '0x45BdA644DD25600b7d6DF4EC87E9710AD1DAE9d9',
  mockWBTC: '0x03f43Ce344D9988138b4807a7392A9feDea83AA1',
  vcopToken: '0x32224a6edf252c711B24f61403be011e6A7BEaEf'
}