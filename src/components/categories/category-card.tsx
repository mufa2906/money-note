"use client"

import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CategoryIcon } from "@/components/common/category-icon"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { SubcategorySection } from "@/components/categories/subcategory-section"
import { useToast } from "@/lib/hooks/use-toast"
import { useSubcategories } from "@/lib/hooks/use-subcategories"
import type { UserCategory } from "@/types"

interface CategoryCardProps {
  category: UserCategory
  onDeleted?: () => void
  onEdit?: (category: UserCategory) => void
}

export function CategoryCard({ category, onDeleted, onEdit }: CategoryCardProps) {
  const { toast } = useToast()
  const { subcategoriesByCategory } = useSubcategories()
  const subcategories = subcategoriesByCategory[category.name] ?? []
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function handleDelete() {
    try {
      const res = await fetch(`/api/categories?id=${category.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal menghapus")
      toast({ title: "Kategori dihapus", description: category.label })
      onDeleted?.()
    } catch (e) {
      toast({ title: "Gagal", description: String(e), variant: "destructive" })
    }
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <CategoryIcon category={category.name} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{category.label}</p>
          <p className="text-xs text-muted-foreground">{category.name}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onEdit?.(category)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <SubcategorySection categoryName={category.name} subcategories={subcategories} />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus kategori?"
        description={`Kategori "${category.label}" akan dihapus. Tidak bisa dihapus jika masih ada transaksi yang menggunakannya.`}
        confirmText="Hapus"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}
