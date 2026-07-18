const { contextBridge, ipcRenderer } = require('electron')

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload)

contextBridge.exposeInMainWorld('growthArc', {
  dashboard: () => invoke('dashboard:get'),
  world: {
    get: () => invoke('world:get'),
    updatePlayer: (data) => invoke('player:update', data),
  },
  structure: {
    get: () => invoke('structure:get'),
    createArea: (data) => invoke('area:create', data),
    archiveArea: (id) => invoke('area:archive', id),
    createGoal: (data) => invoke('goal:create', data),
    archiveGoal: (id) => invoke('goal:archive', id),
    createTask: (data) => invoke('task:create', data),
    updateTask: (id, patch) => invoke('task:update', { id, patch }),
  },
  session: {
    active: () => invoke('session:active'),
    start: (data) => invoke('session:start', data),
    heartbeat: (id) => invoke('session:heartbeat', id),
    pause: (id) => invoke('session:pause', id),
    resume: (id) => invoke('session:resume', id),
    stop: (id, data) => invoke('session:stop', { id, data }),
    cancel: (id) => invoke('session:cancel', id),
  },
  companions: {
    get: () => invoke('companions:get'),
    setActive: (id) => invoke('companions:set-active', id),
    evolve: (id, pathId) => invoke('companions:evolve', { id, pathId }),
  },
  history: (limit) => invoke('history:get', limit),
  review: {
    daily: (date) => invoke('review:daily', date),
    saveDaily: (data) => invoke('review:save-daily', data),
    weekly: (date) => invoke('review:weekly', date),
  },
  settings: {
    get: () => invoke('settings:get'),
    set: (data) => invoke('settings:set', data),
    hasApiKey: () => invoke('settings:has-api-key'),
    setApiKey: (key) => invoke('settings:set-api-key', key),
    clearApiKey: () => invoke('settings:clear-api-key'),
    openDataFolder: () => invoke('settings:open-data-folder'),
  },
  ai: {
    generate: (type, date) => invoke('ai:generate', { type, date }),
  },
  inventory: {
    use: (itemId) => invoke('inventory:use', itemId),
  },
  window: {
    show: () => ipcRenderer.send('window:show'),
  },
})
