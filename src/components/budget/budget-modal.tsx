"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AmountInput } from "@/components/common/amount-input"
import { useToast } from "@/lib/hooks/use-toast"
import { useCategories } from "@/lib/hooks/use-categories"
import { BUILTIN_CATEGORIES } from "@/components/common/category-icon"
import type { BudgetWithSpent } from "@/lib/hooks/use-budgets"

interface BudgetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existing?: BudgetWithSpent | null
  takenCategories?: string[]
  onSave: (category: string, amount: number) => Promise<void>
}

export function BudgetModal({ open, onOpenChange, existing, takenCategories = [], onSave }: BudgetModalProps) {
  const { toast } = useToast()
  const { categories: dbCategories } = useCategories()
  const allCategories = dbCategories.length > 0 ? dbCategories : BUILTIN_CATEGORIES
  const [category, setCategory] = useState("")
  const [amount, setAmount] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setCategory(existing?.category ?? "")
      setAmount(existing ? String(existing.amount) : "")
    }
  }, [open, existing])

  const availableCategories = allCategories.filter(
    (c) => !takenCategories.includes(c.name) || c.name === existing?.category,
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!category || !amount || Number(amount) <= 0) return
    setSaving(true)
    try {
      await onSave(category, Number(amount))
      toast({ title: existing ? "Budget diperbarui!" : "Budget disimpan!" })
      onOpenChange(false)
    } catch (err) {
      toast({ title: "Gagal", description: String(err), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Budget" : "Set Budget Kategori"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Kategori</Label>
            <Select value={category} onValueChange={setCategory} disabled={!!existing}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((c) => (
                  <SelectItem key={c.name} value={c.name}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Budget Bulanan</Label>
            <AmountInput
              placeholder="500.000"
              value={amount}
              onChange={setAmount}
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving || !category || !amount}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
