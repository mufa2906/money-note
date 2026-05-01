"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AmountInput } from "@/components/common/amount-input"
import { useToast } from "@/lib/hooks/use-toast"
import { useAccounts } from "@/lib/hooks/use-accounts"

const ACCOUNT_TYPES = [
  { value: "bank", label: "Bank" },
  { value: "ewallet", label: "E-Wallet" },
  { value: "cash", label: "Tunai" },
]

const PRESET_COLORS = ["#1e40af", "#16a34a", "#92400e", "#7c3aed", "#b45309", "#0891b2"]

interface AddAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddAccountModal({ open, onOpenChange, onSuccess }: AddAccountModalProps) {
  const { toast } = useToast()
  const { refetch: refetchAccounts } = useAccounts()
  const [submitting, setSubmitting] = useState(false)
  const [accountType, setAccountType] = useState("")
  const [accountName, setAccountName] = useState("")
  const [balance, setBalance] = useState("")
  const [color, setColor] = useState(PRESET_COLORS[0])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accountType || !accountName) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountType, accountName, balance: Number(balance) || 0, color, icon: accountType === "bank" ? "Building2" : accountType === "ewallet" ? "Wallet" : "Banknote" }),
      })
      if (!res.ok) throw new Error("Gagal menambahkan akun")
      toast({ title: "Akun ditambahkan!", description: `${accountName} berhasil ditambahkan.` })
      setAccountType(""); setAccountName(""); setBalance(""); setColor(PRESET_COLORS[0])
      onOpenChange(false)
      await refetchAccounts()
      onSuccess?.()
    } catch (e) {
      toast({ title: "Gagal", description: String(e), variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Tambah Akun Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Jenis Akun</Label>
            <Select value={accountType} onValueChange={setAccountType} required>
              <SelectTrigger><SelectValue placeholder="Pilih jenis akun" /></SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="accountName">Nama Akun</Label>
            <Input id="accountName" placeholder="BCA, GoPay, Dompet, dll." value={accountName} onChange={(e) => setAccountName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="balance">Saldo Awal</Label>
            <AmountInput id="balance" placeholder="0" value={balance} onChange={setBalance} />
          </div>
          <div className="space-y-1">
            <Label>Warna</Label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c, borderColor: color === c ? "currentColor" : "transparent" }}
                />
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={submitting || !accountType || !accountName}>
            {submitting ? "Menyimpan..." : "Tambah Akun"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
