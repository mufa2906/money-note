"use client"

import { createContext, useCallback, useContext, useEffect, useState, useMemo, type ReactNode } from "react"
import { useAuth } from "@/providers/auth-provider"
import type { Account, Transaction, Category, UserCategory } from "@/types"

interface AccountsContextValue {
  accounts: Account[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface TransactionsContextValue {
  transactions: Transaction[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface CategoriesContextValue {
  categories: UserCategory[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const AccountsContext = createContext<AccountsContextValue | null>(null)
const TransactionsContext = createContext<TransactionsContextValue | null>(null)
const CategoriesContext = createContext<CategoriesContextValue | null>(null)

function mapTransactionRow(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    userId: row.userId as string,
    accountId: (row.walletAccountId ?? row.accountId) as string,
    amount: row.amount as number,
    type: row.type as "income" | "expense",
    category: row.category as Category,
    description: row.description as string,
    transactionDate: row.transactionDate as string,
    source: row.source as "manual" | "bot" | "import",
    createdAt: row.createdAt ? String(row.createdAt) : new Date().toISOString(),
  }
}

function mapCategoryRow(row: Record<string, unknown>): UserCategory {
  return {
    id: row.id as string,
    userId: row.userId as string,
    name: row.name as string,
    label: row.label as string,
    color: row.color as string,
    icon: row.icon as string,
    position: row.position as number,
    createdAt: row.createdAt ? String(row.createdAt) : new Date().toISOString(),
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [accountsError, setAccountsError] = useState<string | null>(null)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [transactionsError, setTransactionsError] = useState<string | null>(null)

  const [categories, setCategories] = useState<UserCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true)
    try {
      const res = await fetch("/api/accounts", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch accounts")
      const data = await res.json()
      setAccounts(
        data.map((a: Record<string, unknown>) => ({
          id: a.id,
          userId: a.userId,
          accountType: a.accountType,
          accountName: a.accountName,
          balance: a.balance,
          color: a.color,
          icon: a.icon,
        })),
      )
      setAccountsError(null)
    } catch (e) {
      setAccountsError(String(e))
    } finally {
      setAccountsLoading(false)
    }
  }, [])

  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true)
    try {
      const res = await fetch("/api/transactions", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch transactions")
      const data = await res.json()
      setTransactions(data.map(mapTransactionRow))
      setTransactionsError(null)
    } catch (e) {
      setTransactionsError(String(e))
    } finally {
      setTransactionsLoading(false)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true)
    try {
      const res = await fetch("/api/categories", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch categories")
      const data = await res.json()
      setCategories(data.map(mapCategoryRow))
      setCategoriesError(null)
    } catch (e) {
      setCategoriesError(String(e))
    } finally {
      setCategoriesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      setAccounts([])
      setTransactions([])
      setCategories([])
      setAccountsLoading(false)
      setTransactionsLoading(false)
      setCategoriesLoading(false)
      return
    }
    fetchAccounts()
    fetchTransactions()
    fetchCategories()
  }, [isAuthenticated, isLoading, fetchAccounts, fetchTransactions, fetchCategories])

  const accountsValue = useMemo<AccountsContextValue>(
    () => ({ accounts, loading: accountsLoading, error: accountsError, refetch: fetchAccounts }),
    [accounts, accountsLoading, accountsError, fetchAccounts],
  )

  const transactionsValue = useMemo<TransactionsContextValue>(
    () => ({ transactions, loading: transactionsLoading, error: transactionsError, refetch: fetchTransactions }),
    [transactions, transactionsLoading, transactionsError, fetchTransactions],
  )

  const categoriesValue = useMemo<CategoriesContextValue>(
    () => ({ categories, loading: categoriesLoading, error: categoriesError, refetch: fetchCategories }),
    [categories, categoriesLoading, categoriesError, fetchCategories],
  )

  return (
    <AccountsContext.Provider value={accountsValue}>
      <TransactionsContext.Provider value={transactionsValue}>
        <CategoriesContext.Provider value={categoriesValue}>
          {children}
        </CategoriesContext.Provider>
      </TransactionsContext.Provider>
    </AccountsContext.Provider>
  )
}

export function useAccountsContext(): AccountsContextValue {
  const ctx = useContext(AccountsContext)
  if (!ctx) throw new Error("useAccountsContext must be used within DataProvider")
  return ctx
}

export function useTransactionsContext(): TransactionsContextValue {
  const ctx = useContext(TransactionsContext)
  if (!ctx) throw new Error("useTransactionsContext must be used within DataProvider")
  return ctx
}

export function useCategoriesContext(): CategoriesContextValue {
  const ctx = useContext(CategoriesContext)
  if (!ctx) throw new Error("useCategoriesContext must be used within DataProvider")
  return ctx
}
