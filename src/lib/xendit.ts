const XENDIT_API_BASE = "https://api.xendit.co"

export const PLAN_PRICES = {
  monthly: { amount: 49000, durationDays: 30, label: "Premium Bulanan" },
  yearly: { amount: 469000, durationDays: 365, label: "Premium Tahunan" },
} as const

export type PlanType = keyof typeof PLAN_PRICES

export interface XenditInvoice {
  id: string
  external_id: string
  user_id: string
  status: string
  invoice_url: string
  amount: number
  expiry_date: string
  paid_at?: string
  payment_method?: string
  payment_channel?: string
}

export interface CreateInvoiceArgs {
  externalId: string
  amount: number
  payerEmail: string
  description: string
  successRedirectUrl: string
  failureRedirectUrl: string
}

function getSecretKey() {
  const key = process.env.XENDIT_SECRET_KEY
  if (!key) throw new Error("XENDIT_SECRET_KEY is not set")
  return key
}

export async function createXenditInvoice(args: CreateInvoiceArgs): Promise<XenditInvoice> {
  const secret = getSecretKey()
  const auth = Buffer.from(`${secret}:`).toString("base64")

  const res = await fetch(`${XENDIT_API_BASE}/v2/invoices`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_id: args.externalId,
      amount: args.amount,
      payer_email: args.payerEmail,
      description: args.description,
      success_redirect_url: args.successRedirectUrl,
      failure_redirect_url: args.failureRedirectUrl,
      currency: "IDR",
      invoice_duration: 86400,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Xendit invoice creation failed (${res.status}): ${text}`)
  }
  return res.json()
}

export function verifyXenditWebhook(callbackToken: string | null): boolean {
  const expected = process.env.XENDIT_WEBHOOK_TOKEN
  if (!expected) throw new Error("XENDIT_WEBHOOK_TOKEN is not set")
  if (!callbackToken) return false
  return callbackToken === expected
}
