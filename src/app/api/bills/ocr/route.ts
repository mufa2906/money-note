import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

const GEMINI_MODEL = "gemini-2.5-flash"
const GEMINI_API = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const PROMPT = `Kamu adalah asisten yang membaca foto struk pembelian (Indonesia). Ekstrak data dari struk dan kembalikan HANYA JSON valid (tanpa markdown, tanpa penjelasan) dengan format:
{
  "title": "nama tempat / restoran / toko",
  "items": [
    { "name": "nama menu", "price": <harga satuan dalam Rupiah, integer>, "qty": <jumlah, integer minimal 1> }
  ],
  "charges": [
    { "name": "nama biaya tambahan", "amount": <nominal dalam Rupiah, integer> }
  ]
}

Aturan:
- price = harga satuan, BUKAN total. Jika struk hanya menunjukkan total per baris (qty × harga), bagi total dengan qty.
- Jika tidak ada qty, asumsikan qty = 1.
- Hanya item makanan/produk di "items"; abaikan diskon, voucher, subtotal, total, kembalian, tunai.
- "charges" berisi semua biaya tambahan di luar harga item: service charge, PPN, PB1, biaya kemasan, biaya admin, dll. Pakai nama persis seperti tertulis di struk (misal "Service Charge", "PPN 11%", "PB1", "Kemasan").
- Kalau tidak ada biaya tambahan, "charges": [].
- Semua nominal dalam Rupiah utuh (tanpa desimal).
- Jika tidak yakin, kembalikan items: [].`

export async function POST(request: NextRequest) {
  const { error } = await requireAuth(request)
  if (error) return error

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 })

  const body = await request.json().catch(() => null)
  const image = typeof body?.image === "string" ? body.image : null
  const mimeType = typeof body?.mimeType === "string" && body.mimeType.startsWith("image/") ? body.mimeType : "image/jpeg"
  if (!image) return NextResponse.json({ error: "image required (base64)" }, { status: 400 })

  const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: PROMPT },
            { inlineData: { mimeType, data: image } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    console.error("Gemini OCR failed:", res.status, errBody)
    return NextResponse.json({ error: "OCR gagal. Coba foto yang lebih jelas." }, { status: 502 })
  }

  const data = await res.json()
  const textPart = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof textPart !== "string") {
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
          return { name, price, qty }
        })
        .filter((x): x is { name: string; price: number; qty: number } => x !== null)
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
