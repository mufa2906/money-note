"use client"

import { use, useState, useMemo, useCallback, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, MessageCircle, Check, Receipt, Users, Pencil, X, Coins, CreditCard, ChevronDown, ChevronUp, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AmountInput } from "@/components/common/amount-input"
import { useBill } from "@/lib/hooks/use-bills"
import { useToast } from "@/lib/hooks/use-toast"
import { computeBreakdown, billGrandTotal } from "@/lib/bill-utils"
import { formatCurrency } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { BillItem, BillParticipant, BillCharge, BillPaymentInfo, ParticipantBreakdown, SplitStatus } from "@/types"
import { AddTransactionModal } from "@/components/transactions/add-transaction-modal"

interface Mutations {
  patchBill: (updates: { title?: string; description?: string | null; paymentInfo?: BillPaymentInfo | null; charges?: BillCharge[] }) => Promise<void>
  addItem: (data: { name: string; price: number; qty: number }) => Promise<void>
  updateItem: (itemId: string, updates: { name?: string; price?: number; originalPrice?: number | null; qty?: number; participantIds?: string[] }) => Promise<void>
  deleteItem: (itemId: string) => Promise<void>
  addParticipant: (data: { name: string; contact?: string }) => Promise<void>
  updateParticipant: (pid: string, updates: { status?: SplitStatus }) => Promise<void>
  deleteParticipant: (pid: string) => Promise<void>
}

export default function BillEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { bill, loading, refetch, setBill } = useBill(id)
  const { toast } = useToast()
  const [titleEdit, setTitleEdit] = useState<string | null>(null)
  const [descEdit, setDescEdit] = useState<string | null>(null)

  const breakdowns = useMemo(() => (bill ? computeBreakdown(bill) : []), [bill])

  const mutations = useMemo<Mutations>(() => ({
    async patchBill(updates) {
      setBill((prev) => prev && { ...prev, ...updates })
      const res = await fetch(`/api/bills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        toast({ title: "Gagal simpan", variant: "destructive" })
        await refetch()
      }
    },

    async addItem(data) {
      const tempId = `temp-${crypto.randomUUID()}`
      setBill((prev) => prev && {
        ...prev,
        items: [
          ...prev.items,
          { id: tempId, billId: id, name: data.name, price: data.price, originalPrice: null, qty: data.qty, position: prev.items.length, participantIds: [] },
        ],
      })
      const res = await fetch(`/api/bills/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        setBill((prev) => prev && { ...prev, items: prev.items.filter((i) => i.id !== tempId) })
        toast({ title: "Gagal tambah item", variant: "destructive" })
        return
      }
      const created = await res.json()
      setBill((prev) => {
        if (!prev) return prev
        const tempItem = prev.items.find((i) => i.id === tempId)
        const preserved = tempItem?.participantIds ?? []
        return { ...prev, items: prev.items.map((i) => i.id === tempId ? { ...created, participantIds: preserved } : i) }
      })
    },

    async updateItem(itemId, updates) {
      let prevSnapshot: BillItem | null = null
      setBill((prev) => {
        if (!prev) return prev
        const existing = prev.items.find((i) => i.id === itemId)
        if (existing) prevSnapshot = existing
        return { ...prev, items: prev.items.map((i) => i.id === itemId ? { ...i, ...updates } : i) }
      })
      if (itemId.startsWith("temp-")) return
      const res = await fetch(`/api/bill-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        if (prevSnapshot) {
          const snapshot = prevSnapshot
          setBill((prev) => prev && { ...prev, items: prev.items.map((i) => i.id === itemId ? snapshot : i) })
        }
        toast({ title: "Gagal simpan item", variant: "destructive" })
      }
    },

    async deleteItem(itemId) {
      let prevSnapshot: BillItem | null = null
      setBill((prev) => {
        if (!prev) return prev
        const existing = prev.items.find((i) => i.id === itemId)
        if (existing) prevSnapshot = existing
        return { ...prev, items: prev.items.filter((i) => i.id !== itemId) }
      })
      if (itemId.startsWith("temp-")) return
      const res = await fetch(`/api/bill-items/${itemId}`, { method: "DELETE" })
      if (!res.ok) {
        if (prevSnapshot) {
          const snapshot = prevSnapshot
          setBill((prev) => prev && { ...prev, items: [...prev.items, snapshot].sort((a, b) => a.position - b.position) })
        }
        toast({ title: "Gagal hapus item", variant: "destructive" })
      }
    },

    async addParticipant(data) {
      const tempId = `temp-${crypto.randomUUID()}`
      setBill((prev) => prev && {
        ...prev,
        participants: [
          ...prev.participants,
          { id: tempId, billId: id, name: data.name, contact: data.contact ?? null, status: "unpaid" },
        ],
      })
      const res = await fetch(`/api/bills/${id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        setBill((prev) => prev && { ...prev, participants: prev.participants.filter((p) => p.id !== tempId) })
        toast({ title: "Gagal tambah peserta", variant: "destructive" })
        return
      }
      const created = await res.json()
      setBill((prev) => prev && { ...prev, participants: prev.participants.map((p) => p.id === tempId ? created : p) })
    },

    async updateParticipant(pid, updates) {
      let prevSnapshot: BillParticipant | null = null
      setBill((prev) => {
        if (!prev) return prev
        const existing = prev.participants.find((p) => p.id === pid)
        if (existing) prevSnapshot = existing
        return { ...prev, participants: prev.participants.map((p) => p.id === pid ? { ...p, ...updates } : p) }
      })
      if (pid.startsWith("temp-")) return
      const res = await fetch(`/api/bill-participants/${pid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        if (prevSnapshot) {
          const snapshot = prevSnapshot
          setBill((prev) => prev && { ...prev, participants: prev.participants.map((p) => p.id === pid ? snapshot : p) })
        }
        toast({ title: "Gagal simpan", variant: "destructive" })
      }
    },

    async deleteParticipant(pid) {
      let prevSnapshot: BillParticipant | null = null
      setBill((prev) => {
        if (!prev) return prev
        const existing = prev.participants.find((p) => p.id === pid)
        if (existing) prevSnapshot = existing
        return {
          ...prev,
          participants: prev.participants.filter((p) => p.id !== pid),
          items: prev.items.map((i) => ({ ...i, participantIds: i.participantIds.filter((x) => x !== pid) })),
        }
      })
      if (pid.startsWith("temp-")) return
      const res = await fetch(`/api/bill-participants/${pid}`, { method: "DELETE" })
      if (!res.ok) {
        if (prevSnapshot) {
          const snapshot = prevSnapshot
          setBill((prev) => prev && { ...prev, participants: [...prev.participants, snapshot] })
        }
        toast({ title: "Gagal hapus peserta", variant: "destructive" })
        await refetch()
      }
    },
  }), [id, refetch, setBill, toast])

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

  async function saveTitle() {
    if (titleEdit === null) return
    const trimmed = titleEdit.trim()
    if (trimmed && trimmed !== bill?.title) {
      await mutations.patchBill({ title: trimmed })
    }
    setTitleEdit(null)
  }

  async function saveDesc() {
    if (descEdit === null) return
    const trimmed = descEdit.trim() || null
    if (trimmed !== (bill?.description ?? null)) {
      await mutations.patchBill({ description: trimmed })
    }
    setDescEdit(null)
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
          {descEdit !== null ? (
            <div className="flex items-center gap-1 mt-0.5">
              <Input
                value={descEdit}
                onChange={(e) => setDescEdit(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveDesc() }}
                placeholder="Tujuan / keterangan..."
                autoFocus
                className="h-7 text-xs"
              />
              <Button size="icon" className="h-7 w-7" onClick={saveDesc}><Check className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDescEdit(null)}><X className="h-3 w-3" /></Button>
            </div>
          ) : (
            <button onClick={() => setDescEdit(bill.description ?? "")} className="flex items-center gap-1 group mt-0.5">
              <p className="text-xs text-muted-foreground truncate">
                {bill.description ? bill.description : <span className="italic">Tambah tujuan...</span>}
              </p>
              <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
            </button>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">Total: {formatCurrency(billGrandTotal(bill))}</p>
        </div>
      </div>

      <ItemsSection items={bill.items} participants={bill.participants} mutations={mutations} />
      <ChargesSection charges={bill.charges} mutations={mutations} />
      <ParticipantsSection participants={bill.participants} mutations={mutations} />
      <PaymentInfoSection paymentInfo={bill.paymentInfo} mutations={mutations} />

      {breakdowns.length > 0 && (
        <BreakdownSection
          breakdowns={breakdowns}
          billTitle={bill.title}
          billCreatedAt={bill.createdAt}
          participants={bill.participants}
          paymentInfo={bill.paymentInfo}
          mutations={mutations}
          onSynced={refetch}
        />
      )}
    </div>
  )
}

function ItemsSection({ items, participants, mutations }: { items: BillItem[]; participants: BillParticipant[]; mutations: Mutations }) {
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [qty, setQty] = useState("1")

  function reset() {
    setName(""); setPrice(""); setQty("1"); setAddOpen(false)
  }

  async function submit() {
    if (!name.trim() || !price) return
    await mutations.addItem({ name: name.trim(), price: Number(price), qty: Number(qty) || 1 })
    reset()
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
              <Button size="sm" onClick={submit} className="flex-1">Simpan</Button>
              <Button size="sm" variant="ghost" onClick={reset}>Batal</Button>
            </div>
          </div>
        )}

        {items.length === 0 && !addOpen && (
          <p className="text-sm text-muted-foreground text-center py-3">Belum ada item. Tambahkan menu yang dipesan.</p>
        )}

        {items.map((item) => (
          <ItemRow key={item.id} item={item} participants={participants} mutations={mutations} />
        ))}
      </CardContent>
    </Card>
  )
}

function ItemRow({ item, participants, mutations }: { item: BillItem; participants: BillParticipant[]; mutations: Mutations }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [price, setPrice] = useState(String(item.price))
  const [originalPrice, setOriginalPrice] = useState(item.originalPrice ? String(item.originalPrice) : "")
  const [qty, setQty] = useState(String(item.qty))
  const [popoverOpen, setPopoverOpen] = useState(false)

  useEffect(() => {
    if (!editing) {
      setName(item.name)
      setPrice(String(item.price))
      setOriginalPrice(item.originalPrice ? String(item.originalPrice) : "")
      setQty(String(item.qty))
    }
  }, [item.name, item.price, item.originalPrice, item.qty, editing])

  const assigned = participants.filter((p) => item.participantIds.includes(p.id))
  const allAssigned = participants.length > 0 && participants.every((p) => item.participantIds.includes(p.id))
  const hasDiscount = item.originalPrice != null && item.originalPrice > item.price

  async function save() {
    const parsedOriginal = Number(originalPrice)
    const parsedPrice = Number(price)
    const op = Number.isFinite(parsedOriginal) && parsedOriginal > parsedPrice ? parsedOriginal : null
    await mutations.updateItem(item.id, { name: name.trim(), price: parsedPrice, qty: Number(qty) || 1, originalPrice: op })
    setEditing(false)
  }

  function toggleParticipant(participantId: string) {
    const next = item.participantIds.includes(participantId)
      ? item.participantIds.filter((p) => p !== participantId)
      : [...item.participantIds, participantId]
    mutations.updateItem(item.id, { participantIds: next })
  }

  function toggleAll() {
    const next = allAssigned ? [] : participants.map((p) => p.id)
    mutations.updateItem(item.id, { participantIds: next })
  }

  if (editing) {
    return (
      <div className="space-y-2 rounded-md border p-3 bg-muted/40">
        <Input placeholder="Nama menu" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <div className="grid grid-cols-3 gap-2">
          <AmountInput placeholder="Harga satuan" value={price} onChange={setPrice} />
          <AmountInput placeholder="Harga asli (opsional)" value={originalPrice} onChange={setOriginalPrice} />
          <Input type="number" min={1} placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        {originalPrice && Number(originalPrice) > 0 && (
          <p className="text-xs text-muted-foreground">
            {Number(originalPrice) > Number(price)
              ? `Diskon: -${formatCurrency((Number(originalPrice) - Number(price)) * (Number(qty) || 1))}`
              : "Harga asli harus lebih besar dari harga satuan"}
          </p>
        )}
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
        <p className="text-sm font-medium truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground">
          {item.qty} × {hasDiscount ? (
            <><span className="line-through">{formatCurrency(item.originalPrice!)}</span> <span className="text-green-600 dark:text-green-400">{formatCurrency(item.price)}</span></>
          ) : formatCurrency(item.price)}
        </p>
        <div className="mt-1">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <Users className="h-3 w-3" />
                {assigned.length === 0 ? (
                  <span className="italic">Belum ada peserta</span>
                ) : assigned.length === participants.length ? (
                  <span>Semua peserta</span>
                ) : (
                  assigned.map((a) => a.name).join(", ")
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              {participants.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">Tambahkan peserta dulu.</p>
              ) : (
                <>
                  <button
                    onClick={toggleAll}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-accent rounded-sm font-medium border-b mb-1 pb-2"
                  >
                    <div className={`h-4 w-4 rounded border flex items-center justify-center ${allAssigned ? "bg-primary border-primary" : "border-input"}`}>
                      {allAssigned && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span>Semua Peserta</span>
                  </button>
                  {participants.map((p) => {
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
                  })}
                </>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        {hasDiscount ? (
          <>
            <p className="text-xs text-muted-foreground line-through">{formatCurrency(item.originalPrice! * item.qty)}</p>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">{formatCurrency(item.price * item.qty)}</p>
            <p className="text-[10px] text-green-600 dark:text-green-400">-{formatCurrency((item.originalPrice! - item.price) * item.qty)}</p>
          </>
        ) : (
          <p className="text-sm font-medium">{formatCurrency(item.price * item.qty)}</p>
        )}
      </div>
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(true)} aria-label="Edit">
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => mutations.deleteItem(item.id)} aria-label="Hapus">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

function ChargesSection({ charges, mutations }: { charges: BillCharge[]; mutations: Mutations }) {
  const commit = useCallback((next: BillCharge[]) => {
    mutations.patchBill({ charges: next })
  }, [mutations])

  function addRow(name: string) {
    if (charges.some((c) => c.name.toLowerCase() === name.toLowerCase())) return
    commit([...charges, { name, amount: 0 }])
  }

  function removeRow(idx: number) {
    commit(charges.filter((_, i) => i !== idx))
  }

  function updateRow(idx: number, patch: Partial<BillCharge>) {
    commit(charges.map((c, i) => i === idx ? { ...c, ...patch } : c))
  }

  const hasService = charges.some((c) => c.name.toLowerCase().includes("service"))
  const hasPpn = charges.some((c) => c.name.toLowerCase().includes("ppn") || c.name.toLowerCase().includes("pajak"))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Coins className="h-4 w-4" /> Biaya Tambahan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {charges.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">Belum ada biaya tambahan. Akan dibagi proporsional ke tiap orang.</p>
        )}

        {charges.map((charge, idx) => (
          <ChargeRow key={idx} charge={charge} onChange={(p) => updateRow(idx, p)} onDelete={() => removeRow(idx)} />
        ))}

        <div className="flex flex-wrap gap-1.5 pt-1">
          {!hasService && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addRow("Service Charge")}>
              <Plus className="h-3 w-3 mr-1" /> Service Charge
            </Button>
          )}
          {!hasPpn && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addRow("PPN")}>
              <Plus className="h-3 w-3 mr-1" /> PPN
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => addRow("Biaya")}>
            <Plus className="h-3 w-3 mr-1" /> Biaya Lain
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ChargeRow({ charge, onChange, onDelete }: { charge: BillCharge; onChange: (p: Partial<BillCharge>) => void; onDelete: () => void }) {
  const [name, setName] = useState(charge.name)
  const [amount, setAmount] = useState(String(charge.amount))

  useEffect(() => { setName(charge.name) }, [charge.name])
  useEffect(() => { setAmount(String(charge.amount)) }, [charge.amount])

  function commitName() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== charge.name) onChange({ name: trimmed })
    else if (!trimmed) setName(charge.name)
  }
  function commitAmount() {
    const num = Number(amount) || 0
    if (num !== charge.amount) onChange({ amount: num })
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        placeholder="Nama biaya"
        className="flex-1"
      />
      <div className="w-32 flex-shrink-0">
        <AmountInput value={amount} onChange={setAmount} onBlur={commitAmount} placeholder="0" />
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0" onClick={onDelete} aria-label="Hapus biaya">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function ParticipantsSection({ participants, mutations }: { participants: BillParticipant[]; mutations: Mutations }) {
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")

  function reset() {
    setName(""); setContact(""); setAddOpen(false)
  }

  async function submit() {
    if (!name.trim()) return
    await mutations.addParticipant({ name: name.trim(), contact: contact.trim() || undefined })
    reset()
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
            <Input placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit() }} autoFocus />
            <Input placeholder="No. WhatsApp (opsional, contoh: 081234567890)" value={contact} onChange={(e) => setContact(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={submit} className="flex-1">Simpan</Button>
              <Button size="sm" variant="ghost" onClick={reset}>Batal</Button>
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
              onClick={() => mutations.deleteParticipant(p.id)}
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

function BreakdownSection({ breakdowns, billTitle, billCreatedAt, participants, paymentInfo, mutations, onSynced }: { breakdowns: ParticipantBreakdown[]; billTitle: string; billCreatedAt: string; participants: BillParticipant[]; paymentInfo: BillPaymentInfo | null; mutations: Mutations; onSynced: () => void }) {
  function buildWaText(b: ParticipantBreakdown) {
    const chargesTotal = b.chargeShares.reduce((s, c) => s + c.amount, 0)
    const hasItems = b.lineItems.length > 0
    const hasCharges = chargesTotal > 0
    const lines: string[] = [`Halo ${b.name}, rincian patunganmu untuk *${billTitle}*:`, ""]
    if (hasItems) {
      lines.push("Item:")
      for (const li of b.lineItems) lines.push(`• ${li.name}${li.qty > 1 ? ` ×${li.qty}` : ""}: ${formatCurrency(li.share)}`)
      lines.push(`Subtotal item: ${formatCurrency(b.itemsSubtotal)}`)
      lines.push("")
    }
    if (hasCharges) {
      lines.push("Biaya tambahan:")
      for (const c of b.chargeShares) { if (c.amount > 0) lines.push(`• ${c.name}: ${formatCurrency(c.amount)}`) }
      lines.push(`Subtotal biaya: ${formatCurrency(chargesTotal)}`)
      lines.push("")
    }
    lines.push(`*TOTAL: ${formatCurrency(b.total)}*`)
    if (paymentInfo) {
      lines.push("")
      lines.push(`Transfer ke: *${paymentInfo.method}*`)
      lines.push(`No. Rekening: ${paymentInfo.account}`)
      lines.push(`Atas nama: ${paymentInfo.accountName}`)
    }
    return lines.join("\n")
  }

  function sendToAll() {
    const unpaid = breakdowns.filter((b) => b.status !== "paid" && b.contact)
    if (unpaid.length === 0) return
    for (const b of unpaid) {
      const phone = b.contact!.replace(/\D/g, "")
      const text = encodeURIComponent(buildWaText(b))
      window.open(`https://wa.me/${phone}?text=${text}`, "_blank")
    }
  }

  const unpaidWithContact = breakdowns.filter((b) => b.status !== "paid" && b.contact)

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Rincian per Orang</CardTitle>
        {unpaidWithContact.length > 0 && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={sendToAll}>
            <Send className="h-3 w-3 mr-1" /> Kirim ke Semua
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {breakdowns.map((b) => (
          <BreakdownCard key={b.participantId} breakdown={b} buildWaText={buildWaText} mutations={mutations} billTitle={billTitle} billCreatedAt={billCreatedAt} participants={participants} onSynced={onSynced} />
        ))}
      </CardContent>
    </Card>
  )
}

function BreakdownCard({ breakdown, buildWaText, mutations, billTitle, billCreatedAt, participants, onSynced }: { breakdown: ParticipantBreakdown; buildWaText: (b: ParticipantBreakdown) => string; mutations: Mutations; billTitle: string; billCreatedAt: string; participants: BillParticipant[]; onSynced: () => void }) {
  const chargesTotal = breakdown.chargeShares.reduce((s, c) => s + c.amount, 0)
  const hasItems = breakdown.lineItems.length > 0
  const hasCharges = chargesTotal > 0
  const [expanded, setExpanded] = useState(false)
  const [txOpen, setTxOpen] = useState(false)
  const participant = participants.find((p) => p.id === breakdown.participantId)

  function togglePaid() {
    mutations.updateParticipant(breakdown.participantId, { status: breakdown.status === "paid" ? "unpaid" : "paid" })
  }

  function sendWhatsApp() {
    const phone = breakdown.contact ? breakdown.contact.replace(/\D/g, "") : ""
    const text = encodeURIComponent(buildWaText(breakdown))
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank")
  }

  const itemDesc = breakdown.lineItems.length > 0
    ? breakdown.lineItems.map((li) => `${li.name} - ${formatCurrency(li.share)}`).join(", ")
    : `Bagi tagihan: ${billTitle}`

  return (
    <div className="rounded-md border">
      <button
        className="w-full flex items-center justify-between gap-2 p-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{breakdown.name}</p>
            {breakdown.status === "paid" && (
              <Badge className="text-xs py-0 px-1.5 h-4 bg-green-600 hover:bg-green-600"><Check className="h-3 w-3 mr-0.5" />Lunas</Badge>
            )}
          </div>
          {breakdown.contact && <p className="text-xs text-muted-foreground">{breakdown.contact}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <p className="text-base font-bold">{formatCurrency(breakdown.total)}</p>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t pt-3">
          {(hasItems || hasCharges) && (
            <div className="space-y-2 text-xs">
              {hasItems && (
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Item</p>
                  {breakdown.lineItems.map((li, idx) => (
                    <div key={idx} className="flex justify-between text-muted-foreground">
                      <span className="truncate pr-2">• {li.name}{li.qty > 1 ? ` ×${li.qty}` : ""}</span>
                      <span className="tabular-nums">{formatCurrency(li.share)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-0.5 border-t border-dashed">
                    <span className="font-medium">Subtotal item</span>
                    <span className="font-medium tabular-nums">{formatCurrency(breakdown.itemsSubtotal)}</span>
                  </div>
                </div>
              )}
              {hasCharges && (
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Biaya Tambahan</p>
                  {breakdown.chargeShares.map((c, idx) => (
                    c.amount > 0 ? (
                      <div key={`c-${idx}`} className="flex justify-between text-muted-foreground">
                        <span className="truncate pr-2">• {c.name}</span>
                        <span className="tabular-nums">{formatCurrency(c.amount)}</span>
                      </div>
                    ) : null
                  ))}
                  <div className="flex justify-between pt-0.5 border-t border-dashed">
                    <span className="font-medium">Subtotal biaya</span>
                    <span className="font-medium tabular-nums">{formatCurrency(chargesTotal)}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t-2">
                <span className="font-bold text-sm">TOTAL</span>
                <span className="font-bold text-sm tabular-nums">{formatCurrency(breakdown.total)}</span>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={sendWhatsApp}>
              <MessageCircle className="h-3 w-3 mr-1" /> Kirim WA
            </Button>
            <Button size="sm" className="h-7 text-xs flex-1" variant={breakdown.status === "paid" ? "outline" : "default"} onClick={togglePaid}>
              {breakdown.status === "paid" ? "Tandai Belum Lunas" : "Tandai Lunas"}
            </Button>
          </div>
          {participant?.transactionId ? (
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <Check className="h-3 w-3" />
              <span>Sudah dicatat ke transaksi</span>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs w-full" onClick={() => setTxOpen(true)}>
              <Receipt className="h-3 w-3 mr-1" /> Catat ke Transaksi
            </Button>
          )}
        </div>
      )}
      <AddTransactionModal
        open={txOpen}
        onOpenChange={setTxOpen}
        initialValues={{
          amount: String(Math.round(breakdown.total)),
          description: itemDesc,
          type: "expense",
          date: new Date(billCreatedAt),
          billParticipantId: breakdown.participantId,
        }}
        onSuccess={onSynced}
      />
    </div>
  )
}

const PAYMENT_METHODS = ["BCA", "Mandiri", "BNI", "BRI", "GoPay", "OVO", "DANA", "ShopeePay", "SeaBank", "Jago", "Lainnya"]

function PaymentInfoSection({ paymentInfo, mutations }: { paymentInfo: BillPaymentInfo | null; mutations: Mutations }) {
  const [editing, setEditing] = useState(false)
  const [method, setMethod] = useState(paymentInfo?.method ?? "BCA")
  const [account, setAccount] = useState(paymentInfo?.account ?? "")
  const [accountName, setAccountName] = useState(paymentInfo?.accountName ?? "")

  function openEdit() {
    setMethod(paymentInfo?.method ?? "BCA")
    setAccount(paymentInfo?.account ?? "")
    setAccountName(paymentInfo?.accountName ?? "")
    setEditing(true)
  }

  async function save() {
    if (!account.trim() || !accountName.trim()) return
    await mutations.patchBill({ paymentInfo: { method, account: account.trim(), accountName: accountName.trim() } })
    setEditing(false)
  }

  async function remove() {
    await mutations.patchBill({ paymentInfo: null })
    setEditing(false)
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Rekening Tujuan</CardTitle>
        {!editing && (
          <Button size="sm" variant="outline" onClick={openEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> {paymentInfo ? "Edit" : "Tambah"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Bank / E-Money</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nomor Rekening / No. HP</Label>
              <Input className="h-8 text-sm" placeholder="081234567890" value={account} onChange={(e) => setAccount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Atas Nama</Label>
              <Input className="h-8 text-sm" placeholder="Nama pemilik rekening" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} className="flex-1" disabled={!account.trim() || !accountName.trim()}>Simpan</Button>
              {paymentInfo && <Button size="sm" variant="destructive" onClick={remove}>Hapus</Button>}
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Batal</Button>
            </div>
          </div>
        ) : paymentInfo ? (
          <div className="rounded-md bg-muted/50 px-3 py-2 space-y-0.5">
            <p className="text-sm font-medium">{paymentInfo.method}</p>
            <p className="text-sm tabular-nums">{paymentInfo.account}</p>
            <p className="text-xs text-muted-foreground">a.n. {paymentInfo.accountName}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">Belum ada rekening tujuan. Tambahkan agar peserta tahu mau transfer ke mana.</p>
        )}
      </CardContent>
    </Card>
  )
}
