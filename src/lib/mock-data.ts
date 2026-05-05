import type { MockUser, Account, Transaction, SplitBill, AppNotification, Category } from "@/types"

export const MOCK_USER: MockUser = {
  id: "usr_01",
  name: "Budi Santoso",
  email: "budi@contoh.com",
  avatar: null,
  tier: "free",
  telegramId: null,
  waId: null,
  verificationCode: "MN-A3F7K2",
}

export const MOCK_ACCOUNTS: Account[] = [
  { id: "acc_01", userId: "usr_01", accountType: "bank", accountName: "BCA", balance: 4_500_000, color: "#1e40af", icon: "Building2" },
  { id: "acc_02", userId: "usr_01", accountType: "ewallet", accountName: "GoPay", balance: 750_000, color: "#16a34a", icon: "Wallet" },
  { id: "acc_03", userId: "usr_01", accountType: "cash", accountName: "Tunai", balance: 200_000, color: "#92400e", icon: "Banknote" },
]

const today = new Date()
function daysAgo(n: number): string {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return d.toISOString().split("T")[0]
}

function isoAgo(n: number): string {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "txn_01", userId: "usr_01", accountId: "acc_01", amount: 8_500_000, type: "income", category: "gaji", description: "Gaji Bulan April", transactionDate: daysAgo(2), source: "manual", createdAt: isoAgo(2) },
  { id: "txn_02", userId: "usr_01", accountId: "acc_01", amount: 45_000, type: "expense", category: "makanan", description: "Makan siang Warteg", transactionDate: daysAgo(0), source: "bot", createdAt: isoAgo(0) },
  { id: "txn_03", userId: "usr_01", accountId: "acc_02", amount: 25_000, type: "expense", category: "transportasi", description: "Grab ke kantor", transactionDate: daysAgo(0), source: "bot", createdAt: isoAgo(0) },
  { id: "txn_04", userId: "usr_01", accountId: "acc_01", amount: 350_000, type: "expense", category: "belanja", description: "Beli baju di Uniqlo", transactionDate: daysAgo(1), source: "manual", createdAt: isoAgo(1) },
  { id: "txn_05", userId: "usr_01", accountId: "acc_02", amount: 80_000, type: "expense", category: "makanan", description: "Kopi dan snack", transactionDate: daysAgo(1), source: "bot", createdAt: isoAgo(1) },
  { id: "txn_06", userId: "usr_01", accountId: "acc_01", amount: 500_000, type: "expense", category: "tagihan", description: "Tagihan listrik PLN", transactionDate: daysAgo(3), source: "manual", createdAt: isoAgo(3) },
  { id: "txn_07", userId: "usr_01", accountId: "acc_01", amount: 150_000, type: "expense", category: "tagihan", description: "Paket internet Telkomsel", transactionDate: daysAgo(3), source: "manual", createdAt: isoAgo(3) },
  { id: "txn_08", userId: "usr_01", accountId: "acc_02", amount: 30_000, type: "expense", category: "transportasi", description: "Parkir mall", transactionDate: daysAgo(4), source: "manual", createdAt: isoAgo(4) },
  { id: "txn_09", userId: "usr_01", accountId: "acc_01", amount: 200_000, type: "expense", category: "hiburan", description: "Nonton bioskop berdua", transactionDate: daysAgo(5), source: "manual", createdAt: isoAgo(5) },
  { id: "txn_10", userId: "usr_01", accountId: "acc_01", amount: 75_000, type: "expense", category: "makanan", description: "Makan malam restoran", transactionDate: daysAgo(5), source: "bot", createdAt: isoAgo(5) },
  { id: "txn_11", userId: "usr_01", accountId: "acc_02", amount: 50_000, type: "expense", category: "makanan", description: "Beli sayur pasar", transactionDate: daysAgo(6), source: "bot", createdAt: isoAgo(6) },
  { id: "txn_12", userId: "usr_01", accountId: "acc_01", amount: 120_000, type: "expense", category: "kesehatan", description: "Beli obat apotek", transactionDate: daysAgo(7), source: "manual", createdAt: isoAgo(7) },
  { id: "txn_13", userId: "usr_01", accountId: "acc_01", amount: 250_000, type: "expense", category: "belanja", description: "Belanja kebutuhan rumah", transactionDate: daysAgo(8), source: "manual", createdAt: isoAgo(8) },
  { id: "txn_14", userId: "usr_01", accountId: "acc_02", amount: 35_000, type: "expense", category: "transportasi", description: "GoRide ke pasar", transactionDate: daysAgo(8), source: "bot", createdAt: isoAgo(8) },
  { id: "txn_15", userId: "usr_01", accountId: "acc_01", amount: 500_000, type: "income", category: "lainnya", description: "Transfer dari teman", transactionDate: daysAgo(10), source: "manual", createdAt: isoAgo(10) },
  { id: "txn_16", userId: "usr_01", accountId: "acc_01", amount: 180_000, type: "expense", category: "hiburan", description: "Berlangganan Netflix", transactionDate: daysAgo(10), source: "manual", createdAt: isoAgo(10) },
  { id: "txn_17", userId: "usr_01", accountId: "acc_02", amount: 65_000, type: "expense", category: "makanan", description: "GoFood makan siang", transactionDate: daysAgo(11), source: "bot", createdAt: isoAgo(11) },
  { id: "txn_18", userId: "usr_01", accountId: "acc_01", amount: 300_000, type: "expense", category: "pendidikan", description: "Buku pemrograman", transactionDate: daysAgo(12), source: "manual", createdAt: isoAgo(12) },
  { id: "txn_19", userId: "usr_01", accountId: "acc_01", amount: 90_000, type: "expense", category: "transportasi", description: "Bensin motor", transactionDate: daysAgo(13), source: "bot", createdAt: isoAgo(13) },
  { id: "txn_20", userId: "usr_01", accountId: "acc_02", amount: 40_000, type: "expense", category: "makanan", description: "Jajan bakso", transactionDate: daysAgo(14), source: "bot", createdAt: isoAgo(14) },
  { id: "txn_21", userId: "usr_01", accountId: "acc_01", amount: 8_200_000, type: "income", category: "gaji", description: "Gaji Bulan Maret", transactionDate: daysAgo(32), source: "manual", createdAt: isoAgo(32) },
  { id: "txn_22", userId: "usr_01", accountId: "acc_01", amount: 450_000, type: "expense", category: "tagihan", description: "Cicilan kartu kredit", transactionDate: daysAgo(33), source: "manual", createdAt: isoAgo(33) },
  { id: "txn_23", userId: "usr_01", accountId: "acc_01", amount: 130_000, type: "expense", category: "belanja", description: "Beli peralatan mandi", transactionDate: daysAgo(35), source: "manual", createdAt: isoAgo(35) },
  { id: "txn_24", userId: "usr_01", accountId: "acc_02", amount: 55_000, type: "expense", category: "makanan", description: "Sarapan nasi uduk", transactionDate: daysAgo(36), source: "bot", createdAt: isoAgo(36) },
  { id: "txn_25", userId: "usr_01", accountId: "acc_01", amount: 400_000, type: "expense", category: "kesehatan", description: "Periksa dokter gigi", transactionDate: daysAgo(38), source: "manual", createdAt: isoAgo(38) },
  { id: "txn_26", userId: "usr_01", accountId: "acc_01", amount: 220_000, type: "expense", category: "hiburan", description: "Karaoke dengan teman", transactionDate: daysAgo(40), source: "manual", createdAt: isoAgo(40) },
  { id: "txn_27", userId: "usr_01", accountId: "acc_02", amount: 70_000, type: "expense", category: "transportasi", description: "Taxi Blue Bird", transactionDate: daysAgo(42), source: "bot", createdAt: isoAgo(42) },
  { id: "txn_28", userId: "usr_01", accountId: "acc_01", amount: 1_000_000, type: "income", category: "lainnya", description: "Bonus proyek freelance", transactionDate: daysAgo(45), source: "manual", createdAt: isoAgo(45) },
  { id: "txn_29", userId: "usr_01", accountId: "acc_01", amount: 85_000, type: "expense", category: "makanan", description: "Makan siang bersama tim", transactionDate: daysAgo(48), source: "bot", createdAt: isoAgo(48) },
  { id: "txn_30", userId: "usr_01", accountId: "acc_01", amount: 600_000, type: "expense", category: "tagihan", description: "Tagihan air PDAM", transactionDate: daysAgo(50), source: "manual", createdAt: isoAgo(50) },
]

export const MOCK_SPLIT_BILLS: SplitBill[] = [
  { id: "split_01", transactionId: "txn_09", transactionDescription: "Nonton bioskop berdua", totalAmount: 200_000, targetName: "Andi Wijaya", targetContact: "@andiwijaya", splitAmount: 100_000, status: "unpaid", createdAt: daysAgo(5) },
  { id: "split_02", transactionId: "txn_26", transactionDescription: "Karaoke dengan teman", totalAmount: 220_000, targetName: "Sari Dewi", targetContact: "@saridewi", splitAmount: 110_000, status: "paid", createdAt: daysAgo(40) },
  { id: "split_03", transactionId: "txn_26", transactionDescription: "Karaoke dengan teman", totalAmount: 220_000, targetName: "Rudi Hartono", targetContact: "@rudihartono", splitAmount: 110_000, status: "unpaid", createdAt: daysAgo(40) },
  { id: "split_04", transactionId: "txn_10", transactionDescription: "Makan malam restoran", totalAmount: 75_000, targetName: "Maya Putri", targetContact: "@mayaputri", splitAmount: 37_500, status: "paid", createdAt: daysAgo(5) },
]

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: "notif_01", userId: "usr_01", kind: "transaction_added", title: "Transaksi Dicatat", body: "Pengeluaran Rp 45.000 untuk Makanan telah dicatat via bot.", isRead: false, createdAt: new Date().toISOString() },
  { id: "notif_02", userId: "usr_01", kind: "budget_warning", title: "Peringatan Anggaran", body: "Pengeluaran makanan bulan ini sudah mencapai 80% dari target anggaran.", isRead: false, createdAt: daysAgo(1) },
  { id: "notif_03", userId: "usr_01", kind: "split_reminder", title: "Pengingat Tagihan", body: "Andi Wijaya belum membayar tagihan bioskop sebesar Rp 100.000.", isRead: true, createdAt: daysAgo(2) },
  { id: "notif_04", userId: "usr_01", kind: "weekly_summary", title: "Ringkasan Mingguan", body: "Minggu ini kamu mengeluarkan Rp 755.000. Lebih hemat 12% dari minggu lalu!", isRead: true, createdAt: daysAgo(3) },
  { id: "notif_05", userId: "usr_01", kind: "transaction_added", title: "Gaji Masuk", body: "Pemasukan Rp 8.500.000 dari Gaji Bulan April telah dicatat.", isRead: true, createdAt: daysAgo(2) },
  { id: "notif_06", userId: "usr_01", kind: "system", title: "Selamat Datang di MoneyNote!", body: "Mulai catat transaksimu sekarang via Telegram Bot atau langsung di aplikasi.", isRead: true, createdAt: daysAgo(7) },
  { id: "notif_07", userId: "usr_01", kind: "split_reminder", title: "Tagihan Lunas", body: "Sari Dewi sudah membayar tagihan karaoke sebesar Rp 110.000.", isRead: true, createdAt: daysAgo(38) },
  { id: "notif_08", userId: "usr_01", kind: "budget_warning", title: "Anggaran Hampir Habis", body: "Pengeluaran hiburan bulan ini sudah Rp 380.000 dari batas Rp 400.000.", isRead: true, createdAt: daysAgo(5) },
  { id: "notif_09", userId: "usr_01", kind: "weekly_summary", title: "Ringkasan Mingguan", body: "Minggu lalu kamu mengeluarkan Rp 1.240.000. Terbesar di kategori Belanja.", isRead: true, createdAt: daysAgo(10) },
  { id: "notif_10", userId: "usr_01", kind: "system", title: "Tips Hemat", body: "Coba atur anggaran harian di menu Pengaturan untuk kontrol pengeluaran lebih baik.", isRead: true, createdAt: daysAgo(14) },
]

export function getTotalBalance(): number {
  return MOCK_ACCOUNTS.reduce((sum, acc) => sum + acc.balance, 0)
}

export function getMonthlyIncome(month: number, year: number): number {
  return MOCK_TRANSACTIONS.filter((t) => {
    const d = new Date(t.transactionDate)
    return t.type === "income" && d.getMonth() === month && d.getFullYear() === year
  }).reduce((sum, t) => sum + t.amount, 0)
}

export function getMonthlyExpense(month: number, year: number): number {
  return MOCK_TRANSACTIONS.filter((t) => {
    const d = new Date(t.transactionDate)
    return t.type === "expense" && d.getMonth() === month && d.getFullYear() === year
  }).reduce((sum, t) => sum + t.amount, 0)
}

export function getTransactionsByCategory(): Record<Category, number> {
  const result = {} as Record<Category, number>
  MOCK_TRANSACTIONS.filter((t) => t.type === "expense").forEach((t) => {
    result[t.category] = (result[t.category] || 0) + t.amount
  })
  return result
}

export function getMonthlyTrend(months: number): { month: string; income: number; expense: number }[] {
  const result = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setMonth(d.getMonth() - i)
    const month = d.getMonth()
    const year = d.getFullYear()
    const label = d.toLocaleDateString("id-ID", { month: "short" })
    result.push({
      month: label,
      income: getMonthlyIncome(month, year),
      expense: getMonthlyExpense(month, year),
    })
  }
  return result
}

export function getRecentTransactions(limit = 5): Transaction[] {
  return [...MOCK_TRANSACTIONS]
    .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
    .slice(0, limit)
}
