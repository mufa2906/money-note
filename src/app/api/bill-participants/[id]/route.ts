import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { bill, billParticipant } from "@/lib/schema"
import { requireAuth } from "@/lib/api-auth"

async function loadOwnedParticipant(participantId: string, userId: string) {
  const [row] = await db
    .select({ p: billParticipant })
    .from(billParticipant)
    .innerJoin(bill, eq(billParticipant.billId, bill.id))
    .where(and(eq(billParticipant.id, participantId), eq(bill.userId, userId)))
    .limit(1)
  return row ?? null
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(request)
  if (error) return error
  const { id } = await params

  const owned = await loadOwnedParticipant(id, session.user.id)
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}
  if (typeof body?.name === "string" && body.name.trim()) updates.name = body.name.trim()
  if (body?.contact !== undefined) updates.contact = body.contact?.trim() || null
  if (body?.status === "paid" || body?.status === "unpaid") updates.status = body.status

  if (Object.keys(updates).length) {
    await db.update(billParticipant).set(updates).where(eq(billParticipant.id, id))
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(request)
  if (error) return error
  const { id } = await params

  const owned = await loadOwnedParticipant(id, session.user.id)
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await db.delete(billParticipant).where(eq(billParticipant.id, id))
  return NextResponse.json({ success: true })
}
