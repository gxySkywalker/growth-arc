const { app, BrowserWindow, ipcMain, Notification, Menu, Tray, nativeImage, safeStorage, shell, powerMonitor } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const { ProxyAgent } = require('undici')
const { StudyDatabase } = require('./database.cjs')

let mainWindow
let tray
let database
let allowQuit = false

function trayIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" rx="7" fill="#171c2d"/><path d="M6 16.5 10 12l3 2.4L18.5 7" fill="none" stroke="#9eaaff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18.5" cy="7" r="2" fill="#79d8b5"/></svg>`
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`).resize({ width: 16, height: 16 })
}

function showWindow() {
  if (!mainWindow) return
  mainWindow.show()
  mainWindow.focus()
}

function createTray() {
  if (tray) return
  tray = new Tray(trayIcon())
  tray.setToolTip('成长轨迹')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '打开成长轨迹', click: showWindow },
    { type: 'separator' },
    { label: '退出', click: () => { allowQuit = true; app.quit() } },
  ]))
  tray.on('double-click', showWindow)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#0b0e16',
    title: '成长轨迹',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('close', (event) => {
    if (!allowQuit) {
      event.preventDefault()
      mainWindow.hide()
      if (Notification.isSupported()) new Notification({ title: '成长轨迹仍在运行', body: '计时器已留在系统托盘。' }).show()
    }
  })
}

function secretPath() {
  return path.join(app.getPath('userData'), 'secret.bin')
}

function saveApiKey(key) {
  const clean = String(key || '').trim()
  if (!clean) throw new Error('API Key 不能为空')
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows 安全存储当前不可用')
  fs.writeFileSync(secretPath(), safeStorage.encryptString(clean))
}

function readApiKey() {
  const file = secretPath()
  if (!fs.existsSync(file) || !safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(fs.readFileSync(file))
  } catch {
    return null
  }
}

function clearApiKey() {
  if (fs.existsSync(secretPath())) fs.unlinkSync(secretPath())
}

function parseResponseText(response) {
  if (typeof response.output_text === 'string') return response.output_text
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) return content.text
    }
  }
  throw new Error('模型没有返回可读取的报告')
}

async function generateAiReport(type, date) {
  const apiKey = readApiKey()
  if (!apiKey) throw new Error('请先在设置中配置 API Key')
  const settings = database.getSettings()
  const provider = settings.api_provider || 'openai'
  const proxyUrl = settings.proxy_url || ''
  const fetchOptions = {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  }
  if (proxyUrl) fetchOptions.dispatcher = new ProxyAgent(proxyUrl)
  const payload = database.getAiPayload(type, date)
  const periodName = type === 'daily' ? '日复盘' : '周成长报告'

  if (provider === 'deepseek') {
    const model = settings.model || 'deepseek-chat'
    const schemaDesc = `返回严格 JSON：{"summary":"一段温和总结","wins":["最多4条"],"patterns":["最多4条"],"risks":["最多3条"],"suggestions":["最多3条"],"next_focus":"一个足够小的下一步"}`
    const body = {
      model,
      max_tokens: 1600,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `你是一位温和但诚实的个人学习教练。只根据给定数据总结，不制造焦虑，不使用连续打卡压力。用简洁中文指出真实成果、可观察规律和一个足够小的下一步。\n${schemaDesc}` },
        { role: 'user', content: `请生成${periodName}。学习数据如下：\n${JSON.stringify(payload)}` },
      ],
    }
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', { ...fetchOptions, body: JSON.stringify(body) })
    const json = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(json?.error?.message || `请求失败（HTTP ${response.status}）`)
    let report
    try {
      report = JSON.parse(json.choices[0].message.content)
    } catch (error) {
      throw new Error(`AI 报告格式无效：${error.message}`)
    }
    database.saveAiReport(type, date, report, model)
    return { report, model }
  }

  // OpenAI path (default)
  const model = settings.model || 'gpt-5.6-luna'
  const response = await fetch('https://api.openai.com/v1/responses', {
    ...fetchOptions,
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 1600,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: '你是一位温和但诚实的个人学习教练。只根据给定数据总结，不制造焦虑，不使用连续打卡压力。用简洁中文指出真实成果、可观察规律和一个足够小的下一步。' }] },
        { role: 'user', content: [{ type: 'input_text', text: `请生成${periodName}。学习数据如下：\n${JSON.stringify(payload)}` }] },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'learning_report',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              summary: { type: 'string' },
              wins: { type: 'array', items: { type: 'string' }, maxItems: 4 },
              patterns: { type: 'array', items: { type: 'string' }, maxItems: 4 },
              risks: { type: 'array', items: { type: 'string' }, maxItems: 3 },
              suggestions: { type: 'array', items: { type: 'string' }, maxItems: 3 },
              next_focus: { type: 'string' },
            },
            required: ['summary', 'wins', 'patterns', 'risks', 'suggestions', 'next_focus'],
          },
        },
      },
    }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.error?.message || `请求失败（HTTP ${response.status}）`)
  let report
  try { report = JSON.parse(parseResponseText(body)) }
  catch (error) { throw new Error(`AI 报告格式无效：${error.message}`) }
  database.saveAiReport(type, date, report, model)
  return { report, model }
}

function handle(channel, callback) {
  ipcMain.handle(channel, async (_event, payload) => {
    try {
      return await callback(payload)
    } catch (error) {
      throw new Error(error?.message || '操作失败')
    }
  })
}

function registerHandlers() {
  handle('dashboard:get', () => database.getDashboard())
  handle('world:get', () => database.getWorldFoundation())
  handle('player:update', (data) => database.updatePlayerProfile(data))
  handle('structure:get', () => database.getStructure())
  handle('structure:get-all', () => database.getAllStructure())
  handle('area:create', (data) => database.createArea(data))
  handle('area:update', ({ id, data }) => database.updateArea(id, data))
  handle('area:archive', (id) => database.archiveArea(id))
  handle('area:restore', (id) => database.restoreArea(id))
  handle('area:delete', (id) => database.deleteArea(id))
  handle('goal:create', (data) => database.createGoal(data))
  handle('goal:update', ({ id, data }) => database.updateGoal(id, data))
  handle('goal:archive', (id) => database.archiveGoal(id))
  handle('goal:restore', (id) => database.restoreGoal(id))
  handle('task:create', (data) => database.createTask(data))
  handle('task:update', ({ id, patch }) => database.updateTask(id, patch))
  handle('task:reorder', (items) => database.reorderTasks(items))
  handle('task:delete', (id) => database.deleteTask(id))
  handle('task:restore', (id) => database.restoreTask(id))
  handle('task:reopen', (id) => database.reopenTask(id))
  handle('task:manual-complete', (id) => database.manualCompleteTask(id))
  handle('session:active', () => database.getActiveSession())
  handle('session:start', (data) => database.startSession(data))
  handle('session:heartbeat', (id) => database.heartbeat(id))
  handle('session:pause', (id) => database.pauseSession(id))
  handle('session:resume', (id) => database.resumeSession(id))
  handle('session:stop', ({ id, data }) => database.stopSession(id, data))
  handle('session:cancel', (id) => database.cancelSession(id))
  handle('companions:get', () => database.getCompanionCollection())
  handle('companions:set-active', (id) => database.setActiveCompanion(id))
  handle('companions:evolve', ({ id, pathId }) => database.evolveCompanion(id, pathId))
  handle('history:get', (limit) => database.getHistory(limit))
  handle('review:daily', (date) => database.getDailyReview(date))
  handle('review:save-daily', (data) => database.saveDailyReview(data))
  handle('review:weekly', (date) => database.getWeeklyReport(date))
  handle('settings:get', () => ({ ...database.getSettings(), hasApiKey: Boolean(readApiKey()) }))
  handle('settings:set', (data) => database.setSettings(data))
  handle('settings:has-api-key', () => Boolean(readApiKey()))
  handle('settings:set-api-key', (key) => { saveApiKey(key); return true })
  handle('settings:clear-api-key', () => { clearApiKey(); return true })
  handle('settings:open-data-folder', async () => shell.openPath(database.openDataPath()))
  handle('ai:generate', ({ type, date }) => generateAiReport(type, date))
  handle('inventory:use', (itemId) => database.useItem(itemId))
  ipcMain.on('window:show', showWindow)
}

app.whenReady().then(async () => {
  database = await new StudyDatabase(app.getPath('userData')).init()
  registerHandlers()
  createWindow()
  createTray()
  powerMonitor.on('suspend', () => database.autoPauseForSuspend())
  powerMonitor.on('resume', () => {
    if (database.getActiveSession()?.status === 'paused' && Notification.isSupported()) {
      new Notification({ title: '专注已自动暂停', body: '电脑刚刚恢复，请确认是否继续。' }).show()
    }
  })
  setInterval(() => {
    const session = database.shouldSendLongNotification()
    if (session && Notification.isSupported()) {
      new Notification({ title: '已经专注 90 分钟', body: '状态允许的话，起身活动一下再继续。' }).show()
    }
  }, 60000)
})

app.on('activate', showWindow)
app.on('before-quit', () => { allowQuit = true })
app.on('window-all-closed', () => {})
