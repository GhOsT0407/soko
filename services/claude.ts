const API_URL = 'https://api.anthropic.com/v1/messages'

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

export async function chatWithClaude(
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any)?.error?.message || `API error ${res.status}`)
  }
  const data = await res.json()
  return (data.content[0].text as string)
}

export async function extractSalesFromPhotos(
  apiKey: string,
  base64Images: string[]
): Promise<ExtractedSale[]> {
  const imageContent = base64Images.map((b64) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: b64,
    },
  }))

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            ...imageContent,
            {
              type: 'text',
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
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any)?.error?.message || `API error ${res.status}`)
  }

  const data = await res.json()
  const text = (data.content[0].text as string).trim()
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  return JSON.parse(match[0]) as ExtractedSale[]
}
