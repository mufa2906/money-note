import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { user } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const [u] = await db.select().from(user).where(eq(user.id, session.user.id))
  return NextResponse.json(u ?? session.user)
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const body = await request.json()
  const { name, telegramId, waId, subscriptionTier, verificationCode } = body

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (telegramId !== undefined) updates.telegramId = telegramId
  if (waId !== undefined) updates.waId = waId
  if (subscriptionTier !== undefined) updates.subscriptionTier = subscriptionTier
  if (verificationCode !== undefined) updates.verificationCode = verificationCode

  const [updated] = await db
    .update(user)
    .set(updates)
    .where(eq(user.id, session.user.id))
    .returning()

  return NextResponse.json(updated)
}
