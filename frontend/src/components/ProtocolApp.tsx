import React, { useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import RegistryABI from '../abi/Registry.json'
import FactoryABI from '../abi/PoolFactory.json'
import PoolABI from '../abi/EvolvablePool.json'
import ERC20 from '../abi/ERC20.json'
import MorpheusABI from '../abi/MorpheusFactory.json'
import { useWeb3 } from '../hooks/useWeb3'
import { DEFAULT_NETWORK } from '../config/contracts'
import PoolsTable from './PoolsTable'
import { toast } from 'react-hot-toast'
import '../index.css'

// Lightweight on-chain types
type Traits = { feeBps: number; slippageGuardBps: number; cooldownBlocks: number; mevProtection: boolean }

type PoolDesc = {
  token0: string
  token1: string
  parent: string
  generation: number
  traits: Traits
  owner?: string
}

type Metrics = { reserve0: string; reserve1: string; avgImpactBps: number }

const ProtocolApp: React.FC = () => {
  const { provider, signer, account, isConnected, chainId, isCorrectNetwork, switchNetwork } = useWeb3()
  const [registryAddr, setRegistryAddr] = useState<string>('')
  const [morpheusAddr, setMorpheusAddr] = useState<string>('')
  const [pools, setPools] = useState<string[]>([])
  const [poolData, setPoolData] = useState<Record<string, PoolDesc>>({})
  const [selected, setSelected] = useState<string>('')
  const [filter, setFilter] = useState<string>('')
  const [busy, setBusy] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [metrics, setMetrics] = useState<Metrics | null>(null)

  const registry = useMemo(() => {
    if (!signer || !registryAddr) return null
    try { return new ethers.Contract(registryAddr, RegistryABI, signer) } catch { return null }
  }, [signer, registryAddr])

  const morpheus = useMemo(() => {
    if (!signer || !morpheusAddr) return null
    try { return new ethers.Contract(morpheusAddr, MorpheusABI, signer) } catch { return null }
  }, [signer, morpheusAddr])

  useEffect(() => {
    const savedRegistry = localStorage.getItem('registry')
    const savedMorpheus = localStorage.getItem('morpheus')
    if (savedRegistry) setRegistryAddr(savedRegistry)
    if (savedMorpheus) setMorpheusAddr(savedMorpheus)
  }, [])

  // Try auto-load deployments.json from public root
  useEffect(() => {
    (async () => {
      try {
        if (registryAddr) return
        const res = await fetch('/deployments.json', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (data?.registry) setRegistryAddr(data.registry)
        if (data?.morpheusFactory) setMorpheusAddr(data.morpheusFactory)
      } catch {}
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // fetch metrics for selected pool
  useEffect(() => {
    (async () => {
      if (!selected || !provider) { setMetrics(null); return }
      try {
        const pool = new ethers.Contract(selected, PoolABI, provider)
        const [r0, r1] = await (pool as any).getReserves()
        let avg = 0
        try { avg = Number(await (pool as any).getAveragePriceImpactBps()) } catch {}
        setMetrics({ reserve0: r0.toString(), reserve1: r1.toString(), avgImpactBps: avg })
      } catch {
        setMetrics(null)
      }
    })()
  }, [selected, provider])

  const txExplorer = (hash?: string) => {
    if (!hash) return undefined
    switch (chainId) {
      case 80002: return `https://amoy.polygonscan.com/tx/${hash}`
      case 84532: return `https://sepolia.basescan.org/tx/${hash}`
      case 421614: return `https://sepolia.arbiscan.io/tx/${hash}`
      default: return undefined
    }
  }

  async function loadPools() {
    if (!registry) return
    setBusy(true); setError('')
    try {
      const t = toast.loading('Loading pools...')
      localStorage.setItem('registry', registryAddr)
      if (morpheusAddr) localStorage.setItem('morpheus', morpheusAddr)
      const list: string[] = await registry.allPools()
      setPools(list)
      const out: Record<string, PoolDesc> = {}
      for (const addr of list) {
        const d = await registry.getPool(addr)
        let owner: string | undefined = undefined
        try {
          const poolC = new ethers.Contract(addr, PoolABI, signer)
          owner = await (poolC as any).owner()
        } catch {}
        out[addr] = {
          token0: d.token0,
          token1: d.token1,
          parent: d.parent,
          generation: Number(d.generation),
          traits: {
            feeBps: Number(d.traits.feeBps),
            slippageGuardBps: Number(d.traits.slippageGuardBps),
            cooldownBlocks: Number(d.traits.cooldownBlocks),
            mevProtection: Boolean(d.traits.mevProtection)
          },
          owner
        }
      }
      setPoolData(out)
      toast.success(`Loaded ${list.length} pool${list.length === 1 ? '' : 's'}`, { id: t })
    } catch (e: any) {
      console.error(e)
      setError(e?.message ?? 'Failed to load pools')
      toast.error(e?.message ?? 'Failed to load pools')
    } finally {
      setBusy(false)
    }
  }

  function onImportDeployments(e: any) {
    try {
      const f = e?.target?.files?.[0]
      if (!f) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result || '{}'))
          if (data.registry) setRegistryAddr(data.registry)
          if (data.morpheusFactory) setMorpheusAddr(data.morpheusFactory)
        } catch (err) {
          console.error(err)
          setError('Invalid deployments.json')
        }
      }
      reader.readAsText(f)
    } catch (err: any) {
      console.error(err)
      setError('Failed to import deployments.json')
    }
  }

  async function spawnChild(parent: string) {
    if (!registry || !signer) return
    setBusy(true); setError('')
    try {
      // Prefer MorpheusFactory evolution if provided
      if (morpheus) {
        const tx = await (morpheus as any).evolveContract(parent, [])
        const pending = toast.loading('Evolving contract...')
        const rc = await tx.wait()
        const url = txExplorer(tx.hash)
        toast.success(url ? `Evolution confirmed. View: ${url}` : 'Evolution confirmed', { id: pending })
        // best-effort: reload
        await loadPools()
        return
      }
      // Fallback: direct create via PoolFactory with parent's traits
      const factoryAddr: string = await registry.factory()
      const factory = new ethers.Contract(factoryAddr, FactoryABI, signer)
      const d = await registry.getPool(parent)
      const tx = await (factory as any).createPool(d.token0, d.token1, parent, d.traits)
      const pending = toast.loading('Creating child pool...')
      await tx.wait()
      const url = txExplorer(tx.hash)
      toast.success(url ? `Child created. View: ${url}` : 'Child created', { id: pending })
      await loadPools()
    } catch (e: any) {
      console.error(e); setError(e?.message ?? 'Spawn failed')
      toast.error(e?.message ?? 'Spawn failed')
    } finally { setBusy(false) }
  }

  async function addLiquidity(poolAddr: string, amount0: string, amount1: string) {
    if (!signer) return
    setBusy(true); setError('')
    try {
      const pool = new ethers.Contract(poolAddr, PoolABI, signer)
      const data = poolData[poolAddr]
      const token0 = new ethers.Contract(data.token0, ERC20, signer)
      const token1 = new ethers.Contract(data.token1, ERC20, signer)
      const amt0 = ethers.parseUnits(amount0 || '0', 18)
      const amt1 = ethers.parseUnits(amount1 || '0', 18)
      await (token0 as any).approve(poolAddr, amt0)
      await (token1 as any).approve(poolAddr, amt1)
      // EvolvablePool.addLiquidity(amount0, amount1) — onlyOwner
      const tx = await (pool as any).addLiquidity(amt0, amt1)
      const pending = toast.loading('Adding liquidity...')
      await tx.wait()
      const url = txExplorer(tx.hash)
      toast.success(url ? `Liquidity added. View: ${url}` : 'Liquidity added', { id: pending })
    } catch (e: any) {
      console.error(e); setError(e?.message ?? 'Add liquidity failed (are you the pool owner?)')
      toast.error(e?.message ?? 'Add liquidity failed')
    } finally { setBusy(false) }
  }

  async function swap(poolAddr: string, tokenIn: string, amountIn: string) {
    if (!signer) return
    setBusy(true); setError('')
    try {
      const pool = new ethers.Contract(poolAddr, PoolABI, signer)
      const token = new ethers.Contract(tokenIn, ERC20, signer)
      const amt = ethers.parseUnits(amountIn || '0', 18)
      await (token as any).approve(poolAddr, amt)
      // EvolvablePool.swapExactInput(tokenIn, amountIn, minOut, to)
      const tx = await (pool as any).swapExactInput(tokenIn, amt, 0, account!)
      const pending = toast.loading('Swapping...')
      await tx.wait()
      const url = txExplorer(tx.hash)
      toast.success(url ? `Swap confirmed. View: ${url}` : 'Swap confirmed', { id: pending })
    } catch (e: any) {
      console.error(e); setError(e?.message ?? 'Swap failed')
      toast.error(e?.message ?? 'Swap failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-wide" style={{fontFamily:'Orbitron'}}>Protocol Console</h2>
      </div>
      {/* Controls */}
      <div className="morpheus-card">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm text-slate-400 mb-1">Registry Address</label>
            <input
              className="w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-lg text-sm font-mono"
              placeholder="0x..."
              value={registryAddr}
              onChange={e => setRegistryAddr(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-slate-400 mb-1">Morpheus Factory (optional)</label>
            <input
              className="w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-lg text-sm font-mono"
              placeholder="0x..."
              value={morpheusAddr}
              onChange={e => setMorpheusAddr(e.target.value)}
            />
          </div>
          <div>
            <button
              className="morpheus-button px-6 py-2"
              onClick={loadPools}
              disabled={!isConnected || !registryAddr || busy}
            >
              {busy ? 'Loading...' : 'Load Pools'}
            </button>
          </div>
          <div>
            <input id="deploymentsFile" type="file" accept="application/json" className="hidden" onChange={onImportDeployments} />
            <button
              className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800/60"
              onClick={() => (document.getElementById('deploymentsFile') as HTMLInputElement)?.click()}
            >
              Import deployments.json
            </button>
          </div>
        </div>
        {!isConnected && (
          <p className="text-sm text-amber-400 mt-3">Connect your wallet to interact with the protocol.</p>
        )}
        {isConnected && !isCorrectNetwork && (
          <div className="mt-3 flex items-center gap-3">
            <p className="text-sm text-amber-400">Wrong network. Please switch to the demo chain.</p>
            <button className="px-3 py-1 rounded-md border border-slate-600 hover:bg-slate-800/60 text-sm" onClick={() => switchNetwork(DEFAULT_NETWORK as any)}>Switch Network</button>
          </div>
        )}
        {error && (
          <p className="text-sm text-red-400 mt-3">{error}</p>
        )}
      </div>

      {/* Pools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="morpheus-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold" style={{fontFamily: 'Orbitron'}}>Pools ({pools.length})</h3>
            <div className="text-xs text-slate-500">Registry: {registryAddr ? `${registryAddr.slice(0,6)}...${registryAddr.slice(-4)}` : '-'}</div>
          </div>

          {busy && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-slate-800/40 border border-slate-700 animate-pulse" />
              ))}
            </div>
          )}
          {!busy && pools.length === 0 && (
            <p className="text-slate-400 text-sm">No pools loaded. Enter a valid Registry address or import <code>deployments.json</code>, then click Load Pools.</p>
          )}

          {!busy && (
            <PoolsTable
              pools={pools}
              data={poolData}
              selected={selected}
              onSelect={setSelected}
              filter={filter}
              setFilter={setFilter}
            />
          )}
        </div>

        {/* Actions */}
        <div className="morpheus-card">
          <h3 className="text-xl font-semibold mb-4" style={{fontFamily: 'Orbitron'}}>Selected Pool</h3>
          {!selected ? (
            <p className="text-slate-400 text-sm mb-2">Select a pool to view details.</p>
          ) : (
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="text-white font-semibold">{poolData[selected]?.token0}/{poolData[selected]?.token1}</div>
                <div className="text-xs text-slate-400">Gen {poolData[selected]?.generation}</div>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                <span className="font-mono break-all">{selected}</span>
                <button className="px-2 py-0.5 border border-slate-600 rounded-md hover:bg-slate-800/60" onClick={() => { navigator.clipboard.writeText(selected); toast.success('Address copied') }}>Copy</button>
                {chainId && (
                  <a className="px-2 py-0.5 border border-slate-600 rounded-md hover:bg-slate-800/60" href={
                    chainId===80002?`https://amoy.polygonscan.com/address/${selected}`:
                    chainId===84532?`https://sepolia.basescan.org/address/${selected}`:
                    chainId===421614?`https://sepolia.arbiscan.io/address/${selected}`:'#'
                  } target="_blank" rel="noreferrer">Explorer</a>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700">
                  <div className="text-slate-400">Reserves</div>
                  <div className="text-slate-300 mt-1">{metrics ? metrics.reserve0 : '—'} / {metrics ? metrics.reserve1 : '—'}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700">
                  <div className="text-slate-400">Avg Price Impact</div>
                  <div className="text-slate-300 mt-1">{metrics ? (metrics.avgImpactBps/100).toFixed(2)+'%' : '—'}</div>
                </div>
              </div>
            </div>
          )}

          <h3 className="text-xl font-semibold mb-4 mt-4" style={{fontFamily: 'Orbitron'}}>Actions</h3>
          {!selected ? (
            <p className="text-slate-400 text-sm">Select a pool to interact with it.</p>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="text-sm text-slate-300 mb-2 font-medium">Spawn Child Pool</div>
                <button className="morpheus-button px-4 py-2" onClick={() => spawnChild(selected)} disabled={!registry || busy}>
                  Spawn Child
                </button>
              </div>

              <div>
                <div className="text-sm text-slate-300 mb-2 font-medium">Add Liquidity</div>
                <div className="text-xs text-slate-500 mb-2">Owner: {poolData[selected]?.owner ? `${poolData[selected]?.owner.slice(0,6)}...${poolData[selected]?.owner.slice(-4)}` : '-'}</div>
                <div className="flex gap-3 mb-2">
                  <input id="amount0" placeholder="Token0 amount" className="flex-1 px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-lg text-sm" />
                  <input id="amount1" placeholder="Token1 amount" className="flex-1 px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-lg text-sm" />
                </div>
                <button className="morpheus-button px-4 py-2" onClick={() => {
                  const a0 = (document.getElementById('amount0') as HTMLInputElement)?.value || '0'
                  const a1 = (document.getElementById('amount1') as HTMLInputElement)?.value || '0'
                  addLiquidity(selected, a0, a1)
                }} disabled={!registry || busy || !account || (account?.toLowerCase() !== poolData[selected]?.owner?.toLowerCase())}>Add Liquidity</button>
                {account && poolData[selected]?.owner && account.toLowerCase() !== poolData[selected]?.owner?.toLowerCase() && (
                  <div className="text-[11px] text-amber-400 mt-1">Only the pool owner can add liquidity in this MVP.</div>
                )}
              </div>

              <div>
                <div className="text-sm text-slate-300 mb-2 font-medium">Swap</div>
                <div className="flex gap-3 mb-2">
                  <select id="tokenIn" className="px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-lg text-sm">
                    <option value={poolData[selected]?.token0}>Token0</option>
                    <option value={poolData[selected]?.token1}>Token1</option>
                  </select>
                  <input id="swapAmount" placeholder="Amount" className="flex-1 px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-lg text-sm" />
                </div>
                <button className="morpheus-button px-4 py-2" onClick={() => {
                  const tokenIn = (document.getElementById('tokenIn') as HTMLSelectElement)?.value
                  const amount = (document.getElementById('swapAmount') as HTMLInputElement)?.value || '0'
                  if (tokenIn) swap(selected, tokenIn, amount)
                }} disabled={!registry || busy}>Swap</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-[12px] text-slate-500">
        Tip: Deploy on Polygon Amoy using CLI, then paste Registry & Factory addresses above. This UI reads pools via Registry and can spawn children and add liquidity in real time.
      </p>
    </div>
  )
}

export default ProtocolApp
