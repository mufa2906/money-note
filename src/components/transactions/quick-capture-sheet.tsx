"use client"

import { useState, useRef } from "react"
import { Loader2, Sparkles, PenLine } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { useAccounts } from "@/lib/hooks/use-accounts"
import { AddTransactionModal, type TransactionInitialValues } from "@/components/transactions/add-transaction-modal"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"

interface QuickCaptureSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CAT_LABELS: Record<string, string> = {
  makanan: "Makanan", transportasi: "Transportasi", belanja: "Belanja",
  hiburan: "Hiburan", tagihan: "Tagihan", kesehatan: "Kesehatan",
  pendidikan: "Pendidikan", gaji: "Gaji", lainnya: "Lainnya",
}

export function QuickCaptureSheet({ open, onOpenChange }: QuickCaptureSheetProps) {
  const { accounts } = useAccounts()
  const [text, setText] = useState("")
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<TransactionInitialValues | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.accountName }))

  async function handleParse() {
    if (!text.trim() || parsing) return
    setParsing(true)
    setParsed(null)
    try {
      const res = await fetch("/api/transactions/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), accounts: accountOptions }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setParsed({
        description: data.description,
        amount: data.amount ?? "",
        type: data.type,
        category: data.category,
        walletAccountId: data.walletAccountId ?? "",
      })
    } catch {
      // On failure, open form pre-filled with just the description
      openForm({ description: text.trim() })
    } finally {
      setParsing(false)
    }
  }

  function openForm(values?: TransactionInitialValues) {
    onOpenChange(false)
    setTimeout(() => {
      setFormOpen(true)
    }, 150)
    if (values) setParsed(values)
  }

  function handleConfirm() {
    if (!parsed) return
    openForm(parsed)
  }

  function handleClose(v: boolean) {
    onOpenChange(v)
    if (!v) {
      setText("")
      setParsed(null)
    }
  }

  const matchedAccount = parsed?.walletAccountId
    ? accounts.find((a) => a.id === parsed.walletAccountId)
    : null

  return (
    <>
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="px-4 pb-8">
          <DrawerHeader className="px-0 pb-3">
            <DrawerTitle className="text-base">Catat Transaksi</DrawerTitle>
          </DrawerHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => { setText(e.target.value); setParsed(null) }}
                onKeyDown={(e) => e.key === "Enter" && handleParse()}
                placeholder="bakso 25rb BCA, gaji 3jt..."
                className="flex-1 rounded-lg border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <Button onClick={handleParse} disabled={!text.trim() || parsing} size="icon" className="h-12 w-12 shrink-0">
                {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              </Button>
            </div>

            {parsed && (
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Hasil parse</span>
                  <span className={cn("text-xs font-medium", parsed.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-500")}>
                    {parsed.type === "income" ? "Pemasukan" : "Pengeluaran"}
                  </span>
                </div>
                <p className="font-semibold text-lg">{parsed.amount ? formatCurrency(Number(parsed.amount)) : "—"}</p>
                <p className="text-sm text-muted-foreground">{parsed.description}</p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {parsed.category && <span className="rounded-full bg-background border px-2 py-0.5">{CAT_LABELS[parsed.category] ?? parsed.category}</span>}
                  {matchedAccount && <span className="rounded-full bg-background border px-2 py-0.5">{matchedAccount.accountName}</span>}
                </div>
                <Button className="w-full mt-1" onClick={handleConfirm}>
                  Simpan
                </Button>
              </div>
            )}

            <button
              onClick={() => openForm({ description: text.trim() || undefined })}
              className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <PenLine className="h-3.5 w-3.5" />
              Pakai form lengkap
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <AddTransactionModal
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValues={parsed ?? undefined}
        onSuccess={() => { setFormOpen(false); setText(""); setParsed(null) }}
      />
    </>
  )
}
