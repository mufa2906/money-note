"use client"

import { useNotificationsContext } from "@/providers/data-provider"

export function useNotifications() {
  return useNotificationsContext()
}
