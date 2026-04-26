"use client"

import { useEffect, useState, useCallback } from "react"
import type { Transaction, Category } from "@/types"

function mapRow(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    userId: row.userId as string,
    accountId: (row.walletAccountId ?? row.accountId) as string,
    amount: row.amount as number,
    type: row.type as "income" | "expense",
    category: row.category as Category,
    description: row.description as string,
    transactionDate: row.transactionDate as string,
    source: row.source as "manual" | "bot" | "import",
  }
}

export function useTransactions(limit?: number) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const url = limit ? `/api/transactions?limit=${limit}` : "/api/transactions"
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch transactions")
      const data = await res.json()
      setTransactions(data.map(mapRow))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { fetch_() }, [fetch_])

  return { transactions, loading, error, refetch: fetch_ }
}
