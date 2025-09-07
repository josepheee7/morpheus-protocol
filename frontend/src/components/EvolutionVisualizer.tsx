import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowPathIcon, BeakerIcon } from '@heroicons/react/24/outline'
import { Pool, EvolutionVisualizerProps } from '../types'

const EvolutionVisualizer: React.FC<EvolutionVisualizerProps> = ({ pools, selectedPool, onEvolve }) => {
  const [evolutionTree, setEvolutionTree] = useState<Pool[][]>([])

  useEffect(() => {
    // Group pools by generation
    const generations: Pool[][] = []
    pools.forEach(pool => {
      if (!generations[pool.generation]) {
        generations[pool.generation] = []
      }
      generations[pool.generation].push(pool)
    })
    setEvolutionTree(generations)
  }, [pools])

  const getTraitColor = (value: number, max: number) => {
    const percentage = (value / max) * 100
    if (percentage < 30) return 'text-red-400'
    if (percentage < 70) return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <div className="min-h-screen cyber-grid">
      <div className="space-y-8 p-6">
        {/* Sci-Fi Header */}
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/20 to-transparent h-px top-1/2"></div>
          <h2 className="text-5xl font-black text-gradient mb-4 neon-text pulse-neon" style={{fontFamily: 'Orbitron'}}>
            ◈ GENETIC EVOLUTION MATRIX ◈
          </h2>
          <p className="text-xl text-neon-green font-mono tracking-wider">
            [ POOL LINEAGE & DNA SEQUENCING ]
          </p>
          <div className="mt-4 flex justify-center space-x-2">
            {[...Array(8)].map((_, i) => (
              <div 
                key={i}
                className="w-1 h-1 bg-green-400 rounded-full animate-pulse" 
                style={{animationDelay: `${i * 0.1}s`}}
              ></div>
            ))}
          </div>
        </motion.div>

        {/* Neural Evolution Tree */}
        <div className="overflow-x-auto">
          <div className="min-w-full space-y-12">
            {evolutionTree.map((generation, genIndex) => (
              <motion.div
                key={genIndex}
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: genIndex * 0.3, type: "spring", stiffness: 50 }}
                className="relative"
              >
                {/* Generation Header */}
                <div className="flex items-center mb-8">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50">
                      <span className="text-2xl font-black text-black" style={{fontFamily: 'Orbitron'}}>{genIndex}</span>
                    </div>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 animate-ping opacity-20"></div>
                  </div>
                  <div className="ml-6">
                    <h3 className="text-3xl font-black text-neon-green neon-text" style={{fontFamily: 'Orbitron'}}>
                      GENERATION-{genIndex.toString().padStart(3, '0')}
                    </h3>
                    <p className="text-green-300 font-mono text-sm">
                      {generation.length} ACTIVE SPECIMENS • AVG FITNESS: {Math.round(generation.reduce((sum, p) => sum + p.fitness, 0) / generation.length)}%
                    </p>
                  </div>
                </div>

                {/* Pool Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {generation.map((pool, poolIndex) => (
                    <motion.div
                      key={pool.address}
                      initial={{ opacity: 0, scale: 0.8, rotateX: -90 }}
                      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                      transition={{ 
                        delay: (genIndex * 0.3) + (poolIndex * 0.15),
                        type: "spring",
                        stiffness: 100
                      }}
                      className={`morpheus-card hologram cursor-pointer transition-all duration-300 ${
                        selectedPool?.address === pool.address 
                          ? 'ring-4 ring-green-400 bg-gradient-to-br from-green-500/20 to-cyan-500/20 shadow-2xl shadow-green-400/50' 
                          : 'hover:bg-gradient-to-br hover:from-green-500/10 hover:to-cyan-500/10 hover:shadow-xl hover:shadow-green-400/30'
                      }`}
                    >
                      {/* Pool Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="p-2 rounded-full bg-gradient-to-r from-green-500 to-cyan-500 shadow-lg shadow-green-500/50">
                            <BeakerIcon className="h-6 w-6 text-black" />
                          </div>
                          <div className="ml-3">
                            <span className="font-black text-xl text-neon-cyan" style={{fontFamily: 'Orbitron'}}>
                              {pool.token0}/{pool.token1}
                            </span>
                            <p className="text-xs text-cyan-300 font-mono">
                              SPECIMEN-{poolIndex.toString().padStart(3, '0')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-green-300 font-mono uppercase">FITNESS</div>
                          <div className="text-2xl font-black text-neon-green neon-text" style={{fontFamily: 'Orbitron'}}>
                            {pool.fitness}%
                          </div>
                        </div>
                      </div>

                      {/* DNA Traits Matrix */}
                      <div className="space-y-3 mb-6 p-4 bg-black/30 rounded-lg border border-green-500/30">
                        <div className="text-center mb-3">
                          <span className="text-xs text-green-300 font-mono uppercase tracking-wider">DNA SEQUENCE</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center">
                            <div className="text-xs text-cyan-300 font-mono">FEE</div>
                            <div className={`text-lg font-black ${getTraitColor(pool.traits.feeBps, 1000)} neon-text`} style={{fontFamily: 'Orbitron'}}>
                              {(pool.traits.feeBps / 100).toFixed(1)}%
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-xs text-cyan-300 font-mono">SLIPPAGE</div>
                            <div className={`text-lg font-black ${getTraitColor(pool.traits.slippageGuardBps, 2000)} neon-text`} style={{fontFamily: 'Orbitron'}}>
                              {(pool.traits.slippageGuardBps / 100).toFixed(1)}%
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-xs text-cyan-300 font-mono">COOLDOWN</div>
                            <div className={`text-lg font-black ${getTraitColor(pool.traits.cooldownBlocks, 100)} neon-text`} style={{fontFamily: 'Orbitron'}}>
                              {pool.traits.cooldownBlocks}
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-xs text-cyan-300 font-mono">MEV-SHIELD</div>
                            <div className={`text-lg font-black ${pool.traits.mevProtection ? 'text-neon-green' : 'text-red-400'} neon-text`} style={{fontFamily: 'Orbitron'}}>
                              {pool.traits.mevProtection ? 'ON' : 'OFF'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Evolution Button */}
                      <button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation()
                          onEvolve(pool)
                        }}
                        className="w-full morpheus-button flex items-center justify-center group"
                      >
                        <ArrowPathIcon className="h-5 w-5 mr-2 group-hover:animate-spin" />
                        <span style={{fontFamily: 'Orbitron'}}>EVOLVE SPECIMEN</span>
                      </button>

                      {/* Selection Indicator */}
                      {selectedPool?.address === pool.address && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/20 to-transparent animate-pulse rounded-xl pointer-events-none"></div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Neural Connection Lines */}
                {genIndex < evolutionTree.length - 1 && (
                  <div className="flex justify-center mt-8">
                    <div className="relative">
                      <div className="w-px h-16 bg-gradient-to-b from-green-500 via-cyan-500 to-transparent"></div>
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Evolution Stats */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="morpheus-card hologram"
        >
          <div className="flex items-center mb-4">
            <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mr-3 animate-pulse"></div>
            <h3 className="text-2xl font-black text-gradient neon-text" style={{fontFamily: 'Orbitron'}}>
              EVOLUTION STATISTICS
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xs text-purple-300 font-mono uppercase">TOTAL GENS</div>
              <div className="text-3xl font-black text-neon-pink neon-text" style={{fontFamily: 'Orbitron'}}>
                {evolutionTree.length}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-purple-300 font-mono uppercase">SPECIMENS</div>
              <div className="text-3xl font-black text-neon-cyan neon-text" style={{fontFamily: 'Orbitron'}}>
                {pools.length}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-purple-300 font-mono uppercase">MAX FITNESS</div>
              <div className="text-3xl font-black text-neon-green neon-text" style={{fontFamily: 'Orbitron'}}>
                {Math.max(...pools.map(p => p.fitness))}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-purple-300 font-mono uppercase">MUTATIONS</div>
              <div className="text-3xl font-black text-yellow-400 neon-text" style={{fontFamily: 'Orbitron'}}>
                {pools.filter(p => p.generation > 0).length}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default EvolutionVisualizer
