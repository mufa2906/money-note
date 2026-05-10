import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { callGeminiVision } from "@/lib/gemini"

const PROMPT = `Kamu adalah asisten yang membaca foto struk pembelian (Indonesia). Ekstrak data dari struk dan kembalikan HANYA JSON valid (tanpa markdown, tanpa penjelasan) dengan format:
{
  "title": "nama tempat / restoran / toko",
  "items": [
    { "name": "nama menu", "price": <harga satuan SETELAH diskon, integer>, "originalPrice": <harga satuan SEBELUM diskon, integer atau null jika tidak ada diskon>, "qty": <jumlah, integer minimal 1> }
  ],
  "charges": [
    { "name": "nama biaya tambahan", "amount": <nominal dalam Rupiah, integer> }
  ]
}

Aturan untuk "items":
- price = harga satuan SETELAH diskon (nett). Jika ada diskon/promo pada item tersebut (tertulis di baris bawahnya atau di kolom diskon), kurangkan dari harga asli sebelum dibagi qty.
- originalPrice = harga satuan SEBELUM diskon. Isi hanya jika ada diskon/promo pada item tersebut. Jika tidak ada diskon, isi null.
- Jika struk menunjukkan total per baris (qty × harga), bagi total dengan qty untuk mendapat harga satuan.
- Jika tidak ada qty, asumsikan qty = 1.
- Masukkan semua item makanan/minuman/produk ke "items". JANGAN masukkan subtotal, total, kembalian, tunai, atau biaya tambahan.

Aturan untuk "charges":
- "charges" berisi biaya yang BENAR-BENAR DITAMBAHKAN ke total tagihan: service charge, PPN (yang dipungut/dikenakan), PB1, biaya kemasan, biaya admin, donasi, dll.
- JANGAN masukkan baris PPN yang bersifat INFORMATIF saja dan TIDAK menambah total: "PPN DIBEBASKAN", "PPN BEBAS", "PPN TIDAK DIPUNGUT", "PPN 0%", atau baris PPN dengan keterangan "dibebaskan/bebas/tidak dipungut". Baris ini hanya pemberitahuan, bukan biaya.
- Pakai nama persis seperti tertulis di struk (misal "Service Charge", "PPN 11%", "PB1", "Kemasan").
- Kalau tidak ada biaya tambahan yang nyata, "charges": [].
- Semua nominal dalam Rupiah utuh (tanpa desimal).
- Jika tidak yakin, kembalikan items: [].`

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
    console.error("Gemini bills OCR failed:", e)
    return NextResponse.json({ error: "OCR gagal. Coba foto yang lebih jelas." }, { status: 502 })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(textPart)
  } catch {
    return NextResponse.json({ error: "Gagal parse hasil OCR." }, { status: 502 })
  }

  const p = parsed as Record<string, unknown>
  const items = Array.isArray(p?.items)
    ? p.items
        .map((i: unknown) => {
          const it = i as Record<string, unknown>
          const name = typeof it?.name === "string" ? it.name.trim() : ""
          const price = Number(it?.price)
          const qty = Math.max(1, Math.floor(Number(it?.qty) || 1))
          if (!name || !Number.isFinite(price) || price <= 0) return null
          const rawOriginal = Number(it?.originalPrice)
          const originalPrice = Number.isFinite(rawOriginal) && rawOriginal > price ? rawOriginal : null
          return { name, price, originalPrice, qty }
        })
        .filter((x): x is { name: string; price: number; originalPrice: number | null; qty: number } => x !== null)
    : []

  const charges = Array.isArray(p?.charges)
    ? p.charges
        .map((c: unknown) => {
          const obj = c as Record<string, unknown>
          const name = typeof obj?.name === "string" ? obj.name.trim() : ""
          const amount = Number(obj?.amount)
          if (!name || !Number.isFinite(amount) || amount <= 0) return null
          return { name, amount }
        })
        .filter((x): x is { name: string; amount: number } => x !== null)
    : []

  // Backwards compat: if old keys still come through, fold them in
  if (Number.isFinite(Number(p?.serviceCharge)) && Number(p?.serviceCharge) > 0) {
    charges.push({ name: "Service Charge", amount: Number(p.serviceCharge) })
  }
  if (Number.isFinite(Number(p?.tax)) && Number(p?.tax) > 0) {
    charges.push({ name: "PPN", amount: Number(p.tax) })
  }

  return NextResponse.json({
    title: typeof p?.title === "string" ? p.title : "",
    items,
    charges,
  })
}
