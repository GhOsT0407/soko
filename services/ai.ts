// Gemini 2.0 Flash — free tier: 15 requests/min, 1500 req/day
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

// Safe delay between requests to stay under 15 RPM (1 req / 4.5s ≈ 13 RPM)
const RATE_LIMIT_DELAY_MS = 4500

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ExtractedSale {
  item: string
  total: number
  date: string | null
  customer: string | null
}

function toGeminiContents(messages: ChatMessage[]) {
  return messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
}

// Calls Gemini with automatic retry on 429 (rate limit)
async function callGemini(apiKey: string, body: object, retries = 3): Promise<any> {
  const res = await fetch(`${BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (res.status === 429) {
    if (retries <= 0) throw new Error('Rate limit reached. Please wait a minute and try again.')
    // Parse retry-after from error if present, otherwise wait 60s
    const err = await res.json().catch(() => ({}))
    const msg: string = (err as any)?.error?.message ?? ''
    const retryMatch = msg.match(/retry in ([\d.]+)s/)
    const waitMs = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) * 1000 + 1000 : 60000
    await sleep(waitMs)
    return callGemini(apiKey, body, retries - 1)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any)?.error?.message || `API error ${res.status}`)
  }

  return res.json()
}

export async function chatWithAI(
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const data = await callGemini(apiKey, {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: toGeminiContents(messages),
    generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
  })
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// Processes one batch of photos — called by past-sales with delay between batches
export async function extractSalesFromPhotos(
  apiKey: string,
  base64Images: string[]
): Promise<ExtractedSale[]> {
  const imageParts = base64Images.map((b64) => ({
    inlineData: { mimeType: 'image/jpeg', data: b64 },
  }))

  const data = await callGemini(apiKey, {
    contents: [
      {
        role: 'user',
        parts: [
          ...imageParts,
          {
            text: `These are photos of sales records, receipts, notebooks, or ledgers from a Nigerian business.
Extract every sale transaction visible. For each sale return:
- item: product/service name (string)
- total: amount in Naira as a plain number — no currency symbol, no commas
- date: date in YYYY-MM-DD format if you can determine it, otherwise null
- customer: customer name if visible, otherwise null

Respond ONLY with a valid JSON array, no markdown, no explanation:
[{"item":"Rice 50kg","total":45000,"date":"2024-01-15","customer":"Mrs Bello"}]
If you cannot find any sales, return exactly: []`,
          },
        ],
      },
    ],
    generationConfig: { maxOutputTokens: 2048, temperature: 0.1 },
  })

  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    return JSON.parse(match[0]) as ExtractedSale[]
  } catch {
    return []
  }
}

export { RATE_LIMIT_DELAY_MS, sleep }
