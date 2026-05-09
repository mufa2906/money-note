import webpush from "web-push"
import { db } from "./db"
import { pushSubscription } from "./schema"
import { eq } from "drizzle-orm"

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidEmail = process.env.VAPID_EMAIL ?? "mailto:admin@moneynote.app"

let initialized = false
function initVapid() {
  if (initialized || !vapidPublicKey || !vapidPrivateKey) return
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)
  initialized = true
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log("[push] VAPID keys not set, skipping")
    return
  }
  initVapid()

  const subs = await db
    .select()
    .from(pushSubscription)
    .where(eq(pushSubscription.userId, userId))

  console.log(`[push] sending to ${subs.length} subscription(s) for user ${userId}`)

  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        const res = await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        )
        console.log(`[push] sent OK status=${res.statusCode}`)
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode
        console.log(`[push] send failed status=${status}`, (err as { body?: string })?.body)
        if (status === 404 || status === 410) {
          await db.delete(pushSubscription).where(eq(pushSubscription.endpoint, s.endpoint))
        }
      }
    })
  )
}
