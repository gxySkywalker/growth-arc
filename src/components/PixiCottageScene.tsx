import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import 'pixi.js/unsafe-eval'
import type { Application, Graphics, Sprite, Texture } from 'pixi.js'
import type { Companion } from '../types'
import { canHandle } from '../lib/inputContext'
import roomBackdrop from '../../assets/art/environments/cottage/cottage_room_backdrop_provisional_v1.png'
import playerWalkAtlas from '../../assets/art/characters/player/player_walk_32x48_v1.png'
import hearthHoundWalkAtlas from '../../assets/art/characters/companions/hearth_hound_walk_48_v1.png'
import hearthHoundManeWalkAtlas from '../../assets/art/characters/companions/hearth_hound_stage-1_walk_48_v1.png'
import hearthHoundEmberTailWalkAtlas from '../../assets/art/characters/companions/hearth_hound_ember_tail_walk_48_v1.png'
import hearthHoundPineShadowWalkAtlas from '../../assets/art/characters/companions/hearth_hound_pine_shadow_walk_48_v1.png'
import hearthHoundMoonPawWalkAtlas from '../../assets/art/characters/companions/hearth_hound_moon_paw_walk_48_v1.png'
import mossFoxWalkAtlas from '../../assets/art/characters/companions/moss_fox_stage-0_walk_48_v1.png'
import mossFoxGrownWalkAtlas from '../../assets/art/characters/companions/moss_fox_stage-1_walk_48_v1.png'
import mossFoxForestCrownWalkAtlas from '../../assets/art/characters/companions/moss_fox_forest_crown_walk_48_v1.png'
import glimmerCatWalkAtlas from '../../assets/art/characters/companions/glimmer_cat_stage-0_walk_48_v1.png'
import glimmerCatGrownWalkAtlas from '../../assets/art/characters/companions/glimmer_cat_stage-1_walk_48_v1.png'
import glimmerCatNightGlassWalkAtlas from '../../assets/art/characters/companions/glimmer_cat_night_glass_walk_48_v1.png'
import riverOtterWalkAtlas from '../../assets/art/characters/companions/river_otter_stage-0_walk_48_v1.png'
import riverOtterGrownWalkAtlas from '../../assets/art/characters/companions/river_otter_stage-1_walk_48_v1.png'
import riverOtterBayCurrentWalkAtlas from '../../assets/art/characters/companions/river_otter_bay_current_walk_48_v1.png'
import ironBadgerWalkAtlas from '../../assets/art/characters/companions/iron_badger_stage-0_walk_48_v1.png'
import ironBadgerGrownWalkAtlas from '../../assets/art/characters/companions/iron_badger_stage-1_walk_48_v1.png'
import ironBadgerArmorKingWalkAtlas from '../../assets/art/characters/companions/iron_badger_armor_king_walk_48_v1.png'
import moonOwlWalkAtlas from '../../assets/art/characters/companions/moon_owl_stage-0_walk_48_v1.png'
import moonOwlGrownWalkAtlas from '../../assets/art/characters/companions/moon_owl_stage-1_walk_48_v1.png'
import moonOwlFinalWalkAtlas from '../../assets/art/characters/companions/moon_owl_dusk_owl_walk_48_v1.png'
import cloudRabbitWalkAtlas from '../../assets/art/characters/companions/cloud_rabbit_stage-0_walk_48_v1.png'
import cloudRabbitGrownWalkAtlas from '../../assets/art/characters/companions/cloud_rabbit_stage-1_walk_48_v1.png'
import cloudRabbitFinalWalkAtlas from '../../assets/art/characters/companions/cloud_rabbit_wind_tuft_rabbit_walk_48_v1.png'
import emberDrakeWalkAtlas from '../../assets/art/characters/companions/ember_drake_stage-0_walk_48_v1.png'
import emberDrakeGrownWalkAtlas from '../../assets/art/characters/companions/ember_drake_stage-1_walk_48_v1.png'
import emberDrakeFinalWalkAtlas from '../../assets/art/characters/companions/ember_drake_ember_drake_walk_48_v1.png'
import {
  COTTAGE_PLAYER_HEIGHT,
  COTTAGE_PLAYER_WIDTH,
  COTTAGE_COMPANION_POSITION,
  COTTAGE_SCENE_HEIGHT,
  COTTAGE_SCENE_WIDTH,
  getCottageInteraction,
  isNearCottageCompanion,
  resolveCottageMove,
  type CottageInteractionAction,
  type CottageDirection,
  type CottagePosition,
} from '../lib/cottage-scene'
import '../pixi-cottage-scene.css'
import '../cottage-scene.css'

const COMPANION_RUNTIME_FRAME_SIZE = 48

export function PixiCottageScene({
  playerName,
  companion = null,
  immersive = false,
  onAction,
  onCompanionInteract,
  onInitError,
}: {
  playerName: string
  companion?: Companion | null
  immersive?: boolean
  onAction?: (action: CottageInteractionAction) => void
  onCompanionInteract?: () => void
  onInitError?: () => void
}) {
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const playerSpriteRef = useRef<Sprite | null>(null)
  const companionSpriteRef = useRef<Sprite | Graphics | null>(null)
  const houndSpriteRef = useRef<Sprite | null>(null)
  const playerFramesRef = useRef<Record<CottageDirection, Texture[]> | null>(null)
  const companionFramesRef = useRef<Record<CottageDirection, Texture> | null>(null)
  const [position, setPosition] = useState<CottagePosition>({ x: 105, y: 78 })
  const [direction, setDirection] = useState<CottageDirection>('south')
  const [walkFrame, setWalkFrame] = useState(0)
  const [pressedMoveKey, setPressedMoveKey] = useState<string | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [message, setMessage] = useState('使用方向键或 WASD 移动；靠近物件后按 E、空格或回车。')

  useEffect(() => {
    let disposed = false
    let initialized = false
    let app: Application | null = null

    const start = async () => {
      try {
        // Dynamic import isolates renderer capability failures in Electron.
        // The caller can then safely render the pre-existing DOM cottage fallback.
        const { Application, Graphics, Rectangle, Sprite, Texture } = await import('pixi.js')
        app = new Application()
        await app.init({
          width: COTTAGE_SCENE_WIDTH,
          height: COTTAGE_SCENE_HEIGHT,
          antialias: false,
          autoDensity: false,
          backgroundAlpha: 0,
          resolution: 1,
          preference: 'webgl',
        })
        initialized = true
        if (disposed || !canvasHostRef.current) {
          app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false })
          return
        }

        app.stage.sortableChildren = true
        appRef.current = app
        app.canvas.classList.add('pixi-cottage-canvas')
        canvasHostRef.current.appendChild(app.canvas)

        const loadTexture = async (url: string) => {
          const image = new Image()
          image.src = url
          await image.decode()
          const texture = Texture.from(image)
          // Canvas defaults to linear filtering. That softens an atlas as soon
          // as a companion is shown larger than one native pixel per texel.
          // Keep every game sprite on nearest-neighbour sampling instead.
          texture.source.style.scaleMode = 'nearest'
          return texture
        }
        const finalHoundAtlas = {
          ember_tail: hearthHoundEmberTailWalkAtlas,
          pine_shadow: hearthHoundPineShadowWalkAtlas,
          moon_paw: hearthHoundMoonPawWalkAtlas,
        }[companion?.evolution_path || '']
        const selectedHoundAtlas = companion?.stage && companion.stage >= 2
          ? finalHoundAtlas || hearthHoundManeWalkAtlas
          : companion?.stage && companion.stage >= 1 ? hearthHoundManeWalkAtlas : hearthHoundWalkAtlas
        const selectedMossAtlas = companion?.stage && companion.stage >= 2 && companion.evolution_path === 'forest_crown'
          ? mossFoxForestCrownWalkAtlas
          : companion?.stage && companion.stage >= 1 ? mossFoxGrownWalkAtlas : mossFoxWalkAtlas
        const selectedNightLightCatAtlas = companion?.stage && companion.stage >= 2 && companion.evolution_path === 'night_glass'
          ? glimmerCatNightGlassWalkAtlas
          : companion?.stage && companion.stage >= 1 ? glimmerCatGrownWalkAtlas : glimmerCatWalkAtlas
        const selectedRiverOtterAtlas = companion?.stage && companion.stage >= 2 && companion.evolution_path === 'bay_current'
          ? riverOtterBayCurrentWalkAtlas
          : companion?.stage && companion.stage >= 1 ? riverOtterGrownWalkAtlas : riverOtterWalkAtlas
        const selectedIronBadgerAtlas = companion?.stage && companion.stage >= 2 && companion.evolution_path === 'armor_king'
          ? ironBadgerArmorKingWalkAtlas
          : companion?.stage && companion.stage >= 1 ? ironBadgerGrownWalkAtlas : ironBadgerWalkAtlas
        const selectedMoonOwlAtlas = companion?.stage && companion.stage >= 2 && companion.evolution_path === 'dusk_owl'
          ? moonOwlFinalWalkAtlas
          : companion?.stage && companion.stage >= 1 ? moonOwlGrownWalkAtlas : moonOwlWalkAtlas
        const selectedCloudRabbitAtlas = companion?.stage && companion.stage >= 2 && companion.evolution_path === 'wind_tuft_rabbit'
          ? cloudRabbitFinalWalkAtlas
          : companion?.stage && companion.stage >= 1 ? cloudRabbitGrownWalkAtlas : cloudRabbitWalkAtlas
        const selectedEmberDrakeAtlas = companion?.stage && companion.stage >= 2 && companion.evolution_path === 'ember_drake'
          ? emberDrakeFinalWalkAtlas
          : companion?.stage && companion.stage >= 1 ? emberDrakeGrownWalkAtlas : emberDrakeWalkAtlas
        const usesProductionAtlas = !companion || ['hearth_hound', 'moss_fox', 'glimmer_cat', 'river_otter', 'iron_badger', 'moon_owl', 'cloud_rabbit', 'ember_drake'].includes(companion.species_id)
        const selectedCompanionAtlas = companion?.species_id === 'moss_fox'
          ? selectedMossAtlas
          : companion?.species_id === 'glimmer_cat' ? selectedNightLightCatAtlas
            : companion?.species_id === 'river_otter' ? selectedRiverOtterAtlas
              : companion?.species_id === 'moon_owl' ? selectedMoonOwlAtlas
                : companion?.species_id === 'cloud_rabbit' ? selectedCloudRabbitAtlas
                  : companion?.species_id === 'ember_drake' ? selectedEmberDrakeAtlas : selectedHoundAtlas
        const resolvedCompanionAtlas = companion?.species_id === 'iron_badger' ? selectedIronBadgerAtlas : selectedCompanionAtlas
        const [backdropTexture, playerAtlas, houndAtlas] = await Promise.all([
          loadTexture(roomBackdrop),
          loadTexture(playerWalkAtlas),
          loadTexture(resolvedCompanionAtlas),
        ])
        if (disposed) return

        const backdrop = new Sprite(backdropTexture)
        backdrop.width = COTTAGE_SCENE_WIDTH
        backdrop.height = COTTAGE_SCENE_HEIGHT
        backdrop.zIndex = 1

        const rowByDirection: Record<CottageDirection, number> = { south: 0, north: 1, west: 2, east: 3 }
        const playerFrames = Object.fromEntries(Object.entries(rowByDirection).map(([facing, row]) => [
          facing,
          Array.from({ length: 4 }, (_, frame) => new Texture({ source: playerAtlas.source, frame: new Rectangle(frame * 32, row * 48, 32, 48) })),
        ])) as Record<CottageDirection, Texture[]>
        playerFramesRef.current = playerFrames
        const player = new Sprite(playerFrames.south[0])
        player.width = COTTAGE_PLAYER_WIDTH
        player.height = COTTAGE_PLAYER_HEIGHT
        player.zIndex = 200
        playerSpriteRef.current = player

        let sceneCompanion: Sprite | Graphics
        if (usesProductionAtlas) {
          const houndFrames = {
            south: new Texture({ source: houndAtlas.source, frame: new Rectangle(0, 0, COMPANION_RUNTIME_FRAME_SIZE, COMPANION_RUNTIME_FRAME_SIZE) }),
            north: new Texture({ source: houndAtlas.source, frame: new Rectangle(0, COMPANION_RUNTIME_FRAME_SIZE, COMPANION_RUNTIME_FRAME_SIZE, COMPANION_RUNTIME_FRAME_SIZE) }),
            west: new Texture({ source: houndAtlas.source, frame: new Rectangle(0, COMPANION_RUNTIME_FRAME_SIZE * 2, COMPANION_RUNTIME_FRAME_SIZE, COMPANION_RUNTIME_FRAME_SIZE) }),
            east: new Texture({ source: houndAtlas.source, frame: new Rectangle(0, COMPANION_RUNTIME_FRAME_SIZE * 3, COMPANION_RUNTIME_FRAME_SIZE, COMPANION_RUNTIME_FRAME_SIZE) }),
          }
          companionFramesRef.current = houndFrames
          sceneCompanion = new Sprite(houndFrames.south)
          houndSpriteRef.current = sceneCompanion
        } else {
          const palette = companion.species.palette === 'ember' ? 0xa84c32 : companion.species.palette === 'moon' ? 0xaaa6a0 : 0x7d8150
          sceneCompanion = new Graphics().roundRect(5, 7, 22, 20, 3).fill({ color: palette }).rect(8, 4, 16, 5).fill({ color: palette })
        }
        const usesStagedProductionArt = ['hearth_hound', 'moss_fox', 'glimmer_cat', 'river_otter', 'iron_badger', 'moon_owl', 'cloud_rabbit', 'ember_drake'].includes(companion?.species_id || 'hearth_hound')
        const companionStage = companion?.stage || 0
        const companionSize = usesStagedProductionArt && companionStage >= 2 ? 56 : usesStagedProductionArt && companionStage >= 1 ? 48 : 40
        const companionHover = companion?.species_id === 'ember_drake' && companionStage >= 1 ? companionStage >= 2 ? 6 : 4 : 0
        sceneCompanion.width = companionSize
        sceneCompanion.height = companionSize
        sceneCompanion.position.set(COTTAGE_COMPANION_POSITION.x + (32 - companionSize) / 2, COTTAGE_COMPANION_POSITION.y + 32 - companionSize - companionHover)
        sceneCompanion.zIndex = 180 + COTTAGE_COMPANION_POSITION.y + 32
        companionSpriteRef.current = sceneCompanion

        app.stage.addChild(backdrop, sceneCompanion, player)
        player.position.set(position.x, position.y)
        player.zIndex = 200 + position.y + COTTAGE_PLAYER_HEIGHT
        app.render()
      } catch (error) {
        if (!disposed) {
          const detail = error instanceof Error ? error.message : String(error)
          console.error('[PixiCottageScene] initialization failed', error)
          setInitError(detail)
          onInitError?.()
        }
      }
    }

    void start()
    return () => {
      disposed = true
      playerSpriteRef.current = null
      appRef.current = null
      playerFramesRef.current = null
      companionSpriteRef.current = null
      houndSpriteRef.current = null
      companionFramesRef.current = null
      // React development mode intentionally mounts, cleans up, then mounts
      // effects again. Pixi v8 must not be destroyed before async init finishes.
      if (initialized && app) {
        app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false })
      }
    }
    }, [companion?.species_id, companion?.stage, companion?.evolution_path, onInitError])

  useEffect(() => {
    const player = playerSpriteRef.current
    const sceneCompanion = companionSpriteRef.current
    if (!player || !sceneCompanion) return
    player.position.set(position.x, position.y)
    player.zIndex = 200 + position.y + COTTAGE_PLAYER_HEIGHT
    if (playerFramesRef.current) player.texture = playerFramesRef.current[direction][walkFrame]
    const usesStagedProductionArt = ['hearth_hound', 'moss_fox', 'glimmer_cat', 'river_otter', 'iron_badger', 'moon_owl', 'cloud_rabbit', 'ember_drake'].includes(companion?.species_id || 'hearth_hound')
    const companionStage = companion?.stage || 0
    const companionSize = usesStagedProductionArt && companionStage >= 2 ? 56 : usesStagedProductionArt && companionStage >= 1 ? 48 : 40
    const companionHover = companion?.species_id === 'ember_drake' && companionStage >= 1 ? companionStage >= 2 ? 6 : 4 : 0
    sceneCompanion.position.set(COTTAGE_COMPANION_POSITION.x + (32 - companionSize) / 2, COTTAGE_COMPANION_POSITION.y + 32 - companionSize - companionHover)
    sceneCompanion.zIndex = 180 + COTTAGE_COMPANION_POSITION.y + 32
    if (houndSpriteRef.current && companionFramesRef.current) {
      const deltaX = position.x - COTTAGE_COMPANION_POSITION.x
      const deltaY = position.y - COTTAGE_COMPANION_POSITION.y
      const companionFacing: CottageDirection = Math.abs(deltaX) > Math.abs(deltaY)
        ? (deltaX < 0 ? 'west' : 'east')
        : (deltaY < 0 ? 'north' : 'south')
      houndSpriteRef.current.texture = companionFramesRef.current[companionFacing]
    }
    appRef.current?.render()
  }, [direction, position, walkFrame])

  useEffect(() => { sceneRef.current?.focus() }, [])

  const talkToCompanion = () => {
    setMessage(`${companion?.nickname || '伙伴'}抬头回应了你。`)
    onCompanionInteract?.()
  }

  const applyMove = (key: string) => {
    const result = resolveCottageMove(position, key)
    if (!result) return false
    setDirection(result.direction)
    setPosition(result.position)
    setWalkFrame((frame) => (frame + 1) % 4)
    const blockedByCompanion = 'blockedBy' in result && result.blockedBy === 'companion'
    const nearbyInteraction = getCottageInteraction(result.position)
    setMessage(blockedByCompanion
      ? `${companion?.nickname || '伙伴'}抬头看向你。按 E、空格或回车交谈。`
      : nearbyInteraction
        ? `按 E、空格或回车：${nearbyInteraction.label}`
        : result.message)
    return true
  }

  useEffect(() => {
    if (!pressedMoveKey) return
    const timer = window.setInterval(() => { applyMove(pressedMoveKey) }, 85)
    return () => window.clearInterval(timer)
  }, [position, pressedMoveKey])

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!canHandle('world')) return
    if (['e', 'enter', ' '].includes(event.key.toLowerCase())) {
      event.preventDefault()
      if (isNearCottageCompanion(position)) {
        talkToCompanion()
        return
      }
      const interaction = getCottageInteraction(position)
      if (interaction && onAction) {
        setMessage(interaction.label)
        onAction(interaction.action)
      } else setMessage('这里没有需要操作的东西。再靠近一些看看。')
      return
    }

    const key = event.key.toLowerCase()
    if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) return
    event.preventDefault()
    if (!pressedMoveKey) applyMove(key)
    setPressedMoveKey(key)
  }

  const stopMove = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key.toLowerCase() === pressedMoveKey) setPressedMoveKey(null)
  }

  const nearbyInteraction = getCottageInteraction(position)
  const interactionPrompt = isNearCottageCompanion(position)
    ? { label: `与${companion?.nickname || '伙伴'}交谈`, position: { x: COTTAGE_COMPANION_POSITION.x + 16, y: COTTAGE_COMPANION_POSITION.y - 3 } }
    : nearbyInteraction
      ? { label: nearbyInteraction.label, position: nearbyInteraction.prompt }
      : null
  const promptStyle: CSSProperties | undefined = interactionPrompt ? {
    left: `${interactionPrompt.position.x / COTTAGE_SCENE_WIDTH * 100}%`,
    top: `${interactionPrompt.position.y / COTTAGE_SCENE_HEIGHT * 100}%`,
  } : undefined

  return <div className={`cottage-scene-shell ${immersive ? 'is-immersive' : ''} pixi-cottage-scene-shell`}>
    <div
      ref={sceneRef}
      className={`cottage-scene pixi-cottage-scene facing-${direction}`}
      tabIndex={0}
      role='application'
      aria-label='可行走的炉火小屋。使用方向键或 WASD 移动，按 E、空格或回车交互。'
      onKeyDown={move}
      onKeyUp={stopMove}
      onBlur={() => setPressedMoveKey(null)}
      onPointerDown={() => sceneRef.current?.focus()}
    >
      <div className='pixi-cottage-canvas-host' ref={canvasHostRef} aria-hidden='true' />
      {initError && <div className='pixi-cottage-error' role='alert'>
        Pixi 小屋资源未能加载：{initError}
      </div>}
      {interactionPrompt && <div className='cottage-interaction-prompt' style={promptStyle} aria-hidden='true'>
        <kbd>E</kbd><span>{interactionPrompt.label}</span>
      </div>}
    </div>
    <div className='cottage-scene-status' aria-live='polite'><span />{message}</div>
  </div>
}
