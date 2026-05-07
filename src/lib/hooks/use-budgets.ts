"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useTransactions } from "@/lib/hooks/use-transactions"
import type { Budget, Category } from "@/types"

export interface BudgetWithSpent extends Budget {
  spent: number
  ratio: number
}

function mapRow(row: Record<string, unknown>): Budget {
  return {
    id: row.id as string,
    userId: row.userId as string,
    category: row.category as Category,
    subcategory: (row.subcategory as string | null) ?? null,
    amount: row.amount as number,
    createdAt: row.createdAt ? new Date(row.createdAt as string | number).toISOString() : new Date().toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt as string | number).toISOString() : new Date().toISOString(),
  }
}

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const { transactions } = useTransactions()

  const fetchBudgets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/budgets", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      setBudgets(data.map(mapRow))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBudgets() }, [fetchBudgets])

  const now = new Date()
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  // spent per category (all expenses)
  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of transactions) {
      if (t.type === "expense" && t.transactionDate.startsWith(monthStr)) {
        map[t.category] = (map[t.category] ?? 0) + t.amount
      }
    }
    return map
  }, [transactions, monthStr])

  // spent per "category:subcategory" key
  const spentByCategorySubcategory = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of transactions) {
      if (t.type === "expense" && t.transactionDate.startsWith(monthStr) && t.subcategory) {
        const key = `${t.category}:${t.subcategory}`
        map[key] = (map[key] ?? 0) + t.amount
      }
    }
    return map
  }, [transactions, monthStr])

  const budgetsWithSpent = useMemo<BudgetWithSpent[]>(() =>
    budgets.map((b) => {
      const spent = b.subcategory
        ? (spentByCategorySubcategory[`${b.category}:${b.subcategory}`] ?? 0)
        : (spentByCategory[b.category] ?? 0)
      return { ...b, spent, ratio: b.amount > 0 ? spent / b.amount : 0 }
    }),
    [budgets, spentByCategory, spentByCategorySubcategory],
  )

  async function createBudget(category: string, amount: number, subcategory?: string | null): Promise<Budget> {
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, subcategory: subcategory ?? null, amount }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? "Gagal menyimpan budget")
    }
    const created = mapRow(await res.json())
    setBudgets((prev) => [...prev, created])
    return created
  }

  async function updateBudget(id: string, amount: number): Promise<void> {
    const res = await fetch(`/api/budgets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    })
    if (!res.ok) throw new Error("Gagal memperbarui budget")
    const updated = mapRow(await res.json())
    setBudgets((prev) => prev.map((b) => (b.id === id ? updated : b)))
  }

  async function deleteBudget(id: string): Promise<void> {
    const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Gagal menghapus budget")
    setBudgets((prev) => prev.filter((b) => b.id !== id))
  }

  return { budgets: budgetsWithSpent, loading, refetch: fetchBudgets, createBudget, updateBudget, deleteBudget, spentByCategory }
}
