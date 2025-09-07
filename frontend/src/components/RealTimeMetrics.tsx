import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChartBarIcon, ArrowTrendingUpIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { ethers } from 'ethers'

interface MetricsData {
  timestamp: number
  volume: number
  fees: number
  priceImpact: number
  liquidity: number
  swapCount: number
  fitness: number
}

interface RealTimeMetricsProps {
  poolAddress: string
  provider: ethers.AbstractProvider | null
}

export default function RealTimeMetrics({ poolAddress, provider }: RealTimeMetricsProps) {
  const [metrics, setMetrics] = useState<MetricsData[]>([])
  const [currentMetrics, setCurrentMetrics] = useState({
    totalVolume: '0',
    totalFees: '0',
    avgPriceImpact: '0',
    totalLiquidity: '0',
    swapCount: 0,
    fitnessScore: 0
  })
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    if (!poolAddress || !provider) return

    let interval: NodeJS.Timeout

    const fetchMetrics = async () => {
      try {
        const pool = new ethers.Contract(poolAddress, [
          'function numSwaps() view returns (uint256)',
          'function totalVolume0() view returns (uint256)',
          'function totalVolume1() view returns (uint256)',
          'function totalFees0() view returns (uint256)',
          'function totalFees1() view returns (uint256)',
          'function reserve0() view returns (uint256)',
          'function reserve1() view returns (uint256)',
          'function getAveragePriceImpactBps() view returns (uint256)'
        ], provider)

        const [numSwaps, volume0, volume1, fees0, fees1, reserve0, reserve1, avgImpact] = await Promise.all([
          pool.numSwaps(),
          pool.totalVolume0(),
          pool.totalVolume1(),
          pool.totalFees0(),
          pool.totalFees1(),
          pool.reserve0(),
          pool.reserve1(),
          pool.getAveragePriceImpactBps().catch(() => 0n)
        ])

        const totalVolume = Number(ethers.formatEther(volume0 + volume1))
        const totalFees = Number(ethers.formatEther(fees0 + fees1))
        const totalLiquidity = Number(ethers.formatEther(reserve0 + reserve1))
        const priceImpact = Number(avgImpact) / 100

        // Calculate fitness score based on metrics
        let fitness = 50
        if (totalVolume > 1000) fitness += 20
        if (totalFees > 10) fitness += 15
        if (priceImpact < 500) fitness += 15 // Less than 5% impact
        if (totalLiquidity > 10000) fitness += 10

        const newMetric: MetricsData = {
          timestamp: Date.now(),
          volume: totalVolume,
          fees: totalFees,
          priceImpact,
          liquidity: totalLiquidity,
          swapCount: Number(numSwaps),
          fitness: Math.min(100, fitness)
        }

        setMetrics(prev => [...prev.slice(-19), newMetric]) // Keep last 20 points
        setCurrentMetrics({
          totalVolume: totalVolume.toFixed(2),
          totalFees: totalFees.toFixed(4),
          avgPriceImpact: priceImpact.toFixed(2),
          totalLiquidity: totalLiquidity.toFixed(2),
          swapCount: Number(numSwaps),
          fitnessScore: Math.min(100, fitness)
        })

        setIsLive(true)
      } catch (error) {
        console.error('Failed to fetch metrics:', error)
        setIsLive(false)
      }
    }

    // Initial fetch
    fetchMetrics()

    // Set up real-time updates every 10 seconds
    interval = setInterval(fetchMetrics, 10000)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [poolAddress, provider])

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">Real-Time Pool Metrics</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          <span className="text-sm text-gray-400">{isLive ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Current Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="morpheus-card p-4"
        >
          <div className="flex items-center">
            <ArrowTrendingUpIcon className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-xs text-gray-400">Total Volume</p>
              <p className="text-lg font-bold text-white">{currentMetrics.totalVolume}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="morpheus-card p-4"
        >
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-6 w-6 text-yellow-400" />
            <div className="ml-3">
              <p className="text-xs text-gray-400">Total Fees</p>
              <p className="text-lg font-bold text-white">{currentMetrics.totalFees}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="morpheus-card p-4"
        >
          <div className="flex items-center">
            <ChartBarIcon className="h-6 w-6 text-blue-400" />
            <div className="ml-3">
              <p className="text-xs text-gray-400">Price Impact</p>
              <p className="text-lg font-bold text-white">{currentMetrics.avgPriceImpact}%</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="morpheus-card p-4"
        >
          <div className="flex items-center">
            <ClockIcon className="h-6 w-6 text-purple-400" />
            <div className="ml-3">
              <p className="text-xs text-gray-400">Swaps</p>
              <p className="text-lg font-bold text-white">{currentMetrics.swapCount}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume & Fees Chart */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="morpheus-card p-6"
        >
          <h4 className="text-lg font-semibold text-white mb-4">Volume & Fees Over Time</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#9CA3AF"
                tickFormatter={(value: any) => formatTime(value)}
              />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelFormatter={(value: any) => formatTime(value as number)}
              />
              <Line 
                type="monotone" 
                dataKey="volume" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Volume"
              />
              <Line 
                type="monotone" 
                dataKey="fees" 
                stroke="#F59E0B" 
                strokeWidth={2}
                name="Fees"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Fitness Score Chart */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="morpheus-card p-6"
        >
          <h4 className="text-lg font-semibold text-white mb-4">Pool Fitness Evolution</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#9CA3AF"
                tickFormatter={(value: any) => formatTime(value)}
              />
              <YAxis stroke="#9CA3AF" domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelFormatter={(value: any) => formatTime(value as number)}
              />
              <Bar 
                dataKey="fitness" 
                fill="#8B5CF6"
                name="Fitness Score"
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Detailed Metrics Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="morpheus-card p-6"
      >
        <h4 className="text-lg font-semibold text-white mb-4">Performance Analytics</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="text-sm font-semibold text-gray-400 mb-3">Current Status</h5>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Liquidity:</span>
                <span className="text-white font-mono">{currentMetrics.totalLiquidity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Fitness Score:</span>
                <span className={`font-bold ${
                  currentMetrics.fitnessScore >= 80 ? 'text-green-400' :
                  currentMetrics.fitnessScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {currentMetrics.fitnessScore}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Pool Address:</span>
                <span className="text-blue-400 font-mono text-sm">
                  {poolAddress.slice(0, 10)}...{poolAddress.slice(-8)}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h5 className="text-sm font-semibold text-gray-400 mb-3">Performance Indicators</h5>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Volume/Liquidity Ratio:</span>
                <span className="text-white">
                  {currentMetrics.totalLiquidity !== '0' 
                    ? (parseFloat(currentMetrics.totalVolume) / parseFloat(currentMetrics.totalLiquidity) * 100).toFixed(2)
                    : '0'
                  }%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Fee Efficiency:</span>
                <span className="text-white">
                  {currentMetrics.totalVolume !== '0'
                    ? (parseFloat(currentMetrics.totalFees) / parseFloat(currentMetrics.totalVolume) * 100).toFixed(4)
                    : '0'
                  }%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Avg Swaps/Update:</span>
                <span className="text-white">{(currentMetrics.swapCount / Math.max(metrics.length, 1)).toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
