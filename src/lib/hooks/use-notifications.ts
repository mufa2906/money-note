"use client"

import { useEffect, useState, useCallback } from "react"
import type { AppNotification, NotificationKind } from "@/types"

function mapRow(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string,
    userId: row.userId as string,
    kind: row.kind as NotificationKind,
    title: row.title as string,
    body: row.body as string,
    isRead: row.isRead as boolean,
    createdAt: row.createdAt ? new Date(row.createdAt as string | number).toISOString() : new Date().toISOString(),
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/notifications")
      if (!res.ok) return
      const data = await res.json()
      const mapped = data.map(mapRow)
      setNotifications(mapped)
      setUnreadCount(mapped.filter((n: AppNotification) => !n.isRead).length)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  return { notifications, loading, unreadCount, markAllRead, refetch: fetch_ }
}
