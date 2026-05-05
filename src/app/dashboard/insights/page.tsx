"use client"

import dynamic from "next/dynamic"
import { useMemo } from "react"
import {
  TrendingDown, TrendingUp, Minus, Crown, CalendarDays,
  Wallet, PiggyBank, AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { FreemiumGate } from "@/components/common/freemium-gate"
import { useAuth } from "@/providers/auth-provider"
import { useTransactions } from "@/lib/hooks/use-transactions"
import { formatCurrency } from "@/lib/utils"
import { CategoryIcon } from "@/components/common/category-icon"
import { useCategories } from "@/lib/hooks/use-categories"

const SpendingByCategoryChart = dynamic(
  () => import("@/components/insights/spending-by-category-chart").then((m) => ({ default: m.SpendingByCategoryChart })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

const MonthlyTrendChart = dynamic(
  () => import("@/components/insights/monthly-trend-chart").then((m) => ({ default: m.MonthlyTrendChart })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]

export default function InsightsPage() {
  const { user } = useAuth()
  const isPremium = user?.subscriptionTier !== "free"
  const { transactions, loading } = useTransactions()
  const { categories } = useCategories()

  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth()
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear

  const thisTxs = useMemo(
    () => transactions.filter((t) => {
      const d = new Date(t.transactionDate)
      return d.getFullYear() === thisYear && d.getMonth() === thisMonth
    }),
    [transactions, thisYear, thisMonth]
  )

  const lastTxs = useMemo(
    () => transactions.filter((t) => {
      const d = new Date(t.transactionDate)
      return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth
    }),
    [transactions, lastMonth, lastMonthYear]
  )

  const thisExpense = useMemo(() => thisTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), [thisTxs])
  const thisIncome = useMemo(() => thisTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), [thisTxs])
  const lastExpense = useMemo(() => lastTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), [lastTxs])
  const lastIncome = useMemo(() => lastTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), [lastTxs])

  // Category breakdown this month
  const catThis = useMemo(() => {
    const map = {} as Record<string, number>
    thisTxs.filter((t) => t.type === "expense").forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [thisTxs])

  const catLast = useMemo(() => {
    const map = {} as Record<string, number>
    lastTxs.filter((t) => t.type === "expense").forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
    return map
  }, [lastTxs])

  // Daily average this month (days elapsed so far)
  const daysElapsed = useMemo(() => {
    const today = now.getDate()
    return Math.max(today, 1)
  }, [])

  const avgDaily = thisExpense / daysElapsed

  // Most expensive day of week
  const dayTotals = useMemo(() => {
    const totals = Array(7).fill(0)
    const counts = Array(7).fill(0)
    thisTxs.filter((t) => t.type === "expense").forEach((t) => {
      const day = new Date(t.transactionDate + "T00:00:00").getDay()
      totals[day] += t.amount
      counts[day]++
    })
    return totals.map((total, i) => ({ day: DAY_NAMES[i], total, count: counts[i] }))
  }, [thisTxs])

  const busiestDay = useMemo(() => {
    return [...dayTotals].sort((a, b) => b.total - a.total)[0]
  }, [dayTotals])

  // Net balance this month
  const netThis = thisIncome - thisExpense
  const netLast = lastIncome - lastExpense

  // Expense change vs last month
  const expenseDiff = lastExpense > 0 ? ((thisExpense - lastExpense) / lastExpense) * 100 : null

  // Chart data
  const categoryData = useMemo(() => {
    const result = {} as Record<string, number>
    transactions.filter((t) => t.type === "expense").forEach((t) => {
      result[t.category] = (result[t.category] || 0) + t.amount
    })
    return result
  }, [transactions])

  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now)
      d.setMonth(d.getMonth() - (5 - i))
      const month = d.getMonth()
      const year = d.getFullYear()
      const label = d.toLocaleDateString("id-ID", { month: "short" })
      const income = transactions.filter((t) => t.type === "income" && new Date(t.transactionDate).getMonth() === month && new Date(t.transactionDate).getFullYear() === year).reduce((s, t) => s + t.amount, 0)
      const expense = transactions.filter((t) => t.type === "expense" && new Date(t.transactionDate).getMonth() === month && new Date(t.transactionDate).getFullYear() === year).reduce((s, t) => s + t.amount, 0)
      return { month: label, income, expense }
    })
  }, [transactions])

  const chartDataAll = categories.filter((c) => categoryData[c.name] > 0).map((c, i) => ({
    name: c.label, value: categoryData[c.name] || 0,
    color: c.color ?? ["#f97316","#3b82f6","#a855f7","#ec4899","#ef4444","#22c55e","#06b6d4","#84cc16","#78716c"][i % 9],
  }))

  const monthName = now.toLocaleDateString("id-ID", { month: "long" })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-xl font-bold">Wawasan</h1>
          <p className="text-sm text-muted-foreground">Ringkasan keuangan {monthName}</p>
        </div>
        {isPremium && <Badge className="ml-auto"><Crown className="h-3 w-3 mr-1" />Premium</Badge>}
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* Net this month */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Saldo Bersih</span>
              </div>
              <p className={`text-lg font-bold ${netThis >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                {netThis >= 0 ? "+" : ""}{formatCurrency(netThis)}
              </p>
              {netLast !== 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bln lalu {netLast >= 0 ? "+" : ""}{formatCurrency(netLast)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Expense vs last month */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                {expenseDiff === null ? <Minus className="h-4 w-4 text-muted-foreground" /> : expenseDiff > 0 ? <TrendingUp className="h-4 w-4 text-red-500" /> : <TrendingDown className="h-4 w-4 text-green-500" />}
                <span className="text-xs text-muted-foreground">Pengeluaran</span>
              </div>
              <p className="text-lg font-bold">{formatCurrency(thisExpense)}</p>
              {expenseDiff !== null && (
                <p className={`text-xs mt-0.5 ${expenseDiff > 0 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                  {expenseDiff > 0 ? "▲" : "▼"} {Math.abs(expenseDiff).toFixed(1)}% vs bln lalu
                </p>
              )}
            </CardContent>
          </Card>

          {/* Avg daily */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Rata-rata/Hari</span>
              </div>
              <p className="text-lg font-bold">{formatCurrency(avgDaily)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{daysElapsed} hari berjalan</p>
            </CardContent>
          </Card>

          {/* Busiest day */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Hari Paling Boros</span>
              </div>
              {busiestDay?.total > 0 ? (
                <>
                  <p className="text-lg font-bold">{busiestDay.day}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(busiestDay.total)} bulan ini</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada data</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top categories this month */}
      {!loading && catThis.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kategori Terbesar Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {catThis.slice(0, isPremium ? catThis.length : 3).map(([cat, amount]) => {
              const prev = catLast[cat] || 0
              const diff = prev > 0 ? ((amount - prev) / prev) * 100 : null
              const pct = thisExpense > 0 ? (amount / thisExpense) * 100 : 0
              const catMeta = categories.find((c) => c.name === cat)
              return (
                <div key={cat} className="flex items-center gap-3">
                  <CategoryIcon category={cat} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium">{catMeta?.label ?? cat}</span>
                      <span className="text-sm font-semibold">{formatCurrency(amount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{pct.toFixed(0)}%</span>
                      {diff !== null && (
                        <span className={`text-xs ${diff > 0 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                          {diff > 0 ? "▲" : "▼"}{Math.abs(diff).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {!isPremium && catThis.length > 3 && (
              <p className="text-xs text-muted-foreground text-center pt-1">+{catThis.length - 3} kategori lainnya — upgrade untuk lihat semua</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Saving rate */}
      {!loading && thisIncome > 0 && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <PiggyBank className="h-8 w-8 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Tingkat Tabungan Bulan Ini</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${netThis >= 0 ? "bg-green-500" : "bg-red-500"}`}
                    style={{ width: `${Math.min(Math.max((netThis / thisIncome) * 100, 0), 100)}%` }}
                  />
                </div>
                <span className={`text-sm font-bold ${netThis >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                  {((netThis / thisIncome) * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pemasukan {formatCurrency(thisIncome)} · Pengeluaran {formatCurrency(thisExpense)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pengeluaran per Kategori</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-64 w-full" /> : (
            <SpendingByCategoryChart data={isPremium ? chartDataAll : chartDataAll.slice(0, 3)} />
          )}
          {!isPremium && <p className="text-xs text-muted-foreground text-center mt-2">Menampilkan 3 kategori terbesar. Upgrade untuk melihat semua.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tren 6 Bulan Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          <FreemiumGate isLocked={!isPremium} featureName="Tren Bulanan">
            {loading ? <Skeleton className="h-64 w-full" /> : <MonthlyTrendChart data={trendData} />}
          </FreemiumGate>
        </CardContent>
      </Card>
    </div>
  )
}
