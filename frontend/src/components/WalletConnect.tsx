import React from 'react'
import { motion } from 'framer-motion'
import { WalletIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useWeb3 } from '../hooks/useWeb3'
import { CONTRACTS, DEFAULT_NETWORK } from '../config/contracts'

const WalletConnect: React.FC = () => {
  const { 
    account, 
    isConnected, 
    isCorrectNetwork, 
    chainId,
    connectWallet, 
    switchNetwork, 
    disconnectWallet 
  } = useWeb3()

  const handleConnect = async () => {
    const result = await connectWallet()
    if (!result.success) {
      console.error('Connection failed:', result.error)
    }
  }

  const handleSwitchNetwork = async () => {
    const result = await switchNetwork(DEFAULT_NETWORK)
    if (!result.success) {
      console.error('Network switch failed:', result.error)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getNetworkName = (chainId: number) => {
    const network = Object.entries(CONTRACTS).find(([_, config]) => config.chainId === chainId)
    return network ? network[0] : 'Unknown'
  }

  if (!isConnected) {
    return (
      <motion.button
        onClick={handleConnect}
        className="morpheus-button flex items-center space-x-2"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <WalletIcon className="h-5 w-5" />
        <span style={{fontFamily: 'Orbitron'}}>CONNECT WALLET</span>
      </motion.button>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      {!isCorrectNetwork && (
        <motion.button
          onClick={handleSwitchNetwork}
          className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 hover:bg-red-500/30 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ExclamationTriangleIcon className="h-4 w-4" />
          <span className="text-sm font-mono">Wrong Network</span>
        </motion.button>
      )}
      
      <div className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-lg border border-purple-500/30">
        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        <div className="text-sm">
          <div className="text-white font-mono" style={{fontFamily: 'Orbitron'}}>
            {formatAddress(account!)}
          </div>
          <div className="text-xs text-gray-400">
            {getNetworkName(chainId!)} Network
          </div>
        </div>
      </div>
      
      <motion.button
        onClick={disconnectWallet}
        className="px-3 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 hover:bg-red-500/30 transition-colors text-sm"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Disconnect
      </motion.button>
    </div>
  )
}

export default WalletConnect
