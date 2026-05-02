import { NextRequest, NextResponse } from "next/server"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { bill, billItem, billParticipant, billItemAssignment } from "@/lib/schema"
import { requireAuth } from "@/lib/api-auth"

async function loadBill(billId: string, userId: string) {
  const [b] = await db
    .select()
    .from(bill)
    .where(and(eq(bill.id, billId), eq(bill.userId, userId)))
    .limit(1)
  return b ?? null
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(request)
  if (error) return error
  const { id } = await params

  const b = await loadBill(id, session.user.id)
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const items = await db.select().from(billItem).where(eq(billItem.billId, id)).orderBy(billItem.position)
  const participants = await db.select().from(billParticipant).where(eq(billParticipant.billId, id))

  const itemIds = items.map((i) => i.id)
  const assignments = itemIds.length
    ? await db.select().from(billItemAssignment).where(inArray(billItemAssignment.itemId, itemIds))
    : []

  const assignmentsByItem = new Map<string, string[]>()
  for (const a of assignments) {
    const arr = assignmentsByItem.get(a.itemId) ?? []
    arr.push(a.participantId)
    assignmentsByItem.set(a.itemId, arr)
  }

  return NextResponse.json({
    ...b,
    items: items.map((i) => ({ ...i, participantIds: assignmentsByItem.get(i.id) ?? [] })),
    participants,
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(request)
  if (error) return error
  const { id } = await params

  const b = await loadBill(id, session.user.id)
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (typeof body?.title === "string" && body.title.trim()) updates.title = body.title.trim()
  if (body?.serviceCharge !== undefined) updates.serviceCharge = Number(body.serviceCharge) || 0
  if (body?.tax !== undefined) updates.tax = Number(body.tax) || 0
  if (body?.photoUrl !== undefined) updates.photoUrl = body.photoUrl ?? null

  const [updated] = await db.update(bill).set(updates).where(eq(bill.id, id)).returning()
  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(request)
  if (error) return error
  const { id } = await params

  const b = await loadBill(id, session.user.id)
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await db.delete(bill).where(eq(bill.id, id))
  return NextResponse.json({ success: true })
}
