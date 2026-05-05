"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AVAILABLE_ICONS, ICON_MAP } from "@/components/common/category-icon"
import { useToast } from "@/lib/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { UserCategory } from "@/types"

const COLOR_PRESETS = [
  "#f97316", "#ef4444", "#ec4899", "#a855f7", "#6366f1",
  "#3b82f6", "#06b6d4", "#14b8a6", "#22c55e", "#84cc16",
  "#f59e0b", "#78716c", "#64748b", "#f43f5e", "#8b5cf6",
]

interface CategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  category?: UserCategory | null
}

export function CategoryModal({ open, onOpenChange, onSuccess, category }: CategoryModalProps) {
  const { toast } = useToast()
  const [label, setLabel] = useState("")
  const [name, setName] = useState("")
  const [color, setColor] = useState("#3b82f6")
  const [icon, setIcon] = useState("MoreHorizontal")
  const [submitting, setSubmitting] = useState(false)
  const isEdit = !!category

  useEffect(() => {
    if (open) {
      setLabel(category?.label ?? "")
      setName(category?.name ?? "")
      setColor(category?.color ?? "#3b82f6")
      setIcon(category?.icon ?? "MoreHorizontal")
    }
  }, [open, category])

  // Auto-generate slug from label for new categories
  function handleLabelChange(val: string) {
    setLabel(val)
    if (!isEdit) {
      setName(val.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim() || !name.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/categories", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: category?.id, name, label, color, icon }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan")
      toast({ title: isEdit ? "Kategori diperbarui!" : "Kategori ditambahkan!", description: label })
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      toast({ title: "Gagal", description: String(e), variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const PreviewIcon = ICON_MAP[icon] ?? ICON_MAP["MoreHorizontal"]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/40">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${color}26`, color }}
            >
              <PreviewIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-sm">{label || "Nama Kategori"}</p>
              <p className="text-xs text-muted-foreground">{name || "nama_kategori"}</p>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Nama Tampilan</Label>
            <Input
              placeholder="Contoh: Jajan Siang"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>ID Kategori <span className="text-muted-foreground text-xs">(otomatis)</span></Label>
            <Input
              placeholder="jajan_siang"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""))}
              disabled={isEdit}
              className={cn(isEdit && "opacity-60")}
            />
            {isEdit && <p className="text-xs text-muted-foreground">ID tidak bisa diubah karena dipakai di transaksi.</p>}
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <Label>Warna</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn("h-7 w-7 rounded-full border-2 transition-transform", color === c ? "border-foreground scale-110" : "border-transparent")}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div className="space-y-2">
            <Label>Ikon</Label>
            <div className="grid grid-cols-5 gap-2">
              {AVAILABLE_ICONS.map(({ name: iconName, Icon }) => (
                <button
                  key={iconName}
                  type="button"
                  className={cn(
                    "flex items-center justify-center h-9 w-full rounded-lg border transition-colors",
                    icon === iconName ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
                  )}
                  onClick={() => setIcon(iconName)}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting || !label.trim() || !name.trim()}>
            {submitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Kategori"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
