"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Receipt, ChevronRight, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/common/empty-state"
import { CurrencyDisplay } from "@/components/common/currency-display"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { CreateBillModal } from "@/components/split-bill/create-bill-modal"
import { useBills } from "@/lib/hooks/use-bills"
import { formatDate } from "@/lib/utils"
import { useToast } from "@/lib/hooks/use-toast"
import type { Bill } from "@/types"

export default function SplitBillPage() {
  const { bills, loading, refetch } = useBills()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Bagi Tagihan</h1>
            <p className="text-sm text-muted-foreground">{bills.length} tagihan</p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Tagihan Baru
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : bills.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Belum ada tagihan"
            description="Bikin tagihan baru, foto struk atau input manual, lalu bagi ke teman-teman."
          />
        ) : (
          <div className="space-y-2">
            {bills.map((b) => <BillCard key={b.id} bill={b} onDeleted={refetch} />)}
          </div>
        )}
      </div>
      <CreateBillModal open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}

function BillCard({ bill, onDeleted }: { bill: Bill; onDeleted: () => void }) {
  const { toast } = useToast()
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function handleDelete() {
    const res = await fetch(`/api/bills/${bill.id}`, { method: "DELETE" })
    if (!res.ok) {
      toast({ title: "Gagal hapus", variant: "destructive" })
      return
    }
    toast({ title: "Tagihan dihapus" })
    onDeleted()
  }

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/split-bill/${bill.id}`} className="flex-1 min-w-0 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary flex-shrink-0">
              <Receipt className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{bill.title}</p>
              <p className="text-xs text-muted-foreground">{formatDate(bill.createdAt)}</p>
            </div>
            <CurrencyDisplay amount={bill.serviceCharge + bill.tax} className="text-xs text-muted-foreground" />
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
            aria-label="Hapus tagihan"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus tagihan?"
        description={`"${bill.title}" akan dihapus beserta semua item dan peserta. Tidak bisa dibatalkan.`}
        confirmText="Hapus"
        destructive
        onConfirm={handleDelete}
      />
    </Card>
  )
}
