import React, { useMemo } from 'react'

interface PoolsTableProps {
  pools: string[]
  data: Record<string, any>
  selected?: string
  onSelect: (addr: string) => void
  filter: string
  setFilter: (s: string) => void
}

const short = (a?: string) => (a ? `${a.slice(0, 6)}...${a.slice(-4)}` : '-')

const PoolsTable: React.FC<PoolsTableProps> = ({ pools, data, selected, onSelect, filter, setFilter }) => {
  const filtered = useMemo(() => {
    const f = (filter || '').toLowerCase()
    if (!f) return pools
    return pools.filter(addr => {
      const d = data[addr] || {}
      return (
        addr.toLowerCase().includes(f) ||
        (d.owner || '').toLowerCase().includes(f) ||
        (d.token0 || '').toLowerCase().includes(f) ||
        (d.token1 || '').toLowerCase().includes(f)
      )
    })
  }, [pools, data, filter])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-slate-400">Search</div>
        <input
          className="w-2/3 px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-lg text-sm"
          placeholder="Address / owner / token"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>
      <div className="overflow-auto max-h-[420px]">
        <table className="w-full text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="text-left font-medium py-2">Pair</th>
              <th className="text-left font-medium py-2">Gen</th>
              <th className="text-left font-medium py-2">Fee %</th>
              <th className="text-left font-medium py-2">Guard %</th>
              <th className="text-left font-medium py-2">Owner</th>
              <th className="text-left font-medium py-2">Address</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(addr => {
              const d = data[addr]
              return (
                <tr key={addr}
                  onClick={() => onSelect(addr)}
                  className={`cursor-pointer border-t border-slate-800 hover:bg-slate-900/60 ${selected === addr ? 'bg-slate-800/60' : ''}`}
                >
                  <td className="py-3">
                    <div className="text-white">{short(d?.token0)}/{short(d?.token1)}</div>
                  </td>
                  <td className="py-3 text-slate-300">{d?.generation ?? '-'}</td>
                  <td className="py-3 text-slate-300">{d ? (d.traits.feeBps/100).toFixed(2) : '-'}</td>
                  <td className="py-3 text-slate-300">{d ? (d.traits.slippageGuardBps/100).toFixed(2) : '-'}</td>
                  <td className="py-3 text-slate-400">{short(d?.owner)}</td>
                  <td className="py-3 text-slate-500 font-mono">{short(addr)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-slate-400 text-sm py-6">No matches. Try a different search.</div>
        )}
      </div>
    </div>
  )
}

export default PoolsTable
