"use client"

import { useEffect, useState } from "react"

export function usePushNotification() {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    if ("Notification" in window && "serviceWorker" in navigator) {
      setIsSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async () => {
    if (!isSupported) return
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }

  return { permission, isSupported, requestPermission }
}
