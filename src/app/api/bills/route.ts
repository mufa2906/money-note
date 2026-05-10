import { NextRequest, NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { bill } from "@/lib/schema"
import { requireAuth, generateId } from "@/lib/api-auth"
import { parseDbCharges, sanitizeCharges, parsePaymentInfo } from "@/lib/bill-utils"

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const rows = await db
    .select()
    .from(bill)
    .where(eq(bill.userId, session.user.id))
    .orderBy(desc(bill.createdAt))

  return NextResponse.json(
    rows.map((b) => ({
      id: b.id,
      userId: b.userId,
      title: b.title,
      description: b.description ?? null,
      paymentInfo: parsePaymentInfo(b.paymentInfo),
      photoUrl: b.photoUrl,
      charges: parseDbCharges(b),
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    })),
  )
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const body = await request.json().catch(() => null)
  const title = typeof body?.title === "string" ? body.title.trim() : ""
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 })

  const description = typeof body?.description === "string" ? body.description.trim() || null : null
  const charges = sanitizeCharges(body?.charges)

  const [created] = await db
    .insert(bill)
    .values({
      id: generateId(),
      userId: session.user.id,
      title,
      description,
      photoUrl: typeof body?.photoUrl === "string" ? body.photoUrl : null,
      charges: JSON.stringify(charges),
      paymentInfo: null,
    })
    .returning()

  return NextResponse.json(created, { status: 201 })
}
