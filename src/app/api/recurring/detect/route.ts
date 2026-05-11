import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { transaction, recurringTemplate } from "@/lib/schema"
import { eq, and, gte } from "drizzle-orm"
import { requireAuth } from "@/lib/api-auth"

export interface RecurringSuggestion {
  description: string
  amount: number
  category: string
  walletAccountId: string
  accountName: string
  dayOfMonth: number | null
  occurrences: number
  confidence: number
}

function normalizeDescription(desc: string): string {
  return desc.toLowerCase().replace(/\d+/g, "").replace(/[^a-z\s]/g, "").trim().replace(/\s+/g, " ")
}

function amountBucket(amount: number): number {
  return Math.round(amount / 50000) * 50000
}

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const userId = session.user.id

  // Get last 90 days of expense transactions
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const fromDate = ninetyDaysAgo.toISOString().slice(0, 10)

  const rows = await db
    .select()
    .from(transaction)
    .where(and(eq(transaction.userId, userId), eq(transaction.type, "expense"), gte(transaction.transactionDate, fromDate)))

  // Get already-confirmed templates to exclude
  const confirmed = await db.select().from(recurringTemplate).where(eq(recurringTemplate.userId, userId))
  const confirmedKeys = new Set(
    confirmed.map((t) => `${normalizeDescription(t.description)}::${amountBucket(t.amount)}`)
  )

  // Group by (normalized description, amount bucket, walletAccountId)
  type TxGroup = {
    dates: string[]
    amount: number
    category: string
    walletAccountId: string
    description: string
  }
  const groups = new Map<string, TxGroup>()

  for (const row of rows) {
    const key = `${normalizeDescription(row.description)}::${amountBucket(row.amount)}::${row.walletAccountId}`
    if (!groups.has(key)) {
      groups.set(key, { dates: [], amount: row.amount, category: row.category, walletAccountId: row.walletAccountId, description: row.description })
    }
    groups.get(key)!.dates.push(row.transactionDate)
  }

  // Get account names
  const { walletAccount } = await import("@/lib/schema")
  const accounts = await db.select().from(walletAccount).where(eq(walletAccount.userId, userId))
  const accountMap = new Map(accounts.map((a) => [a.id, a.accountName]))

  const suggestions: RecurringSuggestion[] = []

  for (const [, group] of groups) {
    if (group.dates.length < 2) continue

    const confirmedKey = `${normalizeDescription(group.description)}::${amountBucket(group.amount)}`
    if (confirmedKeys.has(confirmedKey)) continue

    // Sort dates and check intervals
    const sorted = [...group.dates].sort()
    const intervals: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / (1000 * 60 * 60 * 24)
      intervals.push(diff)
    }

    // Monthly-ish: 20–40 day intervals
    const monthlyIntervals = intervals.filter((d) => d >= 20 && d <= 40)
    if (monthlyIntervals.length === 0) continue

    const avgInterval = monthlyIntervals.reduce((s, d) => s + d, 0) / monthlyIntervals.length
    if (avgInterval < 20 || avgInterval > 40) continue

    // Infer day of month from most recent transaction
    const lastDate = new Date(sorted[sorted.length - 1])
    const dayOfMonth = lastDate.getDate()

    // Confidence: more occurrences + consistent interval = higher confidence
    const intervalVariance = monthlyIntervals.reduce((s, d) => s + Math.abs(d - avgInterval), 0) / monthlyIntervals.length
    const confidence = Math.min(100, Math.round((group.dates.length * 20) + (20 - Math.min(intervalVariance, 20))))

    suggestions.push({
      description: group.description,
      amount: group.amount,
      category: group.category,
      walletAccountId: group.walletAccountId,
      accountName: accountMap.get(group.walletAccountId) ?? "Akun tidak ditemukan",
      dayOfMonth,
      occurrences: group.dates.length,
      confidence,
    })
  }

  // Sort by confidence descending, return top 5
  suggestions.sort((a, b) => b.confidence - a.confidence)

  return NextResponse.json(suggestions.slice(0, 5))
}
