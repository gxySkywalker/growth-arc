import type { Companion } from '../types'

const portraits = import.meta.glob<string>('../../assets/art/characters/companions/*_camp_portrait_v1.png', {
  eager: true,
  import: 'default',
  query: '?url',
})

const portraitPath = (speciesId: string, form: string) =>
  `../../assets/art/characters/companions/${speciesId}_${form}_camp_portrait_v1.png`

/** Optional camp portrait. Adding a future growth portrait with the same
 * filename convention makes it selectable without changing page code. */
export function getCompanionCampPortrait(companion: Companion) {
  const form = companion.evolution_path || `stage-${companion.stage}`
  return portraits[portraitPath(companion.species_id, form)]
    || portraits[portraitPath(companion.species_id, 'stage-0')]
    || null
}
