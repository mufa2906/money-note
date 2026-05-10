import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { extractOcrImage, callGeminiOcr } from "@/lib/gemini"

const PROMPT = `Kamu adalah asisten yang membaca foto struk/nota pembelian (Indonesia). Ekstrak data transaksi dari struk dan kembalikan HANYA JSON valid (tanpa markdown, tanpa penjelasan) dengan format:
{
  "amount": <total tagihan dalam Rupiah, integer>,
  "date": "<tanggal transaksi format YYYY-MM-DD, atau null jika tidak ditemukan>",
  "merchant": "<nama toko/merchant/tempat>",
  "items": ["<nama item 1>", "<nama item 2>"],
  "type": "expense",
  "category": "<kategori yang paling cocok>"
}

Aturan:
- amount: Ambil nilai TOTAL yang harus dibayar (setelah pajak/service charge). Integer, tanpa desimal. Jika tidak ditemukan, gunakan 0.
- date: Format YYYY-MM-DD. Jika tidak ada tanggal di struk, kembalikan null.
- merchant: Nama toko, restoran, atau merchant. Jika tidak ada, gunakan "Tidak diketahui".
- items: Daftar nama item/produk yang dibeli (maks 5 item paling utama, hanya nama tanpa harga/qty). Jika tidak ada item yang jelas, kembalikan array kosong [].
- type: Hampir selalu "expense" untuk struk pembelian.
- category: Pilih satu dari: makanan, transportasi, belanja, hiburan, kesehatan, pendidikan, tagihan, lainnya. Pilih yang paling cocok berdasarkan isi struk.`

export async function POST(request: NextRequest) {
  const { error } = await requireAuth(request)
  if (error) return error

  const body = await request.json().catch(() => null)
  const img = extractOcrImage(body)
  if (!img) return NextResponse.json({ error: "image required (base64)" }, { status: 400 })

  const result = await callGeminiOcr(PROMPT, img.image, img.mimeType, "Gemini transaction")
  if (!result.ok) return result.response

  const p = result.data as Record<string, unknown>
  const amount = Number(p?.amount)
  const merchant = typeof p?.merchant === "string" && p.merchant.trim() ? p.merchant.trim() : "Tidak diketahui"
  const items = Array.isArray(p?.items) ? (p.items as unknown[]).filter((i): i is string => typeof i === "string" && i.trim().length > 0).slice(0, 5) : []
  const description = items.length > 0 ? `${merchant}: ${items.join(", ")}` : merchant
  const type = p?.type === "income" ? "income" : "expense"
  const category = typeof p?.category === "string" && p.category.trim() ? p.category.trim() : "lainnya"
  const date = typeof p?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : null

  return NextResponse.json({
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    date,
    description,
    type,
    category,
  })
}
