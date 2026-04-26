"use client"

import { useState } from "react"
import { User, Bell, Shield, LogOut, Crown, KeyRound } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/providers/auth-provider"
import { usePushNotification } from "@/lib/hooks/use-push-notification"
import { getInitials } from "@/lib/utils"
import { useToast } from "@/lib/hooks/use-toast"
import { signOut, changePassword } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function SettingsPage() {
  const { user, refetchUser } = useAuth()
  const { permission, isSupported, requestPermission } = usePushNotification()
  const { toast } = useToast()
  const router = useRouter()
  const [name, setName] = useState(user?.name ?? "")
  const [saving, setSaving] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(permission === "granted")
  const [weeklyDigest, setWeeklyDigest] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("weeklyDigest") !== "false"
    return true
  })

  // Change password modal state
  const [pwOpen, setPwOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSaving, setPwSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error("Gagal menyimpan")
      await refetchUser()
      toast({ title: "Pengaturan disimpan", description: "Perubahan profilmu berhasil disimpan." })
    } catch (e) {
      toast({ title: "Gagal", description: String(e), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handlePushToggle(checked: boolean) {
    if (checked && permission !== "granted") {
      const result = await requestPermission()
      setPushEnabled(result === "granted")
    } else {
      setPushEnabled(checked)
    }
  }

  function handleWeeklyToggle(checked: boolean) {
    setWeeklyDigest(checked)
    localStorage.setItem("weeklyDigest", String(checked))
    toast({ title: checked ? "Ringkasan mingguan aktif" : "Ringkasan mingguan dimatikan" })
  }

  async function handleSignOut() {
    await signOut()
    router.push("/auth/login")
    router.refresh()
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    if (newPw.length < 8) { setPwError("Password baru minimal 8 karakter."); return }
    if (newPw !== confirmPw) { setPwError("Konfirmasi password tidak cocok."); return }
    setPwSaving(true)
    try {
      const result = await changePassword({ currentPassword: currentPw, newPassword: newPw, revokeOtherSessions: true })
      if (result.error) throw new Error(result.error.message ?? "Gagal mengubah password")
      toast({ title: "Password diubah!", description: "Password barumu sudah aktif." })
      setCurrentPw(""); setNewPw(""); setConfirmPw(""); setPwOpen(false)
    } catch (e) {
      setPwError(String(e).replace("Error: ", ""))
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <>
      <div className="space-y-4 max-w-xl">
        <div>
          <h1 className="text-xl font-bold">Pengaturan</h1>
          <p className="text-sm text-muted-foreground">Kelola profil dan preferensi akunmu</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg bg-primary/10 text-primary">{user ? getInitials(user.name) : "?"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.name ?? "..."}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge variant={user?.subscriptionTier === "premium" ? "default" : "secondary"} className="mt-1">
                  {user?.subscriptionTier === "premium" ? <><Crown className="h-3 w-3 mr-1" />Premium</> : "Gratis"}
                </Badge>
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email ?? ""} disabled className="opacity-60" />
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" />Notifikasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Push Notification</p>
                <p className="text-xs text-muted-foreground">Pengingat tagihan & alert anggaran</p>
              </div>
              {isSupported ? (
                <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} />
              ) : (
                <Badge variant="outline" className="text-xs">Tidak didukung</Badge>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Ringkasan Mingguan</p>
                <p className="text-xs text-muted-foreground">Laporan keuangan tiap akhir minggu via Bot</p>
              </div>
              <Switch checked={weeklyDigest} onCheckedChange={handleWeeklyToggle} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Keamanan & Akun</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => setPwOpen(true)}>
              <KeyRound className="h-4 w-4 mr-2" />Ubah Password
            </Button>
            {user?.subscriptionTier === "free" && (
              <Button asChild className="w-full justify-start">
                <Link href="/dashboard/upgrade"><Crown className="h-4 w-4 mr-2" />Upgrade ke Premium</Link>
              </Button>
            )}
            <Separator />
            <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />Keluar
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {pwError && (
              <Alert variant="destructive">
                <AlertDescription>{pwError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1">
              <Label htmlFor="current-pw">Password Saat Ini</Label>
              <Input id="current-pw" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-pw">Password Baru</Label>
              <Input id="new-pw" type="password" placeholder="Min. 8 karakter" minLength={8} value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm-pw">Konfirmasi Password Baru</Label>
              <Input id="confirm-pw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={pwSaving}>
              {pwSaving ? "Menyimpan..." : "Ubah Password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
