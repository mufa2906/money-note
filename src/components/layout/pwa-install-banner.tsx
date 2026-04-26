"use client"

import { Download, X } from "lucide-react"
import { useState } from "react"
import { usePwaInstall } from "@/lib/hooks/use-pwa-install"
import { Button } from "@/components/ui/button"

export function PwaInstallBanner() {
  const { installPrompt, isInstalled, install } = usePwaInstall()
  const [dismissed, setDismissed] = useState(false)

  if (!installPrompt || isInstalled || dismissed) return null

  return (
    <div className="flex items-center justify-between gap-3 bg-primary text-primary-foreground px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        <Download className="h-4 w-4 flex-shrink-0" />
        <span>Pasang MoneyNote di perangkatmu untuk akses lebih cepat!</span>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="secondary" onClick={install} className="h-7 text-xs">
          Pasang
        </Button>
        <Button size="icon" variant="ghost" onClick={() => setDismissed(true)} className="h-7 w-7 hover:bg-primary-foreground/10">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
