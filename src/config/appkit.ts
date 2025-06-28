import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, base, sepolia, avalanche } from '@reown/appkit/networks'
import { QueryClient } from '@tanstack/react-query'
import type { AppKitNetwork } from '@reown/appkit/networks'

// 0. Setup queryClient
const queryClient = new QueryClient()

// 1. Get projectId from https://cloud.reown.com
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID

// 2. Create a metadata object - optional
const metadata = {
  name: 'VCOP Protocol',
  description: 'VCOP Protocol - The first DeFi lending protocol for Latin America',
  url: 'https://vcop-protocol.com', // origin must match your domain & subdomain
  icons: ['/logovcop.png']
}

// 3. Configure Avalanche Fuji with official RPC
const avalancheFujiCustom: AppKitNetwork = {
  id: 43113,
  name: 'Avalanche Fuji C-Chain',
  nativeCurrency: {
    decimals: 18,
    name: 'AVAX',
    symbol: 'AVAX',
  },
  rpcUrls: {
    default: {
      http: ['https://api.avax-test.network/ext/bc/C/rpc'],
      webSocket: ['wss://api.avax-test.network/ext/bc/C/ws']
    },
    public: {
      http: ['https://api.avax-test.network/ext/bc/C/rpc'],
      webSocket: ['wss://api.avax-test.network/ext/bc/C/ws']
    }
  },
  blockExplorers: {
    default: { 
      name: 'SnowTrace', 
      url: 'https://subnets-test.avax.network/c-chain' 
    },
  },
  testnet: true
}

// 4. Set the networks - Avalanche Fuji first for development
const networks = [avalancheFujiCustom, avalanche, base, mainnet, arbitrum, sepolia] as [AppKitNetwork, ...AppKitNetwork[]]

// 5. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false // Para React (no Next.js)
})

// 6. Create modal
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
    swaps: false,
    onramp: false
  },
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#10b981', // emerald-500 to match your theme
    '--w3m-border-radius-master': '12px',
    '--w3m-font-family': 'Inter, system-ui, sans-serif'
  }
})

// 7. Export provider components and config
export { wagmiAdapter, queryClient }
export const config = wagmiAdapter.wagmiConfig 