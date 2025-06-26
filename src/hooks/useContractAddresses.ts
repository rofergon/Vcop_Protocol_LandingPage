/**
 * @fileoverview useContractAddresses.ts
 * @description Hook centralizado para manejar todas las direcciones de contratos dinámicamente
 * @version 2025 - Siempre lee desde deployed-addresses-mock.json
 */

import { useState, useEffect, useCallback } from 'react'
import { type Address } from 'viem'
import { useChainId } from 'wagmi'

// ===================================
// 🏗️ INTERFACES Y TIPOS
// ===================================

export interface ContractAddresses {
  // Core Lending
  flexibleLoanManager: Address
  genericLoanManager: Address
  riskCalculator: Address
  mintableBurnableHandler: Address
  vaultBasedHandler: Address
  flexibleAssetHandler: Address
  dynamicPriceRegistry: Address
  
  // Tokens
  mockETH: Address
  mockWBTC: Address
  mockUSDC: Address
  vcopToken: Address
  
  // VCOP Collateral
  mockVcopOracle: Address
  vcopPriceCalculator: Address
  vcopCollateralManager: Address
  vcopCollateralHook: Address
  
  // Config
  poolManager: Address
  feeCollector: Address
  usdToCopRate: string
  
  // Automation
  automationRegistry: Address
  automationKeeper: Address
  loanAdapter: Address
  priceTrigger: Address
}

export interface TokenInfo {
  address: Address
  symbol: string
  name: string
  decimals: number
}

export interface AssetMapping {
  [key: string]: string // address -> symbol
}

// ===================================
// 🎯 HOOK PRINCIPAL: useContractAddresses
// ===================================

export function useContractAddresses() {
  const chainId = useChainId()
  const [addresses, setAddresses] = useState<ContractAddresses | null>(null)
  const [assetMapping, setAssetMapping] = useState<AssetMapping>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar direcciones desde deployed-addresses-mock.json
  const loadAddresses = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('🔄 Loading contract addresses from deployed-addresses-mock.json...')
      
      const response = await fetch('/deployed-addresses-mock.json')
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('📋 Raw config data:', data)

      // Mapear datos a la estructura esperada
      const contractAddresses: ContractAddresses = {
        // Core Lending
        flexibleLoanManager: data.coreLending?.flexibleLoanManager as Address,
        genericLoanManager: data.coreLending?.genericLoanManager as Address,
        riskCalculator: data.coreLending?.riskCalculator as Address,
        mintableBurnableHandler: data.coreLending?.mintableBurnableHandler as Address,
        vaultBasedHandler: data.coreLending?.vaultBasedHandler as Address,
        flexibleAssetHandler: data.coreLending?.flexibleAssetHandler as Address,
        dynamicPriceRegistry: data.coreLending?.dynamicPriceRegistry as Address,
        
        // Tokens
        mockETH: data.tokens?.mockETH as Address,
        mockWBTC: data.tokens?.mockWBTC as Address,
        mockUSDC: data.tokens?.mockUSDC as Address,
        vcopToken: data.tokens?.vcopToken as Address,
        
        // VCOP Collateral
        mockVcopOracle: data.vcopCollateral?.mockVcopOracle as Address,
        vcopPriceCalculator: data.vcopCollateral?.vcopPriceCalculator as Address,
        vcopCollateralManager: data.vcopCollateral?.vcopCollateralManager as Address,
        vcopCollateralHook: data.vcopCollateral?.vcopCollateralHook as Address,
        
        // Config
        poolManager: data.config?.poolManager as Address,
        feeCollector: data.config?.feeCollector as Address,
        usdToCopRate: data.config?.usdToCopRate as string,
        
        // Automation
        automationRegistry: data.automation?.automationRegistry as Address,
        automationKeeper: data.automation?.automationKeeper as Address,
        loanAdapter: data.automation?.loanAdapter as Address,
        priceTrigger: data.automation?.priceTrigger as Address
      }

      // Validar que las direcciones críticas existan
      const criticalAddresses = [
        'flexibleLoanManager',
        'vaultBasedHandler', 
        'mockETH',
        'mockUSDC',
        'feeCollector'
      ] as const

      for (const key of criticalAddresses) {
        if (!contractAddresses[key]) {
          throw new Error(`Critical address missing: ${key}`)
        }
      }

      // Crear mapeo de direcciones a símbolos (para ambos casos)
      const mapping: AssetMapping = {}
      
      if (contractAddresses.mockETH) {
        mapping[contractAddresses.mockETH.toLowerCase()] = 'ETH'
        mapping[contractAddresses.mockETH] = 'ETH'
      }
      if (contractAddresses.mockUSDC) {
        mapping[contractAddresses.mockUSDC.toLowerCase()] = 'USDC'
        mapping[contractAddresses.mockUSDC] = 'USDC'
      }
      if (contractAddresses.mockWBTC) {
        mapping[contractAddresses.mockWBTC.toLowerCase()] = 'WBTC'
        mapping[contractAddresses.mockWBTC] = 'WBTC'
      }
      if (contractAddresses.vcopToken) {
        mapping[contractAddresses.vcopToken.toLowerCase()] = 'VCOP'
        mapping[contractAddresses.vcopToken] = 'VCOP'
      }

      setAddresses(contractAddresses)
      setAssetMapping(mapping)
      
      console.log('✅ Contract addresses loaded successfully:')
      console.log('  FlexibleLoanManager:', contractAddresses.flexibleLoanManager)
      console.log('  VaultBasedHandler:', contractAddresses.vaultBasedHandler)
      console.log('  MockETH:', contractAddresses.mockETH)
      console.log('  MockUSDC:', contractAddresses.mockUSDC)
      console.log('  FeeCollector:', contractAddresses.feeCollector)
      console.log('🎯 Asset mapping created:', mapping)

    } catch (err) {
      console.error('💥 Error loading contract addresses:', err)
      setError(err instanceof Error ? err.message : 'Failed to load contract addresses')
      setAddresses(null)
      setAssetMapping({})
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Cargar direcciones al montar el componente y cuando cambie la chain
  useEffect(() => {
    loadAddresses()
  }, [chainId, loadAddresses])

  // ===================================
  // 🛠️ FUNCIONES AUXILIARES
  // ===================================

  /**
   * Obtener símbolo de un asset por su dirección
   */
  const getAssetSymbol = useCallback((assetAddress: string): string => {
    if (!assetAddress) return 'Unknown'
    
    // Intentar con la dirección exacta
    let symbol = assetMapping[assetAddress]
    if (symbol) return symbol
    
    // Intentar con la dirección en minúsculas
    symbol = assetMapping[assetAddress.toLowerCase()]
    if (symbol) return symbol
    
    // Fallback para casos especiales
    const normalized = assetAddress.toLowerCase()
    if (addresses?.mockETH && normalized === addresses.mockETH.toLowerCase()) return 'ETH'
    if (addresses?.mockUSDC && normalized === addresses.mockUSDC.toLowerCase()) return 'USDC'
    if (addresses?.mockWBTC && normalized === addresses.mockWBTC.toLowerCase()) return 'WBTC'
    if (addresses?.vcopToken && normalized === addresses.vcopToken.toLowerCase()) return 'VCOP'
    
    console.warn(`⚠️ Unknown asset address: ${assetAddress}`)
    return 'Unknown'
  }, [assetMapping, addresses])

  /**
   * Obtener información completa de un token
   */
  const getTokenInfo = useCallback((assetAddress: string): TokenInfo | null => {
    if (!addresses || !assetAddress) return null

    const symbol = getAssetSymbol(assetAddress)
    if (symbol === 'Unknown') return null

    const tokenInfoMap: Record<string, Omit<TokenInfo, 'address'>> = {
      'ETH': { symbol: 'ETH', name: 'Mock Ethereum', decimals: 18 },
      'USDC': { symbol: 'USDC', name: 'Mock USD Coin', decimals: 6 },
      'WBTC': { symbol: 'WBTC', name: 'Mock Wrapped Bitcoin', decimals: 8 },
      'VCOP': { symbol: 'VCOP', name: 'VCOP Token', decimals: 18 }
    }

    const info = tokenInfoMap[symbol]
    if (!info) return null

    return {
      address: assetAddress as Address,
      ...info
    }
  }, [addresses, getAssetSymbol])

  /**
   * Obtener todas las direcciones de tokens
   */
  const getAllTokenAddresses = useCallback(() => {
    if (!addresses) return []

    return [
      { address: addresses.mockETH, symbol: 'ETH' },
      { address: addresses.mockUSDC, symbol: 'USDC' },
      { address: addresses.mockWBTC, symbol: 'WBTC' },
      { address: addresses.vcopToken, symbol: 'VCOP' }
    ].filter(token => token.address)
  }, [addresses])

  /**
   * Validar si una dirección es válida
   */
  const isValidAddress = useCallback((address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }, [])

  // ===================================
  // 🎯 RETORNO DEL HOOK
  // ===================================

  return {
    // Datos principales
    addresses,
    assetMapping,
    
    // Estados
    isLoading,
    error,
    
    // Funciones
    loadAddresses,
    getAssetSymbol,
    getTokenInfo,
    getAllTokenAddresses,
    isValidAddress,
    
    // Helpers para casos comunes
    isReady: !isLoading && !error && !!addresses,
    
    // Acceso rápido a direcciones críticas
    flexibleLoanManager: addresses?.flexibleLoanManager,
    vaultBasedHandler: addresses?.vaultBasedHandler,
    mockETH: addresses?.mockETH,
    mockUSDC: addresses?.mockUSDC,
    feeCollector: addresses?.feeCollector
  }
}

// ===================================
// 🔄 HOOK PARA REFRESCAR AUTOMÁTICAMENTE
// ===================================

/**
 * Hook que refresca las direcciones automáticamente cada cierto tiempo
 */
export function useContractAddressesWithRefresh(refreshIntervalMs: number = 60000) {
  const contractAddresses = useContractAddresses()

  useEffect(() => {
    if (refreshIntervalMs <= 0) return

    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing contract addresses...')
      contractAddresses.loadAddresses()
    }, refreshIntervalMs)

    return () => clearInterval(interval)
  }, [refreshIntervalMs, contractAddresses.loadAddresses])

  return contractAddresses
}

// ===================================
// 🎯 EXPORT POR DEFECTO
// ===================================

export default useContractAddresses 