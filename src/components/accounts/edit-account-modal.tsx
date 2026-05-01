"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AmountInput } from "@/components/common/amount-input"
import { useToast } from "@/lib/hooks/use-toast"
import { useAccounts } from "@/lib/hooks/use-accounts"
import type { Account } from "@/types"

const PRESET_COLORS = ["#1e40af", "#16a34a", "#92400e", "#7c3aed", "#b45309", "#0891b2"]

interface EditAccountModalProps {
  account: Account | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditAccountModal({ account, open, onOpenChange, onSuccess }: EditAccountModalProps) {
  const { toast } = useToast()
  const { refetch: refetchAccounts } = useAccounts()
  const [submitting, setSubmitting] = useState(false)
  const [accountName, setAccountName] = useState("")
  const [balance, setBalance] = useState("")
  const [color, setColor] = useState(PRESET_COLORS[0])

  useEffect(() => {
    if (account) {
      setAccountName(account.accountName)
      setBalance(String(account.balance))
      setColor(account.color)
    }
  }, [account])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!account || !accountName) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: account.id, accountName, balance: Number(balance) || 0, color }),
      })
      if (!res.ok) throw new Error("Gagal menyimpan perubahan")
      toast({ title: "Akun diperbarui!", description: `${accountName} berhasil diperbarui.` })
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
          <DialogTitle>Edit Akun</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="edit-name">Nama Akun</Label>
            <Input id="edit-name" value={accountName} onChange={(e) => setAccountName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-balance">Saldo</Label>
            <AmountInput id="edit-balance" value={balance} onChange={setBalance} />
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
          <Button type="submit" className="w-full" disabled={submitting || !accountName}>
            {submitting ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
