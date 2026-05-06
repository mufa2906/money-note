"use client"

import { useState } from "react"
import Link from "next/link"
import { Crown, MessageCircle, Sparkles, Users, ArrowRight, Check, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/providers/auth-provider"

const PERKS = [
  {
    icon: MessageCircle,
    title: "Hubungkan WhatsApp Bot",
    description: "Catat transaksi langsung dari chat WA.",
    href: "/dashboard/integrations",
    cta: "Hubungkan",
  },
  {
    icon: Sparkles,
    title: "Wawasan Lengkap",
    description: "Lihat semua kategori & analisis tren mendalam.",
    href: "/dashboard/insights",
    cta: "Buka Insights",
  },
  {
    icon: Users,
    title: "Bagi Tagihan Tanpa Batas",
    description: "Buat dan kirim pengingat ke kontakmu.",
    href: "/dashboard/split-bill",
    cta: "Buka Bagi Tagihan",
  },
] as const

export function PremiumActiveCard() {
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)
  if (!user || user.subscriptionTier === "free") return null

  const endsAt = user?.subscriptionEndsAt
    ? new Date(user.subscriptionEndsAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : null

  return (
    <Card className="border-amber-500/40 bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-amber-950/40 dark:to-amber-900/20">
      <CardContent className="p-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-between w-full gap-3 text-left"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex-shrink-0">
              <Crown className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">Premium Aktif</p>
              {endsAt && <p className="text-xs text-muted-foreground leading-tight">Hingga {endsAt}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-xs py-0 px-1.5 h-5">
              <Check className="h-3 w-3 mr-1" />Aktif
            </Badge>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {expanded && (
          <div className="mt-3 space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              {PERKS.map(({ icon: Icon, title, description, href, cta }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex flex-col gap-1.5 rounded-lg border bg-background/60 p-3 hover:bg-background transition-colors"
                >
                  <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm font-medium leading-tight">{title}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{description}</p>
                  <span className="inline-flex items-center text-xs font-medium text-amber-700 dark:text-amber-400 mt-1 group-hover:gap-1.5 gap-1 transition-all">
                    {cta} <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-amber-500/20">
              <p className="text-xs text-muted-foreground">Lihat detail manfaat & status pembayaran</p>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link href="/dashboard/upgrade">Detail <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
