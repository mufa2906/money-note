import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { budget } from "@/lib/schema"
import { eq, and, sql } from "drizzle-orm"
import { requireAuth } from "@/lib/api-auth"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { amount } = body

  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "amount is required" }, { status: 400 })
  }

  const [updated] = await db
    .update(budget)
    .set({ amount: Number(amount), updatedAt: sql`(unixepoch())` })
    .where(and(eq(budget.id, id), eq(budget.userId, session.user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const { id } = await params

  await db.delete(budget).where(and(eq(budget.id, id), eq(budget.userId, session.user.id)))

  return NextResponse.json({ success: true })
}
