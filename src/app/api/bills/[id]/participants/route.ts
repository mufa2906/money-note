import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { billParticipant } from "@/lib/schema"
import { requireAuth, generateId } from "@/lib/api-auth"
import { ownsBill } from "@/lib/bill-db"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(request)
  if (error) return error
  const { id } = await params
  if (!(await ownsBill(id, session.user.id))) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })

  const [created] = await db
    .insert(billParticipant)
    .values({
      id: generateId(),
      billId: id,
      name,
      contact: typeof body?.contact === "string" && body.contact.trim() ? body.contact.trim() : null,
    })
    .returning()

  return NextResponse.json(created, { status: 201 })
}
