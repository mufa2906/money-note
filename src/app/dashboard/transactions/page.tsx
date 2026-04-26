"use client"

import { useState, useMemo } from "react"
import { Search, Plus, ArrowLeftRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { TransactionCard } from "@/components/transactions/transaction-card"
import { AddTransactionModal } from "@/components/transactions/add-transaction-modal"
import { EmptyState } from "@/components/common/empty-state"
import { LoadingSkeleton } from "@/components/common/loading-skeleton"
import { useTransactions } from "@/lib/hooks/use-transactions"
import { CATEGORIES } from "@/lib/constants"

export default function TransactionsPage() {
  const { transactions, loading, refetch } = useTransactions()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [addOpen, setAddOpen] = useState(false)

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchSearch = t.description.toLowerCase().includes(search.toLowerCase())
      const matchCat = categoryFilter === "all" || t.category === categoryFilter
      const matchType = typeFilter === "all" || t.type === typeFilter
      return matchSearch && matchCat && matchType
    })
  }, [transactions, search, categoryFilter, typeFilter])

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
              <EmptyState icon={ArrowLeftRight} title="Tidak ada transaksi" description="Coba ubah filter atau tambah transaksi baru" className="py-10" />
            ) : (
              filtered.map((t) => <TransactionCard key={t.id} transaction={t} onDeleted={refetch} />)
            )}
          </CardContent>
        </Card>
      </div>
      <AddTransactionModal open={addOpen} onOpenChange={setAddOpen} onSuccess={refetch} />
    </>
  )
}
