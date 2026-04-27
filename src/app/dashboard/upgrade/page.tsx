"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, Crown, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/providers/auth-provider"
import { useToast } from "@/lib/hooks/use-toast"

const FREE_FEATURES = [
  { label: "Telegram Bot", included: true },
  { label: "Input manual & import CSV", included: true },
  { label: "Notifikasi push standar", included: true },
  { label: "Kategorisasi AI otomatis", included: true },
  { label: "Bagi tagihan sederhana", included: true },
  { label: "WhatsApp Bot", included: false },
  { label: "Sinkronisasi bank otomatis", included: false },
  { label: "Deep AI Insights & saran", included: false },
  { label: "Auto-track bagi tagihan", included: false },
  { label: "Notifikasi prioritas tinggi", included: false },
]

const PREMIUM_FEATURES = FREE_FEATURES.map((f) => ({ ...f, included: true }))

function CheckoutStatusToast() {
  const { refetchUser } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return
    const status = searchParams.get("status")
    if (status !== "success" && status !== "failed") return

    handledRef.current = true
    router.replace("/dashboard/upgrade")

    if (status === "failed") {
      toast({ title: "Pembayaran gagal", description: "Silakan coba lagi.", variant: "destructive" })
      return
    }

    let cancelled = false
    let attempts = 0
    const maxAttempts = 10
    const intervalMs = 2000

    const poll = async () => {
      if (cancelled) return
      attempts += 1
      try {
        const res = await fetch("/api/user", { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          if (data.subscriptionTier === "premium") {
            await refetchUser()
            toast({ title: "Pembayaran berhasil", description: "Akun kamu sekarang Premium. Selamat menikmati!" })
            return
          }
        }
      } catch {
        // ignore and retry
      }
      if (attempts >= maxAttempts) {
        toast({
          title: "Pembayaran sedang dikonfirmasi",
          description: "Tunggu beberapa saat. Premium akan aktif otomatis setelah konfirmasi diterima.",
        })
        return
      }
      setTimeout(poll, intervalMs)
    }

    poll()

    return () => {
      cancelled = true
    }
  }, [searchParams, toast, refetchUser, router])

  return null
}

export default function UpgradePage() {
  const { user, refetchUser } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const isPremium = user?.subscriptionTier === "premium"

  async function handleUpgrade(plan: "monthly" | "yearly") {
    setLoading(true)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Gagal membuat pembayaran")
      }
      const { invoiceUrl } = await res.json()
      if (!invoiceUrl) throw new Error("URL pembayaran tidak tersedia")
      window.location.href = invoiceUrl
    } catch (e) {
      toast({ title: "Gagal", description: e instanceof Error ? e.message : String(e), variant: "destructive" })
      setLoading(false)
    }
  }

  async function handleDowngrade() {
    setLoading(true)
    try {
      await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionTier: "free" }),
      })
      await refetchUser()
      toast({ title: "Downgrade berhasil", description: "Akunmu kembali ke tier Gratis." })
    } catch (e) {
      toast({ title: "Gagal", description: String(e), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <CheckoutStatusToast />
      </Suspense>
      <div className="text-center">
        <Badge variant="secondary" className="mb-3"><Crown className="h-3 w-3 mr-1" />Pilih Plan</Badge>
        <h1 className="text-2xl font-bold">Upgrade ke Premium</h1>
        <p className="text-muted-foreground mt-2">Buka semua fitur untuk kendali keuangan penuh</p>
        {isPremium && <Badge className="mt-2 mx-auto">Kamu sudah Premium!</Badge>}
      </div>

      <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        <Card className={isPremium ? "opacity-60" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Gratis</CardTitle>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">Rp 0</span>
              <span className="text-muted-foreground text-sm">/ selamanya</span>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-2.5">
            {FREE_FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-sm">
                {f.included ? (
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted flex-shrink-0" />
                )}
                <span className={f.included ? "" : "text-muted-foreground"}>{f.label}</span>
              </div>
            ))}
            {isPremium && (
              <Button variant="outline" className="w-full mt-4" onClick={handleDowngrade} disabled={loading}>
                Downgrade ke Gratis
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="ring-2 ring-primary relative">
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Populer</Badge>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" /> Premium
            </CardTitle>
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">Rp 49.000</span>
                <span className="text-muted-foreground text-sm">/ bulan</span>
              </div>
              <p className="text-xs text-muted-foreground">atau Rp 469.000 / tahun (hemat 20%)</p>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-2.5">
            {PREMIUM_FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>{f.label}</span>
              </div>
            ))}
            {!isPremium ? (
              <div className="space-y-2 mt-4">
                <Button className="w-full" onClick={() => handleUpgrade("monthly")} disabled={loading}>
                  <Zap className="h-4 w-4 mr-1.5" />Mulai Premium — Rp 49.000/bln
                </Button>
                <Button variant="outline" className="w-full" onClick={() => handleUpgrade("yearly")} disabled={loading}>
                  Bayar Tahunan — Rp 469.000/thn
                </Button>
              </div>
            ) : (
              <div className="mt-4 text-center">
                <Badge variant="default" className="text-sm px-4 py-1.5">
                  <Check className="h-3.5 w-3.5 mr-1.5" />Aktif
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Pembayaran aman via Xendit. Batalkan kapan saja. Data kamu tetap aman.
      </p>
    </div>
  )
}
