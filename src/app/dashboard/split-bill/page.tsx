"use client"

import { useState } from "react"
import { CheckCircle2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/common/empty-state"
import { CurrencyDisplay } from "@/components/common/currency-display"
import { CreateSplitBillModal } from "@/components/split-bill/create-split-bill-modal"
import { useSplitBills } from "@/lib/hooks/use-split-bills"
import { formatDate, getInitials } from "@/lib/utils"
import { useToast } from "@/lib/hooks/use-toast"
import type { SplitBill } from "@/types"

export default function SplitBillPage() {
  const { splitBills, loading, refetch, markPaid } = useSplitBills()
  const [createOpen, setCreateOpen] = useState(false)
  const unpaid = splitBills.filter((s) => s.status === "unpaid")
  const paid = splitBills.filter((s) => s.status === "paid")

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Bagi Tagihan</h1>
            <p className="text-sm text-muted-foreground">{unpaid.length} tagihan belum lunas</p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Bagi Tagihan
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : (
          <Tabs defaultValue="unpaid">
            <TabsList>
              <TabsTrigger value="unpaid">Belum Lunas ({unpaid.length})</TabsTrigger>
              <TabsTrigger value="paid">Sudah Lunas ({paid.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="unpaid" className="space-y-3 mt-4">
              {unpaid.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Semua tagihan sudah lunas!" description="Tidak ada tagihan yang belum dibayar." />
              ) : (
                unpaid.map((split) => <SplitCard key={split.id} split={split} onMarkPaid={markPaid} onDeleted={refetch} />)
              )}
            </TabsContent>

            <TabsContent value="paid" className="space-y-3 mt-4">
              {paid.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Belum ada tagihan lunas" description="Tagihan yang sudah lunas akan muncul di sini." />
              ) : (
                paid.map((split) => <SplitCard key={split.id} split={split} onMarkPaid={markPaid} onDeleted={refetch} />)
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
      <CreateSplitBillModal open={createOpen} onOpenChange={setCreateOpen} onSuccess={refetch} />
    </>
  )
}

function SplitCard({ split, onMarkPaid, onDeleted }: { split: SplitBill; onMarkPaid: (id: string) => Promise<void>; onDeleted: () => void }) {
  const { toast } = useToast()

  async function handleDelete() {
    try {
      const res = await fetch(`/api/split-bills?id=${split.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Gagal menghapus")
      toast({ title: "Tagihan dihapus" })
      onDeleted()
    } catch (e) {
      toast({ title: "Gagal", description: String(e), variant: "destructive" })
    }
  }

  function handleReminder() {
    const amount = split.splitAmount.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
    const text = `Halo ${split.targetName}, mengingatkan tagihan sebesar ${amount} untuk "${split.transactionDescription}". Mohon segera dilunasi. Terima kasih!`
    const phone = split.targetContact ? split.targetContact.replace(/\D/g, "") : ""
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank")
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(split.targetName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-sm">{split.targetName}</p>
              <Badge variant={split.status === "paid" ? "default" : "secondary"} className="text-xs py-0 px-1.5 h-4">
                {split.status === "paid" ? "Lunas" : "Belum Dibayar"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{split.transactionDescription}</p>
            <p className="text-xs text-muted-foreground">{split.targetContact || "Tidak ada kontak"} · {formatDate(split.createdAt)}</p>
          </div>
          <CurrencyDisplay amount={split.splitAmount} className="text-sm flex-shrink-0" />
        </div>
        <div className="mt-3 flex gap-2">
          {split.status === "unpaid" && (
            <>
              <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={handleReminder}>
                Kirim Pengingat
              </Button>
              <Button size="sm" className="h-7 text-xs flex-1" onClick={() => onMarkPaid(split.id)}>
                Tandai Lunas
              </Button>
            </>
          )}
          {split.status === "paid" && (
            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive" onClick={handleDelete}>
              Hapus
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
