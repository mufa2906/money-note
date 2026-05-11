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

  const prompt = `Parse teks transaksi keuangan Indonesia berikut menjadi JSON terstruktur.

Teks: "${text}"

Daftar akun yang tersedia: ${accountList || "tidak ada"}

Kembalikan JSON dengan format ini:
{
  "description": "deskripsi transaksi (wajib)",
  "amount": 25000,
  "type": "expense",
  "category": "makanan",
  "walletAccountId": "id-akun-jika-disebutkan-atau-null"
}

Aturan:
- amount: angka tanpa format. "25rb" = 25000, "1.5jt" = 1500000, "500k" = 500000
- type: "expense" untuk pengeluaran (default), "income" untuk pemasukan
- category: pilih dari: makanan, transportasi, belanja, hiburan, tagihan, kesehatan, pendidikan, gaji, lainnya
- walletAccountId: cocokkan nama akun dari teks dengan daftar akun di atas (case-insensitive), atau null jika tidak disebutkan
- Jika amount tidak ditemukan, set null
- Balas HANYA JSON, tanpa penjelasan`

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

    // Validate and sanitize
    const result = {
      description: typeof parsed.description === "string" ? parsed.description : text,
      amount: typeof parsed.amount === "number" && parsed.amount > 0 ? String(parsed.amount) : null,
      type: parsed.type === "income" ? "income" : "expense",
      category: VALID_CATEGORIES.includes(parsed.category) ? parsed.category : "lainnya",
      walletAccountId: typeof parsed.walletAccountId === "string" ? parsed.walletAccountId : null,
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Parse failed" }, { status: 502 })
  }
}
