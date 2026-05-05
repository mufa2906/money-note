"use client"

import { useState } from "react"
import { Plus, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CategoryCard } from "@/components/categories/category-card"
import { CategoryModal } from "@/components/categories/category-modal"
import { EmptyState } from "@/components/common/empty-state"
import { LoadingSkeleton } from "@/components/common/loading-skeleton"
import { useCategories } from "@/lib/hooks/use-categories"
import type { UserCategory } from "@/types"

export default function CategoriesPage() {
  const { categories, loading, refetch } = useCategories()
  const [addOpen, setAddOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<UserCategory | null>(null)

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Kategori</h1>
            <p className="text-sm text-muted-foreground">{categories.length} kategori</p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        </div>

        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="Belum ada kategori"
            description="Tambahkan kategori untuk mengorganisir transaksimu."
            action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Tambah Kategori</Button>}
          />
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onDeleted={refetch}
                onEdit={setEditCategory}
              />
            ))}
          </div>
        )}
      </div>

      <CategoryModal open={addOpen} onOpenChange={setAddOpen} onSuccess={refetch} />
      <CategoryModal
        category={editCategory}
        open={!!editCategory}
        onOpenChange={(o) => { if (!o) setEditCategory(null) }}
        onSuccess={refetch}
      />
    </>
  )
}
