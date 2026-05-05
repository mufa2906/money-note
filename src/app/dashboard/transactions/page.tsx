"use client"

import { useState, useMemo } from "react"
import { Search, Plus, ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react"
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
import { CATEGORIES } from "@/lib/constants"
import { formatCurrency } from "@/lib/utils"
import type { Transaction } from "@/types"

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`
}

export default function TransactionsPage() {
  const { transactions, loading, refetch } = useTransactions()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [addOpen, setAddOpen] = useState(false)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)

  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number }>(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  function prevMonth() {
    setSelectedMonth(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    )
  }

  function nextMonth() {
    const now = new Date()
    const isCurrentMonth = selectedMonth.year === now.getFullYear() && selectedMonth.month === now.getMonth()
    if (isCurrentMonth) return
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
      const matchType = typeFilter === "all" || t.type === typeFilter
      return matchSearch && matchCat && matchType
    })
  }, [monthTransactions, search, categoryFilter, typeFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of filtered) {
      const day = t.transactionDate
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(t)
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cari transaksi..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
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
              <EmptyState icon={ArrowLeftRight} title="Tidak ada transaksi" description={monthTransactions.length === 0 ? `Belum ada transaksi di ${monthLabel}` : "Coba ubah filter"} className="py-10" />
            ) : (
              grouped.map(([date, dayTxs]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 py-2 sticky top-0 bg-card z-10">
                    <span className="text-xs font-semibold text-muted-foreground capitalize">
                      {format(new Date(date + "T00:00:00"), "EEEE, d MMMM", { locale: id })}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {dayTxs.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0) >= 0
                        ? "+"
                        : ""}
                      {formatCurrency(dayTxs.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0))}
                    </span>
                  </div>
                  {dayTxs.map((t) => (
                    <TransactionCard
                      key={t.id}
                      transaction={t}
                      hideDate
                      onDeleted={refetch}
                      onEdit={setEditTransaction}
                    />
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
