import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { user, transaction } from "@/lib/schema"
import { eq, and, gte, lte, sql } from "drizzle-orm"
import { sendTelegramMessage } from "@/lib/telegram"
import { formatCurrency } from "@/lib/utils"

// Secured via CRON_SECRET in vercel.json
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  // Last 7 days
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const fromDate = weekAgo.toISOString().slice(0, 10)
  const toDate = now.toISOString().slice(0, 10)

  // Get all users with telegram connected
  const telegramUsers = await db
    .select()
    .from(user)
    .where(sql`${user.telegramId} IS NOT NULL AND ${user.telegramId} != ''`)

  let sent = 0
  for (const u of telegramUsers) {
    if (!u.telegramId) continue
    try {
      // Weekly totals
      const rows = await db
        .select()
        .from(transaction)
        .where(
          and(
            eq(transaction.userId, u.id),
            gte(transaction.transactionDate, fromDate),
            lte(transaction.transactionDate, toDate)
          )
        )

      const income = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0)
      const expense = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0)
      const net = income - expense

      // Category breakdown
      const catMap: Record<string, number> = {}
      rows.filter((r) => r.type === "expense").forEach((r) => {
        catMap[r.category] = (catMap[r.category] || 0) + r.amount
      })
      const topCats = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

      const weekLabel = `${weekAgo.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${now.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`

      let msg = `📊 *Ringkasan Mingguan*\n${weekLabel}\n\n`
      msg += `💰 Pemasukan: *${formatCurrency(income)}*\n`
      msg += `💸 Pengeluaran: *${formatCurrency(expense)}*\n`
      msg += `${net >= 0 ? "✅" : "⚠️"} Saldo Bersih: *${net >= 0 ? "+" : ""}${formatCurrency(net)}*\n`

      if (topCats.length > 0) {
        msg += `\n🏷️ *Pengeluaran Terbesar:*\n`
        topCats.forEach(([cat, amt]) => {
          const pct = expense > 0 ? ((amt / expense) * 100).toFixed(0) : 0
          msg += `• ${cat}: ${formatCurrency(amt)} (${pct}%)\n`
        })
      }

      if (rows.length === 0) {
        msg += `\nBelum ada transaksi minggu ini. Jangan lupa catat keuanganmu! 📝`
      } else {
        msg += `\nTotal ${rows.length} transaksi minggu ini.`
      }

      msg += `\n\n_Lihat detail di dashboard →_ /start`

      await sendTelegramMessage(u.telegramId, msg, { parseMode: "Markdown" })
      sent++
    } catch {
      // Skip users that fail, continue with others
    }
  }

  return NextResponse.json({ sent, total: telegramUsers.length })
}
