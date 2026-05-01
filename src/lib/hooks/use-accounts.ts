"use client"

import { useAccountsContext } from "@/providers/data-provider"

export function useAccounts() {
  return useAccountsContext()
}
