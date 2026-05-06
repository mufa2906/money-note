"use client"

import Link from "next/link"
import { ArrowRight, ArrowLeftRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CategoryIcon } from "@/components/common/category-icon"
import { CurrencyDisplay } from "@/components/common/currency-display"
import { LoadingSkeleton } from "@/components/common/loading-skeleton"
import { EmptyState } from "@/components/common/empty-state"
import { formatDateShort } from "@/lib/utils"
import { BUILTIN_CATEGORIES } from "@/components/common/category-icon"
import { useTransactions } from "@/lib/hooks/use-transactions"
import { useCategories } from "@/lib/hooks/use-categories"

const BUILTIN_LABEL = Object.fromEntries(BUILTIN_CATEGORIES.map((c) => [c.name, c.label]))

export function RecentTransactions() {
  const { transactions, loading } = useTransactions(5)
  const { categories } = useCategories()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
        <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
          <Link href="/dashboard/transactions">
            Lihat semua <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : transactions.length === 0 ? (
          <EmptyState icon={ArrowLeftRight} title="Belum ada transaksi" description="Mulai catat transaksi pertamamu!" />
        ) : (
          transactions.map((t) => (
            <div key={t.id} className="flex items-center gap-3">
              <CategoryIcon category={t.category} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.description}</p>
                <p className="text-xs text-muted-foreground">
                  {categories.find((c) => c.name === t.category)?.label ?? BUILTIN_LABEL[t.category] ?? t.category} · {formatDateShort(t.transactionDate)}
                </p>
              </div>
              <CurrencyDisplay amount={t.amount} type={t.type} showSign className="text-sm" />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
