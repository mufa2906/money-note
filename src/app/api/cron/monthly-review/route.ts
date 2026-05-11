import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { user, transaction, notification } from "@/lib/schema"
import { and, gte, lte, sql } from "drizzle-orm"
import { eq } from "drizzle-orm"
import { sendTelegramMessage } from "@/lib/telegram"
import { formatCurrency } from "@/lib/utils"
import { generateId } from "@/lib/api-auth"

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
        generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null
  } catch {
    return null
  }
}

function getMonthRange(monthsAgo: number): { from: string; to: string; label: string } {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - monthsAgo)
  const from = d.toISOString().slice(0, 10)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const to = lastDay.toISOString().slice(0, 10)
  const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
  return { from, to, label }
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const telegramUsers = await db
    .select()
    .from(user)
    .where(sql`${user.telegramId} IS NOT NULL AND ${user.telegramId} != ''`)

  let sent = 0

  for (const u of telegramUsers) {
    if (!u.telegramId) continue
    try {
      // Collect 3 months of data
      const months = [0, 1, 2].map((i) => getMonthRange(i))
      const monthData = await Promise.all(
        months.map(async ({ from, to, label }) => {
          const rows = await db
            .select()
            .from(transaction)
            .where(and(eq(transaction.userId, u.id), gte(transaction.transactionDate, from), lte(transaction.transactionDate, to)))

          const income = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0)
          const expense = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0)

          const catMap: Record<string, number> = {}
          rows.filter((r) => r.type === "expense").forEach((r) => {
            catMap[r.category] = (catMap[r.category] || 0) + r.amount
          })
          const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 3)

          return { label, income, expense, net: income - expense, topCats, txCount: rows.length }
        })
      )

      const [thisMonth, lastMonth, twoMonthsAgo] = monthData
      if (thisMonth.txCount === 0) continue

      const savingRate = thisMonth.income > 0 ? ((thisMonth.net / thisMonth.income) * 100).toFixed(1) : "0"

      const prompt = `Kamu adalah konsultan keuangan pribadi yang analitis dan personal. Buat laporan bulanan keuangan berdasarkan data 3 bulan terakhir pengguna.

DATA KEUANGAN:
Bulan ini (${thisMonth.label}): Pemasukan Rp${thisMonth.income.toLocaleString("id-ID")}, Pengeluaran Rp${thisMonth.expense.toLocaleString("id-ID")}, Net Rp${thisMonth.net.toLocaleString("id-ID")}, Saving rate ${savingRate}%
Bulan lalu (${lastMonth.label}): Pemasukan Rp${lastMonth.income.toLocaleString("id-ID")}, Pengeluaran Rp${lastMonth.expense.toLocaleString("id-ID")}
2 bulan lalu (${twoMonthsAgo.label}): Pemasukan Rp${twoMonthsAgo.income.toLocaleString("id-ID")}, Pengeluaran Rp${twoMonthsAgo.expense.toLocaleString("id-ID")}

TOP KATEGORI BULAN INI:
${thisMonth.topCats.map(([cat, amt]) => `- ${cat}: Rp${amt.toLocaleString("id-ID")}`).join("\n") || "Belum ada data"}

Berikan laporan bulanan dalam JSON:
{
  "review": "2-3 kalimat ringkasan keseluruhan bulan ini vs bulan lalu, sebut angka spesifik",
  "achievements": ["pencapaian positif (maks 2)"],
  "concerns": ["hal yang perlu diperhatikan atau tren negatif (maks 2)"],
  "recommendations": ["saran konkret untuk bulan depan (maks 3, sebut angka Rupiah)"],
  "forecast": "prediksi 1 kalimat jika tren ini berlanjut"
}

Nada: analytical, direct, personal. Bukan motivational speech. Sebut angka spesifik.`

      const aiText = await callGemini(prompt)
      let aiData: { review: string; achievements: string[]; concerns: string[]; recommendations: string[]; forecast: string } | null = null

      if (aiText) {
        try {
          aiData = JSON.parse(aiText)
        } catch { /* fallback to plain summary */ }
      }

      // Build Telegram message
      let msg = `📈 *Laporan Bulanan — ${thisMonth.label}*\n\n`

      if (aiData) {
        msg += `${aiData.review}\n\n`
        if (aiData.achievements.length > 0) {
          msg += `🎯 *Pencapaian:*\n${aiData.achievements.map((a) => `• ${a}`).join("\n")}\n\n`
        }
        if (aiData.concerns.length > 0) {
          msg += `⚠️ *Perhatian:*\n${aiData.concerns.map((c) => `• ${c}`).join("\n")}\n\n`
        }
        if (aiData.recommendations.length > 0) {
          msg += `💡 *Rekomendasi Bulan Depan:*\n${aiData.recommendations.map((r) => `• ${r}`).join("\n")}\n\n`
        }
        msg += `🔮 ${aiData.forecast}`
      } else {
        // Fallback plain summary
        msg += `💰 Pemasukan: *${formatCurrency(thisMonth.income)}*\n`
        msg += `💸 Pengeluaran: *${formatCurrency(thisMonth.expense)}*\n`
        msg += `${thisMonth.net >= 0 ? "✅" : "⚠️"} Net: *${formatCurrency(thisMonth.net)}*`
      }

      msg += `\n\n_Lihat detail di dashboard →_ /start`

      await sendTelegramMessage(u.telegramId, msg, { parseMode: "Markdown" })

      // Create in-app notification
      await db.insert(notification).values({
        id: generateId(),
        userId: u.id,
        kind: "system",
        title: `Laporan Bulanan ${thisMonth.label}`,
        body: aiData?.review ?? `Pengeluaran ${formatCurrency(thisMonth.expense)}, pemasukan ${formatCurrency(thisMonth.income)}.`,
      })

      sent++
    } catch {
      // Skip users that fail
    }
  }

  return NextResponse.json({ sent, total: telegramUsers.length })
}
