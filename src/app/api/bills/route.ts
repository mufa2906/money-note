import { NextRequest, NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { bill } from "@/lib/schema"
import { requireAuth, generateId } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const rows = await db
    .select()
    .from(bill)
    .where(eq(bill.userId, session.user.id))
    .orderBy(desc(bill.createdAt))

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const body = await request.json().catch(() => null)
  const title = typeof body?.title === "string" ? body.title.trim() : ""
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 })

  const [created] = await db
    .insert(bill)
    .values({
      id: generateId(),
      userId: session.user.id,
      title,
      photoUrl: typeof body?.photoUrl === "string" ? body.photoUrl : null,
      serviceCharge: Number(body?.serviceCharge) || 0,
      tax: Number(body?.tax) || 0,
    })
    .returning()

  return NextResponse.json(created, { status: 201 })
}
