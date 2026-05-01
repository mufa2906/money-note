"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AmountInput } from "@/components/common/amount-input"
import { useToast } from "@/lib/hooks/use-toast"
import { useTransactions } from "@/lib/hooks/use-transactions"
import { formatCurrency } from "@/lib/utils"

interface CreateSplitBillModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateSplitBillModal({ open, onOpenChange, onSuccess }: CreateSplitBillModalProps) {
  const { toast } = useToast()
  const { transactions } = useTransactions()
  const [submitting, setSubmitting] = useState(false)
  const [transactionId, setTransactionId] = useState("")
  const [targetName, setTargetName] = useState("")
  const [targetContact, setTargetContact] = useState("")
  const [splitAmount, setSplitAmount] = useState("")

  const expenseTransactions = transactions.filter((t) => t.type === "expense")
  const selectedTxn = expenseTransactions.find((t) => t.id === transactionId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!transactionId || !targetName || !splitAmount) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/split-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, targetName, targetContact, splitAmount: Number(splitAmount) }),
      })
      if (!res.ok) throw new Error("Gagal membuat tagihan")
      toast({ title: "Tagihan dibuat!", description: `${targetName} berutang ${formatCurrency(Number(splitAmount))}.` })
      setTransactionId(""); setTargetName(""); setTargetContact(""); setSplitAmount("")
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      toast({ title: "Gagal", description: String(e), variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bagi Tagihan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Pilih Transaksi</Label>
            <Select value={transactionId} onValueChange={setTransactionId} required>
              <SelectTrigger>
                <SelectValue placeholder="Pilih transaksi pengeluaran" />
              </SelectTrigger>
              <SelectContent>
                {expenseTransactions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Belum ada transaksi pengeluaran</div>
                ) : (
                  expenseTransactions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="truncate">{t.description}</span>
                      <span className="ml-2 text-muted-foreground text-xs">{formatCurrency(t.amount)}</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedTxn && (
              <p className="text-xs text-muted-foreground">Total: {formatCurrency(selectedTxn.amount)}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="target-name">Nama Orang</Label>
            <Input id="target-name" placeholder="Budi, Sari, dll." value={targetName} onChange={(e) => setTargetName(e.target.value)} required />
          </div>

          <div className="space-y-1">
            <Label htmlFor="target-contact">Kontak (opsional)</Label>
            <Input id="target-contact" placeholder="No. HP / username" value={targetContact} onChange={(e) => setTargetContact(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="split-amount">Jumlah Tagihan</Label>
            <AmountInput
              id="split-amount"
              placeholder={selectedTxn ? String(Math.round(selectedTxn.amount / 2)) : "50.000"}
              value={splitAmount}
              onChange={setSplitAmount}
              required
            />
            {selectedTxn && splitAmount && (
              <p className="text-xs text-muted-foreground">
                Kamu menanggung: {formatCurrency(selectedTxn.amount - Number(splitAmount))}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={submitting || !transactionId || !targetName || !splitAmount}>
            {submitting ? "Menyimpan..." : "Buat Tagihan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
