import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq, gte, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { user, walletAccount, transaction, splitBill, notification } from "@/lib/schema"
import { generateId } from "@/lib/api-auth"
import { sendTelegramMessage, verifyTelegramSecret, type TelegramUpdate } from "@/lib/telegram"
import { formatCurrency } from "@/lib/utils"

export async function POST(request: NextRequest) {
  if (!verifyTelegramSecret(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null
  const message = update?.message
  const chatId = message?.chat.id
  const text = message?.text?.trim()

  if (!chatId || !text) return NextResponse.json({ ok: true })

  try {
    const reply = await handleCommand(chatId, text)
    if (reply) await sendTelegramMessage(chatId, reply)
  } catch (e) {
    console.error("Telegram handler error:", e)
    await sendTelegramMessage(chatId, "Maaf, terjadi kesalahan. Coba lagi sebentar.")
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
      return handleRecord(linked.id, args)
    case "/ringkasan":
      return handleSummary(linked.id)
    case "/tagihan":
      return handleBills(linked.id)
    case "/bantuan":
    case "/help":
      return helpMessage()
    default:
      return [
        "Perintah tidak dikenal.",
        helpMessage(),
      ].join("\n\n")
  }
}

function helpMessage(): string {
  return [
    "<b>Perintah MoneyNote Bot:</b>",
    "<code>/saldo</code> — total saldo semua akun",
    "<code>/catat 50000 makan siang</code> — catat pengeluaran",
    "<code>/catat masuk 1000000 gaji</code> — catat pemasukan",
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

const RECORD_ARG_RE = /^(masuk|income|keluar|expense)?\s*([\d.,]+)\s+(.+)$/i

async function handleRecord(userId: string, args: string): Promise<string> {
  const match = args.match(RECORD_ARG_RE)
  if (!match) {
    return [
      "Format salah. Contoh:",
      "<code>/catat 50000 makan siang</code>",
      "<code>/catat masuk 1000000 gaji</code>",
    ].join("\n")
  }
  const typeWord = (match[1] ?? "").toLowerCase()
  const type: "income" | "expense" = typeWord === "masuk" || typeWord === "income" ? "income" : "expense"
  const amount = Number(match[2].replace(/[.,]/g, ""))
  const description = match[3].trim()
  if (!Number.isFinite(amount) || amount <= 0) return "Jumlah harus angka lebih dari 0."

  const [account] = await db
    .select()
    .from(walletAccount)
    .where(eq(walletAccount.userId, userId))
    .orderBy(walletAccount.createdAt)
    .limit(1)
  if (!account) return "Belum ada akun. Tambahkan akun lewat aplikasi dulu."

  const today = new Date().toISOString().slice(0, 10)
  await db.insert(transaction).values({
    id: generateId(),
    userId,
    walletAccountId: account.id,
    amount,
    type,
    category: type === "income" ? "gaji" : "lainnya",
    description,
    transactionDate: today,
    source: "bot",
  })
  const delta = type === "income" ? amount : -amount
  await db
    .update(walletAccount)
    .set({ balance: sql`${walletAccount.balance} + ${delta}` })
    .where(eq(walletAccount.id, account.id))

  await db.insert(notification).values({
    id: generateId(),
    userId,
    kind: "transaction_added",
    title: type === "income" ? "Pemasukan via Telegram" : "Pengeluaran via Telegram",
    body: `${description} — ${formatCurrency(amount)}`,
  })

  return [
    type === "income" ? "✅ Pemasukan dicatat" : "✅ Pengeluaran dicatat",
    `${escapeHtml(description)} — <b>${formatCurrency(amount)}</b>`,
    `Akun: ${escapeHtml(account.accountName)}`,
  ].join("\n")
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
  const rows = await db
    .select({
      id: splitBill.id,
      targetName: splitBill.targetName,
      splitAmount: splitBill.splitAmount,
      createdAt: splitBill.createdAt,
    })
    .from(splitBill)
    .innerJoin(transaction, eq(splitBill.transactionId, transaction.id))
    .where(and(eq(transaction.userId, userId), eq(splitBill.status, "unpaid")))
    .orderBy(desc(splitBill.createdAt))
    .limit(10)

  if (rows.length === 0) return "Tidak ada tagihan belum lunas. 🎉"
  const lines = rows.map((r) => `• ${escapeHtml(r.targetName)} — <b>${formatCurrency(r.splitAmount)}</b>`)
  return [`<b>Tagihan Belum Lunas (${rows.length})</b>`, "", ...lines].join("\n")
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
