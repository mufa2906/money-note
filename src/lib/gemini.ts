const GEMINI_MODEL = "gemini-2.5-flash"
const GEMINI_API = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error("GEMINI_API_KEY not configured")
  return key
}

async function extractText(res: Response): Promise<string> {
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== "string" || !text) throw new Error("Empty response from Gemini")
  return text
}

export async function callGeminiVision(
  prompt: string,
  image: string,
  mimeType: string,
  options: { temperature?: number } = {}
): Promise<string> {
  const apiKey = getApiKey()
  const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: image } }] }],
      generationConfig: { responseMimeType: "application/json", temperature: options.temperature ?? 0.1 },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini error ${res.status}: ${err}`)
  }
  return extractText(res)
}

export async function callGeminiText(
  prompt: string,
  options: { temperature?: number } = {}
): Promise<string> {
  const apiKey = getApiKey()
  const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: options.temperature ?? 0.1 },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini error ${res.status}: ${err}`)
  }
  return extractText(res)
}
