import { useEffect, useRef, useId } from 'react'
import * as echarts from 'echarts/core'
import type { EChartsCoreOption } from 'echarts/core'

const DEV = (import.meta as any).env?.DEV
let _uid = 0

interface Props { option: EChartsCoreOption | null; className?: string; empty?: boolean; emptyText?: string }

export function ObsChart({ option, className, empty, emptyText }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const inst = useRef<echarts.ECharts | null>(null)
  const motion = useRef(true)
  const uid = useRef(`chart-${++_uid}`)

  useEffect(() => { if (DEV) console.log(`[chart] mount ${uid.current}`) }, [])
  useEffect(() => () => { if (DEV) console.log(`[chart] dispose ${uid.current}`) }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    motion.current = !mq.matches
    const handler = (e: MediaQueryListEvent) => { motion.current = !e.matches; inst.current?.setOption(option || {}, { notMerge: true }) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!ref.current) return
    if (inst.current) inst.current.dispose()
    const chart = echarts.init(ref.current, undefined, { renderer: 'canvas', useDirtyRect: true })
    inst.current = chart
    if (DEV) console.log(`[chart] ${uid.current} init`, { w: ref.current.offsetWidth, h: ref.current.offsetHeight })
    const ro = new ResizeObserver(() => {
      if (DEV) console.log(`[chart] ${uid.current} resize`)
      inst.current?.resize()
    })
    ro.observe(ref.current)
    return () => { ro.disconnect(); chart.dispose(); inst.current = null }
  }, [])

  useEffect(() => {
    if (DEV) {
      const hasOpt = !!option
      const sc = option ? (option as any).series?.length ?? 0 : 0
      const dl = option ? (option as any).series?.[0]?.data?.length ?? 0 : 0
      console.log(`[chart] ${uid.current} option update`, { hasOption: hasOpt, seriesCount: sc, dataLength: dl, empty })
    }
    if (!inst.current || !option) return
    const opts = { ...option }
    if (!motion.current) { opts.animation = false; opts.animationDurationUpdate = 0 }
    if (DEV) console.log(`[chart] ${uid.current} setOption`)
    inst.current.setOption(opts, { notMerge: true, lazyUpdate: false })
  }, [option, empty])

  // Keep the chart host mounted even while data is empty. Previously the
  // first render could have no host, so the one-time init effect returned;
  // when async data arrived later ECharts had no chance to initialize until
  // the user left and re-entered this page.
  return <div className={className} style={{ position: 'relative', width: '100%', height: '100%', minHeight: 120 }}>
    <div ref={ref} style={{ width: '100%', height: '100%' }} />
    {empty ? <div className="obs-empty" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{emptyText || '暂无数据'}</div> : null}
  </div>
}
