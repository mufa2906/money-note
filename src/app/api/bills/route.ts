import { NextRequest, NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { bill } from "@/lib/schema"
import { requireAuth, generateId } from "@/lib/api-auth"
import type { BillCharge } from "@/types"

function sanitizeCharges(input: unknown): BillCharge[] {
  if (!Array.isArray(input)) return []
  return input
    .map((c: unknown) => {
      const obj = c as Record<string, unknown>
      const name = typeof obj?.name === "string" ? obj.name.trim() : ""
      const amount = Number(obj?.amount)
      if (!name || !Number.isFinite(amount)) return null
      return { name, amount }
    })
    .filter((c): c is BillCharge => c !== null)
}

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const rows = await db
    .select()
    .from(bill)
    .where(eq(bill.userId, session.user.id))
    .orderBy(desc(bill.createdAt))

  return NextResponse.json(
    rows.map((b) => {
      let charges: BillCharge[] = []
      if (b.charges) {
        try {
          const parsed = JSON.parse(b.charges)
          if (Array.isArray(parsed)) charges = parsed.filter((c) => c?.name && Number.isFinite(c?.amount))
        } catch {
          // ignore
        }
      }
      if (charges.length === 0) {
        if (b.serviceCharge > 0) charges.push({ name: "Service Charge", amount: b.serviceCharge })
        if (b.tax > 0) charges.push({ name: "PPN", amount: b.tax })
      }
      return {
        id: b.id,
        userId: b.userId,
        title: b.title,
        description: b.description ?? null,
        photoUrl: b.photoUrl,
        charges,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      }
    }),
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
    })
    .returning()

  return NextResponse.json(created, { status: 201 })
}
