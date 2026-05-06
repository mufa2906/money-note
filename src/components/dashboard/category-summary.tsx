"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CategoryIcon } from "@/components/common/category-icon"
import { CurrencyDisplay } from "@/components/common/currency-display"
import { useTransactions } from "@/lib/hooks/use-transactions"
import { useCategories } from "@/lib/hooks/use-categories"
import { BUILTIN_CATEGORIES } from "@/components/common/category-icon"

const BUILTIN_LABEL = Object.fromEntries(BUILTIN_CATEGORIES.map((c) => [c.name, c.label]))

export function CategorySummary() {
  const { transactions } = useTransactions()
  const { categories } = useCategories()

  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const { top, total } = useMemo(() => {
    const expenses = transactions.filter(
      (t) => t.type === "expense" && t.transactionDate.startsWith(ym)
    )
    const map: Record<string, number> = {}
    for (const t of expenses) {
      map[t.category] = (map[t.category] ?? 0) + t.amount
    }
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const total = expenses.reduce((s, t) => s + t.amount, 0)
    return { top: sorted, total }
  }, [transactions, ym])

  if (top.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">Pengeluaran per Kategori</CardTitle>
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs -mr-2">
          <Link href="/dashboard/insights">
            Detail <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {top.map(([cat, amount]) => {
          const label = categories.find((c) => c.name === cat)?.label ?? BUILTIN_LABEL[cat] ?? cat
          const pct = total > 0 ? Math.round((amount / total) * 100) : 0
          return (
            <div key={cat} className="flex items-center gap-2.5">
              <CategoryIcon category={cat} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate">{label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{pct}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <CurrencyDisplay amount={amount} className="text-xs font-medium flex-shrink-0 w-20 text-right" />
            </div>
          )
        })}
        <div className="flex items-center justify-between pt-2 border-t text-xs">
          <span className="text-muted-foreground">Total pengeluaran bulan ini</span>
          <CurrencyDisplay amount={total} className="font-semibold" />
        </div>
      </CardContent>
    </Card>
  )
}
