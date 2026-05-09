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
  if (!vapidPublicKey || !vapidPrivateKey) return
  initVapid()

  const subs = await db
    .select()
    .from(pushSubscription)
    .where(eq(pushSubscription.userId, userId))

  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        )
      } catch (err: unknown) {
        // 404/410 = subscription expired or invalid key — remove from DB
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) {
          await db.delete(pushSubscription).where(eq(pushSubscription.endpoint, s.endpoint))
        }
      }
    })
  )
}
