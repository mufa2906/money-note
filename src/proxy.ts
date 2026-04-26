import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isDashboard = pathname.startsWith("/dashboard")
  const isAuthPage = pathname.startsWith("/auth")
  const isApi = pathname.startsWith("/api")

  if (isApi || (!isDashboard && !isAuthPage)) {
    return NextResponse.next()
  }

  const sessionCookie = getSessionCookie(request)

  if (isDashboard && !sessionCookie) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthPage && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
}
