"use client"

import {
  UtensilsCrossed, Car, ShoppingBag, Music, FileText, Heart, BookOpen, Briefcase,
  MoreHorizontal, Home, Plane, Coffee, Gift, Wrench, Smartphone, Shirt, Bike,
  Train, Baby, Globe, Gamepad2, Fuel, Stethoscope, GraduationCap, DollarSign,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCategories } from "@/lib/hooks/use-categories"

export const AVAILABLE_ICONS: { name: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { name: "UtensilsCrossed", Icon: UtensilsCrossed },
  { name: "Car", Icon: Car },
  { name: "ShoppingBag", Icon: ShoppingBag },
  { name: "Music", Icon: Music },
  { name: "FileText", Icon: FileText },
  { name: "Heart", Icon: Heart },
  { name: "BookOpen", Icon: BookOpen },
  { name: "Briefcase", Icon: Briefcase },
  { name: "MoreHorizontal", Icon: MoreHorizontal },
  { name: "Home", Icon: Home },
  { name: "Plane", Icon: Plane },
  { name: "Coffee", Icon: Coffee },
  { name: "Gift", Icon: Gift },
  { name: "Wrench", Icon: Wrench },
  { name: "Smartphone", Icon: Smartphone },
  { name: "Shirt", Icon: Shirt },
  { name: "Bike", Icon: Bike },
  { name: "Train", Icon: Train },
  { name: "Baby", Icon: Baby },
  { name: "Globe", Icon: Globe },
  { name: "Gamepad2", Icon: Gamepad2 },
  { name: "Fuel", Icon: Fuel },
  { name: "Stethoscope", Icon: Stethoscope },
  { name: "GraduationCap", Icon: GraduationCap },
  { name: "DollarSign", Icon: DollarSign },
]

export const ICON_MAP = Object.fromEntries(AVAILABLE_ICONS.map(({ name, Icon }) => [name, Icon]))

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const BUILTIN_CATEGORIES: { name: string; label: string; icon: string; color: string }[] = [
  { name: "makanan",      label: "Makanan",       icon: "UtensilsCrossed", color: "#f97316" },
  { name: "transportasi", label: "Transportasi",  icon: "Car",             color: "#3b82f6" },
  { name: "belanja",      label: "Belanja",       icon: "ShoppingBag",     color: "#a855f7" },
  { name: "hiburan",      label: "Hiburan",       icon: "Music",           color: "#ec4899" },
  { name: "tagihan",      label: "Tagihan",       icon: "FileText",        color: "#ef4444" },
  { name: "kesehatan",    label: "Kesehatan",     icon: "Heart",           color: "#22c55e" },
  { name: "pendidikan",   label: "Pendidikan",    icon: "BookOpen",        color: "#06b6d4" },
  { name: "gaji",         label: "Gaji",          icon: "Briefcase",       color: "#84cc16" },
  { name: "lainnya",      label: "Lainnya",       icon: "MoreHorizontal",  color: "#78716c" },
]

const BUILTIN_ICON = Object.fromEntries(BUILTIN_CATEGORIES.map((c) => [c.name, c.icon]))
const BUILTIN_COLOR = Object.fromEntries(BUILTIN_CATEGORIES.map((c) => [c.name, c.color]))

interface CategoryIconProps {
  category: string
  className?: string
  size?: "sm" | "md" | "lg"
}

export function CategoryIcon({ category, className, size = "md" }: CategoryIconProps) {
  const { categories } = useCategories()

  const cat = categories.find((c) => c.name === category)
  const iconName = cat?.icon ?? BUILTIN_ICON[category] ?? "MoreHorizontal"
  const color = cat?.color ?? BUILTIN_COLOR[category] ?? "#78716c"

  const Icon = ICON_MAP[iconName] ?? MoreHorizontal
  const sizeClass = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-12 w-12" : "h-9 w-9"
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-6 w-6" : "h-4 w-4"

  return (
    <div
      className={cn("flex items-center justify-center rounded-full flex-shrink-0", sizeClass, className)}
      style={{ backgroundColor: hexToRgba(color, 0.15), color }}
    >
      <Icon className={iconSize} />
    </div>
  )
}
