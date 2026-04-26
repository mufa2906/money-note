"use client"

import { Bell } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./theme-toggle"
import { useAuth } from "@/providers/auth-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useNotifications } from "@/lib/hooks/use-notifications"

export function TopBar() {
  const { user } = useAuth()
  const { unreadCount } = useNotifications()

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b bg-background lg:hidden">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
          M
        </div>
        <span className="font-semibold">MoneyNote</span>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button variant="ghost" size="icon" asChild className="relative">
          <Link href="/dashboard/notifications">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </Link>
        </Button>
        <Link href="/dashboard/settings">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {user ? getInitials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  )
}
