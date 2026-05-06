"use client"

import { useSubcategoriesContext } from "@/providers/data-provider"

export function useSubcategories() {
  return useSubcategoriesContext()
}
