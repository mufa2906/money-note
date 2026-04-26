import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { user } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireAuth } from "@/lib/api-auth"

function generateVerificationCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = "MN-"
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  // Only generate a verification code if the user doesn't have one yet
  const [u] = await db.select().from(user).where(eq(user.id, session.user.id))
  if (u?.verificationCode) {
    return NextResponse.json({ message: "Already initialized" })
  }

  await db
    .update(user)
    .set({ verificationCode: generateVerificationCode() })
    .where(eq(user.id, session.user.id))

  return NextResponse.json({ message: "Initialized" })
}
