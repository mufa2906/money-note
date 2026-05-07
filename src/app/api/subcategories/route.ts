import { NextRequest, NextResponse } from "next/server"
import { db, dbClient } from "@/lib/db"
import { userSubcategory } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { requireAuth, generateId } from "@/lib/api-auth"
import { DEFAULT_SUBCATEGORIES } from "@/lib/subcategory-defaults"

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
