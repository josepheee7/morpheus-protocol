import { useEffect, useRef } from 'react'
import * as React from 'react'

// D3 is provided via CDN (window.d3)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

export type Traits = { feeBps: number; slippageGuardBps: number; cooldownBlocks: number; mevProtection: boolean }
export type PoolDesc = { token0: string; token1: string; parent: string; generation: number; traits: Traits }

export default function LineageTree({
  pools,
  descs,
  selected,
  onSelect,
}: {
  pools: string[]
  descs: Record<string, PoolDesc>
  selected: string
  onSelect: (addr: string) => void
}) {
  const ref = useRef<SVGSVGElement | null>(null)
  useEffect(() => {
    if (!ref.current) return
    const width = ref.current.clientWidth || 800
    const height = 420

    const nodes = pools.map((id) => ({ id, generation: descs[id]?.generation || 0 }))
    const links: { source: string; target: string }[] = []
    for (const id of pools) {
      const p = descs[id]?.parent
      if (p && p !== '0x0000000000000000000000000000000000000000') links.push({ source: p, target: id })
    }

    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()

    const g = svg.append('g')
    const zoom = d3.zoom().on('zoom', (event: any) => g.attr('transform', event.transform))
    svg.call(zoom as any)

    const sim = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-160))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('y', d3.forceY((d: any) => 60 + 80 * (d.generation || 0)).strength(0.8))

    const link = g.append('g').attr('stroke', '#ccc').selectAll('line').data(links).enter().append('line').attr('stroke-width', 1.5)

    const node = g.append('g').selectAll('circle').data(nodes).enter().append('circle')
      .attr('r', (d: any) => (d.id === selected ? 9 : 6))
      .attr('fill', (d: any) => (d.id === selected ? '#4f46e5' : '#16a34a'))
      .attr('stroke', '#111')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('click', (_: any, d: any) => onSelect(d.id))

    const labels = g.append('g').selectAll('text').data(nodes).enter().append('text')
      .text((d: any) => `${d.id.slice(0, 6)}…${d.id.slice(-4)} (g${d.generation})`)
      .attr('font-size', 10)
      .attr('fill', '#444')

    sim.on('tick', () => {
      link
        .attr('x1', (d: any) => (d.source.x))
        .attr('y1', (d: any) => (d.source.y))
        .attr('x2', (d: any) => (d.target.x))
        .attr('y2', (d: any) => (d.target.y))

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y)

      labels
        .attr('x', (d: any) => d.x + 10)
        .attr('y', (d: any) => d.y + 4)
    })

    return () => { sim.stop() }
  }, [pools, descs, selected, onSelect])

  return (
    <svg ref={ref} width={'100%'} height={420} style={{ border: '1px solid #eee', borderRadius: 8, background: '#fafafa' }} />
  )
}
