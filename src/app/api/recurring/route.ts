import { NextRequest, NextResponse } from "next/server"
import { db, dbClient } from "@/lib/db"
import { recurringTemplate, walletAccount } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { requireAuth, generateId } from "@/lib/api-auth"

let migrated = false
async function ensureMigrations() {
  if (migrated) return
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS recurring_template (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      wallet_account_id TEXT NOT NULL,
      day_of_month INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `).catch(() => {})
  migrated = true
}

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error
  await ensureMigrations()

  const userId = session.user.id
  const templates = await db
    .select({
      id: recurringTemplate.id,
      description: recurringTemplate.description,
      amount: recurringTemplate.amount,
      category: recurringTemplate.category,
      walletAccountId: recurringTemplate.walletAccountId,
      dayOfMonth: recurringTemplate.dayOfMonth,
      accountName: walletAccount.accountName,
    })
    .from(recurringTemplate)
    .leftJoin(walletAccount, eq(recurringTemplate.walletAccountId, walletAccount.id))
    .where(eq(recurringTemplate.userId, userId))

  return NextResponse.json(templates)
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error
  await ensureMigrations()

  const userId = session.user.id
  const body = await request.json()
  const { description, amount, category, walletAccountId, dayOfMonth } = body

  if (!description || !amount || !category || !walletAccountId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Verify account belongs to user
  const [acct] = await db.select().from(walletAccount).where(and(eq(walletAccount.id, walletAccountId), eq(walletAccount.userId, userId))).limit(1)
  if (!acct) return NextResponse.json({ error: "Account not found" }, { status: 404 })

  const id = generateId()
  await db.insert(recurringTemplate).values({
    id,
    userId,
    description,
    amount,
    category,
    walletAccountId,
    dayOfMonth: dayOfMonth ?? null,
  })

  return NextResponse.json({ id })
}

export async function DELETE(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error
  await ensureMigrations()

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

  await db.delete(recurringTemplate).where(and(eq(recurringTemplate.id, id), eq(recurringTemplate.userId, session.user.id)))
  return NextResponse.json({ ok: true })
}
