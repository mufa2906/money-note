import {
  UtensilsCrossed, Car, ShoppingBag, Music, FileText,
  Heart, BookOpen, Briefcase, MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Category } from "@/types"

const ICONS: Record<Category, React.ComponentType<{ className?: string }>> = {
  makanan: UtensilsCrossed,
  transportasi: Car,
  belanja: ShoppingBag,
  hiburan: Music,
  tagihan: FileText,
  kesehatan: Heart,
  pendidikan: BookOpen,
  gaji: Briefcase,
  lainnya: MoreHorizontal,
}

const COLORS: Record<Category, string> = {
  makanan: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  transportasi: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  belanja: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  hiburan: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  tagihan: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  kesehatan: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  pendidikan: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  gaji: "bg-lime-100 text-lime-600 dark:bg-lime-900/30 dark:text-lime-400",
  lainnya: "bg-stone-100 text-stone-600 dark:bg-stone-900/30 dark:text-stone-400",
}

interface CategoryIconProps {
  category: Category
  className?: string
  size?: "sm" | "md" | "lg"
}

export function CategoryIcon({ category, className, size = "md" }: CategoryIconProps) {
  const Icon = ICONS[category] ?? MoreHorizontal
  const sizeClass = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-12 w-12" : "h-9 w-9"
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-6 w-6" : "h-4 w-4"

  return (
    <div className={cn("flex items-center justify-center rounded-full flex-shrink-0", sizeClass, COLORS[category], className)}>
      <Icon className={iconSize} />
    </div>
  )
}
