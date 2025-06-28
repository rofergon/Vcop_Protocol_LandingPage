import React, { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClientProvider } from '@tanstack/react-query'
import { wagmiAdapter, queryClient } from '../config/appkit'
import { OraclePricesProvider } from './OraclePricesProvider'

interface AppKitProviderProps {
  children: ReactNode
}

export function AppKitProvider({ children }: AppKitProviderProps) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OraclePricesProvider>
          {children}
        </OraclePricesProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
} 