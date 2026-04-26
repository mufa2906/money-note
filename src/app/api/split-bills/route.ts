import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { splitBill, transaction } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { requireAuth, generateId } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const rows = await db
    .select({
      id: splitBill.id,
      transactionId: splitBill.transactionId,
      transactionDescription: transaction.description,
      totalAmount: transaction.amount,
      targetName: splitBill.targetName,
      targetContact: splitBill.targetContact,
      splitAmount: splitBill.splitAmount,
      status: splitBill.status,
      createdAt: splitBill.createdAt,
    })
    .from(splitBill)
    .innerJoin(transaction, eq(splitBill.transactionId, transaction.id))
    .where(eq(transaction.userId, session.user.id))

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const body = await request.json()
  const { transactionId, targetName, targetContact, splitAmount } = body

  if (!transactionId || !targetName || !splitAmount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Verify the transaction belongs to the authenticated user
  const [txn] = await db
    .select()
    .from(transaction)
    .where(and(eq(transaction.id, transactionId), eq(transaction.userId, session.user.id)))

  if (!txn) return NextResponse.json({ error: "Transaction not found" }, { status: 404 })

  const [created] = await db
    .insert(splitBill)
    .values({ id: generateId(), transactionId, targetName, targetContact: targetContact ?? "", splitAmount: Number(splitAmount) })
    .returning()

  return NextResponse.json(created, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const body = await request.json()
  const { id, status } = body

  if (!id || !status) return NextResponse.json({ error: "id and status are required" }, { status: 400 })

  const [updated] = await db
    .update(splitBill)
    .set({ status })
    .where(eq(splitBill.id, id))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  // Verify ownership via transaction join before deleting
  const [owned] = await db
    .select({ id: splitBill.id })
    .from(splitBill)
    .innerJoin(transaction, eq(splitBill.transactionId, transaction.id))
    .where(and(eq(splitBill.id, id), eq(transaction.userId, session.user.id)))

  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await db.delete(splitBill).where(eq(splitBill.id, id))
  return NextResponse.json({ success: true })
}
