"use client"

import { useMemo } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useTransactions } from "@/lib/hooks/use-transactions"
import { useAccounts } from "@/lib/hooks/use-accounts"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

export function PredictiveBalanceCard() {
  const { transactions, loading: txLoading } = useTransactions()
  const { accounts, loading: accLoading } = useAccounts()

  const now = new Date()
  const curMonth = now.getMonth()
  const curYear = now.getFullYear()
  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate()
  const daysElapsed = now.getDate()
  const daysRemaining = daysInMonth - daysElapsed

  const { expense } = useMemo(() => {
    const thisMonth = transactions.filter((t) => {
      const d = new Date(t.transactionDate)
      return d.getFullYear() === curYear && d.getMonth() === curMonth
    })
    return {
      expense: thisMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    }
  }, [transactions, curMonth, curYear])

  const totalBalance = useMemo(() => accounts.reduce((s, a) => s + a.balance, 0), [accounts])

  const isLoading = txLoading || accLoading

  // Need at least 5 days of data to make a meaningful prediction
  if (isLoading || daysElapsed < 5 || expense === 0) return null

  const dailyRate = expense / daysElapsed
  const projectedAdditionalExpense = dailyRate * daysRemaining
  const predictedBalance = totalBalance - projectedAdditionalExpense

  const isDeficit = predictedBalance < 0
  const isWarning = predictedBalance >= 0 && predictedBalance < totalBalance * 0.2

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            isDeficit ? "bg-red-100 dark:bg-red-900/30" : isWarning ? "bg-amber-100 dark:bg-amber-900/30" : "bg-blue-100 dark:bg-blue-900/30"
          )}>
            {isDeficit || isWarning
              ? <TrendingDown className={cn("h-4 w-4", isDeficit ? "text-red-500" : "text-amber-500")} />
              : <TrendingUp className="h-4 w-4 text-blue-500" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs text-muted-foreground">Prediksi Saldo Akhir Bulan</p>
              <p className="text-xs text-muted-foreground shrink-0">
                Rp {Math.round(dailyRate).toLocaleString("id-ID")}/hari
              </p>
            </div>
            <p className={cn(
              "text-xl font-bold font-mono tabular-nums mt-0.5",
              isDeficit ? "text-red-500" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
            )}>
              {predictedBalance < 0 ? "-" : ""}{formatCurrency(Math.abs(predictedBalance))}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isDeficit
                ? "Pengeluaran diprediksi melebihi saldo"
                : isWarning
                  ? "Saldo akan mepet di akhir bulan"
                  : `Estimasi ${daysRemaining} hari ke depan`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
