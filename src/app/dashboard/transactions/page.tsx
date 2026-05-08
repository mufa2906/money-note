"use client"

export const dynamic = "force-dynamic"

import { useState, useMemo, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Search, Plus, ArrowLeftRight, ChevronLeft, ChevronRight, X } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { TransactionCard } from "@/components/transactions/transaction-card"
import { AddTransactionModal } from "@/components/transactions/add-transaction-modal"
import { EditTransactionModal } from "@/components/transactions/edit-transaction-modal"
import { EmptyState } from "@/components/common/empty-state"
import { LoadingSkeleton } from "@/components/common/loading-skeleton"
import { useTransactions } from "@/lib/hooks/use-transactions"
import { useCategories } from "@/lib/hooks/use-categories"
import { useSubcategories } from "@/lib/hooks/use-subcategories"
import { BUILTIN_CATEGORIES } from "@/components/common/category-icon"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/types"

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`
}

function TransactionsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { transactions, loading, refetch } = useTransactions()
  const { categories: dbCategories } = useCategories()
  const { subcategoriesByCategory } = useSubcategories()
  const allCategories = dbCategories.length > 0 ? dbCategories : BUILTIN_CATEGORIES

  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>(() => searchParams.get("category") ?? "all")
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>(() => searchParams.get("subcategory") ?? "all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [addOpen, setAddOpen] = useState(false)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)

  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number }>(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  // Sync URL params → state on first mount
  useEffect(() => {
    const cat = searchParams.get("category")
    const sub = searchParams.get("subcategory")
    if (cat) setCategoryFilter(cat)
    if (sub) setSubcategoryFilter(sub)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleCategoryChange(val: string) {
    setCategoryFilter(val)
    setSubcategoryFilter("all")
    const params = new URLSearchParams()
    if (val !== "all") params.set("category", val)
    router.replace(`/dashboard/transactions${params.toString() ? `?${params}` : ""}`, { scroll: false })
  }

  function clearFilters() {
    setCategoryFilter("all")
    setSubcategoryFilter("all")
    router.replace("/dashboard/transactions", { scroll: false })
  }

  const subcategoriesForFilter = categoryFilter !== "all"
    ? (subcategoriesByCategory[categoryFilter] ?? [])
    : []

  const activeCatLabel = allCategories.find((c) => c.name === categoryFilter)?.label

  function prevMonth() {
    setSelectedMonth(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    )
  }

  function nextMonth() {
    const now = new Date()
    if (selectedMonth.year === now.getFullYear() && selectedMonth.month === now.getMonth()) return
    setSelectedMonth(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    )
  }

  const isCurrentMonth = useMemo(() => {
    const now = new Date()
    return selectedMonth.year === now.getFullYear() && selectedMonth.month === now.getMonth()
  }, [selectedMonth])

  const monthLabel = useMemo(
    () => format(new Date(selectedMonth.year, selectedMonth.month, 1), "MMMM yyyy", { locale: id }),
    [selectedMonth]
  )

  const monthTransactions = useMemo(() => {
    const key = getMonthKey(selectedMonth.year, selectedMonth.month)
    return transactions.filter((t) => t.transactionDate.startsWith(key))
  }, [transactions, selectedMonth])

  const filtered = useMemo(() => {
    return monthTransactions.filter((t) => {
      const matchSearch = t.description.toLowerCase().includes(search.toLowerCase())
      const matchCat = categoryFilter === "all" || t.category === categoryFilter
      const matchSub = subcategoryFilter === "all" || t.subcategory === subcategoryFilter
      const matchType = typeFilter === "all" || t.type === typeFilter
      return matchSearch && matchCat && matchSub && matchType
    })
  }, [monthTransactions, search, categoryFilter, subcategoryFilter, typeFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of filtered) {
      if (!map.has(t.transactionDate)) map.set(t.transactionDate, [])
      map.get(t.transactionDate)!.push(t)
    }
    for (const dayTxs of map.values()) {
      dayTxs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const monthIncome = useMemo(
    () => monthTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
    [monthTransactions]
  )
  const monthExpense = useMemo(
    () => monthTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    [monthTransactions]
  )

  const hasActiveFilters = categoryFilter !== "all" || subcategoryFilter !== "all"

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Transaksi</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} transaksi</p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold capitalize">{monthLabel}</p>
            {monthTransactions.length > 0 && (
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 dark:text-green-400">+{formatCurrency(monthIncome)}</span>
                {" · "}
                <span className="text-red-500">-{formatCurrency(monthExpense)}</span>
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isCurrentMonth} onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Active category filter banner */}
        {activeCatLabel && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <span className="text-sm font-medium flex-1">
              Filter: <span className="text-primary">{activeCatLabel}</span>
              {subcategoryFilter !== "all" && (
                <> · <span className="text-primary">
                  {subcategoriesByCategory[categoryFilter]?.find((s) => s.name === subcategoryFilter)?.label ?? subcategoryFilter}
                </span></>
              )}
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Subcategory chip filter */}
        {subcategoriesForFilter.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSubcategoryFilter("all")}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                subcategoryFilter === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-accent"
              )}
            >
              Semua
            </button>
            {subcategoriesForFilter.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSubcategoryFilter(subcategoryFilter === s.name ? "all" : s.name)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  subcategoryFilter === s.name
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-accent"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cari transaksi..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {allCategories.map((c) => (
                <SelectItem key={c.name} value={c.name}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="sm:w-36">
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="income">Pemasukan</SelectItem>
              <SelectItem value="expense">Pengeluaran</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0 px-4">
            {loading ? (
              <LoadingSkeleton rows={8} className="py-4" />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={ArrowLeftRight}
                title="Tidak ada transaksi"
                description={monthTransactions.length === 0 ? `Belum ada transaksi di ${monthLabel}` : "Coba ubah filter"}
                className="py-10"
                action={hasActiveFilters ? (
                  <Button size="sm" variant="outline" onClick={clearFilters}>
                    <X className="h-3.5 w-3.5 mr-1" /> Hapus Filter
                  </Button>
                ) : undefined}
              />
            ) : (
              grouped.map(([date, dayTxs]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 py-2 sticky top-0 bg-card z-10">
                    <span className="text-xs font-semibold text-muted-foreground capitalize">
                      {format(new Date(date + "T00:00:00"), "EEEE, d MMMM", { locale: id })}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {dayTxs.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0) >= 0 ? "+" : ""}
                      {formatCurrency(dayTxs.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0))}
                    </span>
                  </div>
                  {dayTxs.map((t) => (
                    <TransactionCard key={t.id} transaction={t} hideDate onDeleted={refetch} onEdit={setEditTransaction} />
                  ))}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <AddTransactionModal open={addOpen} onOpenChange={setAddOpen} onSuccess={refetch} />
      <EditTransactionModal
        transaction={editTransaction}
        open={!!editTransaction}
        onOpenChange={(o) => { if (!o) setEditTransaction(null) }}
        onSuccess={refetch}
      />
    </>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsPageInner />
    </Suspense>
  )
}
