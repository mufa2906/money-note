import { auth } from "./auth"
import { NextRequest, NextResponse } from "next/server"

export async function requireAuth(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  return { session, error: null }
}

export function generateId(): string {
  return crypto.randomUUID()
}
