const KIE_BASE_URL = 'https://api.kie.ai'

function getConfig() {
  return {
    apiKey: localStorage.getItem('resonance_api_key') || import.meta.env.VITE_SUNO_API_KEY || '',
    model: localStorage.getItem('resonance_model') || 'V4',
  }
}

function buildHeaders() {
  const { apiKey } = getConfig()
  if (!apiKey) throw new Error('No API key configured. Open Settings and enter your kie.ai API key.')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  }
}

/**
 * Generate music via kie.ai Suno API
 * POST https://api.kie.ai/api/v1/generate
 */
export async function generateMusic({ prompt, style, title, instrumental = true, lyrics = '' }) {
  const { model } = getConfig()
  const hasCustomLyrics = !!lyrics.trim()

  const body = {
    // In customMode=true Suno treats `prompt` as the literal lyrics to sing.
    // In customMode=false `prompt` is a music description and Suno writes its own lyrics.
    prompt: hasCustomLyrics ? lyrics : prompt,
    customMode: hasCustomLyrics,
    instrumental,
    model,
    callBackUrl: 'https://resonance-studio.example.com/webhook',
    ...(style && { style }),
    ...(title && { title }),
  }

  const res = await fetch(`${KIE_BASE_URL}/api/v1/generate`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Generation failed (${res.status}): ${err}`)
  }

  const data = await res.json()

  if (data.code !== 200) {
    throw new Error(`kie.ai error: ${data.msg || 'Unknown error'}`)
  }

  // Returns { code: 200, data: { taskId: "..." } }
  return data.data.taskId
}

/**
 * Fetch task status and track data
 * GET https://api.kie.ai/api/v1/generate/record-info?taskId=...
 */
export async function getTaskStatus(taskId) {
  const res = await fetch(
    `${KIE_BASE_URL}/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
    { headers: buildHeaders() }
  )

  if (!res.ok) {
    throw new Error(`Status check failed (${res.status})`)
  }

  const data = await res.json()
  if (data.code !== 200) {
    throw new Error(`kie.ai error: ${data.msg}`)
  }

  return data.data
}

// Terminal statuses
const DONE_STATUSES = new Set(['SUCCESS', 'CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'CALLBACK_EXCEPTION', 'SENSITIVE_WORD_ERROR'])
const ERROR_STATUSES = new Set(['CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'CALLBACK_EXCEPTION', 'SENSITIVE_WORD_ERROR'])

/**
 * Poll until task reaches a terminal status.
 * Calls onUpdate(taskData) each cycle so UI can show progress.
 */
export async function pollUntilComplete(taskId, onUpdate, { maxWait = 180000, interval = 5000 } = {}) {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWait) {
    let taskData
    try {
      taskData = await getTaskStatus(taskId)
    } catch (err) {
      // Transient network issue — wait and retry
      await sleep(interval)
      continue
    }

    onUpdate(taskData)

    if (DONE_STATUSES.has(taskData.status)) {
      if (ERROR_STATUSES.has(taskData.status)) {
        throw new Error(`Generation failed with status: ${taskData.status}`)
      }
      // Extract tracks from sunoData
      const tracks = taskData.response?.sunoData ?? []
      return tracks.map(t => ({
        id: t.id,
        title: t.title,
        audio_url: t.audioUrl,
        duration: t.duration,
        status: 'complete',
      }))
    }

    await sleep(interval)
  }

  throw new Error('Generation timed out after 3 minutes.')
}

/**
 * Verify the API key works by checking credits/quota
 */
export async function pingApi() {
  const { apiKey } = getConfig()
  if (!apiKey) return false
  try {
    // A lightweight check — try generating with invalid body to see if auth passes
    const res = await fetch(`${KIE_BASE_URL}/api/v1/generate/record-info?taskId=test`, {
      headers: buildHeaders(),
      signal: AbortSignal.timeout(6000),
    })
    // 200 or 400/404 both mean the key is valid; 401 means invalid key
    return res.status !== 401
  } catch {
    return false
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}
