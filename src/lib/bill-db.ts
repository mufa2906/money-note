import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { bill } from "@/lib/schema"

export async function ownsBill(billId: string, userId: string): Promise<boolean> {
  const [b] = await db.select({ id: bill.id }).from(bill).where(and(eq(bill.id, billId), eq(bill.userId, userId))).limit(1)
  return !!b
}
