import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Dashboard, FocusSession, Structure } from '../types'
import { friendlyError } from '../lib/format'

interface Toast { id: number; message: string; tone: 'success' | 'error' | 'info' }

interface AppContextValue {
  dashboard: Dashboard | null
  structure: Structure | null
  activeSession: FocusSession | null
  loading: boolean
  refresh: () => Promise<void>
  refreshSession: () => Promise<void>
  setActiveSession: (session: FocusSession | null) => void
  notify: (message: string, tone?: Toast['tone']) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [structure, setStructure] = useState<Structure | null>(null)
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    setToasts((items) => {
      if (items.some(t => t.message === message)) return items // dedup same message
      const id = Date.now() + Math.random()
      const next = [...items, { id, message, tone }]
      window.setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 3600)
      return next
    })
  }, [])

  const refresh = useCallback(async () => {
    try {
      const [nextDashboard, nextStructure] = await Promise.all([window.growthArc.dashboard(), window.growthArc.structure.get()])
      setDashboard(nextDashboard)
      setStructure(nextStructure)
      setActiveSession(nextDashboard.activeSession)
    } catch (error) {
      notify(friendlyError(error), 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  const refreshSession = useCallback(async () => {
    try {
      setActiveSession(await window.growthArc.session.active())
    } catch (error) {
      notify(friendlyError(error), 'error')
    }
  }, [notify])

  useEffect(() => { void refresh() }, [refresh])

  const value = useMemo(() => ({ dashboard, structure, activeSession, loading, refresh, refreshSession, setActiveSession, notify }), [dashboard, structure, activeSession, loading, refresh, refreshSession, notify])

  return <AppContext.Provider value={value}>
    {children}
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => <div key={toast.id} className={`toast toast-${toast.tone}`}>{toast.message}</div>)}
    </div>
  </AppContext.Provider>
}

export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside AppProvider')
  return value
}
