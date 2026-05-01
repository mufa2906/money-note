"use client"

import { useState } from "react"
import { Building2, Wallet, Banknote, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { formatCurrency } from "@/lib/utils"
import type { Account } from "@/types"
import { useToast } from "@/lib/hooks/use-toast"
import { useAccounts } from "@/lib/hooks/use-accounts"
import { useTransactions } from "@/lib/hooks/use-transactions"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2, Wallet, Banknote,
}

const TYPE_LABELS: Record<string, string> = {
  bank: "Bank", ewallet: "E-Wallet", cash: "Tunai",
}

interface AccountCardProps {
  account: Account
  onDeleted?: () => void
  onEdit?: (account: Account) => void
}

export function AccountCard({ account: acc, onDeleted, onEdit }: AccountCardProps) {
  const Icon = ICON_MAP[acc.icon] ?? Wallet
  const { toast } = useToast()
  const { refetch: refetchAccounts } = useAccounts()
  const { refetch: refetchTransactions } = useTransactions()
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function handleDelete() {
    try {
      const res = await fetch(`/api/accounts?id=${acc.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Gagal menghapus akun")
      toast({ title: "Akun dihapus", description: `${acc.accountName} telah dihapus.` })
      await Promise.all([refetchAccounts(), refetchTransactions()])
      onDeleted?.()
    } catch (e) {
      toast({ title: "Gagal", description: String(e), variant: "destructive" })
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-2" style={{ backgroundColor: acc.color }} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: acc.color + "20", color: acc.color }}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{acc.accountName}</p>
              <Badge variant="secondary" className="text-xs py-0 px-1.5 h-4">{TYPE_LABELS[acc.accountType]}</Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(acc)}>
                <Pencil className="h-4 w-4 mr-2" />Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onSelect={(e) => {
                  e.preventDefault()
                  setConfirmOpen(true)
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-2xl font-bold font-mono tabular-nums">{formatCurrency(acc.balance)}</p>
        <p className="text-xs text-muted-foreground mt-1">Saldo tersedia</p>
      </CardContent>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus akun?"
        description={`Akun "${acc.accountName}" beserta semua transaksinya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`}
        confirmText="Hapus"
        destructive
        onConfirm={handleDelete}
      />
    </Card>
  )
}
