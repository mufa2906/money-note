import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

const GEMINI_MODEL = "gemini-2.5-flash"
const GEMINI_API = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  // Only for premium users
  const user = session.user as { subscriptionTier?: string }
  if (user.subscriptionTier === "free") {
    return NextResponse.json({ error: "Premium feature" }, { status: 403 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 503 })

  const body = await request.json()
  const { thisMonth, lastMonth, catBreakdown, budgets, savingRate, monthName } = body

  const prompt = `Kamu adalah konsultan keuangan pribadi yang ramah dan empatik. Analisis data keuangan pengguna bulan ${monthName} berikut dan berikan insight mendalam dalam Bahasa Indonesia yang natural dan personal.

DATA KEUANGAN:
- Pemasukan bulan ini: Rp${thisMonth.income.toLocaleString("id-ID")}
- Pengeluaran bulan ini: Rp${thisMonth.expense.toLocaleString("id-ID")}
- Saldo bersih: Rp${thisMonth.net.toLocaleString("id-ID")}
- Tingkat tabungan: ${savingRate.toFixed(1)}%
- Pemasukan bulan lalu: Rp${lastMonth.income.toLocaleString("id-ID")}
- Pengeluaran bulan lalu: Rp${lastMonth.expense.toLocaleString("id-ID")}

BREAKDOWN KATEGORI (pengeluaran terbesar):
${catBreakdown.slice(0, 5).map((c: {name: string; amount: number; pct: number; change: number | null}) =>
  `- ${c.name}: Rp${c.amount.toLocaleString("id-ID")} (${c.pct.toFixed(0)}% dari total pengeluaran${c.change !== null ? `, ${c.change > 0 ? "naik" : "turun"} ${Math.abs(c.change).toFixed(0)}% vs bln lalu` : ""})`
).join("\n")}

STATUS BUDGET:
${budgets.length > 0 ? budgets.map((b: {category: string; spent: number; limit: number; pct: number}) =>
  `- ${b.category}: ${b.pct.toFixed(0)}% terpakai (Rp${b.spent.toLocaleString("id-ID")} dari Rp${b.limit.toLocaleString("id-ID")})`
).join("\n") : "Belum ada budget yang diset."}

Berikan analisis dalam format JSON dengan struktur TEPAT seperti ini:
{
  "summary": "1-2 kalimat pembuka yang personal dan menyebutkan kondisi keuangan bulan ini",
  "highlights": ["insight positif atau pencapaian yang menonjol (maks 2 poin)"],
  "warnings": ["peringatan atau hal yang perlu diperhatikan (maks 2 poin)"],
  "tips": ["saran konkret dan actionable yang bisa langsung dilakukan (maks 3 poin)"],
  "prediction": "prediksi 1 kalimat jika pola pengeluaran ini berlanjut bulan depan"
}

Gunakan nada yang supportif, tidak menghakimi, dan berikan angka Rupiah yang spesifik saat relevan.`

  const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: "AI gagal merespon" }, { status: 502 })
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return NextResponse.json({ error: "AI tidak menghasilkan respons" }, { status: 502 })

  try {
    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: "Gagal parse respons AI" }, { status: 502 })
  }
}
