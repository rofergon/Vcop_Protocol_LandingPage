import { defineChain } from 'viem'
import type { Chain } from 'viem'

// Avalanche Fuji testnet configuration with multiple RPC endpoints
export const avalancheFuji = defineChain({
  id: 43113,
  name: 'Avalanche Fuji',
  nativeCurrency: {
    decimals: 18,
    name: 'AVAX',
    symbol: 'AVAX',
  },
  rpcUrls: {
    default: {
      http: [
        'https://api.avax-test.network/ext/bc/C/rpc',
        'https://avalanche-fuji-c-chain.publicnode.com',
        'https://rpc.ankr.com/avalanche_fuji'
      ],
      webSocket: ['wss://api.avax-test.network/ext/bc/C/ws'],
    },
    public: {
      http: [
        'https://api.avax-test.network/ext/bc/C/rpc',
        'https://avalanche-fuji-c-chain.publicnode.com',
        'https://rpc.ankr.com/avalanche_fuji'
      ],
      webSocket: ['wss://api.avax-test.network/ext/bc/C/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'SnowTrace',
      url: 'https://testnet.snowtrace.io',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 7096959,
    },
  },
  testnet: true,
})

// Export supported chains
export const supportedChains = [avalancheFuji] as const

export type SupportedChain = typeof supportedChains[number] 