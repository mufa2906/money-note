export type SubscriptionTier = "free" | "premium" | "lifetime"

export interface MockUser {
  id: string
  name: string
  email: string
  avatar: string | null
  tier: SubscriptionTier
  telegramId: string | null
  waId: string | null
  verificationCode: string
}

export type AccountType = "bank" | "ewallet" | "cash"

export interface Account {
  id: string
  userId: string
  accountType: AccountType
  accountName: string
  balance: number
  color: string
  icon: string
}

export type TransactionType = "income" | "expense"

export type Category =
  | "makanan"
  | "transportasi"
  | "belanja"
  | "hiburan"
  | "tagihan"
  | "kesehatan"
  | "pendidikan"
  | "gaji"
  | "lainnya"

export interface Transaction {
  id: string
  userId: string
  accountId: string
  amount: number
  type: TransactionType
  category: Category
  description: string
  transactionDate: string
  source: "manual" | "bot" | "import"
}

export type SplitStatus = "unpaid" | "paid"

export interface SplitBill {
  id: string
  transactionId: string
  transactionDescription: string
  totalAmount: number
  targetName: string
  targetContact: string
  splitAmount: number
  status: SplitStatus
  createdAt: string
}

export interface BillItem {
  id: string
  billId: string
  name: string
  price: number
  qty: number
  position: number
  participantIds: string[]
}

export interface BillParticipant {
  id: string
  billId: string
  name: string
  contact: string | null
  status: SplitStatus
}

export interface Bill {
  id: string
  userId: string
  title: string
  photoUrl: string | null
  serviceCharge: number
  tax: number
  createdAt: string
  updatedAt: string
}

export interface BillDetail extends Bill {
  items: BillItem[]
  participants: BillParticipant[]
}

export interface ParticipantBreakdown {
  participantId: string
  name: string
  contact: string | null
  status: SplitStatus
  itemsSubtotal: number
  serviceShare: number
  taxShare: number
  total: number
  lineItems: { name: string; qty: number; share: number }[]
}

export type NotificationKind =
  | "transaction_added"
  | "budget_warning"
  | "split_reminder"
  | "weekly_summary"
  | "system"

export interface AppNotification {
  id: string
  userId: string
  kind: NotificationKind
  title: string
  body: string
  isRead: boolean
  createdAt: string
}

export interface PricingFeature {
  label: string
  included: boolean
}

export interface PricingPlan {
  id: "free" | "premium_monthly" | "premium_yearly"
  name: string
  price: number
  period: "selamanya" | "bulan" | "tahun"
  features: PricingFeature[]
  highlight: boolean
}
