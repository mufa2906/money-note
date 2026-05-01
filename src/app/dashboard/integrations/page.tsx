"use client"

import { useState } from "react"
import { Bot, Copy, Check, ExternalLink, Lock, Crown, MessageCircle, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/providers/auth-provider"
import Link from "next/link"
import { useToast } from "@/lib/hooks/use-toast"

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "MoneyNote01Bot"

export default function IntegrationsPage() {
  const { user, refetchUser } = useAuth()
  const { toast } = useToast()
  const isPremium = user?.subscriptionTier !== "free"
  const verificationCode = user?.verificationCode
  const [copied, setCopied] = useState(false)
  const [telegramLinked, setTelegramLinked] = useState(!!user?.telegramId)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [waInput, setWaInput] = useState("")
  const [savingWa, setSavingWa] = useState(false)

  function copyCode() {
    if (!verificationCode) return
    navigator.clipboard.writeText(verificationCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function generateCode() {
    setGeneratingCode(true)
    try {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
      let code = "MN-"
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationCode: code }),
      })
      if (!res.ok) throw new Error()
      await refetchUser()
      toast({ title: "Kode dibuat!", description: "Kode verifikasi baru siap digunakan." })
    } catch {
      toast({ title: "Gagal", description: "Coba lagi.", variant: "destructive" })
    } finally {
      setGeneratingCode(false)
    }
  }

  async function unlinkTelegram() {
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: null }),
    })
    await refetchUser()
    setTelegramLinked(false)
    toast({ title: "Telegram diputus", description: "Bot Telegram tidak lagi terhubung." })
  }

  function normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, "")
    if (!digits) return ""
    if (digits.startsWith("0")) return `+62${digits.slice(1)}`
    if (digits.startsWith("62")) return `+${digits}`
    if (raw.trim().startsWith("+")) return `+${digits}`
    return `+62${digits}`
  }

  async function linkWhatsApp(e: React.FormEvent) {
    e.preventDefault()
    const phone = normalizePhone(waInput)
    if (phone.length < 9) {
      toast({ title: "Nomor tidak valid", description: "Masukkan nomor WhatsApp yang benar.", variant: "destructive" })
      return
    }
    setSavingWa(true)
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waId: phone }),
      })
      if (!res.ok) throw new Error("Gagal menyimpan nomor")
      await refetchUser()
      setWaInput("")
      toast({ title: "Nomor WhatsApp tersimpan", description: `Bot akan kirim pesan konfirmasi ke ${phone}.` })
    } catch (e) {
      toast({ title: "Gagal", description: e instanceof Error ? e.message : String(e), variant: "destructive" })
    } finally {
      setSavingWa(false)
    }
  }

  async function unlinkWhatsApp() {
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waId: null }),
    })
    await refetchUser()
    toast({ title: "WhatsApp diputus", description: "Bot WhatsApp tidak lagi terhubung." })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Integrasi Bot</h1>
        <p className="text-sm text-muted-foreground">Hubungkan akun dengan Telegram atau WhatsApp</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-500" />
              Telegram Bot
            </CardTitle>
            <Badge variant="secondary">Gratis</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {telegramLinked || user?.telegramId ? (
            <div className="space-y-3">
              <Alert>
                <Check className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-sm">
                  <span className="font-medium text-green-600">Terhubung!</span> Telegram Bot sudah terhubung dengan akunmu.
                </AlertDescription>
              </Alert>
              <Button variant="outline" size="sm" className="w-full" onClick={unlinkTelegram}>
                Putuskan Koneksi Telegram
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                <span className="text-sm text-muted-foreground flex-shrink-0">Kode verifikasi:</span>
                {verificationCode ? (
                  <code className="flex-1 font-mono font-bold tracking-widest text-primary">{verificationCode}</code>
                ) : (
                  <Skeleton className="flex-1 h-5" />
                )}
                {verificationCode ? (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyCode}>
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={generateCode} disabled={generatingCode}>
                    <RefreshCw className={`h-3.5 w-3.5 ${generatingCode ? "animate-spin" : ""}`} />
                    Buat Kode
                  </Button>
                )}
              </div>

              {verificationCode && (
                <>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">Langkah menghubungkan:</p>
                    <ol className="space-y-2 text-muted-foreground list-decimal pl-4">
                      <li>Buka Telegram dan cari <span className="font-mono text-foreground">@{TELEGRAM_BOT_USERNAME}</span></li>
                      <li>Kirim pesan: <code className="bg-muted rounded px-1 text-foreground">/start {verificationCode}</code></li>
                      <li>Bot akan mengkonfirmasi akunmu berhasil terhubung</li>
                    </ol>
                  </div>

                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <a href={`https://t.me/${TELEGRAM_BOT_USERNAME}?start=${verificationCode}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1.5" />Buka Telegram
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={generateCode} disabled={generatingCode}>
                      <RefreshCw className={`h-3.5 w-3.5 ${generatingCode ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <Separator />
          <div>
            <p className="text-sm font-medium mb-2">Perintah Bot yang tersedia:</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                ["/catat [kategori] 50000 deskripsi", "Catat transaksi baru"],
                ["/saldo", "Lihat total saldo"],
                ["/ringkasan", "Ringkasan bulan ini"],
                ["/tagihan", "Daftar tagihan aktif"],
              ].map(([cmd, desc]) => (
                <div key={cmd} className="flex items-center gap-1.5 bg-muted rounded p-1.5">
                  <code className="font-mono text-primary text-[11px]">{cmd}</code>
                  <span className="text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              WhatsApp Bot
            </CardTitle>
            <Badge><Crown className="h-3 w-3 mr-1" />Premium</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isPremium ? (
            user?.waId ? (
              <div className="space-y-3">
                <Alert>
                  <Check className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-sm">
                    <span className="font-medium text-green-600">Terhubung!</span> WhatsApp Bot aktif di <span className="font-mono">{user.waId}</span>.
                  </AlertDescription>
                </Alert>
                <Button variant="outline" size="sm" className="w-full" onClick={unlinkWhatsApp}>
                  Putuskan Koneksi WhatsApp
                </Button>
              </div>
            ) : (
              <form onSubmit={linkWhatsApp} className="space-y-3">
                <Alert>
                  <AlertDescription className="text-sm">
                    Hubungkan WhatsApp untuk catat transaksi lebih mudah melalui chat WA.
                  </AlertDescription>
                </Alert>
                <div className="space-y-1.5">
                  <Label htmlFor="wa-phone">Nomor WhatsApp</Label>
                  <Input
                    id="wa-phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="08123456789"
                    value={waInput}
                    onChange={(e) => setWaInput(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Awalan 0 atau +62 diterima.</p>
                </div>
                <Button type="submit" className="w-full" disabled={savingWa || !waInput}>
                  {savingWa ? "Menyimpan..." : "Hubungkan WhatsApp"}
                </Button>
              </form>
            )
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Fitur Premium</p>
                <p className="text-xs text-muted-foreground mt-1">WhatsApp Bot tersedia untuk pengguna Premium karena ada biaya operasional per percakapan.</p>
              </div>
              <Button asChild size="sm">
                <Link href="/dashboard/upgrade">Upgrade ke Premium</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
