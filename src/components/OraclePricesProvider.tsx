import React, { createContext, useContext, ReactNode } from 'react'
import { useReadContract } from 'wagmi'
import { formatUnits, type Address } from 'viem'
import MOCK_VCOP_ORACLE_ABI from '../Abis/MockVCOPOracle.json'
import { useContractAddresses } from '../hooks/useContractAddresses'

interface OraclePrices {
  ETH: number
  WBTC: number  
  USDC: number
  VCOP: number
  WGOLD: number // Nueva coin WGOLD (oro wrapped)
}

interface OraclePricesContextType {
  prices: OraclePrices
  isLoading: boolean
  error: string | null
  refetchPrices: () => void
  lastUpdated: Date | null
}

const FALLBACK_PRICES: OraclePrices = {
  ETH: 2500,
  WBTC: 45000, 
  USDC: 1,
  VCOP: 1/4100,
  WGOLD: 3302.30 // Precio del oro - Futuros del Precio del Oro (GCM3)
}

const OraclePricesContext = createContext<OraclePricesContextType | undefined>(undefined)

interface OraclePricesProviderProps {
  children: ReactNode
}

export function OraclePricesProvider({ children }: OraclePricesProviderProps) {
  const { addresses, isLoading: addressesLoading, error: addressesError } = useContractAddresses()
  const oracleAddress = addresses?.mockVcopOracle

  // 🔥 OPTIMIZACIÓN: Una sola solicitud compartida con intervalo más largo
  const { 
    data: oracleMarketPrices, 
    refetch: refetchMarketPrices,
    isLoading: isLoadingMarketPrices,
    error: marketPricesError 
  } = useReadContract({
    address: oracleAddress,
    abi: MOCK_VCOP_ORACLE_ABI,
    functionName: 'getCurrentMarketPrices',
    query: {
      refetchOnWindowFocus: false,
      refetchInterval: 120000, // 🔥 Reducido a 2 minutos en lugar de 30 segundos
      staleTime: 60000, // 🔥 Cache durante 1 minuto
      gcTime: 300000, // 🔥 Mantener en cache por 5 minutos
      enabled: !!oracleAddress,
      retry: 2, // 🔥 Solo 2 reintentos en lugar del default
      retryDelay: 5000 // 🔥 5 segundos entre reintentos
    }
  })

  // Procesar precios una sola vez
  const processedPrices = React.useMemo(() => {
    if (oracleMarketPrices && Array.isArray(oracleMarketPrices) && oracleMarketPrices.length === 4) {
      try {
        const [ethPriceRaw, btcPriceRaw, vcopPriceRaw] = oracleMarketPrices as [bigint, bigint, bigint, bigint]
        
        const newPrices: OraclePrices = {
          ETH: parseFloat(formatUnits(ethPriceRaw, 6)) || FALLBACK_PRICES.ETH,
          WBTC: parseFloat(formatUnits(btcPriceRaw, 6)) || FALLBACK_PRICES.WBTC,
          USDC: 1, // USDC siempre es $1
          VCOP: parseFloat(formatUnits(vcopPriceRaw, 6)) || FALLBACK_PRICES.VCOP,
          WGOLD: FALLBACK_PRICES.WGOLD // WGOLD siempre es el valor fijo
        }

        // Validar que los precios sean razonables
        if (newPrices.ETH > 100 && newPrices.ETH < 20000 && 
            newPrices.WBTC > 10000 && newPrices.WBTC < 500000 &&
            newPrices.VCOP > 0) {
          return newPrices
        }
      } catch (err) {
        console.error('Error processing oracle prices:', err)
      }
    }
    return FALLBACK_PRICES
  }, [oracleMarketPrices])

  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)

  // Actualizar timestamp cuando cambien los precios
  React.useEffect(() => {
    if (oracleMarketPrices) {
      setLastUpdated(new Date())
    }
  }, [oracleMarketPrices])

  // 🔥 OPTIMIZACIÓN: Throttled refetch function
  const refetchPrices = React.useCallback(() => {
    refetchMarketPrices()
  }, [refetchMarketPrices])

  const contextValue = React.useMemo(() => ({
    prices: processedPrices,
    isLoading: isLoadingMarketPrices || addressesLoading,
    error: marketPricesError?.message || addressesError || null,
    refetchPrices,
    lastUpdated
  }), [processedPrices, isLoadingMarketPrices, addressesLoading, marketPricesError, addressesError, refetchPrices, lastUpdated])

  return (
    <OraclePricesContext.Provider value={contextValue}>
      {children}
    </OraclePricesContext.Provider>
  )
}

export function useOraclePrices(): OraclePricesContextType {
  const context = useContext(OraclePricesContext)
  if (context === undefined) {
    throw new Error('useOraclePrices must be used within an OraclePricesProvider')
  }
  return context
}

// 🔥 OPTIMIZACIÓN: Hook legacy para compatibilidad, pero redirige al contexto
export function useOraclePricesLegacy() {
  return useOraclePrices()
} 