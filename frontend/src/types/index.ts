export interface Pool {
  id: string
  address: string
  name: string
  token0: string
  token1: string
  generation: number
  parent?: string
  fitness: number
  volume24h: string
  tvl: string
  apy: number
  traits: {
    feeBps: number
    slippageGuardBps: number
    cooldownBlocks: number
    mevProtection: boolean
  }
}

export interface DashboardProps {
  pools: Pool[]
  selectedPool: Pool | null
  onSelectPool: (pool: Pool) => void
}

export interface EvolutionVisualizerProps {
  pools: Pool[]
  selectedPool: Pool | null
  onEvolve: (pool: Pool) => void
}
