import type { ReactNode } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { BottomNav } from "@/components/layout/bottom-nav"
import { TopBar } from "@/components/layout/top-bar"
import { OfflineBanner } from "@/components/common/offline-banner"
import { PwaInstallBanner } from "@/components/layout/pwa-install-banner"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <PwaInstallBanner />
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="container max-w-5xl mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
      <OfflineBanner />
    </div>
  )
}
