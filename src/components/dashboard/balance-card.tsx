"use client"

import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAccounts } from "@/lib/hooks/use-accounts"
import { useTransactions } from "@/lib/hooks/use-transactions"
import { formatCurrency } from "@/lib/utils"

export function BalanceCard() {
  const { accounts, loading: accLoading } = useAccounts()
  const { transactions, loading: txLoading } = useTransactions()

  const now = new Date()
  const curMonth = now.getMonth()
  const curYear = now.getFullYear()

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)

  const income = transactions
    .filter((t) => t.type === "income" && new Date(t.transactionDate).getMonth() === curMonth && new Date(t.transactionDate).getFullYear() === curYear)
    .reduce((s, t) => s + t.amount, 0)

  const expense = transactions
    .filter((t) => t.type === "expense" && new Date(t.transactionDate).getMonth() === curMonth && new Date(t.transactionDate).getFullYear() === curYear)
    .reduce((s, t) => s + t.amount, 0)

  const lastMonthExpense = transactions
    .filter((t) => { const d = new Date(t.transactionDate); return t.type === "expense" && d.getMonth() === (curMonth - 1 + 12) % 12 })
    .reduce((s, t) => s + t.amount, 0)
  const trend = lastMonthExpense > 0 ? ((expense - lastMonthExpense) / lastMonthExpense) * 100 : 0

  if (accLoading || txLoading) {
    return <Skeleton className="h-40 w-full rounded-xl" />
  }

  return (
    <Card className="bg-primary text-primary-foreground overflow-hidden">
      <CardContent className="p-6">
        <p className="text-sm opacity-80 mb-1">Total Saldo</p>
        <p className="text-3xl font-bold font-mono tabular-nums mb-1">
          {formatCurrency(totalBalance)}
        </p>
        <div className="flex items-center gap-1 text-xs opacity-70 mb-6">
          {trend <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
          <span>Pengeluaran {Math.abs(trend).toFixed(0)}% {trend <= 0 ? "lebih hemat" : "lebih boros"} bulan ini</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/10 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowUpRight className="h-3.5 w-3.5 text-green-300" />
              <span className="text-xs opacity-80">Pemasukan</span>
            </div>
            <p className="font-semibold font-mono tabular-nums text-sm">{formatCurrency(income)}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDownRight className="h-3.5 w-3.5 text-red-300" />
              <span className="text-xs opacity-80">Pengeluaran</span>
            </div>
            <p className="font-semibold font-mono tabular-nums text-sm">{formatCurrency(expense)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
