import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { bill, billItem, billItemAssignment, billParticipant } from "@/lib/schema"
import { requireAuth } from "@/lib/api-auth"

async function loadOwnedItem(itemId: string, userId: string) {
  const [row] = await db
    .select({ item: billItem, billId: bill.id })
    .from(billItem)
    .innerJoin(bill, eq(billItem.billId, bill.id))
    .where(and(eq(billItem.id, itemId), eq(bill.userId, userId)))
    .limit(1)
  return row ?? null
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(request)
  if (error) return error
  const { id } = await params

  const owned = await loadOwnedItem(id, session.user.id)
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}
  if (typeof body?.name === "string" && body.name.trim()) updates.name = body.name.trim()
  if (body?.price !== undefined) updates.price = Number(body.price) || 0
  if (body?.qty !== undefined) updates.qty = Math.max(1, Math.floor(Number(body.qty) || 1))

  if (Object.keys(updates).length) {
    await db.update(billItem).set(updates).where(eq(billItem.id, id))
  }

  if (Array.isArray(body?.participantIds)) {
    const validParticipants = await db
      .select({ id: billParticipant.id })
      .from(billParticipant)
      .where(eq(billParticipant.billId, owned.billId))
    const validSet = new Set(validParticipants.map((p) => p.id))
    const filtered = (body.participantIds as unknown[]).filter((p): p is string => typeof p === "string" && validSet.has(p))

    await db.delete(billItemAssignment).where(eq(billItemAssignment.itemId, id))
    if (filtered.length) {
      await db.insert(billItemAssignment).values(filtered.map((pid) => ({ itemId: id, participantId: pid })))
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(request)
  if (error) return error
  const { id } = await params

  const owned = await loadOwnedItem(id, session.user.id)
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await db.delete(billItem).where(eq(billItem.id, id))
  return NextResponse.json({ success: true })
}
