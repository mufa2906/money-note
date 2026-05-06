import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { userCategory, transaction } from "@/lib/schema"
import { eq, and, count } from "drizzle-orm"
import { requireAuth, generateId } from "@/lib/api-auth"

const DEFAULT_CATEGORIES = [
  { name: "makanan", label: "Makanan", color: "#f97316", icon: "UtensilsCrossed", position: 0 },
  { name: "transportasi", label: "Transportasi", color: "#3b82f6", icon: "Car", position: 1 },
  { name: "belanja", label: "Belanja", color: "#a855f7", icon: "ShoppingBag", position: 2 },
  { name: "hiburan", label: "Hiburan", color: "#ec4899", icon: "Music", position: 3 },
  { name: "tagihan", label: "Tagihan", color: "#ef4444", icon: "FileText", position: 4 },
  { name: "kesehatan", label: "Kesehatan", color: "#22c55e", icon: "Heart", position: 5 },
  { name: "pendidikan", label: "Pendidikan", color: "#06b6d4", icon: "BookOpen", position: 6 },
  { name: "gaji", label: "Gaji", color: "#84cc16", icon: "Briefcase", position: 7 },
  { name: "lainnya", label: "Lainnya", color: "#78716c", icon: "MoreHorizontal", position: 8 },
]

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const existing = await db
    .select()
    .from(userCategory)
    .where(eq(userCategory.userId, session.user.id))
    .orderBy(userCategory.position, userCategory.createdAt)

  if (existing.length === 0) {
    const now = new Date()
    const toInsert = DEFAULT_CATEGORIES.map((c) => ({
      id: generateId(),
      userId: session.user.id,
      createdAt: now,
      ...c,
    }))
    await db.insert(userCategory).values(toInsert)
    // Return the inserted rows directly to avoid Turso read-replica lag
    return NextResponse.json(toInsert.map((r) => ({ ...r, createdAt: r.createdAt.getTime() })))
  }

  return NextResponse.json(existing)
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const { name, label, color, icon } = await request.json()
  if (!name || !label || !color || !icon) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const existing = await db
    .select()
    .from(userCategory)
    .where(eq(userCategory.userId, session.user.id))
  const maxPos = existing.reduce((m, c) => Math.max(m, c.position), -1)

  const [created] = await db
    .insert(userCategory)
    .values({ id: generateId(), userId: session.user.id, name, label, color, icon, position: maxPos + 1 })
    .returning()

  return NextResponse.json(created, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const { id, name, label, color, icon } = await request.json()
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const [existing] = await db
    .select()
    .from(userCategory)
    .where(and(eq(userCategory.id, id), eq(userCategory.userId, session.user.id)))
    .limit(1)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [updated] = await db
    .update(userCategory)
    .set({
      name: name ?? existing.name,
      label: label ?? existing.label,
      color: color ?? existing.color,
      icon: icon ?? existing.icon,
    })
    .where(eq(userCategory.id, id))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const [cat] = await db
    .select()
    .from(userCategory)
    .where(and(eq(userCategory.id, id), eq(userCategory.userId, session.user.id)))
    .limit(1)
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [{ value: txCount }] = await db
    .select({ value: count() })
    .from(transaction)
    .where(and(eq(transaction.userId, session.user.id), eq(transaction.category, cat.name)))

  if (txCount > 0) {
    return NextResponse.json(
      { error: `Kategori dipakai di ${txCount} transaksi. Pindahkan transaksi terlebih dahulu.` },
      { status: 409 }
    )
  }

  await db.delete(userCategory).where(eq(userCategory.id, id))
  return NextResponse.json({ success: true })
}
