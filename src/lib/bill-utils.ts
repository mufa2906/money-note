import type { BillCharge, BillDetail, BillPaymentInfo, ParticipantBreakdown } from "@/types"

export function parseDbCharges(row: { charges: string | null; serviceCharge: number; tax: number }): BillCharge[] {
  if (row.charges) {
    try {
      const parsed = JSON.parse(row.charges)
      if (Array.isArray(parsed)) {
        const charges = parsed
          .map((c: unknown) => {
            const obj = c as Record<string, unknown>
            const name = typeof obj?.name === "string" ? obj.name : ""
            const amount = Number(obj?.amount)
            if (!name || !Number.isFinite(amount)) return null
            return { name, amount }
          })
          .filter((c): c is BillCharge => c !== null)
        if (charges.length > 0) return charges
      }
    } catch {
      // fall through to legacy fallback
    }
  }
  const fallback: BillCharge[] = []
  if (row.serviceCharge > 0) fallback.push({ name: "Service Charge", amount: row.serviceCharge })
  if (row.tax > 0) fallback.push({ name: "PPN", amount: row.tax })
  return fallback
}

export function sanitizeCharges(input: unknown): BillCharge[] {
  if (!Array.isArray(input)) return []
  return input
    .map((c: unknown) => {
      const obj = c as Record<string, unknown>
      const name = typeof obj?.name === "string" ? obj.name.trim() : ""
      const amount = Number(obj?.amount)
      if (!name || !Number.isFinite(amount)) return null
      return { name, amount }
    })
    .filter((c): c is BillCharge => c !== null)
}

export function parsePaymentInfo(raw: string | null): BillPaymentInfo | null {
  if (!raw) return null
  try { return JSON.parse(raw) as BillPaymentInfo } catch { return null }
}

export function computeBreakdown(bill: BillDetail): ParticipantBreakdown[] {
  const items = bill.items
  const participants = bill.participants

  const itemsSubtotalByParticipant = new Map<string, number>()
  const lineItemsByParticipant = new Map<string, ParticipantBreakdown["lineItems"]>()

  for (const item of items) {
    if (item.participantIds.length === 0) continue
    const itemTotal = item.price * item.qty
    const sharePerPerson = itemTotal / item.participantIds.length
    for (const pid of item.participantIds) {
      itemsSubtotalByParticipant.set(pid, (itemsSubtotalByParticipant.get(pid) ?? 0) + sharePerPerson)
      const arr = lineItemsByParticipant.get(pid) ?? []
      arr.push({ name: item.name, qty: item.qty, share: sharePerPerson })
      lineItemsByParticipant.set(pid, arr)
    }
  }

  const billItemsSubtotal = items.reduce(
    (sum, i) => sum + (i.participantIds.length > 0 ? i.price * i.qty : 0),
    0,
  )

  return participants.map((p) => {
    const itemsSubtotal = itemsSubtotalByParticipant.get(p.id) ?? 0
    const proportion = billItemsSubtotal > 0 ? itemsSubtotal / billItemsSubtotal : 0
    const chargeShares = bill.charges.map((c) => ({ name: c.name, amount: c.amount * proportion }))
    const chargesTotal = chargeShares.reduce((s, c) => s + c.amount, 0)
    return {
      participantId: p.id,
      name: p.name,
      contact: p.contact,
      status: p.status,
      itemsSubtotal,
      chargeShares,
      total: itemsSubtotal + chargesTotal,
      lineItems: lineItemsByParticipant.get(p.id) ?? [],
    }
  })
}

export function billGrandTotal(bill: BillDetail): number {
  const itemsTotal = bill.items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const chargesTotal = bill.charges.reduce((sum, c) => sum + c.amount, 0)
  return itemsTotal + chargesTotal
}
