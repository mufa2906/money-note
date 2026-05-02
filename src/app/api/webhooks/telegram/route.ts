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
  answerCallbackQuery,
  verifyTelegramSecret,
  type TelegramUpdate,
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
      await handleCategoryCallback(update.callback_query)
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
      return ["Perintah tidak dikenal.", helpMessage()].join("\n\n")
  }
}

function helpMessage(): string {
  return [
    "<b>Perintah MoneyNote Bot:</b>",
    "<code>/saldo</code> — total saldo semua akun",
    "<code>/catat 50000 makan siang</code> — catat pengeluaran (pilih kategori lewat tombol)",
    "<code>/catat masuk 1000000 gaji bulanan</code> — catat pemasukan",
    "<code>/ringkasan</code> — ringkasan bulan ini",
    "<code>/tagihan</code> — daftar bagi tagihan belum lunas",
    "<code>/bantuan</code> — tampilkan pesan ini",
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

function detectCategory(description: string, type: "income" | "expense"): string {
  const lower = description.toLowerCase()
  for (const [keywords, cat] of KEYWORD_CATEGORY) {
    if (keywords.some((k) => lower.includes(k))) return cat
  }
  return type === "income" ? "gaji" : "lainnya"
}

interface ParsedRecord {
  type: "income" | "expense"
  category: string | null
  amount: number
  description: string
}

function parseRecord(args: string): ParsedRecord | null {
  const parts = args.trim().split(/\s+/)
  let idx = 0

  let type: "income" | "expense" = "expense"
  if (parts[idx] && TYPE_WORDS.has(parts[idx].toLowerCase())) {
    type = parts[idx].toLowerCase() === "masuk" || parts[idx].toLowerCase() === "income" ? "income" : "expense"
    idx++
  }

  let category: string | null = null
  if (parts[idx] && CATEGORY_ALIASES[parts[idx].toLowerCase()]) {
    category = CATEGORY_ALIASES[parts[idx].toLowerCase()]
    idx++
  }

  if (!parts[idx]) return null
  const amount = Number(parts[idx].replace(/[.,]/g, ""))
  if (!Number.isFinite(amount) || amount <= 0) return null
  idx++

  if (!parts[idx]) return null
  const description = parts.slice(idx).join(" ")

  return { type, category, amount, description }
}

async function handleRecord(userId: string, chatId: number, args: string): Promise<string | null> {
  const parsed = parseRecord(args)
  if (!parsed) {
    return [
      "Format salah. Contoh:",
      "<code>/catat 50000 makan siang</code>",
      "<code>/catat masuk 1000000 gaji bulanan</code>",
    ].join("\n")
  }

  const { type, amount, description } = parsed
  const autoCategory = parsed.category ?? detectCategory(description, type)

  const [account] = await db
    .select()
    .from(walletAccount)
    .where(eq(walletAccount.userId, userId))
    .orderBy(walletAccount.createdAt)
    .limit(1)
  if (!account) return "Belum ada akun. Tambahkan akun lewat aplikasi dulu."

  await db
    .update(user)
    .set({
      telegramPending: JSON.stringify({ type, amount, description, accountId: account.id, accountName: account.accountName }),
      updatedAt: new Date(),
    })
    .where(eq(user.telegramId, String(chatId)))

  const keyboard = CAT_ROWS.map((row) =>
    row.map((val) => ({
      text: val === autoCategory ? `✓ ${CAT_LABELS[val]}` : CAT_LABELS[val],
      callback_data: `cat:${val}`,
    }))
  )

  const header = type === "income"
    ? `Pemasukan <b>${formatCurrency(amount)}</b>`
    : `Pengeluaran <b>${formatCurrency(amount)}</b>`

  await sendTelegramWithKeyboard(
    chatId,
    `${header} — ${escapeHtml(description)}\nAkun: ${escapeHtml(account.accountName)}\n\nPilih kategori:`,
    keyboard,
  )
  return null
}

async function handleCategoryCallback(cb: NonNullable<TelegramUpdate["callback_query"]>) {
  const chatId = cb.message?.chat.id
  const messageId = cb.message?.message_id
  const category = cb.data?.startsWith("cat:") ? cb.data.slice(4) : null

  await answerCallbackQuery(cb.id)

  if (!chatId || !messageId || !category) return

  const linked = await getLinkedUser(chatId)
  if (!linked?.telegramPending) {
    await editTelegramMessage(chatId, messageId, "Sesi kedaluwarsa. Ulangi dengan /catat.")
    return
  }

  const pending = JSON.parse(linked.telegramPending) as {
    type: "income" | "expense"
    amount: number
    description: string
    accountId: string
    accountName: string
  }

  const today = new Date().toISOString().slice(0, 10)
  await db.insert(transaction).values({
    id: generateId(),
    userId: linked.id,
    walletAccountId: pending.accountId,
    amount: pending.amount,
    type: pending.type,
    category,
    description: pending.description,
    transactionDate: today,
    source: "bot",
  })

  const delta = pending.type === "income" ? pending.amount : -pending.amount
  await db
    .update(walletAccount)
    .set({ balance: sql`${walletAccount.balance} + ${delta}` })
    .where(eq(walletAccount.id, pending.accountId))

  await db
    .update(user)
    .set({ telegramPending: null, updatedAt: new Date() })
    .where(eq(user.id, linked.id))

  await db.insert(notification).values({
    id: generateId(),
    userId: linked.id,
    kind: "transaction_added",
    title: pending.type === "income" ? "Pemasukan via Telegram" : "Pengeluaran via Telegram",
    body: `${pending.description} — ${formatCurrency(pending.amount)}`,
  })

  const catLabel = CAT_LABELS[category] ?? category
  await editTelegramMessage(chatId, messageId, [
    pending.type === "income" ? "✅ Pemasukan dicatat!" : "✅ Pengeluaran dicatat!",
    `${escapeHtml(pending.description)} — <b>${formatCurrency(pending.amount)}</b>`,
    `Kategori: ${catLabel} | Akun: ${escapeHtml(pending.accountName)}`,
  ].join("\n"))
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

    const breakdown = computeBreakdown({
      ...b,
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
