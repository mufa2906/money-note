"use client"

import { useMemo } from "react"
import { ShieldCheck, TrendingDown, Minus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useTransactions } from "@/lib/hooks/use-transactions"
import { useBudgets } from "@/lib/hooks/use-budgets"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

export function SafeToSpendCard() {
  const { transactions, loading: txLoading } = useTransactions()
  const { budgets, loading: budgetLoading } = useBudgets()

  const now = new Date()
  const curMonth = now.getMonth()
  const curYear = now.getFullYear()

  const { income, expense } = useMemo(() => {
    const thisMonth = transactions.filter((t) => {
      const d = new Date(t.transactionDate)
      return d.getFullYear() === curYear && d.getMonth() === curMonth
    })
    return {
      income: thisMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
      expense: thisMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    }
  }, [transactions, curMonth, curYear])

  const safeAmount = income - expense

  // If budgets exist, compute total remaining budget as an additional signal
  const totalBudget = useMemo(() => budgets.reduce((s, b) => s + b.amount, 0), [budgets])
  const hasBudget = totalBudget > 0

  const isLoading = txLoading || budgetLoading

  if (isLoading || income === 0) return null

  const pct = income > 0 ? (safeAmount / income) * 100 : 0
  const isHealthy = pct >= 20
  const isWarning = pct >= 0 && pct < 20
  const isNegative = safeAmount < 0

  const label = isNegative
    ? "Pengeluaran melebihi pemasukan bulan ini"
    : isWarning
      ? "Hampir habis, bijak dalam pengeluaran"
      : "Masih aman untuk dipakai"

  const barColor = isNegative ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-green-500"
  const amountColor = isNegative ? "text-red-500" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", isNegative ? "bg-red-100 dark:bg-red-900/30" : isWarning ? "bg-amber-100 dark:bg-amber-900/30" : "bg-green-100 dark:bg-green-900/30")}>
            {isNegative
              ? <TrendingDown className="h-4 w-4 text-red-500" />
              : isWarning
                ? <Minus className="h-4 w-4 text-amber-500" />
                : <ShieldCheck className="h-4 w-4 text-green-500" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs text-muted-foreground">Uang Aman Dipakai</p>
              {hasBudget && <p className="text-xs text-muted-foreground shrink-0">dari {formatCurrency(income)}</p>}
            </div>
            <p className={cn("text-xl font-bold font-mono tabular-nums mt-0.5", amountColor)}>
              {safeAmount >= 0 ? "" : "-"}{formatCurrency(Math.abs(safeAmount))}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            {income > 0 && (
              <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", barColor)}
                  style={{ width: `${Math.min(Math.max(isNegative ? 100 : (expense / income) * 100, 0), 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
