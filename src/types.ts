export type PageId = 'home' | 'plan' | 'history' | 'review' | 'growth' | 'settings'

export interface Area {
  id: string
  name: string
  color: string
  icon: string
  archived: number
  created_at: number
}

export interface Goal {
  id: string
  area_id: string
  title: string
  description: string
  due_date: string | null
  status: 'active' | 'done' | 'archived'
  created_at: number
  updated_at: number
}

export interface Task {
  id: string
  area_id: string
  goal_id: string | null
  title: string
  notes: string
  status: 'todo' | 'doing' | 'done' | 'archived'
  completed_at: number | null
  completion_xp_awarded: number
  created_at: number
  updated_at: number
}

export interface FocusSession {
  id: string
  task_id: string | null
  area_id: string | null
  content: string
  started_at: number
  ended_at: number | null
  status: 'running' | 'paused' | 'completed' | 'cancelled'
  active_seconds: number
  outcome: string
  blocker: string
  next_step: string
  task_completed: number
  companion_id?: string | null
  companion_name?: string
  companion_species_id?: string
  planned_seconds?: number
  task_title?: string
  area_name?: string
  area_color?: string
  expedition?: ExpeditionResult | null
}

export interface CompanionSpecies {
  id: string
  name: string
  kind: string
  rarity: 'starter' | 'common' | 'rare'
  palette: string
  description: string
  stages: string[]
  evolutions: Array<{ id: string; name: string; note: string }>
  discovered?: boolean
}

export interface Companion {
  id: string
  species_id: string
  nickname: string
  bond_xp: number
  stage: number
  stageName: string
  evolution_path: string
  evolutionReady: boolean
  nextBondXp: number
  is_active: number
  met_at: number
  last_adventure_at: number | null
  species: CompanionSpecies
}

export interface CompanionCollection {
  owned: Companion[]
  active: Companion | null
  catalog: CompanionSpecies[]
  total: number
}

export interface LootItem {
  id: string
  name: string
  rarity: 'common' | 'rare'
  icon: string
  description: string
}

export interface KnowledgeRelic {
  id: string
  session_id: string
  title: string
  content: string
  question: string
  next_step: string
  created_at: number
}

export interface ExpeditionResult {
  sessionId: string
  tier: { id: string; name: string; rareChance: number; companionChance: number; commonCount: number }
  location: string
  event: string
  drops: Array<{ item: LootItem; quantity: number }>
  rareFound: boolean
  rareChance: number
  companionChance: number
  bondXp: number
  activeCompanion: Companion | null
  newCompanion: Companion | null
  knowledgeRelic: KnowledgeRelic | null
  createdAt?: number
}

export interface WorldState {
  name: string
  companions: CompanionCollection
  inventory: Array<{ item_id: string; quantity: number; item: LootItem; updated_at: number }>
  relics: KnowledgeRelic[]
  latestExpedition: ExpeditionResult | null
  rarePity: number
  companionPity: number
}

export interface RangeStats {
  focusSeconds: number
  completedTasks: number
  sessionCount: number
  averageSessionSeconds: number
  activeDays: number
  byArea: Array<{ id: string; name: string; color: string; seconds: number }>
}

export interface XpSummary {
  totalXp: number
  level: number
  currentXp: number
  nextLevelXp: number
  progress: number
  recent: Array<{ id: string; kind: string; amount: number; label: string; created_at: number }>
}

export interface Achievement {
  code: string
  icon: string
  title: string
  description: string
  unlockedAt: number | null
}

export interface Dashboard {
  date: string
  today: RangeStats
  week: RangeStats
  xp: XpSummary
  activeSession: FocusSession | null
  nextTasks: Task[]
  areas: Area[]
  achievements: Achievement[]
  settings: Record<string, string>
  world: WorldState
}

export interface Structure {
  areas: Area[]
  goals: Goal[]
  tasks: Task[]
}

export interface AiReport {
  summary: string
  wins: string[]
  patterns: string[]
  risks: string[]
  suggestions: string[]
  next_focus: string
}

export interface DailyReviewData {
  date: string
  stats: RangeStats
  review: null | {
    review_date: string
    win: string
    blocker: string
    energy: number | null
    tomorrow_task: string
    ai: AiReport | null
    ai_model?: string
  }
}

export interface WeeklyReportData {
  weekStart: string
  stats: RangeStats
  previousStats: RangeStats
  reviews: Array<{ review_date: string; win: string; blocker: string; energy: number | null; tomorrow_task: string }>
  completedTasks: Array<{ title: string; completed_at: number }>
  ai: AiReport | null
  aiModel: string | null
}

export interface GrowthArcApi {
  dashboard: () => Promise<Dashboard>
  structure: {
    get: () => Promise<Structure>
    createArea: (data: { name: string; color: string }) => Promise<Area>
    archiveArea: (id: string) => Promise<void>
    createGoal: (data: { areaId: string; title: string; description?: string; dueDate?: string | null }) => Promise<Goal>
    archiveGoal: (id: string) => Promise<void>
    createTask: (data: { areaId: string; goalId?: string | null; title: string; notes?: string }) => Promise<Task>
    updateTask: (id: string, patch: Partial<Task> & { areaId?: string; goalId?: string | null }) => Promise<{ task: Task; unlocked: Achievement[] }>
  }
  session: {
    active: () => Promise<FocusSession | null>
    start: (data: { taskId?: string | null; areaId?: string | null; content?: string; companionId?: string | null; plannedMinutes?: number }) => Promise<FocusSession>
    heartbeat: (id: string) => Promise<FocusSession | null>
    pause: (id: string) => Promise<FocusSession | null>
    resume: (id: string) => Promise<FocusSession | null>
    stop: (id: string, data: { outcome: string; blocker: string; nextStep: string; taskCompleted: boolean }) => Promise<{ session: FocusSession; xpAwarded: number; unlocked: Achievement[]; expedition: ExpeditionResult }>
    cancel: (id: string) => Promise<null>
  }
  companions: {
    get: () => Promise<CompanionCollection>
    setActive: (id: string) => Promise<CompanionCollection>
    evolve: (id: string, pathId: string) => Promise<Companion>
  }
  history: (limit?: number) => Promise<FocusSession[]>
  review: {
    daily: (date?: string) => Promise<DailyReviewData>
    saveDaily: (data: { date: string; win: string; blocker: string; energy: number | null; tomorrowTask: string }) => Promise<unknown>
    weekly: (date?: string) => Promise<WeeklyReportData>
  }
  settings: {
    get: () => Promise<Record<string, string | boolean>>
    set: (data: Record<string, string>) => Promise<Record<string, string>>
    hasApiKey: () => Promise<boolean>
    setApiKey: (key: string) => Promise<boolean>
    clearApiKey: () => Promise<boolean>
    openDataFolder: () => Promise<string>
  }
  ai: {
    generate: (type: 'daily' | 'weekly', date: string) => Promise<{ report: AiReport; model: string }>
  }
}

declare global {
  interface Window {
    growthArc: GrowthArcApi
  }
}
