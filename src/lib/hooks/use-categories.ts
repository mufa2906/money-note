"use client"

import { useCategoriesContext } from "@/providers/data-provider"

export function useCategories() {
  return useCategoriesContext()
}
