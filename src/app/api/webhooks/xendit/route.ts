import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { subscription, user, notification } from "@/lib/schema"
import { generateId } from "@/lib/api-auth"
import { verifyXenditWebhook, PLAN_PRICES } from "@/lib/xendit"

export async function POST(request: NextRequest) {
  const callbackToken = request.headers.get("x-callback-token")
  if (!verifyXenditWebhook(callbackToken)) {
    return NextResponse.json({ error: "Invalid callback token" }, { status: 401 })
  }

  const payload = await request.json().catch(() => null) as {
    id?: string
    external_id?: string
    status?: string
    paid_at?: string
    payment_method?: string
    payment_channel?: string
  } | null

  if (!payload?.external_id || !payload.status) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const [sub] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.externalReference, payload.external_id))

  if (!sub) {
    return NextResponse.json({ ok: true, ignored: "unknown external_id" })
  }

  const now = new Date()

  if (payload.status === "PAID" || payload.status === "SETTLED") {
    if (sub.status === "active") {
      return NextResponse.json({ ok: true, ignored: "already active" })
    }

    const durationDays = PLAN_PRICES[sub.planType].durationDays
    const periodEnd = new Date(now.getTime() + durationDays * 86400 * 1000)

    await db
      .update(subscription)
      .set({
        status: "active",
        paidAt: payload.paid_at ? new Date(payload.paid_at) : now,
        paymentMethod: payload.payment_method,
        paymentChannel: payload.payment_channel,
        currentPeriodEnd: periodEnd,
        updatedAt: now,
      })
      .where(eq(subscription.id, sub.id))

    await db.update(user).set({ subscriptionTier: "premium", updatedAt: now }).where(eq(user.id, sub.userId))

    await db.insert(notification).values({
      id: generateId(),
      userId: sub.userId,
      kind: "system",
      title: "Pembayaran Berhasil",
      body: `Akun kamu sekarang Premium. Berlaku hingga ${periodEnd.toLocaleDateString("id-ID")}.`,
    })
  } else if (payload.status === "EXPIRED") {
    await db
      .update(subscription)
      .set({ status: "expired", updatedAt: now })
      .where(eq(subscription.id, sub.id))
  } else if (payload.status === "FAILED") {
    await db
      .update(subscription)
      .set({ status: "failed", updatedAt: now })
      .where(eq(subscription.id, sub.id))
  }

  return NextResponse.json({ ok: true })
}
