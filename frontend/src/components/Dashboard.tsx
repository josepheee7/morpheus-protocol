import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChartBarIcon, CpuChipIcon, BeakerIcon, SparklesIcon, ArrowTrendingUpIcon, ClockIcon } from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Pool, DashboardProps } from '../types'

const Dashboard: React.FC<DashboardProps> = ({ pools, selectedPool, onSelectPool }) => {
  const [stats, setStats] = useState({
    totalPools: 0,
    totalVolume: '0',
    avgFitness: 0,
    activeEvolutions: 0
  })

  const [chartData, setChartData] = useState([
    { name: 'Gen 0', pools: 1, fitness: 50 },
    { name: 'Gen 1', pools: 3, fitness: 65 },
    { name: 'Gen 2', pools: 8, fitness: 78 },
    { name: 'Gen 3', pools: 12, fitness: 85 },
  ])

  useEffect(() => {
    if (pools.length > 0) {
      const totalFitness = pools.reduce((sum, pool) => sum + pool.fitness, 0)
      setStats({
        totalPools: pools.length,
        totalVolume: '1.2M',
        avgFitness: Math.round(totalFitness / pools.length),
        activeEvolutions: pools.filter(p => p.generation > 0).length
      })
    }
  }, [pools])

  return (
    <div className="min-h-screen cyber-grid">
      <div className="space-y-8 p-6">
        {/* Futuristic Header */}
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent h-px top-1/2"></div>
          <h1 className="text-6xl font-black text-gradient mb-4 neon-text pulse-neon" style={{fontFamily: 'Orbitron'}}>
            ◊ MORPHEUS PROTOCOL ◊
          </h1>
          <p className="text-xl text-neon-cyan font-mono tracking-wider">
            [ EVOLUTIONARY AMM NEURAL NETWORK ]
          </p>
          <div className="mt-4 flex justify-center space-x-4">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
        </motion.div>

        {/* Holographic Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="morpheus-card hologram"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/50">
                <ChartBarIcon className="h-8 w-8 text-black" />
              </div>
              <div className="ml-4">
                <p className="text-xs text-cyan-300 font-mono uppercase tracking-wider">TOTAL POOLS</p>
                <p className="text-3xl font-black text-neon-cyan neon-text" style={{fontFamily: 'Orbitron'}}>{stats.totalPools}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ type: "spring", stiffness: 100, delay: 0.1 }}
            className="morpheus-card hologram"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/50">
                <ArrowTrendingUpIcon className="h-8 w-8 text-black" />
              </div>
              <div className="ml-4">
                <p className="text-xs text-green-300 font-mono uppercase tracking-wider">VOLUME</p>
                <p className="text-3xl font-black text-neon-green neon-text" style={{fontFamily: 'Orbitron'}}>${stats.totalVolume}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
            className="morpheus-card hologram"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50">
                <ClockIcon className="h-8 w-8 text-black" />
              </div>
              <div className="ml-4">
                <p className="text-xs text-purple-300 font-mono uppercase tracking-wider">AVG FITNESS</p>
                <p className="text-3xl font-black text-neon-pink neon-text" style={{fontFamily: 'Orbitron'}}>{stats.avgFitness}%</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ type: "spring", stiffness: 100, delay: 0.3 }}
            className="morpheus-card hologram"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg shadow-yellow-500/50">
                <ChartBarIcon className="h-8 w-8 text-black" />
              </div>
              <div className="ml-4">
                <p className="text-xs text-yellow-300 font-mono uppercase tracking-wider">EVOLUTIONS</p>
                <p className="text-3xl font-black text-yellow-400 neon-text" style={{fontFamily: 'Orbitron'}}>{stats.activeEvolutions}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Neural Network Evolution Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="morpheus-card hologram"
        >
          <div className="flex items-center mb-6">
            <div className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-pink-400 rounded-full mr-3 animate-pulse"></div>
            <h3 className="text-2xl font-black text-gradient neon-text" style={{fontFamily: 'Orbitron'}}>
              NEURAL EVOLUTION MATRIX
            </h3>
          </div>
          <div className="h-80 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-pink-500/5 rounded-lg"></div>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,255,0.2)" />
                <XAxis 
                  dataKey="name" 
                  stroke="#00ffff" 
                  style={{fontFamily: 'Orbitron', fontSize: '12px'}}
                />
                <YAxis 
                  stroke="#00ffff" 
                  style={{fontFamily: 'Orbitron', fontSize: '12px'}}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.9)', 
                    border: '1px solid #00ffff',
                    borderRadius: '8px',
                    boxShadow: '0 0 20px rgba(0,255,255,0.5)',
                    fontFamily: 'Orbitron'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="pools" 
                  stroke="#ff00ff" 
                  strokeWidth={3}
                  name="Pool Count"
                  dot={{ fill: '#ff00ff', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: '#ff00ff', strokeWidth: 2, fill: '#ff00ff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="fitness" 
                  stroke="#00ff00" 
                  strokeWidth={3}
                  name="Avg Fitness"
                  dot={{ fill: '#00ff00', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: '#00ff00', strokeWidth: 2, fill: '#00ff00' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Cyberpunk Pool Selection */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="morpheus-card hologram"
        >
          <div className="flex items-center mb-6">
            <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-blue-400 rounded-full mr-3 animate-pulse"></div>
            <h3 className="text-2xl font-black text-gradient neon-text" style={{fontFamily: 'Orbitron'}}>
              ACTIVE POOL NETWORK
            </h3>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {pools.map((pool, index) => (
              <motion.div
                key={pool.address}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className={`relative p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                  selectedPool?.address === pool.address 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-pink-500/20 border-2 border-cyan-400 shadow-lg shadow-cyan-400/50' 
                    : 'bg-black/30 border border-gray-600 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-400/30'
                }`}
                onClick={() => onSelectPool(pool)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-black text-xl text-neon-cyan" style={{fontFamily: 'Orbitron'}}>
                      {pool.token0}/{pool.token1}
                    </p>
                    <p className="text-sm text-cyan-300 font-mono">
                      GEN-{pool.generation.toString().padStart(3, '0')} • FITNESS: {pool.fitness}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-pink-300 font-mono">FEE: {pool.traits.feeBps / 100}%</p>
                    <p className="text-xs text-green-300 font-mono">
                      {pool.traits.mevProtection ? '🛡️ MEV-SHIELD' : '⚠️ VULNERABLE'}
                    </p>
                  </div>
                </div>
                {selectedPool?.address === pool.address && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent animate-pulse rounded-xl"></div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Dashboard
