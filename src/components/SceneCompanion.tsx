import type { Companion } from '../types'
import hearthHound from '../../assets/art/characters/companions/hearth_hound_idle_provisional_v1.png'

const PALETTES: Record<string, { main: string; dark: string; light: string; accent: string }> = {
  honey: { main: '#b87f46', dark: '#382319', light: '#efbd73', accent: '#4f5d35' },
  ember: { main: '#a84c32', dark: '#3c2020', light: '#e18a47', accent: '#f0b84c' },
  moss: { main: '#7d8150', dark: '#343725', light: '#b5a568', accent: '#52633c' },
  moon: { main: '#aaa6a0', dark: '#494654', light: '#e7dfc8', accent: '#7a7590' },
  river: { main: '#987053', dark: '#44352d', light: '#d6a778', accent: '#537d83' },
  cloud: { main: '#d9d3c6', dark: '#6d6170', light: '#fff0df', accent: '#9aa7b7' },
  iron: { main: '#79746d', dark: '#383532', light: '#b4a996', accent: '#6b5845' },
  violet: { main: '#79627f', dark: '#382c42', light: '#ba8eae', accent: '#d0a65a' },
}

export function SceneCompanion({
  companion,
  attentive = false,
  facing = 'left',
  depth,
}: {
  companion: Companion | null
  attentive?: boolean
  facing?: 'left' | 'right'
  depth?: number
}) {
  const palette = PALETTES[companion?.species.palette || 'honey'] || PALETTES.honey
  const isStarterHound = !companion || companion.species_id === 'hearth_hound'

  return <div
    className={`cottage-scene-companion facing-${facing} ${attentive ? 'is-attentive' : ''}`}
    style={{ zIndex: depth }}
    role='img'
    aria-label={companion ? `常伴伙伴${companion.nickname}` : '常伴伙伴'}
  >
    {isStarterHound
      ? <img src={hearthHound} alt='' draggable={false} />
      : <svg viewBox='0 0 32 32' shapeRendering='crispEdges' aria-hidden='true'>
          <rect x='7' y='24' width='20' height='3' fill='#261a13' opacity='.55' />
          <rect x='9' y='13' width='16' height='12' fill={palette.dark} />
          <rect x='11' y='11' width='13' height='12' fill={palette.main} />
          <rect x='8' y='5' width='16' height='13' fill={palette.dark} />
          <rect x='10' y='7' width='12' height='10' fill={palette.main} />
          <rect x='12' y='8' width='8' height='3' fill={palette.light} />
          <rect x='11' y='12' width='3' height='3' fill='#1e1714' />
          <rect x='19' y='12' width='3' height='3' fill='#1e1714' />
          <rect x='14' y='16' width='6' height='3' fill={palette.light} />
          <rect x='10' y='20' width='14' height='3' fill={palette.accent} />
          {companion?.species_id === 'ember_drake' && <><path d='M9 16 3 12v10l7 1Z' fill={palette.light} /><path d='m24 16 5-4v10l-6 1Z' fill={palette.light} /></>}
          {companion?.species_id === 'cloud_rabbit' && <><rect x='10' y='1' width='4' height='8' fill={palette.main} /><rect x='19' y='1' width='4' height='8' fill={palette.main} /></>}
          {companion?.species_id === 'moon_owl' && <><rect x='6' y='8' width='5' height='12' fill={palette.light} /><rect x='22' y='8' width='5' height='12' fill={palette.light} /></>}
        </svg>}
  </div>
}
