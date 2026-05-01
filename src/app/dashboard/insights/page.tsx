"use client"

import dynamic from "next/dynamic"
import { useMemo } from "react"
import { Lightbulb, TrendingDown, AlertCircle, Crown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { FreemiumGate } from "@/components/common/freemium-gate"
import { useAuth } from "@/providers/auth-provider"
import { useTransactions } from "@/lib/hooks/use-transactions"
import type { Category } from "@/types"
import { CATEGORIES } from "@/lib/constants"
import { formatCurrency } from "@/lib/utils"

const SpendingByCategoryChart = dynamic(
  () => import("@/components/insights/spending-by-category-chart").then((m) => ({ default: m.SpendingByCategoryChart })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

const MonthlyTrendChart = dynamic(
  () => import("@/components/insights/monthly-trend-chart").then((m) => ({ default: m.MonthlyTrendChart })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

const AI_TIPS_FREE = [
  { icon: TrendingDown, title: "Pantau pengeluaran Makanan", body: "Catat rutin setiap makan di luar agar tahu persis berapa yang kamu habiskan." },
  { icon: Lightbulb, title: "Aktifkan pengingat transaksi", body: "Kirim pesan ke Telegram Bot setiap habis transaksi untuk kebiasaan pencatatan yang konsisten." },
]

const AI_TIPS_PREMIUM = [
  { icon: AlertCircle, title: "Prediksi pengeluaran bulan ini", body: "Berdasarkan tren, estimasi pengeluaran bulan ini bisa 15% lebih tinggi dari anggaran." },
  { icon: TrendingDown, title: "Pola pengeluaran mingguan", body: "Kamu cenderung boros di hari Sabtu-Minggu. Rata-rata 2.4x lebih tinggi dari weekday." },
  { icon: Lightbulb, title: "Potensi tabungan lebih banyak", body: "Optimasi pengeluaran hiburan dan makanan di luar bisa menghemat ratusan ribu per bulan." },
]

export default function InsightsPage() {
  const { user } = useAuth()
  const isPremium = user?.subscriptionTier !== "free"
  const { transactions, loading } = useTransactions()

  const categoryData = useMemo(() => {
    const result = {} as Record<Category, number>
    transactions.filter((t) => t.type === "expense").forEach((t) => {
      result[t.category as Category] = (result[t.category as Category] || 0) + t.amount
    })
    return result
  }, [transactions])

  const trendData = useMemo(() => {
    const now = new Date()
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

  const chartDataAll = CATEGORIES.filter((c) => categoryData[c.value] > 0).map((c, i) => ({
    name: c.label, value: categoryData[c.value] || 0,
    color: ["#f97316","#3b82f6","#a855f7","#ec4899","#ef4444","#22c55e","#06b6d4","#84cc16","#78716c"][i % 9],
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-xl font-bold">Wawasan AI</h1>
          <p className="text-sm text-muted-foreground">Analisis keuangan pribadimu</p>
        </div>
        {isPremium && <Badge className="ml-auto"><Crown className="h-3 w-3 mr-1" />Premium</Badge>}
      </div>

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

      <div className="space-y-3">
        <h2 className="font-semibold text-sm">Saran AI</h2>
        {AI_TIPS_FREE.map((tip) => (
          <Alert key={tip.title}>
            <tip.icon className="h-4 w-4" />
            <AlertTitle className="text-sm">{tip.title}</AlertTitle>
            <AlertDescription className="text-xs">{tip.body}</AlertDescription>
          </Alert>
        ))}
        <FreemiumGate isLocked={!isPremium} featureName="Deep AI Insights">
          <div className="space-y-3">
            {AI_TIPS_PREMIUM.map((tip) => (
              <Alert key={tip.title}>
                <tip.icon className="h-4 w-4" />
                <AlertTitle className="text-sm flex items-center gap-1.5">
                  {tip.title} <Crown className="h-3 w-3 text-amber-500" />
                </AlertTitle>
                <AlertDescription className="text-xs">{tip.body}</AlertDescription>
              </Alert>
            ))}
          </div>
        </FreemiumGate>
      </div>
    </div>
  )
}
