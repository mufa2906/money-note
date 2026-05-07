import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { userSubcategory } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { requireAuth } from "@/lib/api-auth"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const { id } = await params
  const { label } = await request.json()
  if (!label) return NextResponse.json({ error: "label required" }, { status: 400 })

  const [existing] = await db
    .select()
    .from(userSubcategory)
    .where(and(eq(userSubcategory.id, id), eq(userSubcategory.userId, session.user.id)))
    .limit(1)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [updated] = await db
    .update(userSubcategory)
    .set({ label })
    .where(eq(userSubcategory.id, id))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const { id } = await params

  const [existing] = await db
    .select()
    .from(userSubcategory)
    .where(and(eq(userSubcategory.id, id), eq(userSubcategory.userId, session.user.id)))
    .limit(1)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // "dll" is a protected catch-all — cannot be deleted
  if (existing.name === "dll") {
    return NextResponse.json({ error: "Subkategori 'Dll' tidak bisa dihapus." }, { status: 403 })
  }

  await db.delete(userSubcategory).where(eq(userSubcategory.id, id))
  return NextResponse.json({ success: true })
}
