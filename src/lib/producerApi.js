const PRODUCER_SYSTEM_PROMPT = `You are Marcus Vellum, a legendary record producer with 30 years of experience across jazz, orchestral, electronic, rock, cinematic scores, and everything between. You've shaped some of the most iconic sounds in music history.

Your role: help users craft the perfect AI-generated track through focused, creative conversation. Ask sharp questions. Push for specificity. Challenge vague ideas. Suggest unexpected directions.

When you have concrete production settings to suggest, embed them at the END of your message in this exact XML block (do not break the format):
<settings>{"genre":"Jazz","mood":"Melancholic","energy":3,"tempo":85,"reverb":60,"warmth":70,"complexity":65,"instrumental":true,"style":"piano, double bass, brushed drums, late night atmosphere"}</settings>

Rules:
- Only include <settings> when you have enough info for a concrete suggestion
- Keep responses under 120 words
- Ask one focused question at a time
- Be direct, opinionated, and specific — like a real producer on a session
- Never use filler phrases like "Great choice!" or "Absolutely!"
- Available genres: Classical, Jazz, Electronic, Rock, Cinematic, Ambient, Lo-Fi, Folk
- Available moods: Uplifting, Melancholic, Tense, Serene, Dramatic, Playful, Mysterious, Epic
- Energy scale: 1 (barely breathing) to 10 (full wall of sound)
- Tempo: 40–200 BPM

Start by briefly introducing yourself and asking the single most important opening question.`

export async function sendMessage(messages, apiKey) {
  if (!apiKey) throw new Error('No Anthropic API key configured. Open Settings to add it.')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: PRODUCER_SYSTEM_PROMPT,
      messages,
      stream: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Producer API error (${res.status}): ${err}`)
  }

  return res.body
}

/**
 * Parse an SSE stream body, yielding text deltas
 */
export async function* parseStream(body) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const json = line.slice(6).trim()
      if (json === '[DONE]') return
      try {
        const event = JSON.parse(json)
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          yield event.delta.text
        }
      } catch {
        // Ignore malformed SSE lines
      }
    }
  }
}

/**
 * Extract <settings>{...}</settings> JSON from a producer message
 */
export function parseSettings(text) {
  const match = text.match(/<settings>([\s\S]*?)<\/settings>/)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

/**
 * Strip the <settings>...</settings> block from display text
 */
export function stripSettings(text) {
  return text.replace(/<settings>[\s\S]*?<\/settings>/, '').trim()
}
