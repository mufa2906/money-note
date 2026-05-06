import { NextRequest, NextResponse } from "next/server"
import { db, dbClient } from "@/lib/db"
import { userSubcategory } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { requireAuth, generateId } from "@/lib/api-auth"

// Default subcategories per category — seeded once, user can edit freely.
// "dll" is always last and acts as a catch-all.
export const DEFAULT_SUBCATEGORIES: Record<string, { name: string; label: string; position: number }[]> = {
  makanan: [
    { name: "makan_utama", label: "Makan Utama", position: 0 },
    { name: "camilan_minuman", label: "Camilan & Minuman", position: 1 },
    { name: "belanja_dapur", label: "Belanja Dapur", position: 2 },
    { name: "dll", label: "Dll", position: 3 },
  ],
  transportasi: [
    { name: "bbm", label: "BBM", position: 0 },
    { name: "parkir_tol", label: "Parkir & Tol", position: 1 },
    { name: "ojek_online", label: "Ojek/Taksi Online", position: 2 },
    { name: "servis", label: "Servis Kendaraan", position: 3 },
    { name: "dll", label: "Dll", position: 4 },
  ],
  belanja: [
    { name: "kebutuhan_rumah", label: "Kebutuhan Rumah", position: 0 },
    { name: "fashion", label: "Pakaian & Fashion", position: 1 },
    { name: "online_shop", label: "Online Shop", position: 2 },
    { name: "dll", label: "Dll", position: 3 },
  ],
  hiburan: [
    { name: "nongkrong", label: "Nongkrong", position: 0 },
    { name: "streaming", label: "Streaming & Langganan", position: 1 },
    { name: "liburan", label: "Liburan", position: 2 },
    { name: "dll", label: "Dll", position: 3 },
  ],
  tagihan: [
    { name: "listrik_air", label: "Listrik & Air", position: 0 },
    { name: "internet_hp", label: "Internet & HP", position: 1 },
    { name: "sewa_kpr", label: "Sewa / KPR", position: 2 },
    { name: "asuransi", label: "Asuransi", position: 3 },
    { name: "dll", label: "Dll", position: 4 },
  ],
  kesehatan: [
    { name: "dokter", label: "Dokter & Klinik", position: 0 },
    { name: "obat", label: "Obat & Apotek", position: 1 },
    { name: "olahraga", label: "Olahraga & Gym", position: 2 },
    { name: "dll", label: "Dll", position: 3 },
  ],
  pendidikan: [
    { name: "kursus", label: "Kursus & Les", position: 0 },
    { name: "buku_materi", label: "Buku & Materi", position: 1 },
    { name: "biaya_sekolah", label: "Biaya Sekolah/Kuliah", position: 2 },
    { name: "dll", label: "Dll", position: 3 },
  ],
  gaji: [
    { name: "gaji_pokok", label: "Gaji Pokok", position: 0 },
    { name: "freelance", label: "Freelance & Proyek", position: 1 },
    { name: "bonus_thr", label: "Bonus & THR", position: 2 },
    { name: "dll", label: "Dll", position: 3 },
  ],
  lainnya: [
    { name: "donasi", label: "Donasi & Sedekah", position: 0 },
    { name: "tabungan", label: "Tabungan", position: 1 },
    { name: "investasi", label: "Investasi", position: 2 },
    { name: "dll", label: "Dll", position: 3 },
  ],
}

async function ensureTable() {
  await dbClient.execute(
    `CREATE TABLE IF NOT EXISTS user_subcategory (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      category_name TEXT NOT NULL,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`
  )
}

async function seedDefaults(userId: string, categoryNames: string[]) {
  const now = new Date()
  const rows = categoryNames.flatMap((catName) => {
    const subs = DEFAULT_SUBCATEGORIES[catName]
    if (!subs) return []
    return subs.map((s) => ({ id: generateId(), userId, categoryName: catName, ...s, createdAt: now }))
  })
  if (rows.length > 0) {
    await db.insert(userSubcategory).values(rows)
  }
  return rows
}

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  await ensureTable()

  const existing = await db
    .select()
    .from(userSubcategory)
    .where(eq(userSubcategory.userId, session.user.id))
    .orderBy(userSubcategory.categoryName, userSubcategory.position)

  if (existing.length === 0) {
    const seeded = await seedDefaults(session.user.id, Object.keys(DEFAULT_SUBCATEGORIES))
    return NextResponse.json(seeded.map((r) => ({ ...r, createdAt: r.createdAt.getTime() })))
  }

  return NextResponse.json(existing)
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const { categoryName, name, label } = await request.json()
  if (!categoryName || !name || !label) {
    return NextResponse.json({ error: "categoryName, name, label required" }, { status: 400 })
  }

  await ensureTable()

  const existing = await db
    .select()
    .from(userSubcategory)
    .where(and(eq(userSubcategory.userId, session.user.id), eq(userSubcategory.categoryName, categoryName)))

  // Insert before "dll" if it exists, otherwise at end
  const dllIndex = existing.findIndex((s) => s.name === "dll")
  const insertPos = dllIndex >= 0 ? dllIndex : existing.length

  // Shift dll position up if needed
  if (dllIndex >= 0) {
    const dll = existing[dllIndex]
    await db
      .update(userSubcategory)
      .set({ position: dll.position + 1 })
      .where(eq(userSubcategory.id, dll.id))
  }

  const [created] = await db
    .insert(userSubcategory)
    .values({ id: generateId(), userId: session.user.id, categoryName, name, label, position: insertPos })
    .returning()

  return NextResponse.json(created, { status: 201 })
}
