import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

const GEMINI_MODEL = "gemini-2.5-flash"
const GEMINI_API = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const VALID_CATEGORIES = ["makanan", "transportasi", "belanja", "hiburan", "tagihan", "kesehatan", "pendidikan", "gaji", "lainnya"]

export async function POST(request: NextRequest) {
  const { error } = await requireAuth(request)
  if (error) return error

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 503 })

  const body = await request.json()
  const text: string = body?.text ?? ""
  const accounts: { id: string; name: string }[] = body?.accounts ?? []

  if (!text.trim()) return NextResponse.json({ error: "Text required" }, { status: 400 })

  const accountList = accounts.map((a) => `"${a.name}" (id: ${a.id})`).join(", ")

  const prompt = `Ekstrak informasi transaksi keuangan dari teks berikut dan kembalikan sebagai JSON.

Teks: "${text}"

Akun tersedia: ${accountList || "tidak ada"}

Output JSON (WAJIB semua field ada):
{"description":"...","amount":10000,"type":"expense","category":"makanan","walletAccountId":null}

Contoh konversi:
- "popmie 10rb" → {"description":"popmie","amount":10000,"type":"expense","category":"makanan","walletAccountId":null}
- "gaji 3jt BCA" → {"description":"gaji","amount":3000000,"type":"income","category":"gaji","walletAccountId":"<id BCA jika ada>"}
- "bensin 50k" → {"description":"bensin","amount":50000,"type":"expense","category":"transportasi","walletAccountId":null}
- "netflix 54000" → {"description":"netflix","amount":54000,"type":"expense","category":"hiburan","walletAccountId":null}

Aturan amount: rb/ribu/k=×1000, jt/juta=×1000000. amount HARUS number bukan string.
Aturan category: makanan|transportasi|belanja|hiburan|tagihan|kesehatan|pendidikan|gaji|lainnya
Aturan walletAccountId: cocokkan nama akun dari teks, atau null.`

  try {
    const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 150 },
      }),
    })

    if (!res.ok) return NextResponse.json({ error: "AI error" }, { status: 502 })

    const data = await res.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!raw) return NextResponse.json({ error: "No response" }, { status: 502 })

    const parsed = JSON.parse(raw)

    // Parse amount — Gemini sometimes returns string instead of number
    let amount: string | null = null
    if (typeof parsed.amount === "number" && parsed.amount > 0) {
      amount = String(Math.round(parsed.amount))
    } else if (typeof parsed.amount === "string" && parsed.amount.trim()) {
      const num = parseInt(parsed.amount.replace(/[^0-9]/g, ""), 10)
      if (!isNaN(num) && num > 0) amount = String(num)
    }
    // Fallback: try regex on original text if AI missed it
    if (!amount) {
      const match = text.match(/(\d[\d.,]*)\s*(rb|ribu|k|jt|juta|m|000)?/i)
      if (match) {
        let num = parseFloat(match[1].replace(/[.,]/g, ""))
        const unit = (match[2] ?? "").toLowerCase()
        if (unit === "rb" || unit === "ribu" || unit === "k") num *= 1000
        else if (unit === "jt" || unit === "juta" || unit === "m") num *= 1000000
        else if (num < 1000 && !unit) num *= 1000
        if (num > 0) amount = String(Math.round(num))
      }
    }

    // Validate and sanitize
    const result = {
      description: typeof parsed.description === "string" ? parsed.description : text,
      amount,
      type: parsed.type === "income" ? "income" : "expense",
      category: VALID_CATEGORIES.includes(parsed.category) ? parsed.category : "lainnya",
      walletAccountId: typeof parsed.walletAccountId === "string" ? parsed.walletAccountId : null,
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Parse failed" }, { status: 502 })
  }
}
