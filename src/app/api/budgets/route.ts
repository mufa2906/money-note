import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { budget } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { requireAuth, generateId } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const rows = await db
    .select()
    .from(budget)
    .where(eq(budget.userId, session.user.id))

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const body = await request.json()
  const { category, amount } = body

  if (!category || !amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "category and amount are required" }, { status: 400 })
  }

  const [existing] = await db
    .select()
    .from(budget)
    .where(and(eq(budget.userId, session.user.id), eq(budget.category, category)))
    .limit(1)

  if (existing) {
    return NextResponse.json({ error: "Budget untuk kategori ini sudah ada" }, { status: 409 })
  }

  const [created] = await db
    .insert(budget)
    .values({ id: generateId(), userId: session.user.id, category, amount: Number(amount) })
    .returning()

  return NextResponse.json(created, { status: 201 })
}
