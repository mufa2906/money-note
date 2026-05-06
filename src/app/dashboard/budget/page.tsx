"use client"

import { useState } from "react"
import { PiggyBank, Plus, Pencil, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { EmptyState } from "@/components/common/empty-state"
import { BudgetModal } from "@/components/budget/budget-modal"
import { useBudgets, type BudgetWithSpent } from "@/lib/hooks/use-budgets"
import { useCategories } from "@/lib/hooks/use-categories"
import { useToast } from "@/lib/hooks/use-toast"
import { BUILTIN_CATEGORIES } from "@/components/common/category-icon"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

function getBudgetColor(ratio: number) {
  if (ratio >= 1) return "bg-red-500"
  if (ratio >= 0.8) return "bg-yellow-500"
  return "bg-green-500"
}

function getBudgetBadgeClass(ratio: number) {
  if (ratio >= 1) return "text-red-600 bg-red-50 dark:bg-red-950/30"
  if (ratio >= 0.8) return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30"
  return "text-green-600 bg-green-50 dark:bg-green-950/30"
}

export default function BudgetPage() {
  const { toast } = useToast()
  const { budgets, loading, createBudget, updateBudget, deleteBudget } = useBudgets()
  const { categories: dbCategories } = useCategories()
  const allCategories = dbCategories.length > 0 ? dbCategories : BUILTIN_CATEGORIES
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<BudgetWithSpent | null>(null)

  const takenCategories = budgets.map((b) => b.category)
  const hasUnsetCategories = allCategories.some((c) => !takenCategories.includes(c.name))

  function openAdd() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(b: BudgetWithSpent) {
    setEditing(b)
    setModalOpen(true)
  }

  async function handleDelete(b: BudgetWithSpent) {
    try {
      await deleteBudget(b.id)
      toast({ title: "Budget dihapus" })
    } catch {
      toast({ title: "Gagal menghapus budget", variant: "destructive" })
    }
  }

  async function handleSave(category: string, amount: number) {
    if (editing) {
      await updateBudget(editing.id, amount)
    } else {
      await createBudget(category, amount)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Budget</h1>
          <p className="text-sm text-muted-foreground">Kelola batas pengeluaran bulanan per kategori</p>
        </div>
        {hasUnsetCategories && (
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Set Budget
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Belum ada budget"
          description="Set batas pengeluaran per kategori agar kamu bisa pantau anggaran bulanan."
          action={
            <Button size="sm" onClick={openAdd} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Set Budget Pertama
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => {
            const cat = allCategories.find((c) => c.name === b.category)
            const pct = Math.min(Math.round(b.ratio * 100), 100)
            const sisa = Math.max(b.amount - b.spent, 0)
            return (
              <Card key={b.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-sm">{cat?.label ?? b.category}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", getBudgetBadgeClass(b.ratio))}>
                        {pct}%
                      </span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(b)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Progress
                      value={pct}
                      className={cn("h-2", b.ratio >= 1 ? "[&>div]:bg-red-500" : b.ratio >= 0.8 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500")}
                    />
                    <p className="text-xs text-muted-foreground">
                      {b.ratio >= 1
                        ? `Melebihi budget ${formatCurrency(b.spent - b.amount)}`
                        : `Sisa ${formatCurrency(sisa)}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <BudgetModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        existing={editing}
        takenCategories={takenCategories}
        onSave={handleSave}
      />
    </div>
  )
}
