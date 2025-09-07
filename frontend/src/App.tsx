import React, { useState } from 'react'
import './index.css'
import ProtocolApp from './components/ProtocolApp'
import Navbar from './components/Navbar'
import { Toaster } from 'react-hot-toast'

const App: React.FC = () => {
  const [started, setStarted] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Navbar />
      <Toaster position="top-right" />
      <div className="container mx-auto px-4 py-8">
        {!started ? (
          <>
            {/* Header */}
            <header className="mb-16 text-center">
              <div className="mb-8">
                <h1 className="text-7xl font-black text-white mb-4" style={{fontFamily: 'Orbitron', letterSpacing: '0.1em'}}>
                  MORPHEUS
                </h1>
                <div className="text-2xl font-light text-slate-400 tracking-widest" style={{fontFamily: 'Rajdhani'}}>
                  EVOLUTIONARY PROTOCOL
                </div>
              </div>
              <div className="w-24 h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent mx-auto mb-8"></div>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Next-generation DeFi infrastructure where liquidity pools evolve through machine learning algorithms,
                optimizing performance across multiple blockchain networks.
              </p>
            </header>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="morpheus-card group hover:scale-105 transition-transform duration-300">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-slate-800 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3" style={{fontFamily: 'Orbitron'}}>Genetic Evolution</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Pools automatically evolve their parameters through ML-powered genetic algorithms,
                    continuously optimizing for maximum efficiency.
                  </p>
                </div>
              </div>
              <div className="morpheus-card group hover:scale-105 transition-transform duration-300">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-slate-800 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3" style={{fontFamily: 'Orbitron'}}>MEV Protection</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Advanced slippage guards, cooldown mechanisms, and MEV-resistant architecture
                    protect users from front-running attacks.
                  </p>
                </div>
              </div>
              <div className="morpheus-card group hover:scale-105 transition-transform duration-300">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-slate-800 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3" style={{fontFamily: 'Orbitron'}}>Cross-Chain DNA</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Export and import pool genetics across multiple networks,
                    enabling seamless evolution migration between blockchains.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
              <button className="morpheus-button text-lg px-12 py-4 group" onClick={() => setStarted(true)}>
                <span className="flex items-center justify-center space-x-3" style={{fontFamily: 'Orbitron'}}>
                  <span>LAUNCH PROTOCOL</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
              <div className="mt-8 text-xs text-slate-500 tracking-wider" style={{fontFamily: 'Rajdhani'}}>
                EVOLUTIONARY DEFI • MACHINE LEARNING • CROSS-CHAIN
              </div>
            </div>
          </>
        ) : (
          <ProtocolApp />
        )}
      </div>
    </div>
  )
}

export default App
