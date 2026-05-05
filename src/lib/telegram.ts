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

export interface InlineKeyboardButton {
  text: string
  callback_data: string
}

export async function sendTelegramWithKeyboard(
  chatId: number | string,
  text: string,
  keyboard: InlineKeyboardButton[][],
) {
  const res = await fetch(`${TELEGRAM_API_BASE}/bot${getToken()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: keyboard },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error("Telegram sendMessageWithKeyboard failed:", res.status, body)
  }
  return res.ok
}

export async function editTelegramMessage(
  chatId: number | string,
  messageId: number,
  text: string,
) {
  const res = await fetch(`${TELEGRAM_API_BASE}/bot${getToken()}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error("Telegram editMessageText failed:", res.status, body)
  }
  return res.ok
}

export async function editTelegramMessageWithKeyboard(
  chatId: number | string,
  messageId: number,
  text: string,
  keyboard: InlineKeyboardButton[][],
) {
  const res = await fetch(`${TELEGRAM_API_BASE}/bot${getToken()}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: keyboard },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error("Telegram editMessageText+keyboard failed:", res.status, body)
  }
  return res.ok
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API_BASE}/bot${getToken()}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      ...(text && { text }),
    }),
  })
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
  callback_query?: {
    id: string
    from: { id: number; first_name?: string }
    message?: {
      message_id: number
      chat: { id: number }
    }
    data?: string
  }
}
