import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { walletAccount } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireAuth, generateId } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const accounts = await db
    .select()
    .from(walletAccount)
    .where(eq(walletAccount.userId, session.user.id))

  return NextResponse.json(accounts)
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const body = await request.json()
  const { accountType, accountName, balance = 0, color = "#3b82f6", icon = "Wallet" } = body

  if (!accountType || !accountName) {
    return NextResponse.json({ error: "accountType and accountName are required" }, { status: 400 })
  }

  const [created] = await db
    .insert(walletAccount)
    .values({ id: generateId(), userId: session.user.id, accountType, accountName, balance, color, icon })
    .returning()

  return NextResponse.json(created, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const [updated] = await db
    .update(walletAccount)
    .set(updates)
    .where(eq(walletAccount.id, id))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  await db.delete(walletAccount).where(eq(walletAccount.id, id))
  return NextResponse.json({ success: true })
}
