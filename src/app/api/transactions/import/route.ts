import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { transaction, walletAccount } from "@/lib/schema"
import { eq, and, sql } from "drizzle-orm"
import { requireAuth, generateId } from "@/lib/api-auth"

interface CsvRow {
  tanggal: string
  keterangan: string
  jumlah: number
  tipe: "income" | "expense"
  kategori: string
  akunId: string
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const body = await request.json()
  const rows: CsvRow[] = body.rows
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Tidak ada data" }, { status: 400 })
  }

  // Verify all account IDs belong to this user
  const accountIds = [...new Set(rows.map((r) => r.akunId))]
  const userAccounts = await db
    .select()
    .from(walletAccount)
    .where(eq(walletAccount.userId, session.user.id))
  const validIds = new Set(userAccounts.map((a) => a.id))
  for (const id of accountIds) {
    if (!validIds.has(id)) {
      return NextResponse.json({ error: `Akun tidak valid: ${id}` }, { status: 400 })
    }
  }

  let inserted = 0
  for (const row of rows) {
    const delta = row.tipe === "income" ? row.jumlah : -row.jumlah
    await db.insert(transaction).values({
      id: generateId(),
      userId: session.user.id,
      walletAccountId: row.akunId,
      amount: row.jumlah,
      type: row.tipe,
      category: row.kategori || "lainnya",
      subcategory: null,
      description: row.keterangan,
      transactionDate: row.tanggal,
      source: "manual",
    })
    await db
      .update(walletAccount)
      .set({ balance: sql`${walletAccount.balance} + ${delta}` })
      .where(eq(walletAccount.id, row.akunId))
    inserted++
  }

  return NextResponse.json({ inserted })
}
