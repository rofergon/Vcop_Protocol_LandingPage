import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, base, sepolia, avalanche } from '@reown/appkit/networks'
import { QueryClient } from '@tanstack/react-query'
import { http } from 'viem'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { avalancheFuji } from './networks'

// 0. Setup queryClient
const queryClient = new QueryClient()

// 1. Get projectId from https://cloud.reown.com
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID

if (!projectId) {
  throw new Error('VITE_REOWN_PROJECT_ID is not defined in environment variables')
}

// 2. Create a metadata object - optional
const metadata = {
  name: 'VCOP Protocol',
  description: 'VCOP Protocol - The first DeFi lending protocol for Latin America',
  url: 'https://vcop-protocol.com', // origin must match your domain & subdomain
  icons: ['/logovcop.png']
}

// 3. Convert our custom Avalanche Fuji chain to AppKit format
const avalancheFujiForAppKit: AppKitNetwork = {
  id: avalancheFuji.id,
  name: avalancheFuji.name,
  nativeCurrency: avalancheFuji.nativeCurrency,
  rpcUrls: avalancheFuji.rpcUrls,
  blockExplorers: avalancheFuji.blockExplorers,
  testnet: true
}

// 4. Set the networks - Avalanche Fuji first for development
const networks = [avalancheFujiForAppKit, avalanche, base, mainnet, arbitrum, sepolia] as [AppKitNetwork, ...AppKitNetwork[]]

// 5. Create Wagmi Adapter with custom transports to force direct RPC usage
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false, // Para React (no Next.js)
  transports: {
    // Force direct HTTP transport for Avalanche Fuji with fallback RPCs
    [avalancheFuji.id]: http(avalancheFuji.rpcUrls.default.http[0], {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
      timeout: 10000
    }),
    // Keep default transports for other networks
    1: http(),      // Mainnet
    42161: http(),  // Arbitrum
    8453: http(),   // Base
    11155111: http(), // Sepolia
    43114: http()   // Avalanche Mainnet
  }
})

// 6. Create modal with analytics disabled to avoid WalletConnect dependencies
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: false, // 🔥 DISABLED to avoid WalletConnect RPC calls
    swaps: false,
    onramp: false,
    email: false,
    socials: false
  },
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#10b981', // emerald-500 to match your theme
    '--w3m-border-radius-master': '12px',
    '--w3m-font-family': 'Inter, system-ui, sans-serif'
  },
  // Additional configuration to avoid WalletConnect RPC proxy
  enableWalletConnect: true,
  enableInjected: true,
  enableEIP6963: true,
  enableCoinbase: true
})

// 7. Export provider components and config
export { wagmiAdapter, queryClient, avalancheFuji }
export const config = wagmiAdapter.wagmiConfig 