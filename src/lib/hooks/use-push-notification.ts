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
    if (!isSupported) { console.warn("[push] 0 not supported"); return false }
    setLoading(true)
    try {
      console.log("[push] 1 requesting permission, current:", Notification.permission)
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== "granted") { console.warn("[push] 1 permission denied:", perm); return false }
      console.log("[push] 2 fetching VAPID key")

      const keyRes = await fetch("/api/push/vapid-key")
      if (!keyRes.ok) { console.error("[push] 2 vapid-key fetch failed:", keyRes.status); return false }
      const { publicKey } = await keyRes.json()
      console.log("[push] 3 got key len:", publicKey?.length, "| waiting for SW")

      const reg = await navigator.serviceWorker.ready
      console.log("[push] 4 SW ready, active:", reg.active?.state, "scope:", reg.scope)

      const existing = await reg.pushManager.getSubscription()
      console.log("[push] 5 existing sub:", existing?.endpoint ?? "none")
      if (existing) await existing.unsubscribe()

      console.log("[push] 6 calling PushManager.subscribe")
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      console.log("[push] 7 subscribed:", sub.endpoint)

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
        console.error("[push] 8 POST failed:", res.status, body)
        return false
      }
      console.log("[push] 9 done")
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
  // Strip any characters that aren't valid base64url (guards against trailing newlines or invisible chars from env vars)
  const clean = base64String.replace(/[^A-Za-z0-9\-_]/g, "")
  const padding = "=".repeat((4 - (clean.length % 4)) % 4)
  const base64 = (clean + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}
