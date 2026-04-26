import type { ReactNode } from "react"
import Link from "next/link"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground text-base font-bold">
          M
        </div>
        <span className="font-bold text-xl">MoneyNote</span>
      </Link>
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}
