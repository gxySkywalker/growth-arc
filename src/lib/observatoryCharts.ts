import * as echarts from 'echarts/core'
import type { EChartsCoreOption } from 'echarts/core'
import { BarChart, HeatmapChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, HeatmapChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer])

const BASE = {
  textStyle: { fontFamily: "'Fusion Pixel','Courier New',monospace" },
  animationDuration: 150,
  animationDurationUpdate: 120,
}

const STAR = '#8FBCCC'
const STAR_HI = '#BEDCE2'
const STAR_L1 = '#496D7A'
const STAR_L2 = '#6F98A6'
const STAR_L3 = '#9FC5CE'
const STAR_L4 = '#E3EEE8'
const BRASS = '#C39755'
const CHART_BG = '#283342'
const CHART_BG2 = '#303B49'
const AXIS_TEXT = '#D8CCB5'
const AXIS_MUTED = '#A99D88'
const AXIS_LINE = 'rgba(211,193,158,.15)'

const HOUR_LABELS = ['0','','','3','','','6','','','9','','','12','','','15','','','18','','','21','','','']
const DAY_NAMES = ['周一','周二','周三','周四','周五','周六','周日']

export const ECHARTS = { init: echarts.init, dispose: echarts.dispose, getInstanceByDom: echarts.getInstanceByDom }

function fmtShort(s: number): string {
  if (s < 60) return `${s}s`
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}h${m}m` : `${h}h`
  return `${m}m`
}
function fmtLong(s: number): string {
  if (s < 60) return `${s}秒`
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}小时${m}分钟星轨` : `${h}小时`
  return `${m}分钟星轨`
}

export function hourlyOption(hourly: number[]): EChartsCoreOption {
  const bars = hourly.map((v, i) => v > 0 ? { value: [i, v], itemStyle: { color: STAR, borderRadius: 0 } } : null).filter(Boolean)
  return {
    ...BASE,
    grid: { top: 8, right: 8, bottom: 20, left: 8 },
    xAxis: { type: 'category', data: HOUR_LABELS, axisTick: { show: false }, axisLine: { lineStyle: { color: AXIS_LINE } }, axisLabel: { color: AXIS_MUTED, fontSize: 9 }, splitLine: { show: false } },
    yAxis: { type: 'value', min: 0, max: 3600, show: false },
    series: [{ type: 'bar', data: bars, barWidth: 9, barGap: '5%', emphasis: { itemStyle: { color: STAR_L4 } }, itemStyle: { borderRadius: 0, color: STAR } }],
    tooltip: { trigger: 'item', backgroundColor: CHART_BG, borderColor: BRASS, textStyle: { color: AXIS_TEXT, fontSize: 12 }, formatter: (p: any) => p?.data ? `${p.data.value[0]}时<br/>留下${fmtLong(p.data.value[1])}` : '' },
  }
}

export function weeklyBarsOption(daily: number[], todayIdx: number): EChartsCoreOption {
  const max = Math.max(1, ...daily)
  const bars = daily.map((v, i) => v > 0 ? { value: v, itemStyle: { color: STAR, borderRadius: 0 } } : null)
  return {
    ...BASE,
    grid: { top: 28, right: 12, bottom: 24, left: 12 },
    xAxis: { type: 'category', data: DAY_NAMES, axisTick: { show: false }, axisLine: { lineStyle: { color: AXIS_LINE } }, axisLabel: { color: AXIS_MUTED, fontSize: 10, rich: { today: { color: BRASS, fontWeight: 'bold' } }, formatter: (_: any, i: number) => i === todayIdx ? `{today|${DAY_NAMES[i]}}` : DAY_NAMES[i] }, splitLine: { show: false } },
    yAxis: { type: 'value', min: 0, max, show: false },
    series: [{ type: 'bar', data: bars, barWidth: 32, barGap: '15%', emphasis: { itemStyle: { color: STAR_L4 } }, label: { show: true, position: 'top', color: AXIS_MUTED, fontSize: 10, formatter: (p: any) => p.data?.value ? fmtShort(p.data.value) : '' }, itemStyle: { borderRadius: 0, color: STAR } }],
    tooltip: { trigger: 'item', backgroundColor: CHART_BG, borderColor: BRASS, textStyle: { color: AXIS_TEXT, fontSize: 12 }, formatter: (p: any) => p.data?.value ? `${DAY_NAMES[p.dataIndex]} · 出征${fmtLong(p.data.value)}` : '' },
  }
}

export function heatmapOption(grid: number[][], todayRow: number): EChartsCoreOption {
  const data: [number, number, number][] = []
  for (let day = 0; day < 7; day++) for (let hour = 0; hour < 24; hour++) {
    const v = grid[day]?.[hour] || 0
    if (v > 0) data.push([hour, day, v])
  }
  return {
    ...BASE,
    grid: { top: 4, right: 8, bottom: 20, left: 40 },
    xAxis: { type: 'category', data: HOUR_LABELS, position: 'top', axisTick: { show: false }, axisLine: { lineStyle: { color: AXIS_LINE } }, axisLabel: { color: AXIS_MUTED, fontSize: 9 }, splitLine: { show: false } },
    yAxis: { type: 'category', data: DAY_NAMES, inverse: true, axisTick: { show: false }, axisLine: { lineStyle: { color: AXIS_LINE } }, axisLabel: { color: AXIS_MUTED, fontSize: 10, rich: { today: { color: BRASS, fontWeight: 'bold' } }, formatter: (_: any, i: number) => i === todayRow ? `{today|${DAY_NAMES[i]}}` : DAY_NAMES[i] }, splitLine: { show: false } },
    visualMap: { min: 0, max: 3600, show: false, inRange: { color: ['transparent', STAR_L1, STAR_L2, STAR_L3, STAR_L4] } },
    series: [{ type: 'heatmap', data, itemStyle: { borderWidth: 2, borderColor: CHART_BG, borderRadius: 0 }, emphasis: { itemStyle: { borderColor: BRASS, borderWidth: 2 } }, label: { show: false } }],
    tooltip: { backgroundColor: CHART_BG, borderColor: BRASS, textStyle: { color: AXIS_TEXT, fontSize: 12 }, formatter: (p: any) => { const d = p.data; return d ? `${DAY_NAMES[d[1]]} ${d[0]}时<br/>留下${fmtLong(d[2])}` : '' } },
  }
}
