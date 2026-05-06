"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Tag, Users, Sparkles,
  Bot, Bell, Crown, Settings, LogOut, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/providers/auth-provider"
import { getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { signOut } from "@/lib/auth-client"

const NAV = [
  { href: "/dashboard", label: "Beranda", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/transactions", label: "Transaksi", icon: ArrowLeftRight },
  { href: "/dashboard/accounts", label: "Akun", icon: Wallet },
  { href: "/dashboard/categories", label: "Kategori", icon: Tag },
  { href: "/dashboard/split-bill", label: "Bagi Tagihan", icon: Users },
  { href: "/dashboard/insights", label: "Wawasan", icon: Sparkles },
  { href: "/dashboard/integrations", label: "Integrasi Bot", icon: Bot },
  { href: "/dashboard/notifications", label: "Notifikasi", icon: Bell },
  { href: "/dashboard/upgrade", label: "Upgrade", icon: Crown },
  { href: "/dashboard/settings", label: "Pengaturan", icon: Settings },
]

interface MobileMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileMenu({ open, onOpenChange }: MobileMenuProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()

  function isActive(href: string, exact = false) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  async function handleSignOut() {
    onOpenChange(false)
    await signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex flex-col p-0 w-72">
        <SheetHeader className="flex-row items-center gap-2 px-4 h-14 border-b space-y-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">M</div>
          <SheetTitle className="font-semibold">MoneyNote</SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {NAV.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              onClick={() => onOpenChange(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive(href, exact)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{label}</span>
              {href === "/dashboard/upgrade" && user?.subscriptionTier === "free" && (
                <Badge variant="secondary" className="ml-auto text-xs py-0 px-1.5">Free</Badge>
              )}
            </Link>
          ))}
        </nav>

        <Separator />
        <div className="p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {user ? getInitials(user.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name ?? "..."}</p>
              <Badge variant={user?.subscriptionTier !== "free" ? "default" : "outline"} className="text-xs py-0 px-1.5 h-4">
                {user?.subscriptionTier === "lifetime" ? "Lifetime" : user?.subscriptionTier === "premium" ? "Premium" : "Gratis"}
              </Badge>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
