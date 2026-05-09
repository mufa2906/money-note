"use client"

import { useEffect, useState } from "react"

export function usePushNotification() {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if ("Notification" in window && "serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
      checkSubscription()
    }
  }, [])

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setIsSubscribed(!!sub)
    } catch {
      // ignore
    }
  }

  async function subscribe() {
    if (!isSupported) { console.warn("[push] not supported"); return false }
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== "granted") { console.warn("[push] permission denied:", perm); return false }

      const keyRes = await fetch("/api/push/vapid-key")
      if (!keyRes.ok) { console.error("[push] vapid-key fetch failed:", keyRes.status); return false }
      const { publicKey } = await keyRes.json()
      console.log("[push] got VAPID key, subscribing...")

      const reg = await navigator.serviceWorker.ready
      console.log("[push] SW ready:", reg.active?.state)
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      console.log("[push] PushManager subscribed:", sub.endpoint)

      const json = sub.toJSON()
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      })
      if (!res.ok) {
        const body = await res.text()
        console.error("[push] POST /api/push/subscribe failed:", res.status, body)
        return false
      }

      setIsSubscribed(true)
      return true
    } catch (err) {
      console.error("[push] subscribe error:", err)
      return false
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, { method: "DELETE" })
        await sub.unsubscribe()
      }
      setIsSubscribed(false)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return { permission, isSupported, isSubscribed, loading, subscribe, unsubscribe }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}
