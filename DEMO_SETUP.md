# 🚀 MORPHEUS PROTOCOL - DEMO SETUP GUIDE

## Prerequisites for Live Demo

### 1. Node.js & npm Installation
```bash
# Download and install Node.js from https://nodejs.org/
# Verify installation:
node --version
npm --version
```

### 2. Environment Setup
```bash
# 1. Copy environment template
cp .env.example .env

# 2. Add your testnet private key to .env:
PRIVATE_KEY=your_private_key_here_with_testnet_funds

# 3. Get testnet tokens:
# - Polygon Amoy: https://faucet.polygon.technology/
# - Base Sepolia: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
# - Arbitrum Sepolia: https://faucet.arbitrum.io/
```

### 3. Install Dependencies
```bash
# Root project dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 4. Compile Smart Contracts
```bash
npx hardhat compile
```

### 5. Deploy to Testnet
```bash
# Deploy to Polygon Amoy
npm run deploy:amoy

# Deploy to Base Sepolia (optional)
npm run deploy:base

# Deploy to Arbitrum Sepolia (optional)
npm run deploy:arb
```

### 6. Update Frontend Contract Addresses
After deployment, update `frontend/src/config/contracts.ts` with deployed addresses.

### 7. Start Frontend
```bash
npm run web:dev
```

## Demo Flow Script

### Phase 1: Introduction (30 seconds)
- "Welcome to Morpheus Protocol - the world's first evolutionary AMM"
- "Pools evolve through genetic algorithms, optimizing for performance"
- "Cross-chain DNA export enables species migration"

### Phase 2: Pool Creation (1 minute)
- Connect MetaMask wallet
- Create initial liquidity pool with USDC/WETH
- Show initial traits: fee rate, slippage protection, MEV shield

### Phase 3: Evolution Demo (2 minutes)
- Execute pool evolution to spawn child pool
- Show trait mutations and fitness improvements
- Demonstrate generation lineage in Evolution Visualizer

### Phase 4: Trading & Analytics (1 minute)
- Perform token swaps on evolved pools
- Show real-time metrics and performance data
- Highlight cyberpunk UI and animations

### Phase 5: Cross-Chain Migration (1 minute)
- Export pool DNA from Polygon Amoy
- Import to Base Sepolia
- Show cross-chain evolution continuity

## Key Demo Points
✅ **Zero TypeScript errors** - Production ready code
✅ **Futuristic UI** - Cyberpunk aesthetics that wow judges
✅ **Real functionality** - No dummy data, actual blockchain interactions
✅ **Cross-chain capability** - Multi-network deployment
✅ **ML-powered evolution** - Genetic algorithms in action
✅ **Professional presentation** - Smooth, rehearsed demo flow

## Troubleshooting
- Ensure MetaMask is connected to correct testnet
- Verify sufficient testnet tokens for gas fees
- Check contract addresses match deployed instances
- Confirm RPC endpoints are responsive

## Success Metrics
- Pools created and evolved successfully
- Swaps executed with proper slippage protection
- UI animations smooth and impressive
- Cross-chain DNA export/import working
- Zero errors during 5-minute demo window
