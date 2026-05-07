"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { useToast } from "@/lib/hooks/use-toast"
import { useSubcategories } from "@/lib/hooks/use-subcategories"
import type { UserSubcategory } from "@/types"

interface SubcategorySectionProps {
  categoryName: string
  subcategories: UserSubcategory[]
}

export function SubcategorySection({ categoryName, subcategories }: SubcategorySectionProps) {
  const { toast } = useToast()
  const { refetch } = useSubcategories()
  const [expanded, setExpanded] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleRenameConfirm(sub: UserSubcategory) {
    if (!editLabel.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/subcategories/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: editLabel.trim() }),
      })
      if (!res.ok) throw new Error("Gagal menyimpan")
      await refetch()
      setEditingId(null)
    } catch (e) {
      toast({ title: "Gagal", description: String(e), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/subcategories/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal menghapus")
      await refetch()
    } catch (e) {
      toast({ title: "Gagal", description: String(e), variant: "destructive" })
    }
  }

  async function handleAddConfirm() {
    if (!newLabel.trim()) return
    setSaving(true)
    try {
      const name = newLabel.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
      const res = await fetch("/api/subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryName, name: name || `sub_${Date.now()}`, label: newLabel.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Gagal menambah")
      }
      await refetch()
      setAddingNew(false)
      setNewLabel("")
    } catch (e) {
      toast({ title: "Gagal", description: String(e), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const deletingItem = subcategories.find((s) => s.id === deletingId)

  return (
    <div className="border-t">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:text-foreground w-full text-left transition-colors"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {subcategories.length} subkategori
      </button>

      {expanded && (
        <div className="pb-2 px-3 space-y-1">
          {subcategories.map((s) => (
            <div key={s.id} className="flex items-center gap-2 py-1">
              {editingId === s.id ? (
                <>
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRenameConfirm(s); if (e.key === "Escape") setEditingId(null) }}
                    className="h-7 text-xs flex-1"
                    autoFocus
                    disabled={saving}
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRenameConfirm(s)} disabled={saving}>
                    <Check className="h-3 w-3 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)} disabled={saving}>
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-xs">{s.label}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => { setEditingId(s.id); setEditLabel(s.label) }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  {s.name !== "dll" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeletingId(s.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}

          {addingNew ? (
            <div className="flex items-center gap-2 py-1">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddConfirm(); if (e.key === "Escape") { setAddingNew(false); setNewLabel("") } }}
                placeholder="Nama subkategori"
                className="h-7 text-xs flex-1"
                autoFocus
                disabled={saving}
              />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddConfirm} disabled={saving}>
                <Check className="h-3 w-3 text-green-600" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setAddingNew(false); setNewLabel("") }} disabled={saving}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingNew(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
            >
              <Plus className="h-3 w-3" /> Tambah subkategori
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => { if (!o) setDeletingId(null) }}
        title="Hapus subkategori?"
        description={`"${deletingItem?.label}" akan dihapus. Transaksi yang sudah menggunakannya tidak terpengaruh.`}
        confirmText="Hapus"
        destructive
        onConfirm={() => { if (deletingId) handleDelete(deletingId); setDeletingId(null) }}
      />
    </div>
  )
}
