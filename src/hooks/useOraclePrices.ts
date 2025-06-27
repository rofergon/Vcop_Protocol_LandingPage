/**
 * @fileoverview useOraclePrices.ts
 * @description Hook para obtener precios dinámicos del MockVCOPOracle desplegado
 * @version 2025 - Compatible con wagmi v2.x y viem v2.x
 */

import { useState, useEffect, useCallback } from 'react'
import { useReadContract, usePublicClient } from 'wagmi'
import { formatUnits, type Address } from 'viem'
import MOCK_VCOP_ORACLE_ABI from '../Abis/MockVCOPOracle.json'

interface OraclePrices {
  ETH: number
  WBTC: number  
  USDC: number
  VCOP: number
}

interface UseOraclePricesReturn {
  prices: OraclePrices
  isLoading: boolean
  error: string | null
  refetchPrices: () => void
  lastUpdated: Date | null
}

// Direcciones desde deployed-addresses-mock.json
const ORACLE_ADDRESS = '0xd25a71640eDDF4461429CFDf90Dd4192467Cd6C5' as Address
const FALLBACK_PRICES: OraclePrices = {
  ETH: 2500,
  WBTC: 45000, 
  USDC: 1,
  VCOP: 1/4100
}

export function useOraclePrices(): UseOraclePricesReturn {
  const [prices, setPrices] = useState<OraclePrices>(FALLBACK_PRICES)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  const publicClient = usePublicClient()

  // 🔍 Obtener precios actuales del oracle usando getCurrentMarketPrices()
  const { 
    data: oracleMarketPrices, 
    refetch: refetchMarketPrices,
    isLoading: isLoadingMarketPrices,
    error: marketPricesError 
  } = useReadContract({
    address: ORACLE_ADDRESS,
    abi: MOCK_VCOP_ORACLE_ABI,
    functionName: 'getCurrentMarketPrices',
    query: {
      refetchOnWindowFocus: false,
      refetchInterval: 30000, // Actualizar cada 30 segundos
    }
  })

  // 🔍 También obtener configuración del oracle para debugging
  const { 
    data: oracleConfig,
    refetch: refetchConfig
  } = useReadContract({
    address: ORACLE_ADDRESS,
    abi: MOCK_VCOP_ORACLE_ABI,
    functionName: 'getConfiguration',
    query: {
      refetchOnWindowFocus: false
    }
  })

  // Procesar datos del oracle cuando estén disponibles
  useEffect(() => {
    if (oracleMarketPrices && Array.isArray(oracleMarketPrices) && oracleMarketPrices.length === 4) {
      try {
        const [ethPriceRaw, btcPriceRaw, vcopPriceRaw, usdCopRateRaw] = oracleMarketPrices as [bigint, bigint, bigint, bigint]
        
        console.log('🔍 Oracle raw prices:', {
          ethPriceRaw: ethPriceRaw.toString(),
          btcPriceRaw: btcPriceRaw.toString(), 
          vcopPriceRaw: vcopPriceRaw.toString(),
          usdCopRateRaw: usdCopRateRaw.toString()
        })

        // Convertir de 6 decimales (formato del oracle) a números normales
        const newPrices: OraclePrices = {
          ETH: parseFloat(formatUnits(ethPriceRaw, 6)) || FALLBACK_PRICES.ETH,
          WBTC: parseFloat(formatUnits(btcPriceRaw, 6)) || FALLBACK_PRICES.WBTC,
          USDC: 1, // USDC siempre es $1
          VCOP: parseFloat(formatUnits(vcopPriceRaw, 6)) || FALLBACK_PRICES.VCOP
        }

        console.log('📊 Processed oracle prices:', newPrices)
        
        // Validar que los precios sean razonables
        if (newPrices.ETH > 100 && newPrices.ETH < 20000 && 
            newPrices.WBTC > 10000 && newPrices.WBTC < 500000 &&
            newPrices.VCOP > 0) {
          setPrices(newPrices)
          setLastUpdated(new Date())
          setError(null)
          console.log('✅ Oracle prices updated successfully')
        } else {
          console.warn('⚠️ Oracle prices seem unrealistic, using fallback')
          setError('Oracle prices appear invalid, using fallback values')
        }
      } catch (err) {
        console.error('💥 Error processing oracle prices:', err)
        setError('Failed to process oracle prices')
      }
    } else if (oracleMarketPrices !== undefined) {
      console.warn('⚠️ Oracle returned unexpected data format:', oracleMarketPrices)
      setError('Oracle returned unexpected data format')
    }
  }, [oracleMarketPrices])

  // Log configuración del oracle para debugging
  useEffect(() => {
    if (oracleConfig && Array.isArray(oracleConfig) && oracleConfig.length === 6) {
      const [usdToCopRate, vcopToCopRate, vcopToUsdRate, mockETHAddr, mockWBTCAddr, mockUSDCAddr] = oracleConfig as [bigint, bigint, bigint, Address, Address, Address]
      
      console.log('🔧 Oracle Configuration:', {
        usdToCopRate: formatUnits(usdToCopRate, 6),
        vcopToCopRate: formatUnits(vcopToCopRate, 6), 
        vcopToUsdRate: formatUnits(vcopToUsdRate, 6),
        addresses: {
          mockETH: mockETHAddr,
          mockWBTC: mockWBTCAddr,
          mockUSDC: mockUSDCAddr
        }
      })
    }
  }, [oracleConfig])

  // Función para refrescar precios manualmente
  const refetchPrices = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      await Promise.all([
        refetchMarketPrices(),
        refetchConfig()
      ])
      
      console.log('🔄 Prices refreshed manually')
    } catch (err) {
      console.error('💥 Error refreshing prices:', err)
      setError('Failed to refresh prices from oracle')
    } finally {
      setIsLoading(false)
    }
  }, [refetchMarketPrices, refetchConfig])

  // Manejo de errores
  useEffect(() => {
    if (marketPricesError) {
      console.error('💥 Oracle market prices error:', marketPricesError)
      setError(`Oracle error: ${marketPricesError.message}`)
    }
  }, [marketPricesError])

  return {
    prices,
    isLoading: isLoading || isLoadingMarketPrices,
    error,
    refetchPrices,
    lastUpdated
  }
}

// Hook auxiliar para obtener precio individual de un par específico
export function useTokenPrice(baseToken: Address, quoteToken: Address) {
  const publicClient = usePublicClient()
  
  const { data: price, refetch, isLoading, error } = useReadContract({
    address: ORACLE_ADDRESS,
    abi: MOCK_VCOP_ORACLE_ABI,
    functionName: 'getPrice',
    args: [baseToken, quoteToken],
    query: {
      refetchOnWindowFocus: false,
      refetchInterval: 60000, // Actualizar cada minuto
    }
  })

  const formattedPrice = price ? parseFloat(formatUnits(price as bigint, 6)) : 0

  return {
    price: formattedPrice,
    refetch,
    isLoading,
    error
  }
}

export default useOraclePrices 