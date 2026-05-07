import { NextRequest, NextResponse } from "next/server"
import { db, dbClient } from "@/lib/db"
import { budget } from "@/lib/schema"
import { eq, and, isNull } from "drizzle-orm"
import { requireAuth, generateId } from "@/lib/api-auth"

let migrated = false
async function ensureMigrations() {
  if (migrated) return
  await dbClient.execute(`ALTER TABLE budget ADD COLUMN subcategory TEXT`).catch(() => {})
  migrated = true
}

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  await ensureMigrations()

  const rows = await db
    .select()
    .from(budget)
    .where(eq(budget.userId, session.user.id))

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  await ensureMigrations()

  const body = await request.json()
  const { category, subcategory, amount } = body
  const sub: string | null = subcategory ?? null

  if (!category || !amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "category and amount are required" }, { status: 400 })
  }

  const duplicateCheck = sub
    ? and(eq(budget.userId, session.user.id), eq(budget.category, category), eq(budget.subcategory, sub))
    : and(eq(budget.userId, session.user.id), eq(budget.category, category), isNull(budget.subcategory))

  const [existing] = await db.select().from(budget).where(duplicateCheck).limit(1)

  if (existing) {
    return NextResponse.json({ error: "Budget untuk kategori/subkategori ini sudah ada" }, { status: 409 })
  }

  const [created] = await db
    .insert(budget)
    .values({ id: generateId(), userId: session.user.id, category, subcategory: sub, amount: Number(amount) })
    .returning()

  return NextResponse.json(created, { status: 201 })
}
