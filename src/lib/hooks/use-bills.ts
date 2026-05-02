"use client"

import { useCallback, useEffect, useState } from "react"
import type { Bill, BillDetail } from "@/types"

export function useBills() {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/bills")
      if (!res.ok) return
      const data = await res.json()
      setBills(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { bills, loading, refetch }
}

export function useBill(id: string | null) {
  const [bill, setBill] = useState<BillDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/bills/${id}`)
      if (!res.ok) {
        setBill(null)
        return
      }
      const data = await res.json()
      setBill(data)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { refetch() }, [refetch])

  return { bill, loading, refetch, setBill }
}
