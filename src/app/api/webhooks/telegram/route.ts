import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { user, walletAccount, transaction, bill, billItem, billParticipant, billItemAssignment, notification } from "@/lib/schema"
import { computeBreakdown } from "@/lib/bill-utils"
import { generateId } from "@/lib/api-auth"
import {
  sendTelegramMessage,
  sendTelegramWithKeyboard,
  editTelegramMessage,
  editTelegramMessageWithKeyboard,
  answerCallbackQuery,
  verifyTelegramSecret,
  type TelegramUpdate,
  type InlineKeyboardButton,
} from "@/lib/telegram"
import { formatCurrency } from "@/lib/utils"

const CAT_ROWS = [
  ["makanan", "transportasi", "belanja"],
  ["hiburan", "tagihan", "kesehatan"],
  ["pendidikan", "gaji", "lainnya"],
]

const CAT_LABELS: Record<string, string> = {
  makanan: "Makanan", transportasi: "Transportasi", belanja: "Belanja",
  hiburan: "Hiburan", tagihan: "Tagihan", kesehatan: "Kesehatan",
  pendidikan: "Pendidikan", gaji: "Gaji", lainnya: "Lainnya",
}

export async function POST(request: NextRequest) {
  if (!verifyTelegramSecret(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null
  if (!update) return NextResponse.json({ ok: true })

  try {
    if (update.callback_query) {
      await handleCallback(update.callback_query)
      return NextResponse.json({ ok: true })
    }

    const message = update.message
    const chatId = message?.chat.id
    const text = message?.text?.trim()
    if (!chatId || !text) return NextResponse.json({ ok: true })

    const reply = await handleCommand(chatId, text)
    if (reply) await sendTelegramMessage(chatId, reply)
  } catch (e) {
    console.error("Telegram handler error:", e)
  }

  return NextResponse.json({ ok: true })
}

async function handleCommand(chatId: number, text: string): Promise<string | null> {
  const [rawCmd, ...rest] = text.split(/\s+/)
  const cmd = rawCmd.toLowerCase().split("@")[0]
  const args = rest.join(" ").trim()

  if (cmd === "/start") return handleStart(chatId, args)

  const linked = await getLinkedUser(chatId)
  if (!linked) {
    return [
      "Akunmu belum terhubung dengan MoneyNote.",
      "Buka aplikasi → menu <b>Integrasi Bot</b> → buat kode verifikasi,",
      "lalu kirim ke sini: <code>/start MN-XXXXXX</code>",
    ].join("\n")
  }

  switch (cmd) {
    case "/saldo":
      return handleBalance(linked.id)
    case "/catat":
      return handleRecord(linked.id, chatId, args)
    case "/ringkasan":
      return handleSummary(linked.id)
    case "/tagihan":
      return handleBills(linked.id)
    case "/bantuan":
    case "/help":
      return helpMessage()
    default:
      return handleFreeText(linked.id, text)
  }
}

function helpMessage(): string {
  return [
    "<b>Perintah MoneyNote Bot:</b>",
    "<code>/catat 50000 - BCA - makanan - makan siang</code> — format lengkap",
    "<code>/catat 50000 makan siang</code> — format singkat (pilih akun & kategori lewat tombol)",
    "<code>/catat masuk 1000000 - BCA - gaji - gaji bulanan</code> — pemasukan format lengkap",
    "<code>/saldo</code> — total saldo semua akun",
    "<code>/ringkasan</code> — ringkasan bulan ini",
    "<code>/tagihan</code> — daftar bagi tagihan belum lunas",
    "<code>/bantuan</code> — tampilkan pesan ini",
    "",
    "💬 <b>Tanya bebas!</b> Ketik pertanyaan langsung, misal:",
    "<i>\"Berapa pengeluaranku minggu ini?\"</i>",
    "<i>\"Kategori terbesar bulan ini apa?\"</i>",
  ].join("\n")
}

async function getLinkedUser(chatId: number) {
  const [u] = await db.select().from(user).where(eq(user.telegramId, String(chatId))).limit(1)
  return u ?? null
}

async function handleStart(chatId: number, args: string): Promise<string> {
  const code = args.trim().toUpperCase()
  if (!code) {
    return [
      "Halo! 👋 Saya MoneyNote Bot.",
      "Untuk menghubungkan akun, buka aplikasi MoneyNote → menu <b>Integrasi Bot</b>,",
      "buat kode verifikasi, lalu kirim ke sini:",
      "<code>/start MN-XXXXXX</code>",
    ].join("\n")
  }

  const [target] = await db.select().from(user).where(eq(user.verificationCode, code)).limit(1)
  if (!target) {
    return "Kode tidak valid atau sudah digunakan. Buat kode baru di aplikasi MoneyNote → Integrasi Bot."
  }

  await db
    .update(user)
    .set({ telegramId: String(chatId), verificationCode: null, updatedAt: new Date() })
    .where(eq(user.id, target.id))

  await db.insert(notification).values({
    id: generateId(),
    userId: target.id,
    kind: "system",
    title: "Telegram Terhubung",
    body: "Bot Telegram berhasil terhubung dengan akunmu.",
  })

  return `Berhasil terhubung dengan akun <b>${escapeHtml(target.name)}</b> ✅\nKetik <code>/bantuan</code> untuk lihat perintah.`
}

async function handleBalance(userId: string): Promise<string> {
  const accounts = await db.select().from(walletAccount).where(eq(walletAccount.userId, userId))
  if (accounts.length === 0) return "Belum ada akun. Tambahkan akun lewat aplikasi dulu."
  const total = accounts.reduce((s, a) => s + a.balance, 0)
  const lines = accounts.map((a) => `• ${escapeHtml(a.accountName)}: <b>${formatCurrency(a.balance)}</b>`)
  return [`<b>Total Saldo: ${formatCurrency(total)}</b>`, "", ...lines].join("\n")
}

const TYPE_WORDS = new Set(["masuk", "income", "keluar", "expense"])

const CATEGORY_ALIASES: Record<string, string> = {
  makanan: "makanan", makan: "makanan",
  transportasi: "transportasi", transport: "transportasi", bensin: "transportasi",
  belanja: "belanja", shopping: "belanja",
  hiburan: "hiburan",
  tagihan: "tagihan", bayar: "tagihan",
  kesehatan: "kesehatan", sehat: "kesehatan", medis: "kesehatan",
  pendidikan: "pendidikan", belajar: "pendidikan",
  gaji: "gaji", salary: "gaji",
  lainnya: "lainnya", lain: "lainnya",
}

const KEYWORD_CATEGORY: Array<[string[], string]> = [
  [["makan", "sarapan", "siang", "malam", "kopi", "cafe", "warung", "resto", "jajan", "snack", "cemilan", "bakso", "soto", "nasi", "minuman", "ayam", "pizza", "burger"], "makanan"],
  [["bensin", "bbm", "ojek", "grab", "gojek", "taxi", "bus", "commuter", "parkir", "tol", "angkot", "kereta", "perjalanan", "transport"], "transportasi"],
  [["belanja", "beli", "supermarket", "indomaret", "alfamart", "tokopedia", "shopee", "lazada", "groceri"], "belanja"],
  [["nonton", "bioskop", "netflix", "spotify", "game", "hiburan", "main", "musik", "konser"], "hiburan"],
  [["tagihan", "listrik", "air", "wifi", "internet", "pulsa", "kuota", "iuran", "cicilan", "kredit", "pdam"], "tagihan"],
  [["dokter", "obat", "apotek", "rumah sakit", "klinik", "puskesmas", "vitamin", "kesehatan", "periksa"], "kesehatan"],
  [["sekolah", "kampus", "kuliah", "kursus", "les", "buku", "alat tulis", "spp", "pendidikan"], "pendidikan"],
  [["gaji", "salary", "bonus", "tunjangan", "freelance", "proyek", "komisi"], "gaji"],
]

function detectCategoryKeyword(description: string, type: "income" | "expense"): string {
  const lower = description.toLowerCase()
  for (const [keywords, cat] of KEYWORD_CATEGORY) {
    if (keywords.some((k) => lower.includes(k))) return cat
  }
  return type === "income" ? "gaji" : "lainnya"
}

const GEMINI_MODEL = "gemini-2.5-flash"
const GEMINI_API = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null
  } catch {
    return null
  }
}

async function detectCategory(description: string, type: "income" | "expense"): Promise<string> {
  const fallback = detectCategoryKeyword(description, type)
  const prompt = `Klasifikasikan transaksi keuangan berikut ke satu kategori.
Deskripsi: "${description}"
Tipe: ${type === "income" ? "pemasukan" : "pengeluaran"}
Pilih SATU dari: makanan, transportasi, belanja, hiburan, tagihan, kesehatan, pendidikan, gaji, lainnya
Balas HANYA nama kategori, tanpa penjelasan.`
  const result = await callGemini(prompt)
  if (!result) return fallback
  const valid = ["makanan", "transportasi", "belanja", "hiburan", "tagihan", "kesehatan", "pendidikan", "gaji", "lainnya"]
  const clean = result.toLowerCase().trim().split(/\s+/)[0]
  return valid.includes(clean) ? clean : fallback
}

async function handleFreeText(userId: string, text: string): Promise<string> {
  // Fetch context: last 30 transactions this month
  const now = new Date()
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const recentTxs = await db
    .select()
    .from(transaction)
    .where(and(eq(transaction.userId, userId), gte(transaction.transactionDate, `${monthStr}-01`)))
    .orderBy(desc(transaction.transactionDate))
    .limit(30)

  const accounts = await db.select().from(walletAccount).where(eq(walletAccount.userId, userId))
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)
  const income = recentTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const expense = recentTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)

  const txSummary = recentTxs.slice(0, 10).map((t) =>
    `- ${t.transactionDate}: ${t.type === "income" ? "+" : "-"}${formatCurrency(t.amount)} ${t.category} (${t.description})`
  ).join("\n")

  const prompt = `Kamu adalah asisten keuangan pribadi MoneyNote yang ramah. Jawab pertanyaan pengguna berdasarkan data keuangan mereka.

Data keuangan bulan ini (${monthStr}):
- Total saldo semua akun: ${formatCurrency(totalBalance)}
- Pemasukan bulan ini: ${formatCurrency(income)}
- Pengeluaran bulan ini: ${formatCurrency(expense)}
- Sisa: ${formatCurrency(income - expense)}

10 transaksi terakhir:
${txSummary || "Belum ada transaksi bulan ini."}

Pertanyaan pengguna: "${text}"

Jawab dalam Bahasa Indonesia, singkat (maks 3 kalimat), natural, dan gunakan angka Rupiah yang spesifik jika relevan.
Jangan gunakan markdown/HTML. Jika tidak bisa dijawab dari data, katakan dengan jujur.`

  const result = await callGemini(prompt)
  return result ?? "Maaf, AI sementara tidak tersedia. Gunakan perintah /saldo atau /ringkasan untuk cek keuanganmu."
}

interface TelegramPending {
  step: "select_account" | "select_category" | "confirm"
  type: "income" | "expense"
  amount: number
  description: string
  accountId?: string
  accountName?: string
  category?: string
  autoCategory?: string
}

function parseNewFormat(args: string): {
  type: "income" | "expense"
  amount: number
  accountHint: string
  category: string
  description: string
} | null {
  const dashParts = args.split("-").map((s) => s.trim())
  if (dashParts.length < 4) return null

  let nominalPart = dashParts[0]
  let type: "income" | "expense" = "expense"

  const words = nominalPart.trim().split(/\s+/)
  if (words[0] && TYPE_WORDS.has(words[0].toLowerCase())) {
    type = ["masuk", "income"].includes(words[0].toLowerCase()) ? "income" : "expense"
    nominalPart = words.slice(1).join(" ")
  }

  const amount = Number(nominalPart.replace(/[.,]/g, ""))
  if (!Number.isFinite(amount) || amount <= 0) return null

  const accountHint = dashParts[1]
  const categoryRaw = dashParts[2].toLowerCase().trim()
  const category = CATEGORY_ALIASES[categoryRaw]
  if (!category) return null

  const description = dashParts.slice(3).join(" - ").trim()
  if (!description) return null

  return { type, amount, accountHint, category, description }
}

function buildAccountKeyboard(
  accounts: { id: string; accountName: string }[],
): InlineKeyboardButton[][] {
  const rows: InlineKeyboardButton[][] = []
  for (let i = 0; i < accounts.length; i += 2) {
    rows.push(
      accounts.slice(i, i + 2).map((a) => ({
        text: a.accountName,
        callback_data: `acc:${a.id}`,
      }))
    )
  }
  return rows
}

function buildCategoryKeyboard(highlighted?: string): InlineKeyboardButton[][] {
  return CAT_ROWS.map((row) =>
    row.map((val) => ({
      text: val === highlighted ? `✓ ${CAT_LABELS[val]}` : CAT_LABELS[val],
      callback_data: `cat:${val}`,
    }))
  )
}

async function handleRecord(userId: string, chatId: number, args: string): Promise<string | null> {
  if (!args) {
    return [
      "Format lengkap: <code>/catat {nominal} - {akun} - {kategori} - {deskripsi}</code>",
      "Contoh: <code>/catat 50000 - BCA - makanan - makan siang</code>",
      "",
      "Format singkat (pilih akun & kategori lewat tombol):",
      "<code>/catat 50000 makan siang</code>",
    ].join("\n")
  }

  const accounts = await db
    .select()
    .from(walletAccount)
    .where(eq(walletAccount.userId, userId))
    .orderBy(walletAccount.createdAt)

  if (!accounts.length) return "Belum ada akun. Tambahkan akun lewat aplikasi dulu."

  const newFmt = parseNewFormat(args)
  if (newFmt) {
    const matchedAccount = accounts.find(
      (a) =>
        a.accountName.toLowerCase().includes(newFmt.accountHint.toLowerCase()) ||
        newFmt.accountHint.toLowerCase().includes(a.accountName.toLowerCase())
    )

    if (matchedAccount) {
      const pending: TelegramPending = {
        step: "confirm",
        type: newFmt.type,
        amount: newFmt.amount,
        description: newFmt.description,
        accountId: matchedAccount.id,
        accountName: matchedAccount.accountName,
        category: newFmt.category,
      }
      await savePending(chatId, pending)

      const header = newFmt.type === "income" ? "Pemasukan" : "Pengeluaran"
      await sendTelegramWithKeyboard(
        chatId,
        [
          `${header} <b>${formatCurrency(newFmt.amount)}</b>`,
          `${escapeHtml(newFmt.description)}`,
          `Akun: <b>${escapeHtml(matchedAccount.accountName)}</b> · Kategori: <b>${CAT_LABELS[newFmt.category]}</b>`,
          "",
          "Konfirmasi?",
        ].join("\n"),
        [
          [
            { text: "✅ Ya, Catat", callback_data: "confirm:yes" },
            { text: "❌ Batal", callback_data: "confirm:no" },
          ],
        ],
      )
      return null
    }

    // Account not found — show account selection
    const pending: TelegramPending = {
      step: "select_account",
      type: newFmt.type,
      amount: newFmt.amount,
      description: newFmt.description,
      category: newFmt.category,
    }
    await savePending(chatId, pending)

    const header = newFmt.type === "income"
      ? `Pemasukan <b>${formatCurrency(newFmt.amount)}</b>`
      : `Pengeluaran <b>${formatCurrency(newFmt.amount)}</b>`
    await sendTelegramWithKeyboard(
      chatId,
      `${header} — ${escapeHtml(newFmt.description)}\nAkun "<b>${escapeHtml(newFmt.accountHint)}</b>" tidak ditemukan. Pilih akun:`,
      buildAccountKeyboard(accounts),
    )
    return null
  }

  // Short format: try to parse amount + description
  const parts = args.trim().split(/\s+/)
  let idx = 0
  let type: "income" | "expense" = "expense"
  if (parts[idx] && TYPE_WORDS.has(parts[idx].toLowerCase())) {
    type = ["masuk", "income"].includes(parts[idx].toLowerCase()) ? "income" : "expense"
    idx++
  }

  const amount = Number(parts[idx]?.replace(/[.,]/g, ""))
  if (!Number.isFinite(amount) || amount <= 0) {
    return [
      "Format lengkap: <code>/catat {nominal} - {akun} - {kategori} - {deskripsi}</code>",
      "Contoh: <code>/catat 50000 - BCA - makanan - makan siang</code>",
      "",
      "Format singkat:",
      "<code>/catat 50000 makan siang</code>",
      "<code>/catat masuk 1000000 gaji bulanan</code>",
    ].join("\n")
  }
  idx++

  const description = parts.slice(idx).join(" ")
  if (!description) {
    return [
      "Format lengkap: <code>/catat {nominal} - {akun} - {kategori} - {deskripsi}</code>",
      "Contoh: <code>/catat 50000 - BCA - makanan - makan siang</code>",
    ].join("\n")
  }

  const autoCategory = await detectCategory(description, type)
  const pending: TelegramPending = {
    step: "select_account",
    type,
    amount,
    description,
    autoCategory,
  }
  await savePending(chatId, pending)

  const header = type === "income"
    ? `Pemasukan <b>${formatCurrency(amount)}</b>`
    : `Pengeluaran <b>${formatCurrency(amount)}</b>`
  await sendTelegramWithKeyboard(
    chatId,
    `${header} — ${escapeHtml(description)}\nPilih akun:`,
    buildAccountKeyboard(accounts),
  )
  return null
}

async function savePending(chatId: number, pending: TelegramPending) {
  await db
    .update(user)
    .set({ telegramPending: JSON.stringify(pending), updatedAt: new Date() })
    .where(eq(user.telegramId, String(chatId)))
}

async function handleCallback(cb: NonNullable<TelegramUpdate["callback_query"]>) {
  const chatId = cb.message?.chat.id
  const messageId = cb.message?.message_id
  const data = cb.data

  await answerCallbackQuery(cb.id)
  if (!chatId || !messageId || !data) return

  const linked = await getLinkedUser(chatId)
  if (!linked?.telegramPending) {
    await editTelegramMessage(chatId, messageId, "Sesi kedaluwarsa. Ulangi dengan /catat.")
    return
  }

  const pending = JSON.parse(linked.telegramPending) as TelegramPending & {
    // legacy shape (no step field)
    accountId?: string
    accountName?: string
  }

  // ── Account selection ──────────────────────────────────────────────────────
  if (data.startsWith("acc:")) {
    const accountId = data.slice(4)
    const [account] = await db.select().from(walletAccount).where(eq(walletAccount.id, accountId)).limit(1)
    if (!account) {
      await editTelegramMessage(chatId, messageId, "Akun tidak ditemukan. Ulangi dengan /catat.")
      return
    }

    const updatedPending: TelegramPending = {
      ...pending,
      step: "select_category",
      accountId: account.id,
      accountName: account.accountName,
    }

    // If category was already set from new-format input, go straight to confirm
    if (updatedPending.category) {
      updatedPending.step = "confirm"
      await db
        .update(user)
        .set({ telegramPending: JSON.stringify(updatedPending), updatedAt: new Date() })
        .where(eq(user.id, linked.id))

      const header = updatedPending.type === "income" ? "Pemasukan" : "Pengeluaran"
      await editTelegramMessageWithKeyboard(
        chatId,
        messageId,
        [
          `${header} <b>${formatCurrency(updatedPending.amount)}</b>`,
          `${escapeHtml(updatedPending.description)}`,
          `Akun: <b>${escapeHtml(account.accountName)}</b> · Kategori: <b>${CAT_LABELS[updatedPending.category]}</b>`,
          "",
          "Konfirmasi?",
        ].join("\n"),
        [
          [
            { text: "✅ Ya, Catat", callback_data: "confirm:yes" },
            { text: "❌ Batal", callback_data: "confirm:no" },
          ],
        ],
      )
      return
    }

    // No category yet — show category keyboard
    await db
      .update(user)
      .set({ telegramPending: JSON.stringify(updatedPending), updatedAt: new Date() })
      .where(eq(user.id, linked.id))

    const highlighted = pending.autoCategory ?? await detectCategory(pending.description, pending.type)
    const header = pending.type === "income"
      ? `Pemasukan <b>${formatCurrency(pending.amount)}</b>`
      : `Pengeluaran <b>${formatCurrency(pending.amount)}</b>`
    await editTelegramMessageWithKeyboard(
      chatId,
      messageId,
      `${header} — ${escapeHtml(pending.description)}\nAkun: <b>${escapeHtml(account.accountName)}</b>\n\nPilih kategori:`,
      buildCategoryKeyboard(highlighted),
    )
    return
  }

  // ── Category selection ─────────────────────────────────────────────────────
  if (data.startsWith("cat:")) {
    const category = data.slice(4)

    // Support legacy pending (no step field, accountId already set)
    const accountId = pending.accountId
    const accountName = pending.accountName
    if (!accountId || !accountName) {
      await editTelegramMessage(chatId, messageId, "Sesi kedaluwarsa. Ulangi dengan /catat.")
      return
    }

    await saveTransaction(linked.id, chatId, messageId, { ...pending, accountId, accountName, category })
    return
  }

  // ── Confirm / Cancel ───────────────────────────────────────────────────────
  if (data === "confirm:no") {
    await db.update(user).set({ telegramPending: null, updatedAt: new Date() }).where(eq(user.id, linked.id))
    await editTelegramMessage(chatId, messageId, "❌ Transaksi dibatalkan.")
    return
  }

  if (data === "confirm:yes") {
    const { accountId, accountName, category } = pending
    if (!accountId || !accountName || !category) {
      await editTelegramMessage(chatId, messageId, "Sesi tidak lengkap. Ulangi dengan /catat.")
      return
    }
    await saveTransaction(linked.id, chatId, messageId, { ...pending, accountId, accountName, category })
  }
}

async function saveTransaction(
  userId: string,
  chatId: number,
  messageId: number,
  data: TelegramPending & { accountId: string; accountName: string; category: string },
) {
  const today = new Date().toISOString().slice(0, 10)
  await db.insert(transaction).values({
    id: generateId(),
    userId,
    walletAccountId: data.accountId,
    amount: data.amount,
    type: data.type,
    category: data.category,
    description: data.description,
    transactionDate: today,
    source: "bot",
  })

  const delta = data.type === "income" ? data.amount : -data.amount
  await db
    .update(walletAccount)
    .set({ balance: sql`${walletAccount.balance} + ${delta}` })
    .where(eq(walletAccount.id, data.accountId))

  await db
    .update(user)
    .set({ telegramPending: null, updatedAt: new Date() })
    .where(eq(user.id, userId))

  await db.insert(notification).values({
    id: generateId(),
    userId,
    kind: "transaction_added",
    title: data.type === "income" ? "Pemasukan via Telegram" : "Pengeluaran via Telegram",
    body: `${data.description} — ${formatCurrency(data.amount)}`,
  })

  const catLabel = CAT_LABELS[data.category] ?? data.category
  await editTelegramMessage(
    chatId,
    messageId,
    [
      data.type === "income" ? "✅ Pemasukan dicatat!" : "✅ Pengeluaran dicatat!",
      `${escapeHtml(data.description)} — <b>${formatCurrency(data.amount)}</b>`,
      `Kategori: ${catLabel} · Akun: ${escapeHtml(data.accountName)}`,
    ].join("\n"),
  )
}

async function handleSummary(userId: string): Promise<string> {
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  const startStr = start.toISOString().slice(0, 10)

  const rows = await db
    .select({ type: transaction.type, amount: transaction.amount })
    .from(transaction)
    .where(and(eq(transaction.userId, userId), gte(transaction.transactionDate, startStr)))

  const income = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0)
  const expense = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0)
  const monthName = start.toLocaleDateString("id-ID", { month: "long", year: "numeric" })

  return [
    `<b>Ringkasan ${monthName}</b>`,
    `Pemasukan: <b>${formatCurrency(income)}</b>`,
    `Pengeluaran: <b>${formatCurrency(expense)}</b>`,
    `Selisih: <b>${formatCurrency(income - expense)}</b>`,
    `Total transaksi: ${rows.length}`,
  ].join("\n")
}

async function handleBills(userId: string): Promise<string> {
  const bills = await db
    .select()
    .from(bill)
    .where(eq(bill.userId, userId))
    .orderBy(desc(bill.createdAt))
    .limit(10)

  if (bills.length === 0) return "Belum ada tagihan. Bikin lewat aplikasi dulu ya."

  const lines: string[] = []
  let unpaidCount = 0

  for (const b of bills) {
    const items = await db.select().from(billItem).where(eq(billItem.billId, b.id)).orderBy(billItem.position)
    const participants = await db.select().from(billParticipant).where(eq(billParticipant.billId, b.id))
    const itemIds = items.map((i) => i.id)
    const assignments = itemIds.length
      ? await db.select().from(billItemAssignment).where(inArray(billItemAssignment.itemId, itemIds))
      : []
    const assignmentsByItem = new Map<string, string[]>()
    for (const a of assignments) {
      const arr = assignmentsByItem.get(a.itemId) ?? []
      arr.push(a.participantId)
      assignmentsByItem.set(a.itemId, arr)
    }

    let charges: { name: string; amount: number }[] = []
    if (b.charges) {
      try {
        const parsed = JSON.parse(b.charges)
        if (Array.isArray(parsed)) {
          charges = parsed.filter((c: { name?: unknown; amount?: unknown }) => typeof c?.name === "string" && Number.isFinite(c?.amount)) as { name: string; amount: number }[]
        }
      } catch { /* ignore */ }
    }
    if (charges.length === 0) {
      if (b.serviceCharge > 0) charges.push({ name: "Service Charge", amount: b.serviceCharge })
      if (b.tax > 0) charges.push({ name: "PPN", amount: b.tax })
    }

    const breakdown = computeBreakdown({
      id: b.id,
      userId: b.userId,
      title: b.title,
      description: b.description ?? null,
      paymentInfo: null,
      photoUrl: b.photoUrl,
      charges,
      createdAt: String(b.createdAt),
      updatedAt: String(b.updatedAt),
      items: items.map((i) => ({ ...i, participantIds: assignmentsByItem.get(i.id) ?? [] })),
      participants,
    })

    const unpaid = breakdown.filter((p) => p.status === "unpaid" && p.total > 0)
    if (unpaid.length === 0) continue
    unpaidCount += unpaid.length

    lines.push(`<b>${escapeHtml(b.title)}</b>`)
    for (const p of unpaid) {
      lines.push(`• ${escapeHtml(p.name)} — <b>${formatCurrency(p.total)}</b>`)
    }
    lines.push("")
  }

  if (unpaidCount === 0) return "Semua tagihan sudah lunas. 🎉"
  return [`<b>Tagihan Belum Lunas</b>`, "", ...lines].join("\n").trim()
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
