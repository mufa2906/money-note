import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { subscription, user, notification } from "@/lib/schema"
import { requireAuth, generateId } from "@/lib/api-auth"
import { getXenditInvoice, PLAN_PRICES } from "@/lib/xendit"

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const pendingSubs = await db
    .select()
    .from(subscription)
    .where(and(eq(subscription.userId, session.user.id), eq(subscription.status, "pending")))
    .orderBy(desc(subscription.createdAt))

  let upgraded = false

  for (const sub of pendingSubs) {
    if (!sub.externalId) continue

    let invoice
    try {
      invoice = await getXenditInvoice(sub.externalId)
    } catch (e) {
      console.error("Xendit verify error:", e)
      continue
    }

    const now = new Date()
    if (invoice.status === "PAID" || invoice.status === "SETTLED") {
      const durationDays = PLAN_PRICES[sub.planType].durationDays
      const periodEnd = new Date(now.getTime() + durationDays * 86400 * 1000)

      await db
        .update(subscription)
        .set({
          status: "active",
          paidAt: invoice.paid_at ? new Date(invoice.paid_at) : now,
          paymentMethod: invoice.payment_method,
          paymentChannel: invoice.payment_channel,
          currentPeriodEnd: periodEnd,
          updatedAt: now,
        })
        .where(eq(subscription.id, sub.id))

      await db
        .update(user)
        .set({ subscriptionTier: "premium", updatedAt: now })
        .where(eq(user.id, session.user.id))

      await db.insert(notification).values({
        id: generateId(),
        userId: session.user.id,
        kind: "system",
        title: "Pembayaran Berhasil",
        body: `Akun kamu sekarang Premium. Berlaku hingga ${periodEnd.toLocaleDateString("id-ID")}.`,
      })

      upgraded = true
      break
    } else if (invoice.status === "EXPIRED") {
      await db
        .update(subscription)
        .set({ status: "expired", updatedAt: now })
        .where(eq(subscription.id, sub.id))
    }
  }

  const [u] = await db.select().from(user).where(eq(user.id, session.user.id))
  return NextResponse.json({ upgraded, subscriptionTier: u?.subscriptionTier ?? "free" })
}
