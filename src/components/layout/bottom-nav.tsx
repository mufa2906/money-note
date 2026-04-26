"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ArrowLeftRight, Sparkles, Settings, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { AddTransactionModal } from "@/components/transactions/add-transaction-modal"

const ITEMS = [
  { href: "/dashboard", label: "Beranda", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/transactions", label: "Transaksi", icon: ArrowLeftRight },
  null,
  { href: "/dashboard/insights", label: "Wawasan", icon: Sparkles },
  { href: "/dashboard/settings", label: "Pengaturan", icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()
  const [addOpen, setAddOpen] = useState(false)

  function isActive(href: string, exact = false) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center bg-background border-t pb-safe lg:hidden">
        {ITEMS.map((item, i) => {
          if (item === null) {
            return (
              <button
                key="add"
                onClick={() => setAddOpen(true)}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
              >
                <div className="flex h-11 w-11 -mt-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Plus className="h-5 w-5" />
                </div>
              </button>
            )
          }
          const { href, label, icon: Icon, exact } = item
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-3 text-xs transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              <span className="text-[10px] leading-none">{label}</span>
            </Link>
          )
        })}
      </nav>
      <AddTransactionModal open={addOpen} onOpenChange={setAddOpen} />
    </>
  )
}
