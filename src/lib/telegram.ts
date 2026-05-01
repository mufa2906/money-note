const TELEGRAM_API_BASE = "https://api.telegram.org"

function getToken() {
  const t = process.env.TELEGRAM_BOT_TOKEN
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not set")
  return t
}

export async function sendTelegramMessage(chatId: number | string, text: string, opts: { parseMode?: "Markdown" | "HTML" } = {}) {
  const res = await fetch(`${TELEGRAM_API_BASE}/bot${getToken()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: opts.parseMode ?? "HTML",
      disable_web_page_preview: true,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error("Telegram sendMessage failed:", res.status, body)
  }
  return res.ok
}

export function verifyTelegramSecret(headerValue: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!expected) throw new Error("TELEGRAM_WEBHOOK_SECRET is not set")
  if (!headerValue) return false
  return headerValue === expected
}

export interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from?: { id: number; first_name?: string; username?: string }
    chat: { id: number; type: string }
    date: number
    text?: string
  }
}
