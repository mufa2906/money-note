import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { user, subscription } from "@/lib/schema"
import { and, eq, gt } from "drizzle-orm"
import { requireAuth } from "@/lib/api-auth"

async function getActivePaidSubscription(userId: string) {
  const [row] = await db
    .select({ id: subscription.id, currentPeriodEnd: subscription.currentPeriodEnd })
    .from(subscription)
    .where(
      and(
        eq(subscription.userId, userId),
        eq(subscription.status, "active"),
        gt(subscription.currentPeriodEnd, new Date()),
      ),
    )
    .limit(1)
  return row ?? null
}

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const [u] = await db.select().from(user).where(eq(user.id, session.user.id))
  if (!u) return NextResponse.json(session.user)

  // Lazy-expire premium when no active paid period remains. Xendit invoices are
  // one-time payments — the only way premium ends is by reaching currentPeriodEnd.
  const activeSub = await getActivePaidSubscription(session.user.id)
  if (u.subscriptionTier === "premium" && !activeSub) {
    const [downgraded] = await db
      .update(user)
      .set({ subscriptionTier: "free", updatedAt: new Date() })
      .where(eq(user.id, session.user.id))
      .returning()
    return NextResponse.json({ ...downgraded, subscriptionEndsAt: null })
  }

  return NextResponse.json({ ...u, subscriptionEndsAt: activeSub?.currentPeriodEnd ?? null })
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const body = await request.json()
  const { name, telegramId, waId, subscriptionTier, verificationCode } = body

  // subscriptionTier is server-controlled: upgrades come from a verified Xendit
  // payment, downgrades happen automatically when currentPeriodEnd passes.
  if (subscriptionTier !== undefined) {
    return NextResponse.json({ error: "subscriptionTier is read-only" }, { status: 403 })
  }

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (telegramId !== undefined) updates.telegramId = telegramId
  if (waId !== undefined) updates.waId = waId
  if (verificationCode !== undefined) updates.verificationCode = verificationCode

  const [updated] = await db
    .update(user)
    .set(updates)
    .where(eq(user.id, session.user.id))
    .returning()

  return NextResponse.json(updated)
}
