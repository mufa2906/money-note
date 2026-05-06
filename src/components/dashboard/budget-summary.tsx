"use client"

import Link from "next/link"
import { PiggyBank, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useBudgets } from "@/lib/hooks/use-budgets"
import { useCategories } from "@/lib/hooks/use-categories"
import { BUILTIN_CATEGORIES } from "@/components/common/category-icon"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

export function BudgetSummary() {
  const { budgets, loading } = useBudgets()
  const { categories: dbCategories } = useCategories()
  const allCategories = dbCategories.length > 0 ? dbCategories : BUILTIN_CATEGORIES

  if (loading || budgets.length === 0) return null

  const sorted = [...budgets].sort((a, b) => b.ratio - a.ratio).slice(0, 3)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-primary" />
            Budget Bulan Ini
          </CardTitle>
          <Link href="/dashboard/budget" className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            Lihat semua
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map((b) => {
          const cat = allCategories.find((c) => c.name === b.category)
          const pct = Math.min(Math.round(b.ratio * 100), 100)
          return (
            <div key={b.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{cat?.label ?? b.category}</span>
                <span className={cn(
                  "font-semibold",
                  b.ratio >= 1 ? "text-red-500" : b.ratio >= 0.8 ? "text-yellow-500" : "text-green-500",
                )}>
                  {pct}% · {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                </span>
              </div>
              <Progress
                value={pct}
                className={cn("h-1.5", b.ratio >= 1 ? "[&>div]:bg-red-500" : b.ratio >= 0.8 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500")}
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
