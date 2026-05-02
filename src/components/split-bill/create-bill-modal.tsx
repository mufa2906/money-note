"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Camera, FolderOpen, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/lib/hooks/use-toast"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateBillModal({ open, onOpenChange }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  async function createEmpty() {
    if (!title.trim()) {
      toast({ title: "Isi judul tagihan dulu", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined }),
      })
      if (!res.ok) throw new Error("Gagal membuat")
      const created = await res.json()
      onOpenChange(false)
      setTitle("")
      setDescription("")
      router.push(`/dashboard/split-bill/${created.id}`)
    } catch (e) {
      toast({ title: "Gagal", description: String(e), variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  async function uploadAndScan(file: File) {
    setOcrLoading(true)
    try {
      const buf = await file.arrayBuffer()
      const base64 = Buffer.from(buf).toString("base64")
      const ocrRes = await fetch("/api/bills/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      })
      if (!ocrRes.ok) {
        const err = await ocrRes.json().catch(() => ({}))
        throw new Error(err?.error ?? "Gagal scan struk")
      }
      const parsed = await ocrRes.json()

      const billRes = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || parsed.title || "Tagihan tanpa judul",
          description: description.trim() || undefined,
          charges: parsed.charges ?? [],
        }),
      })
      if (!billRes.ok) throw new Error("Gagal membuat tagihan")
      const newBill = await billRes.json()

      if (Array.isArray(parsed.items)) {
        for (const item of parsed.items) {
          await fetch(`/api/bills/${newBill.id}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: item.name, price: item.price, originalPrice: item.originalPrice ?? null, qty: item.qty ?? 1 }),
          })
        }
      }

      onOpenChange(false)
      setTitle("")
      toast({ title: "Struk berhasil di-scan", description: `${parsed.items?.length ?? 0} item terdeteksi` })
      setDescription("")
      router.push(`/dashboard/split-bill/${newBill.id}`)
    } catch (e) {
      toast({ title: "Gagal scan struk", description: String(e), variant: "destructive" })
    } finally {
      setOcrLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !ocrLoading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tagihan Baru</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="bill-title">Judul</Label>
            <Input
              id="bill-title"
              placeholder="Makan di Sushi Tei, Belanja Indomaret, dll."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bill-desc">Tujuan / Keterangan <span className="text-muted-foreground font-normal">(opsional)</span></Label>
            <Input
              id="bill-desc"
              placeholder="Ulang tahun, reuni, dinner kantor, dll."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadAndScan(file)
              e.target.value = ""
            }}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadAndScan(file)
              e.target.value = ""
            }}
          />

          <div className="grid gap-2">
            {ocrLoading ? (
              <Button variant="outline" disabled className="w-full">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning struk...
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => cameraRef.current?.click()}
                  disabled={submitting}
                  className="w-full"
                >
                  <Camera className="h-4 w-4 mr-2" /> Foto Langsung
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={submitting}
                  className="w-full"
                >
                  <FolderOpen className="h-4 w-4 mr-2" /> Upload
                </Button>
              </div>
            )}
            <Button onClick={createEmpty} disabled={submitting || ocrLoading} className="w-full">
              {submitting ? "Membuat..." : "Buat Tagihan Kosong"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Foto struk → otomatis ekstrak menu, service charge, dan PPN dengan AI
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
