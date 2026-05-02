"use client"

import { use, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, MessageCircle, Check, Receipt, Users, Pencil, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AmountInput } from "@/components/common/amount-input"
import { CurrencyDisplay } from "@/components/common/currency-display"
import { useBill } from "@/lib/hooks/use-bills"
import { useToast } from "@/lib/hooks/use-toast"
import { computeBreakdown, billGrandTotal } from "@/lib/bill-utils"
import { formatCurrency } from "@/lib/utils"
import type { BillItem, BillParticipant, ParticipantBreakdown } from "@/types"

export default function BillEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { bill, loading, refetch } = useBill(id)
  const { toast } = useToast()
  const router = useRouter()
  const [titleEdit, setTitleEdit] = useState<string | null>(null)

  const breakdowns = useMemo(() => (bill ? computeBreakdown(bill) : []), [bill])

  if (loading) return <Skeleton className="h-96 w-full" />
  if (!bill) {
    return (
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/split-bill"><ArrowLeft className="h-4 w-4 mr-1" /> Kembali</Link>
        </Button>
        <p className="text-sm text-muted-foreground">Tagihan tidak ditemukan.</p>
      </div>
    )
  }

  async function patchBill(updates: Record<string, unknown>) {
    const res = await fetch(`/api/bills/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    if (!res.ok) {
      toast({ title: "Gagal simpan", variant: "destructive" })
      return
    }
    await refetch()
  }

  async function saveTitle() {
    if (titleEdit === null || !titleEdit.trim()) {
      setTitleEdit(null)
      return
    }
    await patchBill({ title: titleEdit.trim() })
    setTitleEdit(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/dashboard/split-bill"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          {titleEdit !== null ? (
            <div className="flex items-center gap-1">
              <Input
                value={titleEdit}
                onChange={(e) => setTitleEdit(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveTitle() }}
                autoFocus
                className="h-8 text-base font-bold"
              />
              <Button size="icon" className="h-8 w-8" onClick={saveTitle}><Check className="h-3.5 w-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setTitleEdit(null)}><X className="h-3.5 w-3.5" /></Button>
            </div>
          ) : (
            <button onClick={() => setTitleEdit(bill.title)} className="flex items-center gap-1.5 group">
              <h1 className="text-xl font-bold truncate">{bill.title}</h1>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </button>
          )}
          <p className="text-xs text-muted-foreground">Total: {formatCurrency(billGrandTotal(bill))}</p>
        </div>
      </div>

      <ItemsSection
        items={bill.items}
        participants={bill.participants}
        billId={id}
        onChange={refetch}
      />

      <ChargesSection
        serviceCharge={bill.serviceCharge}
        tax={bill.tax}
        onSave={(sc, tx) => patchBill({ serviceCharge: sc, tax: tx })}
      />

      <ParticipantsSection
        participants={bill.participants}
        billId={id}
        onChange={refetch}
      />

      {breakdowns.length > 0 && (
        <BreakdownSection breakdowns={breakdowns} billTitle={bill.title} onChange={refetch} />
      )}
    </div>
  )
}

function ItemsSection({ items, participants, billId, onChange }: { items: BillItem[]; participants: BillParticipant[]; billId: string; onChange: () => Promise<void> | void }) {
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [qty, setQty] = useState("1")

  async function addItem() {
    if (!name.trim() || !price) return
    await fetch(`/api/bills/${billId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), price: Number(price), qty: Number(qty) || 1 }),
    })
    setName(""); setPrice(""); setQty("1"); setAddOpen(false)
    await onChange()
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" /> Menu / Item</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAddOpen((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" /> Tambah
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {addOpen && (
          <div className="space-y-2 rounded-md border p-3 bg-muted/40">
            <Input placeholder="Nama menu" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <div className="grid grid-cols-2 gap-2">
              <AmountInput placeholder="Harga satuan" value={price} onChange={setPrice} />
              <Input type="number" min={1} placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addItem} className="flex-1">Simpan</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddOpen(false); setName(""); setPrice(""); setQty("1") }}>Batal</Button>
            </div>
          </div>
        )}

        {items.length === 0 && !addOpen && (
          <p className="text-sm text-muted-foreground text-center py-3">Belum ada item. Tambahkan menu yang dipesan.</p>
        )}

        {items.map((item) => (
          <ItemRow key={item.id} item={item} participants={participants} onChange={onChange} />
        ))}
      </CardContent>
    </Card>
  )
}

function ItemRow({ item, participants, onChange }: { item: BillItem; participants: BillParticipant[]; onChange: () => Promise<void> | void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [price, setPrice] = useState(String(item.price))
  const [qty, setQty] = useState(String(item.qty))
  const [popoverOpen, setPopoverOpen] = useState(false)

  const assigned = participants.filter((p) => item.participantIds.includes(p.id))

  async function save() {
    await fetch(`/api/bill-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), price: Number(price), qty: Number(qty) || 1 }),
    })
    setEditing(false)
    await onChange()
  }

  async function deleteItem() {
    await fetch(`/api/bill-items/${item.id}`, { method: "DELETE" })
    await onChange()
  }

  async function toggleParticipant(participantId: string) {
    const next = item.participantIds.includes(participantId)
      ? item.participantIds.filter((p) => p !== participantId)
      : [...item.participantIds, participantId]
    await fetch(`/api/bill-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantIds: next }),
    })
    await onChange()
  }

  if (editing) {
    return (
      <div className="space-y-2 rounded-md border p-3 bg-muted/40">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <AmountInput value={price} onChange={setPrice} />
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={save} className="flex-1">Simpan</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Batal</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 py-2 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{item.name}</p>
          {item.qty > 1 && <span className="text-xs text-muted-foreground">×{item.qty}</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <Users className="h-3 w-3" />
                {assigned.length === 0 ? (
                  <span className="italic">Belum ada peserta</span>
                ) : (
                  assigned.map((a) => a.name).join(", ")
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              {participants.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">Tambahkan peserta dulu.</p>
              ) : (
                participants.map((p) => {
                  const checked = item.participantIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleParticipant(p.id)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-accent rounded-sm"
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center ${checked ? "bg-primary border-primary" : "border-input"}`}>
                        {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span className="truncate">{p.name}</span>
                    </button>
                  )
                })
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-medium">{formatCurrency(item.price * item.qty)}</p>
        {item.qty > 1 && <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}/pcs</p>}
      </div>
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(true)} aria-label="Edit">
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={deleteItem} aria-label="Hapus">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

function ChargesSection({ serviceCharge, tax, onSave }: { serviceCharge: number; tax: number; onSave: (sc: number, tx: number) => Promise<void> | void }) {
  const [sc, setSc] = useState(String(serviceCharge))
  const [tx, setTx] = useState(String(tax))
  const [saving, setSaving] = useState(false)
  const dirty = Number(sc) !== serviceCharge || Number(tx) !== tax

  async function save() {
    setSaving(true)
    await onSave(Number(sc) || 0, Number(tx) || 0)
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Service Charge & PPN</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Service Charge</Label>
            <AmountInput value={sc} onChange={setSc} placeholder="0" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">PPN / Pajak</Label>
            <AmountInput value={tx} onChange={setTx} placeholder="0" />
          </div>
        </div>
        {dirty && (
          <Button size="sm" onClick={save} disabled={saving} className="w-full">
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function ParticipantsSection({ participants, billId, onChange }: { participants: BillParticipant[]; billId: string; onChange: () => Promise<void> | void }) {
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")

  async function addParticipant() {
    if (!name.trim()) return
    await fetch(`/api/bills/${billId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), contact: contact.trim() || undefined }),
    })
    setName(""); setContact(""); setAddOpen(false)
    await onChange()
  }

  async function deleteParticipant(id: string) {
    await fetch(`/api/bill-participants/${id}`, { method: "DELETE" })
    await onChange()
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Peserta</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAddOpen((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" /> Tambah
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {addOpen && (
          <div className="space-y-2 rounded-md border p-3 bg-muted/40">
            <Input placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <Input placeholder="No. WhatsApp (opsional, contoh: 081234567890)" value={contact} onChange={(e) => setContact(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={addParticipant} className="flex-1">Simpan</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddOpen(false); setName(""); setContact("") }}>Batal</Button>
            </div>
          </div>
        )}

        {participants.length === 0 && !addOpen && (
          <p className="text-sm text-muted-foreground text-center py-3">Belum ada peserta. Tambahkan teman yang ikut bayar.</p>
        )}

        {participants.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{p.name}</p>
              {p.contact && <p className="text-xs text-muted-foreground">{p.contact}</p>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => deleteParticipant(p.id)}
              aria-label="Hapus peserta"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function BreakdownSection({ breakdowns, billTitle, onChange }: { breakdowns: ParticipantBreakdown[]; billTitle: string; onChange: () => Promise<void> | void }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Rincian per Orang</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {breakdowns.map((b) => (
          <BreakdownCard key={b.participantId} breakdown={b} billTitle={billTitle} onChange={onChange} />
        ))}
      </CardContent>
    </Card>
  )
}

function BreakdownCard({ breakdown, billTitle, onChange }: { breakdown: ParticipantBreakdown; billTitle: string; onChange: () => Promise<void> | void }) {
  async function togglePaid() {
    await fetch(`/api/bill-participants/${breakdown.participantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: breakdown.status === "paid" ? "unpaid" : "paid" }),
    })
    await onChange()
  }

  function sendWhatsApp() {
    const lines: string[] = [`Halo ${breakdown.name}, ini rincian patungan untuk *${billTitle}*:`, ""]
    for (const li of breakdown.lineItems) {
      lines.push(`• ${li.name}${li.qty > 1 ? ` ×${li.qty}` : ""}: ${formatCurrency(li.share)}`)
    }
    lines.push(``)
    lines.push(`Subtotal item: ${formatCurrency(breakdown.itemsSubtotal)}`)
    if (breakdown.serviceShare > 0) lines.push(`Service charge: ${formatCurrency(breakdown.serviceShare)}`)
    if (breakdown.taxShare > 0) lines.push(`PPN: ${formatCurrency(breakdown.taxShare)}`)
    lines.push(`*Total: ${formatCurrency(breakdown.total)}*`)
    const phone = breakdown.contact ? breakdown.contact.replace(/\D/g, "") : ""
    const text = encodeURIComponent(lines.join("\n"))
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank")
  }

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{breakdown.name}</p>
            {breakdown.status === "paid" && (
              <Badge className="text-xs py-0 px-1.5 h-4 bg-green-600 hover:bg-green-600"><Check className="h-3 w-3 mr-0.5" />Lunas</Badge>
            )}
          </div>
          {breakdown.contact && <p className="text-xs text-muted-foreground">{breakdown.contact}</p>}
        </div>
        <p className="text-base font-bold">{formatCurrency(breakdown.total)}</p>
      </div>

      {breakdown.lineItems.length > 0 && (
        <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
          {breakdown.lineItems.map((li, idx) => (
            <div key={idx} className="flex justify-between">
              <span className="truncate">{li.name}{li.qty > 1 ? ` ×${li.qty}` : ""}</span>
              <span>{formatCurrency(li.share)}</span>
            </div>
          ))}
          {breakdown.serviceShare > 0 && (
            <div className="flex justify-between">
              <span>Service charge</span>
              <span>{formatCurrency(breakdown.serviceShare)}</span>
            </div>
          )}
          {breakdown.taxShare > 0 && (
            <div className="flex justify-between">
              <span>PPN</span>
              <span>{formatCurrency(breakdown.taxShare)}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={sendWhatsApp}>
          <MessageCircle className="h-3 w-3 mr-1" /> Kirim WA
        </Button>
        <Button size="sm" className="h-7 text-xs flex-1" variant={breakdown.status === "paid" ? "outline" : "default"} onClick={togglePaid}>
          {breakdown.status === "paid" ? "Tandai Belum Lunas" : "Tandai Lunas"}
        </Button>
      </div>
    </div>
  )
}
