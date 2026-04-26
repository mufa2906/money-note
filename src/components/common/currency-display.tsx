import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"

interface CurrencyDisplayProps {
  amount: number
  type?: "income" | "expense" | "neutral"
  className?: string
  showSign?: boolean
}

export function CurrencyDisplay({ amount, type = "neutral", className, showSign = false }: CurrencyDisplayProps) {
  const colorClass =
    type === "income" ? "text-green-600 dark:text-green-400" :
    type === "expense" ? "text-red-500 dark:text-red-400" : ""

  const sign = showSign ? (type === "income" ? "+" : type === "expense" ? "-" : "") : ""

  return (
    <span className={cn("font-mono font-semibold tabular-nums", colorClass, className)}>
      {sign}{formatCurrency(amount)}
    </span>
  )
}
