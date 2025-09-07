// Contract addresses and ABIs for Morpheus Protocol
// Update these addresses after deployment

export const CONTRACTS = {
  // Polygon Amoy Testnet
  amoy: {
    chainId: 80002,
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    registry: '0x0000000000000000000000000000000000000000', // Update after deployment
    poolFactory: '0x0000000000000000000000000000000000000000', // Update after deployment
    morpheusFactory: '0x0000000000000000000000000000000000000000', // Update after deployment
  },
  
  // Base Sepolia Testnet
  baseSepolia: {
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
    registry: '0x0000000000000000000000000000000000000000', // Update after deployment
    poolFactory: '0x0000000000000000000000000000000000000000', // Update after deployment
    morpheusFactory: '0x0000000000000000000000000000000000000000', // Update after deployment
  },
  
  // Arbitrum Sepolia Testnet
  arbitrumSepolia: {
    chainId: 421614,
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    registry: '0x0000000000000000000000000000000000000000', // Update after deployment
    poolFactory: '0x0000000000000000000000000000000000000000', // Update after deployment
    morpheusFactory: '0x0000000000000000000000000000000000000000', // Update after deployment
  }
}

export const DEFAULT_NETWORK = 'amoy'

// Test tokens for demo
export const TEST_TOKENS = {
  amoy: {
    USDC: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // Polygon Amoy USDC
    WETH: '0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9', // Polygon Amoy WETH
  },
  baseSepolia: {
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
    WETH: '0x4200000000000000000000000000000000000006', // Base Sepolia WETH
  },
  arbitrumSepolia: {
    USDC: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Sepolia USDC
    WETH: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73', // Arbitrum Sepolia WETH
  }
}
