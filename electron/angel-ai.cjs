const { narrativeDirectionName, worldStateDetail, hashSeed } = require('./domain.cjs')

function parseLetterFact(letter) {
  const raw = letter?.fact ?? letter?.fact_json
  if (!raw) throw new Error('信件缺少冻结事实')
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}

function narrativeDirection(fact) {
  const journey = fact.journey || {}
  const raw = journey.mainDirectionNarrative || (journey.mainDirection
    ? { name: journey.mainDirection, source: journey.mainDirection === '通用学习' ? 'system_default' : 'user_created' }
    : null)
  return narrativeDirectionName(raw)
}

function narrativeNames(items) {
  return (items || []).map((item) => String(item?.title || item?.name || item || '').trim()).filter(Boolean)
}

function narrativeDepartures(stats) {
  return Object.values(stats?.sessionCounts || {}).reduce((sum, count) => sum + (Number(count) || 0), 0)
}

// This is the only fact contract exposed to a model. It deliberately does not
// mirror fact_json: ids, schema/version details, direction source labels, and
// raw internal category names never leave the program boundary.
function buildNarrativeFactEnvelope(letter) {
  const fact = parseLetterFact(letter)
  const stats = fact.stats || {}
  const journey = fact.journey || {}
  const chronicle = fact.chronicle || {}
  const period = fact.period || {}
  const postOfficeDetail = fact.worldState?.locations?.postOffice
    ? worldStateDetail(fact.worldState, hashSeed(`ai:${period.periodKey || letter.period_key || ''}`))
    : null
  return {
    letterType: fact.letterType || letter.letter_type,
    period: { periodKey: period.periodKey || letter.period_key || null },
    stats: {
      departures: narrativeDepartures(stats),
      completedTaskCount: narrativeNames(journey.completedTasks).length,
    },
    journey: {
      direction: narrativeDirection(fact),
      completedTasks: narrativeNames(journey.completedTasks),
      discoveries: narrativeNames(journey.discoveries),
    },
    observatory: {
      hasWrittenReview: fact.observatory?.hasWrittenReview === true,
      weeklyNote: typeof fact.observatory?.weeklyNote === 'string' ? fact.observatory.weeklyNote : null,
    },
    chronicle: {
      season: chronicle.season || null,
      newDiscoveries: narrativeNames(chronicle.newDiscoveries),
    },
    worldState: postOfficeDetail ? { postOfficeDetail } : {},
  }
}

function isAngelNarrativeEligible(letter) {
  return letter?.letter_type === 'daily' || letter?.letter_type === 'weekly'
}

function shouldUseAiBody(letter) {
  return Number(letter?.is_read) !== 1
}

async function generateAngelNarrative({ letter, apiKey, settings = {}, prompt, fetchImpl = fetch, timeoutMs = 30000 }) {
  if (!apiKey) return { success: false, status: 'skipped' }
  let fact
  try { fact = buildNarrativeFactEnvelope(letter) } catch (error) { return { success: false, status: 'failed', error: error.message } }
  const provider = settings.api_provider || 'openai'
  const model = settings.model || (provider === 'deepseek' ? 'deepseek-chat' : 'gpt-5.6-luna')
  const baseUrl = settings.ai_base_url || settings.proxy_url || (provider === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1')
  try {
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, max_tokens: 600, messages: [{ role: 'system', content: `${prompt}\n\n## 当前信件事实\n${JSON.stringify(fact)}` }, { role: 'user', content: '请根据当前事实，以小天使的口吻写一封短信。' }] }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    const json = await response.json().catch(() => ({}))
    if (!response.ok) return response.status === 429 ? { success: false, status: 'quota_exceeded' } : { success: false, status: 'failed', error: json?.error?.message || `HTTP ${response.status}` }
    const text = json.choices?.[0]?.message?.content?.trim()
    return text ? { success: true, status: 'success', text, provider, model, fact } : { success: false, status: 'failed', error: 'empty response' }
  } catch (error) { return { success: false, status: 'failed', error: error?.message || 'request failed' } }
}

module.exports = { buildNarrativeFactEnvelope, generateAngelNarrative, isAngelNarrativeEligible, shouldUseAiBody }
