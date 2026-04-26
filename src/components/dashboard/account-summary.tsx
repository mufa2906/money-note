"use client"

import Link from "next/link"
import { ArrowRight, Building2, Wallet, Banknote } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/common/empty-state"
import { useAccounts } from "@/lib/hooks/use-accounts"
import { formatCurrency } from "@/lib/utils"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2, Wallet, Banknote,
}

export function AccountSummary() {
  const { accounts, loading } = useAccounts()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Akun Keuangan</CardTitle>
        <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
          <Link href="/dashboard/accounts">
            Kelola <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-0">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))
        ) : accounts.length === 0 ? (
          <EmptyState icon={Wallet} title="Belum ada akun" description="Tambahkan rekening atau dompetmu" />
        ) : (
          accounts.map((acc) => {
            const Icon = ICON_MAP[acc.icon] ?? Wallet
            return (
              <div key={acc.id} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0" style={{ backgroundColor: acc.color + "20", color: acc.color }}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{acc.accountName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{acc.accountType === "ewallet" ? "E-Wallet" : acc.accountType === "bank" ? "Bank" : "Tunai"}</p>
                </div>
                <p className="text-sm font-mono font-semibold tabular-nums">{formatCurrency(acc.balance)}</p>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
