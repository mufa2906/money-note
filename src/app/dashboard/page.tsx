import { BalanceCard } from "@/components/dashboard/balance-card"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { AccountSummary } from "@/components/dashboard/account-summary"
import { CategorySummary } from "@/components/dashboard/category-summary"
import { QuickAddFab } from "@/components/dashboard/quick-add-fab"
import { PremiumActiveCard } from "@/components/dashboard/premium-active-card"
import { BudgetSummary } from "@/components/dashboard/budget-summary"
import { SafeToSpendCard } from "@/components/dashboard/safe-to-spend-card"
import { PredictiveBalanceCard } from "@/components/dashboard/predictive-balance-card"
import { RecurringSuggestionsCard } from "@/components/dashboard/recurring-suggestions-card"

export default function DashboardPage() {
  return (
    <>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Beranda</h1>
          <p className="text-sm text-muted-foreground">Selamat datang kembali!</p>
        </div>
        <BalanceCard />
        <SafeToSpendCard />
        <PredictiveBalanceCard />
        <PremiumActiveCard />
        <BudgetSummary />
        <RecurringSuggestionsCard />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RecentTransactions />
          <div className="space-y-4">
            <AccountSummary />
            <CategorySummary />
          </div>
        </div>
      </div>
      <QuickAddFab />
    </>
  )
}
