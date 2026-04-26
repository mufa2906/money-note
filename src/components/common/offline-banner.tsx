"use client"

import { WifiOff } from "lucide-react"
import { useOnlineStatus } from "@/lib/hooks/use-online-status"
import { cn } from "@/lib/utils"

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className={cn(
      "fixed bottom-20 left-1/2 -translate-x-1/2 z-50",
      "flex items-center gap-2 rounded-full bg-destructive text-destructive-foreground",
      "px-4 py-2 text-sm shadow-lg lg:bottom-4"
    )}>
      <WifiOff className="h-4 w-4" />
      <span>Sedang offline — data akan disinkronkan saat online</span>
    </div>
  )
}
