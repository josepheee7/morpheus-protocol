// Advanced ML-powered pool analysis and evolution prediction
// Uses TensorFlow.js for client-side ML inference

declare global {
  interface Window {
    tf?: any
  }
}

interface PoolMetrics {
  numSwaps: string
  avgImpact: string
  r0: string
  r1: string
  fees0: string
  fees1: string
}

interface AnalysisResult {
  riskScore: number
  label: 'low' | 'medium' | 'high'
  notes: string[]
}

interface Traits {
  feeBps: number
  slippageGuardBps: number
  cooldownBlocks: number
  mevProtection: boolean
}

// Neural Network for fitness prediction
class FitnessPredictor {
  private model: any = null

  async initializeModel() {
    if (!window.tf) {
      console.warn('TensorFlow.js not loaded')
      return
    }

    try {
      // Create a simple neural network for fitness prediction
      this.model = window.tf.sequential({
        layers: [
          window.tf.layers.dense({ inputShape: [6], units: 16, activation: 'relu' }),
          window.tf.layers.dropout({ rate: 0.2 }),
          window.tf.layers.dense({ units: 8, activation: 'relu' }),
          window.tf.layers.dense({ units: 1, activation: 'sigmoid' })
        ]
      })

      this.model.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError',
        metrics: ['mae']
      })
    } catch (error) {
      console.warn('Failed to initialize ML model:', error)
    }
  }

  predictFitness(metrics: PoolMetrics): number {
    if (!this.model || !window.tf) {
      return this.fallbackFitness(metrics)
    }

    try {
      const numSwaps = parseFloat(metrics.numSwaps) || 0
      const avgImpact = parseFloat(metrics.avgImpact) || 0
      const r0 = parseFloat(metrics.r0) || 0
      const r1 = parseFloat(metrics.r1) || 0
      const fees0 = parseFloat(metrics.fees0) || 0
      const fees1 = parseFloat(metrics.fees1) || 0

      const input = window.tf.tensor2d([[
        Math.min(numSwaps / 1000, 1),
        Math.min(avgImpact / 2000, 1),
        Math.min(r0 / 1e6, 1),
        Math.min(r1 / 1e6, 1),
        Math.min((fees0 + fees1) / 1000, 1),
        Math.min(Math.abs(r0 - r1) / 1e6, 1)
      ]])

      const prediction = this.model.predict(input)
      const fitness = prediction.dataSync()[0] * 100
      
      input.dispose()
      prediction.dispose()
      
      return Math.max(0, Math.min(100, fitness))
    } catch (error) {
      console.warn('ML prediction failed, using fallback:', error)
      return this.fallbackFitness(metrics)
    }
  }

  private fallbackFitness(metrics: PoolMetrics): number {
    const numSwaps = parseFloat(metrics.numSwaps) || 0
    const avgImpact = parseFloat(metrics.avgImpact) || 0
    const r0 = parseFloat(metrics.r0) || 0
    const r1 = parseFloat(metrics.r1) || 0
    const fees0 = parseFloat(metrics.fees0) || 0
    const fees1 = parseFloat(metrics.fees1) || 0

    let fitness = 50 // Base fitness

    // Volume contribution
    fitness += Math.min(20, numSwaps / 10)

    // Liquidity depth
    const totalLiquidity = r0 + r1
    fitness += Math.min(15, totalLiquidity / 10000)

    // Price impact penalty
    fitness -= Math.min(20, avgImpact / 100)

    // Fee collection bonus
    const totalFees = fees0 + fees1
    fitness += Math.min(15, totalFees / 100)

    return Math.max(0, Math.min(100, fitness))
  }
}

const fitnessPredictor = new FitnessPredictor()

// Initialize ML model
fitnessPredictor.initializeModel()

export function analyzeMetrics(metrics: PoolMetrics): AnalysisResult {
  const notes: string[] = []
  let riskScore = 0

  const numSwaps = parseFloat(metrics.numSwaps) || 0
  const avgImpact = parseFloat(metrics.avgImpact) || 0
  const r0 = parseFloat(metrics.r0) || 0
  const r1 = parseFloat(metrics.r1) || 0
  const fees0 = parseFloat(metrics.fees0) || 0
  const fees1 = parseFloat(metrics.fees1) || 0

  // Volume analysis
  if (numSwaps < 10) {
    riskScore += 30
    notes.push('Low trading activity detected')
  } else if (numSwaps > 100) {
    notes.push('High trading activity - pool is performing well')
  }

  // Price impact analysis
  if (avgImpact > 1000) {
    riskScore += 25
    notes.push('High average price impact - consider increasing liquidity')
  } else if (avgImpact < 100) {
    notes.push('Low price impact - good liquidity depth')
  }

  // Liquidity analysis
  const totalLiquidity = r0 + r1
  if (totalLiquidity < 1000) {
    riskScore += 35
    notes.push('Low liquidity reserves - may cause high slippage')
  } else if (totalLiquidity > 100000) {
    notes.push('Excellent liquidity depth')
  }

  // Fee analysis
  const totalFees = fees0 + fees1
  if (totalFees === 0 && numSwaps > 0) {
    riskScore += 20
    notes.push('No fees collected despite trading activity')
  } else if (totalFees > 0) {
    notes.push('Fee collection is active')
  }

  // Liquidity balance analysis
  const imbalance = Math.abs(r0 - r1) / Math.max(r0 + r1, 1)
  if (imbalance > 0.8) {
    riskScore += 15
    notes.push('Significant liquidity imbalance detected')
  }

  // Determine risk label
  let label: 'low' | 'medium' | 'high'
  if (riskScore < 30) label = 'low'
  else if (riskScore < 70) label = 'medium'
  else label = 'high'

  if (notes.length === 0) {
    notes.push('Pool metrics look healthy')
  }

  return { riskScore, label, notes }
}
