import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { transaction, walletAccount, notification } from "@/lib/schema"
import { eq, and, desc, sql } from "drizzle-orm"
import { requireAuth, generateId } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get("limit") ?? 100)

  const rows = await db
    .select()
    .from(transaction)
    .where(eq(transaction.userId, session.user.id))
    .orderBy(desc(transaction.transactionDate))
    .limit(limit)

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const body = await request.json()
  const { walletAccountId, amount, type, category, description, transactionDate, source = "manual" } = body

  if (!walletAccountId || !amount || !type || !category || !description || !transactionDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const [created] = await db
    .insert(transaction)
    .values({ id: generateId(), userId: session.user.id, walletAccountId, amount: Number(amount), type, category, description, transactionDate, source })
    .returning()

  const delta = type === "income" ? Number(amount) : -Number(amount)
  await db
    .update(walletAccount)
    .set({ balance: sql`${walletAccount.balance} + ${delta}` })
    .where(eq(walletAccount.id, walletAccountId))

  await db
    .insert(notification)
    .values({
      id: generateId(),
      userId: session.user.id,
      kind: "transaction_added",
      title: type === "income" ? "Pemasukan Dicatat" : "Pengeluaran Dicatat",
      body: `${description} — ${type === "income" ? "Pemasukan" : "Pengeluaran"} berhasil dicatat.`,
      isRead: false,
    })

  return NextResponse.json(created, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  await db
    .delete(transaction)
    .where(and(eq(transaction.id, id), eq(transaction.userId, session.user.id)))

  return NextResponse.json({ success: true })
}
