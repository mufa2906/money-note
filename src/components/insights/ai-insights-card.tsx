"use client"

import { useState } from "react"
import { Sparkles, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Lightbulb, Telescope } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface AiInsight {
  summary: string
  highlights: string[]
  warnings: string[]
  tips: string[]
  prediction: string
}

interface AiInsightsCardProps {
  payload: {
    thisMonth: { income: number; expense: number; net: number }
    lastMonth: { income: number; expense: number }
    catBreakdown: { name: string; amount: number; pct: number; change: number | null }[]
    budgets: { category: string; spent: number; limit: number; pct: number }[]
    savingRate: number
    monthName: string
  }
}

export function AiInsightsCard({ payload }: AiInsightsCardProps) {
  const [insight, setInsight] = useState<AiInsight | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function fetchInsight() {
    if (insight) { setOpen(!open); return }
    setLoading(true)
    setError(null)
    setOpen(true)
    try {
      const res = await fetch("/api/insights/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Gagal memuat analisis AI")
      const data = await res.json()
      setInsight(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Analisis AI
            <Badge className="text-xs py-0 h-4">Premium</Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchInsight} className="h-7 text-xs gap-1">
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {insight ? (open ? "Tutup" : "Lihat") : "Analisis"}
          </Button>
        </div>
        {!open && (
          <p className="text-xs text-muted-foreground">
            Dapatkan insight mendalam dan saran penghematan personal dari AI.
          </p>
        )}
      </CardHeader>

      {open && (
        <CardContent className="space-y-3 pt-0">
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {insight && (
            <>
              <p className="text-sm text-muted-foreground">{insight.summary}</p>

              {insight.highlights.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold flex items-center gap-1 text-green-600 dark:text-green-400">
                    <TrendingUp className="h-3.5 w-3.5" /> Hal Positif
                  </p>
                  {insight.highlights.map((h, i) => (
                    <p key={i} className={cn("text-sm pl-4 relative before:absolute before:left-1 before:content-['•'] before:text-green-500")}>{h}</p>
                  ))}
                </div>
              )}

              {insight.warnings.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> Perlu Diperhatikan
                  </p>
                  {insight.warnings.map((w, i) => (
                    <p key={i} className={cn("text-sm pl-4 relative before:absolute before:left-1 before:content-['•'] before:text-amber-500")}>{w}</p>
                  ))}
                </div>
              )}

              {insight.tips.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <Lightbulb className="h-3.5 w-3.5" /> Saran
                  </p>
                  {insight.tips.map((t, i) => (
                    <p key={i} className={cn("text-sm pl-4 relative before:absolute before:left-1 before:content-['•'] before:text-blue-500")}>{t}</p>
                  ))}
                </div>
              )}

              {insight.prediction && (
                <div className="rounded-lg bg-muted/50 p-3 flex gap-2">
                  <Telescope className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{insight.prediction}</p>
                </div>
              )}

              <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => { setInsight(null); fetchInsight() }}>
                <Sparkles className="h-3 w-3 mr-1" /> Analisis Ulang
              </Button>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
