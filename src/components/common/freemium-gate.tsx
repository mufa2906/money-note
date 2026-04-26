import { Crown } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { ReactNode } from "react"

interface FreemiumGateProps {
  isLocked: boolean
  featureName: string
  children: ReactNode
}

export function FreemiumGate({ isLocked, featureName, children }: FreemiumGateProps) {
  if (!isLocked) return <>{children}</>

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg gap-3 p-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Crown className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm">{featureName}</p>
          <p className="text-xs text-muted-foreground mt-1">Fitur ini hanya tersedia untuk pengguna Premium</p>
        </div>
        <Button size="sm" asChild>
          <Link href="/dashboard/upgrade">Upgrade ke Premium</Link>
        </Button>
      </div>
    </div>
  )
}
