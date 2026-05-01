"use client"

import { createContext, useCallback, useContext, useEffect, useState, useMemo, type ReactNode } from "react"
import { useAuth } from "@/providers/auth-provider"
import type { Account, Transaction, Category } from "@/types"

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

const AccountsContext = createContext<AccountsContextValue | null>(null)
const TransactionsContext = createContext<TransactionsContextValue | null>(null)

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

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      setAccounts([])
      setTransactions([])
      setAccountsLoading(false)
      setTransactionsLoading(false)
      return
    }
    fetchAccounts()
    fetchTransactions()
  }, [isAuthenticated, isLoading, fetchAccounts, fetchTransactions])

  const accountsValue = useMemo<AccountsContextValue>(
    () => ({ accounts, loading: accountsLoading, error: accountsError, refetch: fetchAccounts }),
    [accounts, accountsLoading, accountsError, fetchAccounts],
  )

  const transactionsValue = useMemo<TransactionsContextValue>(
    () => ({ transactions, loading: transactionsLoading, error: transactionsError, refetch: fetchTransactions }),
    [transactions, transactionsLoading, transactionsError, fetchTransactions],
  )

  return (
    <AccountsContext.Provider value={accountsValue}>
      <TransactionsContext.Provider value={transactionsValue}>{children}</TransactionsContext.Provider>
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
