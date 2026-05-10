"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Image, Camera, Receipt, Users, Loader2 } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/lib/hooks/use-toast"
import { useAiStatus } from "@/lib/hooks/use-ai-status"
import { AddTransactionModal, type TransactionInitialValues } from "@/components/transactions/add-transaction-modal"

type Mode = "idle" | "choosing-type" | "ocr-loading" | "transaction-review"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InputMethodSheet({ open, onOpenChange }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const { aiAvailable } = useAiStatus()
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<Mode>("idle")
  const [capturedImage, setCapturedImage] = useState<{ base64: string; mimeType: string } | null>(null)
  const [ocrValues, setOcrValues] = useState<TransactionInitialValues | undefined>(undefined)
  const [txModalOpen, setTxModalOpen] = useState(false)

  function reset() {
    setMode("idle")
    setCapturedImage(null)
    setOcrValues(undefined)
  }

  function handleClose() {
    reset()
    onOpenChange(false)
  }

  async function handleFileSelect(file: File) {
    const buf = await file.arrayBuffer()
    const base64 = Buffer.from(buf).toString("base64")
    setCapturedImage({ base64, mimeType: file.type || "image/jpeg" })
    onOpenChange(false)
    setMode("choosing-type")
  }

  async function handleTypeChoice(type: "transaction" | "splitbill") {
    if (!capturedImage) return

    if (!aiAvailable) {
      // AI off — skip OCR, go straight to empty form / empty bill
      if (type === "transaction") {
        setMode("transaction-review")
        setTxModalOpen(true)
      } else {
        reset()
        try {
          const billRes = await fetch("/api/bills", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Tagihan Baru" }),
          })
          if (!billRes.ok) throw new Error()
          const bill = await billRes.json()
          router.push(`/dashboard/split-bill/${bill.id}`)
        } catch {
          toast({ title: "Gagal membuat tagihan", variant: "destructive" })
        }
      }
      return
    }

    setMode("ocr-loading")

    if (type === "transaction") {
      try {
        const res = await fetch("/api/transactions/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: capturedImage.base64, mimeType: capturedImage.mimeType }),
        })
        if (!res.ok) throw new Error("OCR gagal")
        const data = await res.json()
        setOcrValues({
          amount: data.amount > 0 ? String(data.amount) : "",
          description: data.description ?? "",
          date: data.date ? new Date(data.date) : new Date(),
          category: data.category ?? "",
          type: data.type ?? "expense",
        })
        setMode("transaction-review")
        setTxModalOpen(true)
      } catch {
        toast({ title: "OCR gagal", description: "Gagal membaca gambar. Form diisi manual.", variant: "destructive" })
        setMode("transaction-review")
        setTxModalOpen(true)
      }
    } else {
      try {
        const ocrRes = await fetch("/api/bills/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: capturedImage.base64, mimeType: capturedImage.mimeType }),
        })
        if (!ocrRes.ok) throw new Error("OCR gagal")
        const ocr = await ocrRes.json()

        const billRes = await fetch("/api/bills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: ocr.title || "Tagihan Baru",
            charges: ocr.charges ?? [],
          }),
        })
        if (!billRes.ok) throw new Error("Gagal membuat tagihan")
        const bill = await billRes.json()

        await Promise.all(
          (ocr.items ?? []).map((item: { name: string; price: number; qty: number; originalPrice?: number | null }) =>
            fetch(`/api/bills/${bill.id}/items`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: item.name, price: item.price, qty: item.qty ?? 1, originalPrice: item.originalPrice ?? null }),
            })
          )
        )

        reset()
        router.push(`/dashboard/split-bill/${bill.id}`)
      } catch {
        toast({ title: "OCR gagal", description: "Gagal membaca gambar. Buat tagihan kosong.", variant: "destructive" })
        reset()
        try {
          const billRes = await fetch("/api/bills", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Tagihan Baru" }),
          })
          if (billRes.ok) {
            const bill = await billRes.json()
            router.push(`/dashboard/split-bill/${bill.id}`)
          }
        } catch {
          // silent — user stays on current page
        }
      }
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileSelect(file)
          e.target.value = ""
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileSelect(file)
          e.target.value = ""
        }}
      />

      {/* Pilih metode input */}
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Catat Transaksi</DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-3 gap-3 px-4 pb-8 pt-2">
            <button
              onClick={() => { handleClose(); setOcrValues(undefined); setTxModalOpen(true) }}
              className="flex flex-col items-center gap-2 rounded-xl border p-4 hover:bg-accent transition-colors"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Pencil className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium">Manual</span>
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-xl border p-4 hover:bg-accent transition-colors"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Image className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium">Gambar</span>
              {!aiAvailable && <span className="text-[10px] text-muted-foreground leading-none">manual</span>}
            </button>
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-xl border p-4 hover:bg-accent transition-colors"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium">Kamera</span>
              {!aiAvailable && <span className="text-[10px] text-muted-foreground leading-none">manual</span>}
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Pilih jenis setelah gambar dipilih */}
      <Dialog open={mode === "choosing-type"} onOpenChange={(o) => { if (!o) reset() }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Buat apa dari gambar ini?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleTypeChoice("transaction")}
              className="flex flex-col items-center gap-3 rounded-xl border-2 p-5 hover:border-primary hover:bg-accent transition-colors"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Transaksi</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {aiAvailable ? "Catat pengeluaran dari struk" : "Catat manual dari foto"}
                </p>
              </div>
            </button>
            <button
              onClick={() => handleTypeChoice("splitbill")}
              className="flex flex-col items-center gap-3 rounded-xl border-2 p-5 hover:border-primary hover:bg-accent transition-colors"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Bagi Tagihan</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {aiAvailable ? "Bagi ke beberapa orang" : "Buat tagihan manual"}
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading OCR */}
      <Dialog open={mode === "ocr-loading"} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-xs">
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Memproses gambar...</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Form transaksi (manual atau dari OCR) */}
      <AddTransactionModal
        open={txModalOpen}
        onOpenChange={(o) => {
          setTxModalOpen(o)
          if (!o) reset()
        }}
        initialValues={ocrValues}
      />
    </>
  )
}
