import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, base, sepolia, baseSepolia } from '@reown/appkit/networks'
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

// 3. Configure Base Sepolia with official RPC
const baseSepoliaCustom: AppKitNetwork = {
  ...baseSepolia,
  rpcUrls: {
    default: {
      http: ['https://sepolia.base.org']
    },
    public: {
      http: ['https://sepolia.base.org']
    }
  }
}

// 4. Set the networks - Base Sepolia first for development
const networks = [baseSepoliaCustom, base, mainnet, arbitrum, sepolia] as [AppKitNetwork, ...AppKitNetwork[]]

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