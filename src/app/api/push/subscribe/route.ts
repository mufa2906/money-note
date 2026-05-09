import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { pushSubscription } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { requireAuth, generateId } from "@/lib/api-auth"

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const body = await request.json()
  const { endpoint, p256dh, auth } = body
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 })
  }

  // Upsert: remove old subscription with same endpoint if exists
  await db
    .delete(pushSubscription)
    .where(and(eq(pushSubscription.userId, session.user.id), eq(pushSubscription.endpoint, endpoint)))

  await db.insert(pushSubscription).values({
    id: generateId(),
    userId: session.user.id,
    endpoint,
    p256dh,
    auth,
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get("endpoint")
  if (endpoint) {
    await db
      .delete(pushSubscription)
      .where(and(eq(pushSubscription.userId, session.user.id), eq(pushSubscription.endpoint, endpoint)))
  } else {
    await db.delete(pushSubscription).where(eq(pushSubscription.userId, session.user.id))
  }

  return NextResponse.json({ success: true })
}
