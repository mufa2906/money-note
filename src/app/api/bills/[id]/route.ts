import { NextRequest, NextResponse } from "next/server"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { bill, billItem, billParticipant, billItemAssignment } from "@/lib/schema"
import { requireAuth } from "@/lib/api-auth"
import { parseDbCharges, sanitizeCharges, parsePaymentInfo } from "@/lib/bill-utils"

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
    id: b.id,
    userId: b.userId,
    title: b.title,
    description: b.description ?? null,
    paymentInfo: parsePaymentInfo(b.paymentInfo),
    photoUrl: b.photoUrl,
    charges: parseDbCharges(b),
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
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
  if (body?.description !== undefined) updates.description = typeof body.description === "string" ? body.description.trim() || null : null
  if (body?.paymentInfo !== undefined) {
    if (body.paymentInfo === null) {
      updates.paymentInfo = null
    } else if (typeof body.paymentInfo === "object") {
      const { method, account, accountName } = body.paymentInfo as Record<string, unknown>
      if (typeof method === "string" && typeof account === "string" && typeof accountName === "string") {
        updates.paymentInfo = JSON.stringify({ method: method.trim(), account: account.trim(), accountName: accountName.trim() })
      }
    }
  }
  if (body?.photoUrl !== undefined) updates.photoUrl = body.photoUrl ?? null
  if (body?.charges !== undefined) {
    if (!Array.isArray(body.charges)) return NextResponse.json({ error: "charges must be an array" }, { status: 400 })
    updates.charges = JSON.stringify(sanitizeCharges(body.charges))
    updates.serviceCharge = 0
    updates.tax = 0
  }

  await db.update(bill).set(updates).where(eq(bill.id, id))
  return NextResponse.json({ success: true })
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
