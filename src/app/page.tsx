import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Bot, Sparkles, Bell, WifiOff, FileSpreadsheet, CreditCard,
  Users, Check, X, ArrowRight, Shield, Smartphone,
} from "lucide-react"

const FEATURES = [
  { icon: Bot, title: "Telegram & WhatsApp Bot", desc: "Catat transaksi hanya dengan mengirim pesan chat, AI langsung mengkategorikan secara otomatis." },
  { icon: Sparkles, title: "Wawasan", desc: "Analisis pola pengeluaran, ringkasan keuangan bulanan, dan insight tren berbasis data transaksimu." },
  { icon: Bell, title: "Notifikasi Push", desc: "Pengingat tagihan dan alert anggaran langsung di browser tanpa perlu membuka aplikasi." },
  { icon: WifiOff, title: "Mode Offline", desc: "Catat transaksi tanpa internet. Data otomatis tersinkronisasi saat koneksi pulih." },
  { icon: FileSpreadsheet, title: "Import Excel/CSV", desc: "Impor riwayat transaksi dari file Excel atau CSV dengan mudah." },
  { icon: CreditCard, title: "Multi Akun", desc: "Kelola rekening bank, e-wallet, dan uang tunai dalam satu tampilan." },
]

const FREE_FEATURES = [
  "Telegram Bot",
  "Input manual & import CSV",
  "Notifikasi push standar",
  "Kategorisasi AI dasar",
  "Bagi tagihan sederhana",
]

const PREMIUM_FEATURES = [
  "Semua fitur Gratis",
  "WhatsApp Bot",
  "Sinkronisasi bank otomatis",
  "Deep AI insights & saran",
  "Auto-track bagi tagihan",
  "Notifikasi prioritas tinggi",
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">M</div>
            <span className="font-bold text-lg">MoneyNote</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Masuk</Link>
            <Button asChild size="sm">
              <Link href="/auth/register">Daftar Gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="py-20 px-4 text-center">
        <div className="container max-w-3xl mx-auto">
          <Badge variant="secondary" className="mb-4">Freemium — Gratis Selamanya</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Catat Keuangan Pribadi<br className="hidden md:block" /> lewat Chat Bot
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Kirim pesan ke Telegram Bot, AI otomatis mencatat dan mengkategorikan transaksimu.
            Pantau keuangan kapan saja, di mana saja.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link href="/auth/register">
                Mulai Gratis <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard">Lihat Demo</Link>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-4 mt-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Data terenkripsi</span>
            <span className="flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" /> Bisa di-install di HP</span>
            <span className="flex items-center gap-1"><WifiOff className="h-3.5 w-3.5" /> Offline ready</span>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Semua yang kamu butuhkan</h2>
            <p className="text-muted-foreground">Fitur lengkap untuk pencatatan keuangan yang efisien</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1.5">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Harga yang Transparan</h2>
            <p className="text-muted-foreground">Mulai gratis, upgrade kapan saja</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-1">Gratis</h3>
              <p className="text-3xl font-bold mb-1">Rp 0</p>
              <p className="text-sm text-muted-foreground mb-6">Selamanya</p>
              <ul className="space-y-2.5 mb-6">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/register">Mulai Sekarang</Link>
              </Button>
            </Card>
            <Card className="p-6 ring-2 ring-primary relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Populer</Badge>
              <h3 className="font-bold text-lg mb-1">Premium</h3>
              <p className="text-3xl font-bold mb-1">Rp 49.000</p>
              <p className="text-sm text-muted-foreground mb-6">per bulan</p>
              <ul className="space-y-2.5 mb-6">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full">
                <Link href="/auth/register">Coba 7 Hari Gratis</Link>
              </Button>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 px-4">
        <div className="container max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">M</div>
            <span className="text-sm font-medium">MoneyNote</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 MoneyNote. Semua hak dilindungi.</p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground">Privasi</Link>
            <Link href="#" className="hover:text-foreground">Syarat</Link>
            <Link href="#" className="hover:text-foreground">Kontak</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
