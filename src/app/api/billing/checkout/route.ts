import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { subscription } from "@/lib/schema"
import { requireAuth, generateId } from "@/lib/api-auth"
import { PLAN_PRICES, PlanType, createXenditInvoice } from "@/lib/xendit"

function getAppUrl(request: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    new URL(request.url).origin
  )
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(request)
  if (error) return error

  const body = await request.json().catch(() => ({}))
  const plan = body.plan as PlanType | undefined
  if (!plan || !(plan in PLAN_PRICES)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
  }

  const price = PLAN_PRICES[plan]
  const subId = generateId()
  const externalReference = `mn-${subId}`
  const appUrl = getAppUrl(request)

  let invoice
  try {
    invoice = await createXenditInvoice({
      externalId: externalReference,
      amount: price.amount,
      payerEmail: session.user.email,
      description: `MoneyNote ${price.label}`,
      successRedirectUrl: `${appUrl}/dashboard/upgrade?status=success`,
      failureRedirectUrl: `${appUrl}/dashboard/upgrade?status=failed`,
    })
  } catch (e) {
    console.error("Xendit checkout error:", e)
    return NextResponse.json({ error: "Gagal membuat invoice pembayaran" }, { status: 502 })
  }

  await db.insert(subscription).values({
    id: subId,
    userId: session.user.id,
    planType: plan,
    status: "pending",
    amount: price.amount,
    externalId: invoice.id,
    externalReference,
    invoiceUrl: invoice.invoice_url,
  })

  return NextResponse.json({ invoiceUrl: invoice.invoice_url, externalReference })
}
