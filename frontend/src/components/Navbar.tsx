import React from 'react'
import WalletConnect from './WalletConnect'
import { useWeb3 } from '../hooks/useWeb3'

const networkName = (chainId?: number | null) => {
  switch (chainId) {
    case 80002: return 'Polygon Amoy'
    case 84532: return 'Base Sepolia'
    case 421614: return 'Arbitrum Sepolia'
    default: return chainId ? `Chain ${chainId}` : 'Not Connected'
  }
}

const NetworkBadge: React.FC = () => {
  const { chainId, isConnected } = useWeb3()
  const name = networkName(chainId)
  return (
    <div className={`px-3 py-1 rounded-full text-xs border ${isConnected ? 'border-cyan-400 text-cyan-300' : 'border-slate-600 text-slate-400'}`}>
      {name}
    </div>
  )
}

const Navbar: React.FC = () => {
  return (
    <nav className="w-full sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 bg-slate-900/80 border-b border-slate-800">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="text-2xl font-black tracking-widest" style={{fontFamily:'Orbitron'}}>MORPHEUS</div>
          <div className="hidden md:flex items-center gap-5 text-sm text-slate-300">
            <a href="#" className="hover:text-white">Dashboard</a>
            <a href="#" className="hover:text-white">Pools</a>
            <a href="#" className="hover:text-white">DNA</a>
            <a href="https://github.com/" target="_blank" className="hover:text-white">Docs</a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NetworkBadge />
          <WalletConnect />
        </div>
      </div>
    </nav>
  )
}

export default Navbar
