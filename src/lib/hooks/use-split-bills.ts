"use client"

import { useState, useEffect, useCallback } from "react"
import type { SplitBill } from "@/types"

export function useSplitBills() {
  const [splitBills, setSplitBills] = useState<SplitBill[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSplitBills = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/split-bills")
      if (!res.ok) return
      const data = await res.json()
      setSplitBills(
        data.map((s: Record<string, unknown>) => ({
          id: s.id,
          transactionId: s.transactionId,
          transactionDescription: s.transactionDescription ?? "",
          totalAmount: Number(s.totalAmount),
          targetName: s.targetName,
          targetContact: s.targetContact ?? "",
          splitAmount: Number(s.splitAmount),
          status: s.status,
          createdAt: s.createdAt,
        }))
      )
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSplitBills() }, [fetchSplitBills])

  async function markPaid(id: string) {
    await fetch("/api/split-bills", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "paid" }),
    })
    await fetchSplitBills()
  }

  return { splitBills, loading, refetch: fetchSplitBills, markPaid }
}
