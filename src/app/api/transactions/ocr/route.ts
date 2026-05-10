import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { callGeminiVision } from "@/lib/gemini"

const PROMPT = `Kamu adalah asisten yang membaca foto struk/nota pembelian (Indonesia). Ekstrak data transaksi dari struk dan kembalikan HANYA JSON valid (tanpa markdown, tanpa penjelasan) dengan format:
{
  "amount": <total tagihan dalam Rupiah, integer>,
  "date": "<tanggal transaksi format YYYY-MM-DD, atau null jika tidak ditemukan>",
  "description": "<nama toko/merchant/tempat>",
  "type": "expense",
  "category": "<kategori yang paling cocok>"
}

Aturan:
- amount: Ambil nilai TOTAL yang harus dibayar (setelah pajak/service charge). Integer, tanpa desimal. Jika tidak ditemukan, gunakan 0.
- date: Format YYYY-MM-DD. Jika tidak ada tanggal di struk, kembalikan null.
- description: Nama toko, restoran, merchant, atau sumber transaksi. Jika tidak ada, gunakan "Tidak diketahui".
- type: Hampir selalu "expense" untuk struk pembelian.
- category: Pilih satu dari: makanan, transportasi, belanja, hiburan, kesehatan, pendidikan, tagihan, investasi, dll. Pilih yang paling cocok berdasarkan isi struk.`

export async function POST(request: NextRequest) {
  const { error } = await requireAuth(request)
  if (error) return error

  const body = await request.json().catch(() => null)
  const image = typeof body?.image === "string" ? body.image : null
  const mimeType = typeof body?.mimeType === "string" && body.mimeType.startsWith("image/") ? body.mimeType : "image/jpeg"
  if (!image) return NextResponse.json({ error: "image required (base64)" }, { status: 400 })

  let textPart: string
  try {
    textPart = await callGeminiVision(PROMPT, image, mimeType)
  } catch (e) {
    console.error("Gemini transaction OCR failed:", e)
    return NextResponse.json({ error: "OCR gagal. Coba foto yang lebih jelas." }, { status: 502 })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(textPart)
  } catch {
    return NextResponse.json({ error: "Gagal parse hasil OCR." }, { status: 502 })
  }

  const p = parsed as Record<string, unknown>
  const amount = Number(p?.amount)
  const description = typeof p?.description === "string" && p.description.trim() ? p.description.trim() : "Tidak diketahui"
  const type = p?.type === "income" ? "income" : "expense"
  const category = typeof p?.category === "string" && p.category.trim() ? p.category.trim() : "dll"
  const date = typeof p?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : null

  return NextResponse.json({
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    date,
    description,
    type,
    category,
  })
}
