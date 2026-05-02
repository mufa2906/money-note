import type { BillDetail, ParticipantBreakdown } from "@/types"

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
    const serviceShare = bill.serviceCharge * proportion
    const taxShare = bill.tax * proportion
    return {
      participantId: p.id,
      name: p.name,
      contact: p.contact,
      status: p.status,
      itemsSubtotal,
      serviceShare,
      taxShare,
      total: itemsSubtotal + serviceShare + taxShare,
      lineItems: lineItemsByParticipant.get(p.id) ?? [],
    }
  })
}

export function billGrandTotal(bill: BillDetail): number {
  const itemsTotal = bill.items.reduce((sum, i) => sum + i.price * i.qty, 0)
  return itemsTotal + bill.serviceCharge + bill.tax
}
