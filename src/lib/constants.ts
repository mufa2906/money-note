import type { Category } from "@/types"

export const CATEGORIES: { value: Category; label: string; color: string; icon: string }[] = [
  { value: "makanan", label: "Makanan", color: "#f97316", icon: "UtensilsCrossed" },
  { value: "transportasi", label: "Transportasi", color: "#3b82f6", icon: "Car" },
  { value: "belanja", label: "Belanja", color: "#a855f7", icon: "ShoppingBag" },
  { value: "hiburan", label: "Hiburan", color: "#ec4899", icon: "Music" },
  { value: "tagihan", label: "Tagihan", color: "#ef4444", icon: "FileText" },
  { value: "kesehatan", label: "Kesehatan", color: "#22c55e", icon: "Heart" },
  { value: "pendidikan", label: "Pendidikan", color: "#06b6d4", icon: "BookOpen" },
  { value: "gaji", label: "Gaji", color: "#84cc16", icon: "Briefcase" },
  { value: "lainnya", label: "Lainnya", color: "#78716c", icon: "MoreHorizontal" },
]

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Beranda", icon: "LayoutDashboard" },
  { href: "/dashboard/transactions", label: "Transaksi", icon: "ArrowLeftRight" },
  { href: "/dashboard/accounts", label: "Akun", icon: "Wallet" },
  { href: "/dashboard/categories", label: "Kategori", icon: "Tag" },
  { href: "/dashboard/split-bill", label: "Bagi Tagihan", icon: "Users" },
  { href: "/dashboard/insights", label: "Wawasan AI", icon: "Sparkles" },
  { href: "/dashboard/integrations", label: "Integrasi Bot", icon: "Bot" },
  { href: "/dashboard/notifications", label: "Notifikasi", icon: "Bell" },
  { href: "/dashboard/upgrade", label: "Upgrade", icon: "Crown" },
  { href: "/dashboard/settings", label: "Pengaturan", icon: "Settings" },
]

export const BOTTOM_NAV_ITEMS = [
  { href: "/dashboard", label: "Beranda", icon: "LayoutDashboard" },
  { href: "/dashboard/transactions", label: "Transaksi", icon: "ArrowLeftRight" },
  { href: "/dashboard/insights", label: "Wawasan", icon: "Sparkles" },
  { href: "/dashboard/settings", label: "Pengaturan", icon: "Settings" },
]

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c])
) as Record<Category, (typeof CATEGORIES)[0]>
