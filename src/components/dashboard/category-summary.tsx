"use client"

import Link from "next/link"
import { ArrowRight, Tag } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CategoryIcon } from "@/components/common/category-icon"
import { BUILTIN_CATEGORIES } from "@/components/common/category-icon"
import { useCategories } from "@/lib/hooks/use-categories"

export function CategorySummary() {
  const { categories: dbCategories, loading } = useCategories()
  const categories = dbCategories.length > 0 ? dbCategories : BUILTIN_CATEGORIES

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
        <CardTitle className="text-base">Kategori</CardTitle>
        <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
          <Link href="/dashboard/categories">
            Kelola <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {loading && dbCategories.length === 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {categories.map((c) => (
              <Link
                key={c.name}
                href={`/dashboard/transactions?category=${c.name}`}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <CategoryIcon category={c.name} size="sm" />
                <span className="text-xs text-center leading-tight font-medium truncate w-full text-center">{c.label}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
