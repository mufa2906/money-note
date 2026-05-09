"use client"

import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CategoryIcon } from "@/components/common/category-icon"
import { CurrencyDisplay } from "@/components/common/currency-display"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { formatDate } from "@/lib/utils"
import { useToast } from "@/lib/hooks/use-toast"
import { useTransactions } from "@/lib/hooks/use-transactions"
import { useAccounts } from "@/lib/hooks/use-accounts"
import { useCategories } from "@/lib/hooks/use-categories"
import { useSubcategories } from "@/lib/hooks/use-subcategories"
import { BUILTIN_CATEGORIES } from "@/components/common/category-icon"
import type { Transaction } from "@/types"
import { cn } from "@/lib/utils"

interface TransactionCardProps {
  transaction: Transaction
  onDeleted?: () => void
  onEdit?: (transaction: Transaction) => void
  hideDate?: boolean
}

const BUILTIN_LABEL = Object.fromEntries(BUILTIN_CATEGORIES.map((c) => [c.name, c.label]))

export function TransactionCard({ transaction: t, onDeleted, onEdit, hideDate }: TransactionCardProps) {
  const { categories } = useCategories()
  const { subcategoriesByCategory } = useSubcategories()
  const catLabel = categories.find((c) => c.name === t.category)?.label ?? BUILTIN_LABEL[t.category] ?? t.category
  const subcatLabel = t.subcategory && t.subcategory !== "dll"
    ? (subcategoriesByCategory[t.category]?.find((s) => s.name === t.subcategory)?.label ?? null)
    : null
  const { toast } = useToast()
  const { refetch: refetchTransactions } = useTransactions()
  const { refetch: refetchAccounts } = useAccounts()
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function handleDelete() {
    try {
      const res = await fetch(`/api/transactions?id=${t.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Gagal menghapus")
      toast({ title: "Transaksi dihapus", description: t.description })
      await Promise.all([refetchTransactions(), refetchAccounts()])
      onDeleted?.()
    } catch (e) {
      toast({ title: "Gagal", description: String(e), variant: "destructive" })
    }
  }

  return (
    <div className={cn("flex items-center gap-3 py-3 border-b last:border-0")}>
      <CategoryIcon category={t.category} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{t.description}</p>
        <div className="overflow-x-auto mt-0.5 no-scrollbar">
          <div className="flex items-center gap-1.5 w-max">
            {!hideDate && <span className="text-xs text-muted-foreground shrink-0">{formatDate(t.transactionDate)}</span>}
            <Badge variant="secondary" className="text-xs py-0 px-1.5 h-4 shrink-0 whitespace-nowrap">
              {catLabel}
            </Badge>
            {subcatLabel && (
              <Badge variant="outline" className="text-xs py-0 px-1.5 h-4 shrink-0 text-muted-foreground whitespace-nowrap">
                {subcatLabel}
              </Badge>
            )}
            {t.source === "bot" && (
              <Badge variant="outline" className="text-xs py-0 px-1.5 h-4 shrink-0">Bot</Badge>
            )}
          </div>
        </div>
      </div>
      <CurrencyDisplay amount={t.amount} type={t.type} showSign className="text-sm flex-shrink-0" />
      {(onDeleted || onEdit) && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(t)}
              aria-label="Edit transaksi"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDeleted && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
              aria-label="Hapus transaksi"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus transaksi?"
        description={`"${t.description}" akan dihapus dan saldo akun akan disesuaikan kembali. Tidak bisa dibatalkan.`}
        confirmText="Hapus"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}
