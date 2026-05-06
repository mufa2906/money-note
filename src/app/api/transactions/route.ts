import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { transaction, walletAccount, notification, budget } from "@/lib/schema"
import { eq, and, desc, sql, like, sum } from "drizzle-orm"
import { requireAuth, generateId } from "@/lib/api-auth"

const CATEGORY_LABELS: Record<string, string> = {
  makanan: "Makanan",
  transportasi: "Transportasi",
  belanja: "Belanja",
  hiburan: "Hiburan",
  tagihan: "Tagihan",
  kesehatan: "Kesehatan",
  pendidikan: "Pendidikan",
  gaji: "Gaji",
  lainnya: "Lainnya",
}

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get("limit") ?? 500)

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
  const { walletAccountId, amount, type, category, subcategory, description, transactionDate, source = "manual" } = body

  if (!walletAccountId || !amount || !type || !category || !description || !transactionDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const [created] = await db
    .insert(transaction)
    .values({ id: generateId(), userId: session.user.id, walletAccountId, amount: Number(amount), type, category, subcategory: subcategory ?? null, description, transactionDate, source })
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

  if (type === "expense") {
    const [budgetRow] = await db
      .select()
      .from(budget)
      .where(and(eq(budget.userId, session.user.id), eq(budget.category, category)))
      .limit(1)

    if (budgetRow) {
      const monthStr = transactionDate.slice(0, 7)
      const [spentRow] = await db
        .select({ total: sum(transaction.amount) })
        .from(transaction)
        .where(
          and(
            eq(transaction.userId, session.user.id),
            eq(transaction.category, category),
            eq(transaction.type, "expense"),
            like(transaction.transactionDate, `${monthStr}%`),
          ),
        )

      const currentSpent = Number(spentRow?.total ?? 0)
      const previousSpent = currentSpent - Number(amount)
      const budgetAmount = budgetRow.amount
      const prevRatio = previousSpent / budgetAmount
      const currRatio = currentSpent / budgetAmount
      const catLabel = CATEGORY_LABELS[category] ?? category

      if (prevRatio < 1.0 && currRatio >= 1.0) {
        await db.insert(notification).values({
          id: generateId(),
          userId: session.user.id,
          kind: "budget_warning",
          title: `Budget ${catLabel} Terlampaui!`,
          body: `Pengeluaran ${catLabel} bulan ini Rp${currentSpent.toLocaleString("id-ID")} — melebihi budget Rp${budgetAmount.toLocaleString("id-ID")}.`,
          isRead: false,
        })
      } else if (prevRatio < 0.8 && currRatio >= 0.8) {
        await db.insert(notification).values({
          id: generateId(),
          userId: session.user.id,
          kind: "budget_warning",
          title: `Budget ${catLabel} Hampir Habis`,
          body: `Pengeluaran ${catLabel} sudah ${Math.round(currRatio * 100)}% dari budget bulan ini (Rp${budgetAmount.toLocaleString("id-ID")}).`,
          isRead: false,
        })
      }
    }
  }

  return NextResponse.json(created, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const body = await request.json()
  const { id, walletAccountId, amount, type, category, subcategory, description, transactionDate } = body

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const [existing] = await db
    .select()
    .from(transaction)
    .where(and(eq(transaction.id, id), eq(transaction.userId, session.user.id)))
    .limit(1)
  if (!existing) return NextResponse.json({ error: "Transaction not found" }, { status: 404 })

  const newAmount = amount !== undefined ? Number(amount) : existing.amount
  const newType = type ?? existing.type
  const newAccountId = walletAccountId ?? existing.walletAccountId

  const oldDelta = existing.type === "income" ? existing.amount : -existing.amount
  const newDelta = newType === "income" ? newAmount : -newAmount

  if (newAccountId === existing.walletAccountId) {
    const diff = newDelta - oldDelta
    if (diff !== 0) {
      await db
        .update(walletAccount)
        .set({ balance: sql`${walletAccount.balance} + ${diff}` })
        .where(eq(walletAccount.id, existing.walletAccountId))
    }
  } else {
    await db
      .update(walletAccount)
      .set({ balance: sql`${walletAccount.balance} - ${oldDelta}` })
      .where(eq(walletAccount.id, existing.walletAccountId))
    await db
      .update(walletAccount)
      .set({ balance: sql`${walletAccount.balance} + ${newDelta}` })
      .where(eq(walletAccount.id, newAccountId))
  }

  const [updated] = await db
    .update(transaction)
    .set({
      walletAccountId: newAccountId,
      amount: newAmount,
      type: newType,
      category: category ?? existing.category,
      subcategory: subcategory !== undefined ? (subcategory || null) : existing.subcategory,
      description: description ?? existing.description,
      transactionDate: transactionDate ?? existing.transactionDate,
    })
    .where(eq(transaction.id, id))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const [existing] = await db
    .select()
    .from(transaction)
    .where(and(eq(transaction.id, id), eq(transaction.userId, session.user.id)))
    .limit(1)
  if (!existing) return NextResponse.json({ success: true })

  const reverseDelta = existing.type === "income" ? -existing.amount : existing.amount
  await db
    .update(walletAccount)
    .set({ balance: sql`${walletAccount.balance} + ${reverseDelta}` })
    .where(eq(walletAccount.id, existing.walletAccountId))

  await db.delete(transaction).where(eq(transaction.id, id))

  return NextResponse.json({ success: true })
}
