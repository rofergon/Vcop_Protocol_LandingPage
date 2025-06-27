/**
 * @fileoverview useCreatePosition.ts  
 * @description Hook completo para crear posiciones usando wagmi v2 + viem v2
 * @version 2025 - Compatible con las últimas versiones - FLEXIBLE VERSION
 */

import { useState, useCallback, useEffect } from 'react'
import { 
  useAccount, 
  useReadContract, 
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  useChainId,
  useConfig
} from 'wagmi'
import { 
  formatUnits, 
  parseUnits,
  type Address,
  type Hash
} from 'viem'
import { readContract } from 'wagmi/actions'

// Importar ABIs
import FlexibleLoanManagerABI from '../Abis/FlexibleLoanManager.json'
import MockVCOPOracleABI from '../Abis/MockVCOPOracle.json'

// Importar hook centralizado de direcciones
import useContractAddresses from './useContractAddresses'

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

export interface CreatePositionParams {
  collateralAsset?: Address
  loanAsset?: Address
  collateralAmount?: string  // En formato decimal (ej: "1.5")
  loanAmount?: string       // En formato decimal (ej: "2500.0")
  maxLoanToValue?: number   // En porcentaje (ej: 75 para 75%)
  interestRate?: number     // En porcentaje (ej: 8 para 8% APR)
  duration?: bigint         // 0 = perpetual
}

export interface CreatePositionState {
  isLoading: boolean
  error: string | null
  success: boolean
  positionId: bigint | null
  txHash: Hash | null
  step: 'idle' | 'checking' | 'validating' | 'approving' | 'creating' | 'completed'
}

export interface AssetPrice {
  price: bigint
  decimals: number
  symbol: string
}

export interface LoanValidation {
  isValid: boolean
  collateralValueUSD: bigint
  loanValueUSD: bigint
  actualLTV: number
  riskLevel: 'low' | 'medium' | 'high' | 'extreme'
  warnings: string[]
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
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  }
] as const

// ===================================
// 🚀 HOOK PRINCIPAL
// ===================================

export function useCreatePosition({
  autoVerifyBalances = true
}: {
  autoVerifyBalances?: boolean
} = {}) {
  
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
  const config = useConfig()
  
  // Hook centralizado de direcciones
  const { addresses, isReady: addressesReady, error: addressesError } = useContractAddresses()
  
  // Balances usando useBalance de wagmi v2
  const { data: ethBalance, refetch: refetchETHBalance } = useBalance({
    address,
    token: addresses?.mockETH,
    query: { enabled: !!address && autoVerifyBalances && !!addresses?.mockETH }
  })
  
  const { data: usdcBalance, refetch: refetchUSDCBalance } = useBalance({
    address, 
    token: addresses?.mockUSDC,
    query: { enabled: !!address && autoVerifyBalances && !!addresses?.mockUSDC }
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
  // 💰 FUNCIONES DE PRECIOS CON ORACLE
  // ===================================

  /**
   * Obtiene el precio de un asset usando MockVCOPOracle
   */
  const { data: ethPrice } = useReadContract({
    address: addresses?.mockVcopOracle,
    abi: MockVCOPOracleABI,
    functionName: 'getPrice',
    args: addresses?.mockETH && addresses?.mockUSDC ? [addresses.mockETH, addresses.mockUSDC] : undefined,
    query: { enabled: !!addresses?.mockVcopOracle && !!addresses?.mockETH && !!addresses?.mockUSDC }
  })

  const { data: usdcPrice } = useReadContract({
    address: addresses?.mockVcopOracle,
    abi: MockVCOPOracleABI,
    functionName: 'getPrice',
    args: addresses?.mockUSDC && addresses?.mockUSDC ? [addresses.mockUSDC, addresses.mockUSDC] : undefined,
    query: { enabled: !!addresses?.mockVcopOracle && !!addresses?.mockUSDC }
  })

  /**
   * Obtiene información de precios de un asset
   */
  const getAssetPrice = useCallback(async (assetAddress: Address): Promise<AssetPrice> => {
    if (!addresses?.mockVcopOracle || !addresses?.mockUSDC) {
      throw new Error('Oracle or USDC address not available')
    }

    // Obtener precio del oracle (en 6 decimales)
    const price = await readContract(config, {
      address: addresses.mockVcopOracle,
      abi: MockVCOPOracleABI,
      functionName: 'getPrice',
      args: [assetAddress, addresses.mockUSDC]
    })

    // Obtener decimales del token
    let decimals = 18
    try {
      const tokenDecimals = await readContract(config, {
        address: assetAddress,
        abi: ERC20_ABI,
        functionName: 'decimals'
      })
      decimals = Number(tokenDecimals)
    } catch (error) {
      console.warn(`Could not fetch decimals for ${assetAddress}, using 18`)
    }

    // Obtener símbolo del asset
    const symbol = assetAddress === addresses.mockETH ? 'ETH' : 
                   assetAddress === addresses.mockUSDC ? 'USDC' : 
                   assetAddress === addresses.mockWBTC ? 'WBTC' : 'Unknown'

    return {
      price: price as bigint,
      decimals,
      symbol
    }
  }, [addresses])

  // ===================================
  // 🛠️ FUNCIONES DE VALIDACIÓN
  // ===================================

  /**
   * Valida los términos del préstamo y calcula métricas de riesgo
   */
  const validateLoanTerms = useCallback(async (params: CreatePositionParams): Promise<LoanValidation> => {
    try {
      const {
        collateralAsset = addresses?.mockETH,
        loanAsset = addresses?.mockUSDC,
        collateralAmount = "1",
        loanAmount = "2000",
        maxLoanToValue = 80
      } = params

      if (!collateralAsset || !loanAsset) {
        throw new Error('Asset addresses not available')
      }

      // Obtener precios de los assets
      const [collateralPrice, loanPrice] = await Promise.all([
        getAssetPrice(collateralAsset),
        getAssetPrice(loanAsset)
      ])

      // Manejar si los valores ya vienen como BigInt o como string
      let collateralAmountBigint: bigint
      let loanAmountBigint: bigint

      if (typeof collateralAmount === 'bigint') {
        collateralAmountBigint = collateralAmount
      } else {
        const collateralAmountStr = typeof collateralAmount === 'string' ? collateralAmount : String(collateralAmount)
        collateralAmountBigint = parseUnits(collateralAmountStr, collateralPrice.decimals)
      }

      if (typeof loanAmount === 'bigint') {
        loanAmountBigint = loanAmount
      } else {
        const loanAmountStr = typeof loanAmount === 'string' ? loanAmount : String(loanAmount)
        loanAmountBigint = parseUnits(loanAmountStr, loanPrice.decimals)
      }

      // Calcular valores en USD - CORREGIDO
      // El oracle MockVCOP siempre devuelve precios con 6 decimales (no depende del token)
      const ORACLE_DECIMALS = 6
      const collateralValueUSD = (collateralAmountBigint * collateralPrice.price) / BigInt(10 ** ORACLE_DECIMALS)
      const loanValueUSD = (loanAmountBigint * loanPrice.price) / BigInt(10 ** ORACLE_DECIMALS)

      // Calcular LTV actual - CORREGIDO
      // LTV = (loan value / collateral value) * 100
      const actualLTV = Number(loanValueUSD * 100n / collateralValueUSD)

      console.log('🔍 LTV Calculation Debug:')
      console.log('  Collateral Amount:', collateralAmountBigint.toString())
      console.log('  Loan Amount:', loanAmountBigint.toString())
      console.log('  Collateral Price:', collateralPrice.price.toString())
      console.log('  Loan Price:', loanPrice.price.toString())
      console.log('  Collateral Value USD:', collateralValueUSD.toString())
      console.log('  Loan Value USD:', loanValueUSD.toString())
      console.log('  Calculated LTV:', actualLTV.toFixed(2) + '%')

      // Determinar nivel de riesgo
      let riskLevel: 'low' | 'medium' | 'high' | 'extreme'
      if (actualLTV <= 50) riskLevel = 'low'
      else if (actualLTV <= 75) riskLevel = 'medium'
      else if (actualLTV <= 90) riskLevel = 'high'
      else riskLevel = 'extreme'

      // Generar advertencias
      const warnings: string[] = []
      
      if (actualLTV > maxLoanToValue) {
        warnings.push(`Actual LTV (${actualLTV.toFixed(2)}%) exceeds max LTV (${maxLoanToValue}%)`)
      }

      if (actualLTV > 85) {
        warnings.push('High liquidation risk - position may be liquidated quickly in volatile markets')
      }

      if (actualLTV > 95) {
        warnings.push('EXTREME RISK - Position is at immediate liquidation risk')
      }

      return {
        isValid: warnings.length === 0 || actualLTV <= 95, // Permitir hasta 95% LTV
        collateralValueUSD,
        loanValueUSD,
        actualLTV,
        riskLevel,
        warnings
      }

    } catch (error) {
      return {
        isValid: false,
        collateralValueUSD: 0n,
        loanValueUSD: 0n,
        actualLTV: 0,
        riskLevel: 'extreme',
        warnings: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }, [addresses, getAssetPrice])

  /**
   * Verifica balances del collateral únicamente
   */
  const checkBalances = useCallback((params: CreatePositionParams) => {
    if (!autoVerifyBalances) {
      return { valid: true, message: 'Balance check skipped' }
    }

    if (!addresses) {
      return { valid: false, message: 'Contract addresses not loaded' }
    }

    const {
      collateralAsset = addresses.mockETH,
      collateralAmount = "1"
    } = params

    // Obtener decimales del asset de collateral
    const isETH = collateralAsset === addresses.mockETH
    const isUSDC = collateralAsset === addresses.mockUSDC
    
    console.log('🔍 checkBalances - collateralAsset:', collateralAsset)
    console.log('🔍 checkBalances - addresses.mockETH:', addresses.mockETH)  
    console.log('🔍 checkBalances - addresses.mockUSDC:', addresses.mockUSDC)
    console.log('🔍 checkBalances - isETH:', isETH, 'isUSDC:', isUSDC)

    const decimals = isETH ? 18 : isUSDC ? 6 : 18
    
    // Manejar si el valor ya viene como BigInt (en wei) o como string (decimal)
    let collateralAmountBigint: bigint
    let displayAmount: string
    
    if (typeof collateralAmount === 'bigint') {
      // Ya está en wei, usarlo directamente
      collateralAmountBigint = collateralAmount
      displayAmount = formatUnits(collateralAmount, decimals)
      console.log('🔍 checkBalances - usando BigInt directo:', (collateralAmount as bigint).toString())
    } else {
      // Es string, convertir de decimal a wei
      const collateralAmountStr = typeof collateralAmount === 'string' ? collateralAmount : String(collateralAmount)
      collateralAmountBigint = parseUnits(collateralAmountStr, decimals)
      displayAmount = collateralAmountStr
      console.log('🔍 checkBalances - convirtiendo string:', collateralAmountStr, 'a wei:', collateralAmountBigint.toString())
    }
    
    // Validar balance del asset de COLLATERAL específico
    if (isETH) {
      if (!ethBalance) {
        return { valid: false, message: 'ETH balance not loaded' }
      }
      
      if (ethBalance.value < collateralAmountBigint) {
        console.log('🚨 Balance check failed - displayAmount:', displayAmount, 'collateralAmountBigint:', collateralAmountBigint.toString())
        return {
          valid: false,
          message: `Need ${displayAmount} ETH for collateral, have ${formatUnits(ethBalance.value, 18)} ETH`
        }
      }
    } else if (isUSDC) {
      if (!usdcBalance) {
        return { valid: false, message: 'USDC balance not loaded' }
      }
      
      if (usdcBalance.value < collateralAmountBigint) {
        console.log('🚨 Balance check failed - displayAmount:', displayAmount, 'collateralAmountBigint:', collateralAmountBigint.toString())
        return {
          valid: false,
          message: `Need ${displayAmount} USDC for collateral, have ${formatUnits(usdcBalance.value, 6)} USDC`
        }
      }
    } else {
      // Para otros assets, solo advertir que no podemos verificar balance
      console.log('⚠️ Cannot verify balance for unknown collateral asset:', collateralAsset)
      return { valid: true, message: 'Balance check skipped for unknown asset' }
    }
    
    return { valid: true, message: 'Collateral balance sufficient' }
  }, [ethBalance, usdcBalance, autoVerifyBalances, addresses])

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

  // ===================================
  // 🎯 FUNCIÓN PRINCIPAL - AHORA FLEXIBLE
  // ===================================

  const createPosition = useCallback(async (customParams: CreatePositionParams = {}) => {
    if (!isConnected || !address) {
      updateState({ error: 'Please connect your wallet' })
      return
    }

    if (!addresses) {
      updateState({ error: 'Contract addresses not loaded' })
      return
    }

    try {
      updateState({ 
        isLoading: true, 
        error: null, 
        step: 'checking',
        success: false
      })

      // Step 1: Combinar parámetros por defecto con los del usuario
      const params: Required<CreatePositionParams> = {
        collateralAsset: customParams.collateralAsset || addresses.mockETH,
        loanAsset: customParams.loanAsset || addresses.mockUSDC,
        collateralAmount: customParams.collateralAmount || "1",
        loanAmount: customParams.loanAmount || "2000",
        maxLoanToValue: customParams.maxLoanToValue || 80,
        interestRate: customParams.interestRate || 8,
        duration: customParams.duration || 0n
      }

      console.log('🎯 Creating position with params:', params)

      // Step 2: Validar términos del préstamo
      updateState({ step: 'validating' })
      const validation = await validateLoanTerms(params)
      
      if (!validation.isValid) {
        updateState({ 
          error: `Loan validation failed: ${validation.warnings.join(', ')}`,
          isLoading: false,
          step: 'idle'
        })
        return
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️ Loan warnings:', validation.warnings)
      }

      // Step 3: Verificar balances del collateral
      const balanceCheck = checkBalances(params)
      if (!balanceCheck.valid) {
        updateState({ 
          error: balanceCheck.message,
          isLoading: false,
          step: 'idle'
        })
        return
      }

      // Step 4: Preparar términos finales para el contrato
      const collateralDecimals = params.collateralAsset === addresses.mockETH ? 18 : 6
      const loanDecimals = params.loanAsset === addresses.mockUSDC ? 6 : 18

      // Manejar si los valores ya vienen como BigInt o como string
      let collateralAmountForContract: bigint
      let loanAmountForContract: bigint

      if (typeof params.collateralAmount === 'bigint') {
        collateralAmountForContract = params.collateralAmount
      } else {
        const collateralAmountStr = typeof params.collateralAmount === 'string' ? params.collateralAmount : String(params.collateralAmount)
        collateralAmountForContract = parseUnits(collateralAmountStr, collateralDecimals)
      }

      if (typeof params.loanAmount === 'bigint') {
        loanAmountForContract = params.loanAmount
      } else {
        const loanAmountStr = typeof params.loanAmount === 'string' ? params.loanAmount : String(params.loanAmount)
        loanAmountForContract = parseUnits(loanAmountStr, loanDecimals)
      }

      const finalTerms: LoanTerms = {
        collateralAsset: params.collateralAsset,
        loanAsset: params.loanAsset,
        collateralAmount: collateralAmountForContract,
        loanAmount: loanAmountForContract,
        maxLoanToValue: typeof params.maxLoanToValue === 'bigint' ? params.maxLoanToValue : BigInt(params.maxLoanToValue * 10000), // Convertir a 6 decimales
        interestRate: typeof params.interestRate === 'bigint' ? params.interestRate : BigInt(params.interestRate * 10000), // Convertir a 6 decimales  
        duration: params.duration
      }

      console.log('📋 Final loan terms:', finalTerms)

      // Step 5: Verificar allowance y aprobar si es necesario
      const currentAllowance = await readContract(config, {
        address: params.collateralAsset,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, addresses.flexibleLoanManager]
      })

      const allowance = (currentAllowance as bigint) || 0n
      if (allowance < finalTerms.collateralAmount) {
        updateState({ step: 'approving' })
        
        approve({
          address: params.collateralAsset,
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
      console.error('💥 Error creating position:', error)
      updateState({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
        step: 'idle'
      })
    }
  }, [isConnected, address, addresses, validateLoanTerms, checkBalances, approve, createLoan])

  // ===================================
  // 🔄 EFECTOS PARA MANEJAR FLUJO
  // ===================================

  // Manejar confirmación de approve
  useEffect(() => {
    if (isApproveSuccess && state.step === 'approving' && addresses) {
      updateState({ step: 'creating' })

      // El createLoan se debe ejecutar con los términos que se usaron en approve
      // Por ahora usaremos términos por defecto, pero en una implementación real
      // deberíamos guardar los términos en estado
      const defaultTerms: LoanTerms = {
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
        args: [defaultTerms]
      })
    }
  }, [isApproveSuccess, state.step, createLoan, addresses])

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
  // 💰 FUNCIONES DE UTILIDAD DE PRECIOS
  // ===================================

  /**
   * Calcula el LTV máximo recomendado basado en el tipo de collateral
   */
  const getRecommendedMaxLTV = useCallback((collateralAsset: Address) => {
    if (!addresses) return 75

    if (collateralAsset === addresses.mockETH) return 80  // ETH es relativamente estable
    if (collateralAsset === addresses.mockUSDC) return 90 // USDC es estable
    if (collateralAsset === addresses.mockWBTC) return 75 // BTC es volátil
    
    return 70 // Conservador para otros assets
  }, [addresses])

  /**
   * Estima el precio de liquidación basado en LTV y precios actuales
   */
  const estimateLiquidationPrice = useCallback(async (params: CreatePositionParams) => {
    try {
      const validation = await validateLoanTerms(params)
      if (!validation.isValid) return null

      const {
        collateralAsset = addresses?.mockETH,
        loanAsset = addresses?.mockUSDC,
        maxLoanToValue = 80
      } = params

      if (!collateralAsset || !loanAsset) return null

      const [collateralPrice, loanPrice] = await Promise.all([
        getAssetPrice(collateralAsset),
        getAssetPrice(loanAsset)
      ])

      // Precio de liquidación = (loan_value * liquidation_ratio) / collateral_amount
      const liquidationRatio = maxLoanToValue + 10 // Agregar 10% de buffer para liquidación
      const liquidationPrice = (validation.loanValueUSD * BigInt(liquidationRatio * 100)) / 
                               (validation.collateralValueUSD * 100n)

      return {
        liquidationPrice: formatUnits(liquidationPrice, 6),
        currentPrice: formatUnits(collateralPrice.price, 6),
        priceDropToLiquidation: Number(liquidationPrice) / Number(collateralPrice.price) * 100
      }
    } catch (error) {
      console.error('Error estimating liquidation price:', error)
      return null
    }
  }, [addresses, validateLoanTerms, getAssetPrice])

  // ===================================
  // 🎯 RETORNO DEL HOOK
  // ===================================

  return {
    // Estado principal
    ...state,
    
    // Funciones principales
    createPosition,
    resetState,
    
    // Funciones de validación y análisis
    validateLoanTerms,
    getRecommendedMaxLTV,
    estimateLiquidationPrice,
    
    // Info de precios
    priceInfo: {
      ethPrice: ethPrice ? formatUnits(ethPrice as bigint, 6) : null,
      usdcPrice: usdcPrice ? formatUnits(usdcPrice as bigint, 6) : null,
    },
    
    // Info de balances
    balanceInfo: {
      eth: ethBalance ? {
        value: ethBalance.value,
        formatted: formatUnits(ethBalance.value, 18),
        sufficient: true
      } : null,
      usdc: usdcBalance ? {
        value: usdcBalance.value,
        formatted: formatUnits(usdcBalance.value, 6),
        sufficient: true
      } : null
    },
    
    // Estados de transacciones
    isApprovePending: isApprovePending || isApproveConfirming,
    isCreateLoanPending: isCreateLoanPending || isCreateLoanConfirming,
    
    // Info de wallet
    isConnected,
    address,
    chainId,
    
    // Info de direcciones
    contractAddresses: addresses,
    addressesReady,
    
    // Funciones de refresh
    refetchBalances: () => {
      refetchETHBalance()
      refetchUSDCBalance()
    }
  }
}

export default useCreatePosition