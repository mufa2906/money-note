"use client"

import { useMemo } from "react"
import { useTransactionsContext } from "@/providers/data-provider"

export function useTransactions(limit?: number) {
  const { transactions, loading, error, refetch } = useTransactionsContext()
  const sliced = useMemo(() => (limit ? transactions.slice(0, limit) : transactions), [transactions, limit])
  return { transactions: sliced, loading, error, refetch }
}
