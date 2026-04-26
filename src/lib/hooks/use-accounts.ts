"use client"

import { useEffect, useState, useCallback } from "react"
import type { Account } from "@/types"

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/accounts")
      if (!res.ok) throw new Error("Failed to fetch accounts")
      const data = await res.json()
      setAccounts(data.map((a: Record<string, unknown>) => ({
        id: a.id,
        userId: a.userId,
        accountType: a.accountType,
        accountName: a.accountName,
        balance: a.balance,
        color: a.color,
        icon: a.icon,
      })))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  return { accounts, loading, error, refetch: fetch_ }
}
