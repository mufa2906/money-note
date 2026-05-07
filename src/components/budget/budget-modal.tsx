"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AmountInput } from "@/components/common/amount-input"
import { useToast } from "@/lib/hooks/use-toast"
import { useCategories } from "@/lib/hooks/use-categories"
import { useSubcategories } from "@/lib/hooks/use-subcategories"
import { BUILTIN_CATEGORIES } from "@/components/common/category-icon"
import { cn } from "@/lib/utils"
import type { BudgetWithSpent } from "@/lib/hooks/use-budgets"

interface BudgetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existing?: BudgetWithSpent | null
  takenKeys?: string[]
  onSave: (category: string, amount: number, subcategory?: string | null) => Promise<void>
}

export function BudgetModal({ open, onOpenChange, existing, takenKeys = [], onSave }: BudgetModalProps) {
  const { toast } = useToast()
  const { categories: dbCategories } = useCategories()
  const { subcategoriesByCategory } = useSubcategories()
  const allCategories = dbCategories.length > 0 ? dbCategories : BUILTIN_CATEGORIES

  const [level, setLevel] = useState<"category" | "subcategory">("category")
  const [category, setCategory] = useState("")
  const [subcategory, setSubcategory] = useState("")
  const [amount, setAmount] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (existing) {
        setLevel(existing.subcategory ? "subcategory" : "category")
        setCategory(existing.category)
        setSubcategory(existing.subcategory ?? "")
        setAmount(String(existing.amount))
      } else {
        setLevel("category")
        setCategory("")
        setSubcategory("")
        setAmount("")
      }
    }
  }, [open, existing])

  const subcategoriesForCategory = category ? (subcategoriesByCategory[category] ?? []) : []

  // filter already-taken entries (key = "cat" or "cat:subcat")
  const availableCategories = allCategories.filter((c) => {
    const key = c.name
    return !takenKeys.includes(key) || c.name === existing?.category
  })

  const availableSubcategories = subcategoriesForCategory.filter((s) => {
    const key = `${category}:${s.name}`
    return !takenKeys.includes(key) || (existing?.category === category && existing?.subcategory === s.name)
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!category || !amount || Number(amount) <= 0) return
    if (level === "subcategory" && !subcategory) return
    setSaving(true)
    try {
      await onSave(category, Number(amount), level === "subcategory" ? subcategory : null)
      toast({ title: existing ? "Budget diperbarui!" : "Budget disimpan!" })
      onOpenChange(false)
    } catch (err) {
      toast({ title: "Gagal", description: String(err), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const isEditing = !!existing

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Budget" : "Set Budget"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Level selector */}
          {!isEditing && (
            <div className="grid grid-cols-2 gap-2">
              {(["category", "subcategory"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => { setLevel(l); setSubcategory("") }}
                  className={cn(
                    "rounded-md border py-2 text-sm font-medium transition-colors",
                    level === l ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                  )}
                >
                  {l === "category" ? "Per Kategori" : "Per Subkategori"}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <Label>Kategori</Label>
            <Select
              value={category}
              onValueChange={(v) => { setCategory(v); setSubcategory("") }}
              disabled={isEditing}
            >
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

          {level === "subcategory" && (
            <div className="space-y-1">
              <Label>Subkategori</Label>
              <Select value={subcategory} onValueChange={setSubcategory} disabled={isEditing || !category}>
                <SelectTrigger>
                  <SelectValue placeholder={!category ? "Pilih kategori dulu" : "Pilih subkategori"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSubcategories.map((s) => (
                    <SelectItem key={s.name} value={s.name}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label>Budget Bulanan</Label>
            <AmountInput placeholder="500.000" value={amount} onChange={setAmount} />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={saving || !category || !amount || (level === "subcategory" && !subcategory)}
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
