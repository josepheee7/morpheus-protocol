import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS, DEFAULT_NETWORK } from '../config/contracts'

interface Web3State {
  provider: ethers.BrowserProvider | ethers.JsonRpcProvider | null
  signer: ethers.Signer | null
  account: string | null
  chainId: number | null
  isConnected: boolean
  isCorrectNetwork: boolean
}

export const useWeb3 = () => {
  const DEMO_MODE = (import.meta as any).env?.VITE_DEMO_MODE === 'true'
  const DEMO_RPC_URL: string = (import.meta as any).env?.VITE_DEMO_RPC_URL || 'http://127.0.0.1:8545'
  const [web3State, setWeb3State] = useState<Web3State>({
    provider: null,
    signer: null,
    account: null,
    chainId: null,
    isConnected: false,
    isCorrectNetwork: false
  })

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.send('eth_requestAccounts', [])
        const signer = await provider.getSigner()
        const network = await provider.getNetwork()
        const account = accounts[0]
        const chainId = Number(network.chainId)
        const isCorrectNetwork = chainId === CONTRACTS[DEFAULT_NETWORK].chainId || (DEMO_MODE && chainId === 31337)
        setWeb3State({ provider, signer, account, chainId, isConnected: true, isCorrectNetwork })
        return { success: true, account }
      }

      // Fallback to demo JsonRpcProvider (no extension required)
      if (DEMO_MODE) {
        const provider = new ethers.JsonRpcProvider(DEMO_RPC_URL)
        const network = await provider.getNetwork()
        const accounts: string[] = await provider.send('eth_accounts', [])
        const account = accounts[0]
        const signer = await provider.getSigner(account)
        const chainId = Number(network.chainId)
        const isCorrectNetwork = chainId === 31337
        setWeb3State({ provider, signer, account, chainId, isConnected: true, isCorrectNetwork })
        return { success: true, account }
      }

      throw new Error('No wallet available')
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  const switchNetwork = async (networkName: keyof typeof CONTRACTS) => {
    try {
      if (!window.ethereum) {
        // In demo mode, pretend success if using local provider
        if (DEMO_MODE && web3State.chainId === 31337) return { success: true }
        throw new Error('MetaMask not installed')
      }

      const targetChainId = CONTRACTS[networkName].chainId
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }]
      })

      return { success: true }
    } catch (error) {
      console.error('Failed to switch network:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  const disconnectWallet = () => {
    setWeb3State({
      provider: null,
      signer: null,
      account: null,
      chainId: null,
      isConnected: false,
      isCorrectNetwork: false
    })
  }

  // Listen for account and network changes; attempt demo auto-connect
  useEffect(() => {
    const attach = () => {
      if (window.ethereum) {
        const handleAccountsChanged = (accounts: string[]) => {
          if (accounts.length === 0) {
            disconnectWallet()
          } else {
            connectWallet()
          }
        }
        const handleChainChanged = () => { connectWallet() }
        window.ethereum.on('accountsChanged', handleAccountsChanged)
        window.ethereum.on('chainChanged', handleChainChanged)
        return () => {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
          window.ethereum.removeListener('chainChanged', handleChainChanged)
        }
      } else if (DEMO_MODE && !web3State.isConnected) {
        // auto connect demo
        connectWallet()
      }
      return () => {}
    }
    return attach()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    ...web3State,
    connectWallet,
    switchNetwork,
    disconnectWallet
  }
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}
