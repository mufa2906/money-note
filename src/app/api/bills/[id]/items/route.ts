import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { bill, billItem } from "@/lib/schema"
import { requireAuth, generateId } from "@/lib/api-auth"

async function ownsBill(billId: string, userId: string) {
  const [b] = await db.select({ id: bill.id }).from(bill).where(and(eq(bill.id, billId), eq(bill.userId, userId))).limit(1)
  return !!b
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(request)
  if (error) return error
  const { id } = await params
  if (!(await ownsBill(id, session.user.id))) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })

  const existing = await db.select({ position: billItem.position }).from(billItem).where(eq(billItem.billId, id))
  const nextPos = existing.length ? Math.max(...existing.map((e) => e.position)) + 1 : 0

  const [created] = await db
    .insert(billItem)
    .values({
      id: generateId(),
      billId: id,
      name,
      price: Number(body?.price) || 0,
      qty: Math.max(1, Math.floor(Number(body?.qty) || 1)),
      position: nextPos,
    })
    .returning()

  return NextResponse.json(created, { status: 201 })
}
