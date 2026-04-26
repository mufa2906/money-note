"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AccountCard } from "@/components/accounts/account-card"
import { AddAccountModal } from "@/components/accounts/add-account-modal"
import { EditAccountModal } from "@/components/accounts/edit-account-modal"
import { EmptyState } from "@/components/common/empty-state"
import { LoadingSkeleton } from "@/components/common/loading-skeleton"
import { useAccounts } from "@/lib/hooks/use-accounts"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Wallet } from "lucide-react"
import type { Account } from "@/types"

export default function AccountsPage() {
  const { accounts, loading, refetch } = useAccounts()
  const [addOpen, setAddOpen] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Akun Keuangan</h1>
            <p className="text-sm text-muted-foreground">Total: {formatCurrency(totalBalance)}</p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Akun
          </Button>
        </div>

        {loading ? (
          <LoadingSkeleton rows={3} />
        ) : accounts.length === 0 ? (
          <EmptyState icon={Wallet} title="Belum ada akun" description="Tambahkan rekening bank, e-wallet, atau dompet tunaimu." action={
            <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Tambah Akun</Button>
          } />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((acc) => (
                <AccountCard key={acc.id} account={acc} onDeleted={refetch} onEdit={setEditAccount} />
              ))}
            </div>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-3">Distribusi Saldo</p>
                <div className="space-y-2">
                  {accounts.map((acc) => {
                    const pct = totalBalance > 0 ? Math.round((acc.balance / totalBalance) * 100) : 0
                    return (
                      <div key={acc.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{acc.accountName}</span>
                          <span className="font-mono">{pct}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: acc.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <AddAccountModal open={addOpen} onOpenChange={setAddOpen} onSuccess={refetch} />
      <EditAccountModal account={editAccount} open={!!editAccount} onOpenChange={(o) => { if (!o) setEditAccount(null) }} onSuccess={refetch} />
    </>
  )
}
