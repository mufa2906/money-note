import { sql } from "drizzle-orm"
import { text, integer, real, sqliteTable } from "drizzle-orm/sqlite-core"

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  subscriptionTier: text("subscription_tier", { enum: ["free", "premium", "lifetime"] }).notNull().default("free"),
  telegramId: text("telegram_id"),
  waId: text("wa_id"),
  verificationCode: text("verification_code"),
  telegramPending: text("telegram_pending"),
})

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
})

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
})

export const walletAccount = sqliteTable("wallet_account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountType: text("account_type", { enum: ["bank", "ewallet", "cash"] }).notNull(),
  accountName: text("account_name").notNull(),
  balance: real("balance").notNull().default(0),
  color: text("color").notNull().default("#3b82f6"),
  icon: text("icon").notNull().default("Wallet"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

export const transaction = sqliteTable("transaction", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  walletAccountId: text("wallet_account_id").notNull().references(() => walletAccount.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  transactionDate: text("transaction_date").notNull(),
  source: text("source", { enum: ["manual", "bot", "import"] }).notNull().default("manual"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

export const splitBill = sqliteTable("split_bill", {
  id: text("id").primaryKey(),
  transactionId: text("transaction_id").notNull().references(() => transaction.id, { onDelete: "cascade" }),
  targetName: text("target_name").notNull(),
  targetContact: text("target_contact").notNull(),
  splitAmount: real("split_amount").notNull(),
  status: text("status", { enum: ["unpaid", "paid"] }).notNull().default("unpaid"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

export const pushSubscription = sqliteTable("push_subscription", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

export const notification = sqliteTable("notification", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["transaction_added", "budget_warning", "split_reminder", "weekly_summary", "system"] }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

export const subscription = sqliteTable("subscription", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  planType: text("plan_type", { enum: ["monthly", "yearly"] }).notNull(),
  status: text("status", { enum: ["pending", "active", "canceled", "expired", "failed"] }).notNull().default("pending"),
  amount: real("amount").notNull(),
  currentPeriodEnd: integer("current_period_end", { mode: "timestamp" }),
  provider: text("provider", { enum: ["xendit"] }).notNull().default("xendit"),
  externalId: text("external_id"),
  externalReference: text("external_reference").notNull().unique(),
  invoiceUrl: text("invoice_url"),
  paidAt: integer("paid_at", { mode: "timestamp" }),
  paymentMethod: text("payment_method"),
  paymentChannel: text("payment_channel"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})
