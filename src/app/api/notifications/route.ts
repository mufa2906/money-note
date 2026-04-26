import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { notification } from "@/lib/schema"
import { eq, and, desc } from "drizzle-orm"
import { requireAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const rows = await db
    .select()
    .from(notification)
    .where(eq(notification.userId, session.user.id))
    .orderBy(desc(notification.createdAt))
    .limit(50)

  return NextResponse.json(rows)
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const body = await request.json()
  const { id, isRead } = body

  if (id) {
    await db
      .update(notification)
      .set({ isRead: true })
      .where(and(eq(notification.id, id), eq(notification.userId, session.user.id)))
  } else {
    await db
      .update(notification)
      .set({ isRead: true })
      .where(eq(notification.userId, session.user.id))
  }

  return NextResponse.json({ success: true })
}
