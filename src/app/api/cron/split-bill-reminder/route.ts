import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { user, bill, billItem, billParticipant, billItemAssignment } from "@/lib/schema"
import { eq, and, lt, inArray, sql } from "drizzle-orm"
import { sendTelegramMessage } from "@/lib/telegram"
import { sendPushToUser } from "@/lib/push"
import { formatCurrency } from "@/lib/utils"
import { computeBreakdown } from "@/lib/bill-utils"
import type { BillDetail } from "@/types"

const DAYS_THRESHOLD = 3

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const thresholdDate = new Date()
  thresholdDate.setDate(thresholdDate.getDate() - DAYS_THRESHOLD)

  const users = await db.select().from(user)

  let notified = 0

  for (const u of users) {
    try {
      // Bill milik user yang sudah lebih dari DAYS_THRESHOLD hari
      const bills = await db
        .select()
        .from(bill)
        .where(and(eq(bill.userId, u.id), lt(bill.createdAt, thresholdDate)))

      if (bills.length === 0) continue

      const billsWithUnpaid: {
        title: string
        daysAgo: number
        unpaid: { name: string; total: number }[]
      }[] = []

      for (const b of bills) {
        const allParticipants = await db
          .select()
          .from(billParticipant)
          .where(eq(billParticipant.billId, b.id))

        const unpaidParticipants = allParticipants.filter((p) => p.status === "unpaid")
        if (unpaidParticipants.length === 0) continue

        const items = await db
          .select()
          .from(billItem)
          .where(eq(billItem.billId, b.id))
          .orderBy(billItem.position)

        const itemIds = items.map((i) => i.id)
        const assignments = itemIds.length
          ? await db.select().from(billItemAssignment).where(inArray(billItemAssignment.itemId, itemIds))
          : []

        const assignmentsByItem = new Map<string, string[]>()
        for (const a of assignments) {
          const arr = assignmentsByItem.get(a.itemId) ?? []
          arr.push(a.participantId)
          assignmentsByItem.set(a.itemId, arr)
        }

        let charges: { name: string; amount: number }[] = []
        try {
          const parsed = b.charges ? JSON.parse(b.charges) : []
          charges = Array.isArray(parsed) ? parsed : []
        } catch {
          charges = []
        }

        const createdAt = b.createdAt instanceof Date ? b.createdAt : new Date(Number(b.createdAt) * 1000)

        const billDetail: BillDetail = {
          id: b.id,
          userId: b.userId,
          title: b.title,
          description: b.description ?? null,
          paymentInfo: null,
          photoUrl: b.photoUrl ?? null,
          charges,
          createdAt: createdAt.toISOString(),
          updatedAt: (b.updatedAt instanceof Date ? b.updatedAt : new Date(Number(b.updatedAt) * 1000)).toISOString(),
          items: items.map((i) => ({
            ...i,
            originalPrice: i.originalPrice ?? null,
            billId: b.id,
            participantIds: assignmentsByItem.get(i.id) ?? [],
          })),
          participants: allParticipants.map((p) => ({
            ...p,
            contact: p.contact ?? null,
            transactionId: p.transactionId ?? null,
          })),
        }

        const breakdowns = computeBreakdown(billDetail)
        const unpaidBreakdowns = breakdowns.filter((bd) => bd.status === "unpaid" && bd.total > 0)
        if (unpaidBreakdowns.length === 0) continue

        const daysAgo = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

        billsWithUnpaid.push({
          title: b.title,
          daysAgo,
          unpaid: unpaidBreakdowns.map((bd) => ({ name: bd.name, total: bd.total })),
        })
      }

      if (billsWithUnpaid.length === 0) continue

      const totalUnpaidBills = billsWithUnpaid.length
      const totalUnpaidPeople = billsWithUnpaid.reduce((s, b) => s + b.unpaid.length, 0)

      if (u.telegramId) {
        let msg = `💸 *Pengingat Tagihan*\n\n`
        msg += `Kamu punya *${totalUnpaidBills} tagihan* dengan *${totalUnpaidPeople} orang* yang belum lunas:\n\n`
        for (const b of billsWithUnpaid) {
          msg += `📋 *${b.title}* (${b.daysAgo} hari lalu)\n`
          for (const p of b.unpaid) {
            msg += `  • ${p.name} — ${formatCurrency(p.total)}\n`
          }
          msg += `\n`
        }
        msg += `Buka aplikasi untuk cek dan kirim pengingat ke mereka.`
        await sendTelegramMessage(u.telegramId, msg, { parseMode: "Markdown" })
      }

      await sendPushToUser(u.id, {
        title: "Pengingat Tagihan",
        body: `${totalUnpaidBills} tagihan, ${totalUnpaidPeople} orang belum lunas. Cek sekarang.`,
        url: "/dashboard/split-bill",
      })

      notified++
    } catch {
      // Skip user yang gagal, lanjut ke user berikutnya
    }
  }

  return NextResponse.json({ notified, total: users.length })
}
