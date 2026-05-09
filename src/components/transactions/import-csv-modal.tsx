"use client"

import { useRef, useState } from "react"
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useAccounts } from "@/lib/hooks/use-accounts"
import { useToast } from "@/lib/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface ParsedRow {
  tanggal: string
  keterangan: string
  jumlah: number
  tipe: "income" | "expense"
  kategori: string
  valid: boolean
  error?: string
}

interface ImportCsvModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const CSV_TEMPLATE = `tanggal,keterangan,jumlah,tipe,kategori
2025-01-15,Gaji bulanan,5000000,income,gaji
2025-01-16,Makan siang,25000,expense,makanan
2025-01-17,Grab ke kantor,15000,expense,transportasi`

function parseDate(raw: string): string | null {
  const trimmed = raw.trim()
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  // DD/MM/YYYY or DD-MM-YYYY
  const parts = trimmed.split(/[\/\-]/)
  if (parts.length === 3) {
    const [a, b, c] = parts
    if (c.length === 4) return `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`
    if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`
  }
  return null
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const header = lines[0].toLowerCase().split(",").map((h) => h.trim())
  const iCol = header.indexOf("tanggal")
  const dCol = header.indexOf("keterangan")
  const aCol = header.indexOf("jumlah")
  const tCol = header.indexOf("tipe")
  const cCol = header.indexOf("kategori")

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
    const rawDate = cols[iCol] ?? ""
    const keterangan = cols[dCol] ?? ""
    const rawJumlah = (cols[aCol] ?? "").replace(/[^\d]/g, "")
    const rawTipe = (cols[tCol] ?? "").toLowerCase()
    const kategori = (cols[cCol] ?? "lainnya").toLowerCase() || "lainnya"

    const tanggal = parseDate(rawDate)
    const jumlah = parseInt(rawJumlah, 10)
    const tipe: "income" | "expense" =
      rawTipe === "income" || rawTipe === "pemasukan" ? "income" : "expense"

    const errors: string[] = []
    if (!tanggal) errors.push("tanggal tidak valid")
    if (!keterangan) errors.push("keterangan kosong")
    if (!jumlah || isNaN(jumlah) || jumlah <= 0) errors.push("jumlah tidak valid")

    return {
      tanggal: tanggal ?? rawDate,
      keterangan,
      jumlah: isNaN(jumlah) ? 0 : jumlah,
      tipe,
      kategori,
      valid: errors.length === 0,
      error: errors.join(", "),
    }
  })
}

export function ImportCsvModal({ open, onOpenChange, onSuccess }: ImportCsvModalProps) {
  const { accounts } = useAccounts()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [selectedAccount, setSelectedAccount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [fileName, setFileName] = useState("")

  const validRows = rows.filter((r) => r.valid)
  const invalidRows = rows.filter((r) => !r.valid)

  function handleFile(file: File) {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setRows(parseCsv(text))
    }
    reader.readAsText(file, "utf-8")
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "template-transaksi.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport() {
    if (!selectedAccount || validRows.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRows.map((r) => ({ ...r, akunId: selectedAccount })),
        }),
      })
      if (!res.ok) throw new Error("Gagal import")
      const { inserted } = await res.json()
      toast({ title: `${inserted} transaksi berhasil diimport!` })
      onOpenChange(false)
      setRows([])
      setFileName("")
      setSelectedAccount("")
      onSuccess?.()
    } catch (e) {
      toast({ title: "Gagal import", description: String(e), variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setRows([]); setFileName("") } onOpenChange(o) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import CSV Transaksi</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              "hover:border-primary hover:bg-primary/5"
            )}
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            {fileName ? (
              <p className="text-sm font-medium">{fileName}</p>
            ) : (
              <>
                <p className="text-sm font-medium">Klik atau seret file CSV ke sini</p>
                <p className="text-xs text-muted-foreground mt-1">Format: tanggal, keterangan, jumlah, tipe, kategori</p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={downloadTemplate}>
            Download Template CSV
          </Button>

          {/* Preview */}
          {rows.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{validRows.length} baris valid</span>
                {invalidRows.length > 0 && (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500 ml-2" />
                    <span className="text-red-500">{invalidRows.length} baris error (akan dilewati)</span>
                  </>
                )}
              </div>

              <div className="max-h-40 overflow-y-auto border rounded-lg text-xs">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Tanggal</th>
                      <th className="p-2 text-left">Keterangan</th>
                      <th className="p-2 text-right">Jumlah</th>
                      <th className="p-2 text-left">Tipe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className={cn("border-t", !r.valid && "opacity-40")}>
                        <td className="p-2">{r.tanggal}</td>
                        <td className="p-2 max-w-[120px] truncate">{r.keterangan}</td>
                        <td className={cn("p-2 text-right font-medium", r.tipe === "income" ? "text-green-600" : "text-red-500")}>
                          {r.tipe === "income" ? "+" : "-"}{formatCurrency(r.jumlah)}
                        </td>
                        <td className="p-2">
                          <Badge variant={r.tipe === "income" ? "default" : "secondary"} className="text-xs py-0 h-4">
                            {r.tipe === "income" ? "Masuk" : "Keluar"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Masukkan ke akun</label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih akun tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.accountName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                disabled={!selectedAccount || validRows.length === 0 || submitting}
                onClick={handleImport}
              >
                {submitting ? "Mengimport..." : `Import ${validRows.length} Transaksi`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
