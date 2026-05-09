"use client"

import { Bell, Check, AlertTriangle, Info, TrendingDown, Bot } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { EmptyState } from "@/components/common/empty-state"
import { LoadingSkeleton } from "@/components/common/loading-skeleton"
import { usePushNotification } from "@/lib/hooks/use-push-notification"
import { useNotifications } from "@/lib/hooks/use-notifications"
import { formatDate } from "@/lib/utils"
import type { NotificationKind } from "@/types"
import { cn } from "@/lib/utils"

const KIND_ICONS: Record<NotificationKind, React.ComponentType<{ className?: string }>> = {
  transaction_added: Check,
  budget_warning: AlertTriangle,
  split_reminder: Bot,
  weekly_summary: TrendingDown,
  system: Info,
}

const KIND_COLORS: Record<NotificationKind, string> = {
  transaction_added: "text-green-500",
  budget_warning: "text-orange-500",
  split_reminder: "text-blue-500",
  weekly_summary: "text-purple-500",
  system: "text-muted-foreground",
}

export default function NotificationsPage() {
  const { isSupported, isSubscribed, subscribe } = usePushNotification()
  const { notifications, loading, unreadCount, markAllRead } = useNotifications()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Notifikasi</h1>
          {unreadCount > 0 && <p className="text-sm text-muted-foreground">{unreadCount} belum dibaca</p>}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-7">
            Tandai semua dibaca
          </Button>
        )}
      </div>

      {isSupported && !isSubscribed && (
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertTitle className="text-sm">Aktifkan Notifikasi Push</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            Dapatkan pengingat tagihan dan alert anggaran langsung di browser.{" "}
            <Button variant="link" className="h-auto p-0 text-xs" onClick={subscribe}>
              Aktifkan sekarang
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingSkeleton rows={5} className="p-4" />
          ) : notifications.length === 0 ? (
            <EmptyState icon={Bell} title="Tidak ada notifikasi" className="py-10" />
          ) : (
            notifications.map((notif) => {
              const Icon = KIND_ICONS[notif.kind]
              const iconColor = KIND_COLORS[notif.kind]
              return (
                <div
                  key={notif.id}
                  className={cn(
                    "flex items-start gap-3 p-4 border-b last:border-0 transition-colors",
                    !notif.isRead && "bg-primary/5"
                  )}
                >
                  <div className={cn("mt-0.5 flex-shrink-0", iconColor)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{notif.title}</p>
                      {!notif.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(notif.createdAt)}</p>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
