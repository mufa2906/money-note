"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { AmountInput } from "@/components/common/amount-input"
import { cn } from "@/lib/utils"
import { useToast } from "@/lib/hooks/use-toast"
import { useAccounts } from "@/lib/hooks/use-accounts"
import { useTransactions } from "@/lib/hooks/use-transactions"
import { useCategories } from "@/lib/hooks/use-categories"
import { useNotifications } from "@/lib/hooks/use-notifications"
import { useSubcategories } from "@/lib/hooks/use-subcategories"
import { BUILTIN_CATEGORIES } from "@/components/common/category-icon"

const schema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Jumlah harus lebih dari 0"),
  category: z.string().min(1, "Pilih kategori"),
  walletAccountId: z.string().min(1, "Pilih akun"),
  description: z.string().min(1, "Masukkan keterangan"),
  date: z.date(),
})

type FormValues = z.infer<typeof schema>

interface AddTransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddTransactionModal({ open, onOpenChange, onSuccess }: AddTransactionModalProps) {
  const { toast } = useToast()
  const { accounts, refetch: refetchAccounts } = useAccounts()
  const { refetch: refetchTransactions } = useTransactions()
  const { categories: dbCategories } = useCategories()
  const { refetch: refetchNotifications } = useNotifications()
  const { subcategoriesByCategory } = useSubcategories()
  const categories = dbCategories.length > 0 ? dbCategories : BUILTIN_CATEGORIES
  const [calOpen, setCalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "expense", date: new Date() },
  })

  const transactionType = form.watch("type")
  const selectedCategory = form.watch("category")
  const subcategoriesForCategory = selectedCategory ? (subcategoriesByCategory[selectedCategory] ?? []) : []

  async function onSubmit(data: FormValues) {
    setSubmitting(true)
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAccountId: data.walletAccountId,
          amount: Number(data.amount),
          type: data.type,
          category: data.category,
          subcategory: selectedSubcategory ?? null,
          description: data.description,
          transactionDate: format(data.date, "yyyy-MM-dd"),
          source: "manual",
        }),
      })

      if (!res.ok) throw new Error("Gagal menyimpan transaksi")

      toast({
        title: "Transaksi dicatat!",
        description: `${data.description} berhasil disimpan.`,
      })
      form.reset({ type: "expense", date: new Date() })
      setSelectedSubcategory(null)
      onOpenChange(false)
      await Promise.all([refetchTransactions(), refetchAccounts(), refetchNotifications()])
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
          <DialogTitle>Catat Transaksi</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => form.setValue("type", t)}
                className={cn(
                  "rounded-md border py-2 text-sm font-medium transition-colors",
                  transactionType === t
                    ? t === "income" ? "bg-green-600 text-white border-green-600" : "bg-red-500 text-white border-red-500"
                    : "border-border hover:bg-accent"
                )}
              >
                {t === "income" ? "Pemasukan" : "Pengeluaran"}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <Label htmlFor="amount">Jumlah</Label>
            <AmountInput
              id="amount"
              placeholder="50.000"
              value={form.watch("amount") ?? ""}
              onChange={(raw) => form.setValue("amount", raw, { shouldValidate: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Kategori</Label>
            <Select onValueChange={(v) => { form.setValue("category", v); setSelectedSubcategory(null) }}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.name} value={c.name}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subcategoriesForCategory.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {subcategoriesForCategory.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSubcategory(selectedSubcategory === s.name ? null : s.name)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      selectedSubcategory === s.name
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-accent"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>Akun</Label>
            <Select onValueChange={(v) => form.setValue("walletAccountId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih akun" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.accountName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Keterangan</Label>
            <Input id="description" placeholder="Makan siang, bensin, dll." {...form.register("description")} />
          </div>

          <div className="space-y-1">
            <Label>Tanggal</Label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.watch("date") && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch("date") ? format(form.watch("date"), "d MMMM yyyy", { locale: id }) : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={form.watch("date")}
                  onSelect={(d) => { if (d) { form.setValue("date", d); setCalOpen(false) } }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Menyimpan..." : "Simpan Transaksi"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
