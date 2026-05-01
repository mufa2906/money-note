"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { useSession } from "@/lib/auth-client"
import type { SubscriptionTier } from "@/types"

interface AuthUser {
  id: string
  name: string
  email: string
  image?: string | null
  subscriptionTier: SubscriptionTier
  subscriptionEndsAt?: string | null
  telegramId?: string | null
  waId?: string | null
  verificationCode?: string | null
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  refetchUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()
  const [user, setUser] = useState<AuthUser | null>(null)

  const refetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/user", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setUser({
          id: data.id,
          name: data.name,
          email: data.email,
          image: data.image,
          subscriptionTier: (data.subscriptionTier as SubscriptionTier) ?? "free",
          subscriptionEndsAt: data.subscriptionEndsAt ?? null,
          telegramId: data.telegramId,
          waId: data.waId,
          verificationCode: data.verificationCode,
        })
      }
    } catch {
      // ignore fetch errors (e.g. unauthenticated)
    }
  }, [])

  useEffect(() => {
    if (session?.user) {
      // Always trust the database over the (cached) session cookie for fields like
      // subscriptionTier that can change outside of the auth flow.
      refetchUser()
    } else if (!isPending) {
      setUser(null)
    }
  }, [session?.user?.id, isPending, refetchUser])

  return (
    <AuthContext.Provider value={{ user, isLoading: isPending, isAuthenticated: !!session?.user, refetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
