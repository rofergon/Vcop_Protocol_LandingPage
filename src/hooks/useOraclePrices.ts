/**
 * @fileoverview useOraclePrices.ts
 * @description Hook optimizado que usa el contexto centralizado para reducir solicitudes RPC
 * @version 2025 - Compatible con wagmi v2.x y viem v2.x
 */

// 🔥 OPTIMIZACIÓN: Redirigir al contexto centralizado para evitar múltiples solicitudes
import { useOraclePrices as useOraclePricesFromContext } from '../components/OraclePricesProvider'
import { useReadContract } from 'wagmi'
import { formatUnits, type Address } from 'viem'
import MOCK_VCOP_ORACLE_ABI from '../Abis/MockVCOPOracle.json'
import { useContractAddresses } from './useContractAddresses'

// Re-exportar tipos para compatibilidad
export interface OraclePrices {
  ETH: number
  WBTC: number  
  USDC: number
  VCOP: number
}

export interface UseOraclePricesReturn {
  prices: OraclePrices
  isLoading: boolean
  error: string | null
  refetchPrices: () => void
  lastUpdated: Date | null
}

// 🔥 OPTIMIZACIÓN: Hook principal redirige al contexto compartido
export function useOraclePrices(): UseOraclePricesReturn {
  return useOraclePricesFromContext()
}

// 🔥 OPTIMIZACIÓN: Hook auxiliar para obtener precio individual con menor frecuencia
export function useTokenPrice(baseToken: Address, quoteToken: Address) {
  const { addresses } = useContractAddresses()
  const oracleAddress = addresses?.mockVcopOracle
  
  const { data: price, refetch, isLoading, error } = useReadContract({
    address: oracleAddress,
    abi: MOCK_VCOP_ORACLE_ABI,
    functionName: 'getPrice',
    args: [baseToken, quoteToken],
    query: {
      refetchOnWindowFocus: false,
      refetchInterval: 300000, // 🔥 Reducido a 5 minutos en lugar de 1 minuto
      staleTime: 120000, // 🔥 Cache durante 2 minutos
      gcTime: 600000, // 🔥 Mantener en cache por 10 minutos
      enabled: !!oracleAddress,
      retry: 1, // 🔥 Solo 1 reintento
      retryDelay: 10000 // 🔥 10 segundos entre reintentos
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