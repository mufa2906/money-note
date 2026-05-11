"use client"

import { useEffect, useState } from "react"
import { RefreshCw, Check, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import type { RecurringSuggestion } from "@/app/api/recurring/detect/route"

export function RecurringSuggestionsCard() {
  const [suggestions, setSuggestions] = useState<RecurringSuggestion[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/recurring/detect")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSuggestions(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleConfirm(s: RecurringSuggestion) {
    const key = `${s.description}::${s.amount}`
    setConfirming(key)
    try {
      await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: s.description,
          amount: s.amount,
          category: s.category,
          walletAccountId: s.walletAccountId,
          dayOfMonth: s.dayOfMonth,
        }),
      })
      setDismissed((prev) => new Set([...prev, key]))
    } catch { /* ignore */ } finally {
      setConfirming(null)
    }
  }

  function handleDismiss(s: RecurringSuggestion) {
    setDismissed((prev) => new Set([...prev, `${s.description}::${s.amount}`]))
  }

  const visible = suggestions.filter((s) => !dismissed.has(`${s.description}::${s.amount}`))

  if (loading || visible.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Transaksi Berulang Terdeteksi</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {visible.map((s) => {
          const key = `${s.description}::${s.amount}`
          const isConfirming = confirming === key
          return (
            <div key={key} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(s.amount)} · {s.accountName}
                  {s.dayOfMonth ? ` · sekitar tgl ${s.dayOfMonth}` : ""}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                  onClick={() => handleConfirm(s)}
                  disabled={isConfirming}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => handleDismiss(s)}
                  disabled={isConfirming}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
        <p className="text-xs text-muted-foreground pt-1">
          ✓ konfirmasi untuk simpan sebagai template · ✗ abaikan
        </p>
      </CardContent>
    </Card>
  )
}
