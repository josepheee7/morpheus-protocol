import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GlobeAltIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { ethers } from 'ethers'

interface Chain {
  id: number
  name: string
  rpc: string
  explorer: string
  color: string
  deployed: boolean
}

interface MultiChainManagerProps {
  onChainSwitch: (chainId: number) => void
  currentChain: number
}

export default function MultiChainManager({ onChainSwitch, currentChain }: MultiChainManagerProps) {
  const [chains] = useState<Chain[]>([
    {
      id: 80002,
      name: 'Polygon Amoy',
      rpc: 'https://rpc-amoy.polygon.technology',
      explorer: 'https://amoy.polygonscan.com',
      color: 'from-purple-500 to-purple-700',
      deployed: true
    },
    {
      id: 84532,
      name: 'Base Sepolia',
      rpc: 'https://sepolia.base.org',
      explorer: 'https://sepolia.basescan.org',
      color: 'from-blue-500 to-blue-700',
      deployed: true
    },
    {
      id: 421614,
      name: 'Arbitrum Sepolia',
      rpc: 'https://sepolia.arbiscan.io',
      explorer: 'https://sepolia.arbiscan.io',
      color: 'from-orange-500 to-orange-700',
      deployed: true
    }
  ])

  const [isDeploying, setIsDeploying] = useState<number | null>(null)
  const [deploymentStatus, setDeploymentStatus] = useState<Record<number, string>>({})

  const handleDeploy = async (chainId: number) => {
    setIsDeploying(chainId)
    setDeploymentStatus(prev => ({ ...prev, [chainId]: 'Deploying contracts...' }))
    
    // Simulate deployment process
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    setDeploymentStatus(prev => ({ ...prev, [chainId]: 'Deployed successfully!' }))
    setIsDeploying(null)
  }

  const handleExportDNA = async (sourceChain: number, targetChain: number) => {
    setDeploymentStatus(prev => ({ 
      ...prev, 
      [targetChain]: `Exporting DNA from ${chains.find(c => c.id === sourceChain)?.name}...` 
    }))
    
    // Simulate DNA export/import
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setDeploymentStatus(prev => ({ 
      ...prev, 
      [targetChain]: 'DNA imported successfully!' 
    }))
  }

  return (
    <div className="morpheus-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center">
          <GlobeAltIcon className="h-6 w-6 text-blue-400 mr-2" />
          Multi-Chain Deployment
        </h3>
        <div className="text-sm text-gray-400">
          {chains.filter(c => c.deployed).length}/{chains.length} chains active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {chains.map((chain, index) => (
          <motion.div
            key={chain.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative p-6 rounded-lg border transition-all duration-200 ${
              currentChain === chain.id
                ? 'border-blue-500 bg-blue-500/20'
                : 'border-gray-600 bg-gray-800/50'
            }`}
          >
            {/* Chain Header */}
            <div className="flex items-center justify-between mb-4">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${chain.color}`}></div>
              {chain.deployed && (
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              )}
            </div>

            <h4 className="text-lg font-semibold text-white mb-2">{chain.name}</h4>
            <p className="text-gray-400 text-sm mb-4">Chain ID: {chain.id}</p>

            {/* Status */}
            <div className="mb-4">
              {deploymentStatus[chain.id] ? (
                <div className="text-sm text-blue-400 bg-blue-500/20 p-2 rounded">
                  {deploymentStatus[chain.id]}
                </div>
              ) : (
                <div className={`text-sm p-2 rounded ${
                  chain.deployed 
                    ? 'text-green-400 bg-green-500/20' 
                    : 'text-yellow-400 bg-yellow-500/20'
                }`}>
                  {chain.deployed ? 'Contracts Deployed' : 'Ready to Deploy'}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onChainSwitch(chain.id)}
                disabled={!chain.deployed}
                className={`w-full py-2 px-4 rounded-lg font-semibold transition-all duration-200 ${
                  currentChain === chain.id
                    ? 'bg-blue-600 text-white'
                    : chain.deployed
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                {currentChain === chain.id ? 'Current Chain' : 'Switch Chain'}
              </motion.button>

              {!chain.deployed && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDeploy(chain.id)}
                  disabled={isDeploying === chain.id}
                  className="w-full morpheus-button py-2 flex items-center justify-center"
                >
                  {isDeploying === chain.id ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    'Deploy Contracts'
                  )}
                </motion.button>
              )}

              {chain.deployed && chain.id !== currentChain && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleExportDNA(currentChain, chain.id)}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
                >
                  Import DNA
                </motion.button>
              )}
            </div>

            {/* Explorer Link */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <a
                href={chain.explorer}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
              >
                <GlobeAltIcon className="h-4 w-4 mr-1" />
                View Explorer
              </a>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Cross-Chain Evolution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 p-6 bg-gradient-to-r from-green-900/50 to-blue-900/50 rounded-lg border border-green-500/30"
      >
        <h4 className="text-lg font-semibold text-white mb-4">Cross-Chain Evolution</h4>
        <p className="text-gray-300 text-sm mb-4">
          Export pool DNA from one chain and import it to another for cross-chain evolution.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Source Chain</label>
            <select className="morpheus-input w-full">
              {chains.filter(c => c.deployed).map(chain => (
                <option key={chain.id} value={chain.id}>{chain.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Target Chain</label>
            <select className="morpheus-input w-full">
              {chains.filter(c => c.deployed).map(chain => (
                <option key={chain.id} value={chain.id}>{chain.name}</option>
              ))}
            </select>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-4 morpheus-button w-full py-3"
        >
          Execute Cross-Chain Evolution
        </motion.button>
      </motion.div>
    </div>
  )
}
