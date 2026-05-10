# MoneyNote — Technical Reference

> Dokumen ini untuk AI assistant dan developer. Baca sebelum mulai coding agar tidak salah asumsi.  
> **Last updated:** 2026-05-10 (rev 2)

---

## Tech Stack

| Layer | Teknologi | Catatan |
|-------|-----------|---------|
| Framework | Next.js 16.2 App Router | Full-stack, semua di satu repo |
| Language | TypeScript | Strict mode |
| UI | Tailwind CSS + shadcn/ui (Radix) | |
| Database | SQLite via **Turso** (LibSQL) | Edge-compatible |
| ORM | **Drizzle** | Type-safe, schema di `src/lib/schema.ts` |
| Auth | **Better Auth** | Email/pass + Google OAuth |
| AI / OCR | **Google Gemini 2.5 Flash** | Bukan OpenAI |
| Payment | **Xendit** | Bukan Stripe/Midtrans |
| Bot | Telegram Bot API | Gratis |
| Push Notif | Web Push (VAPID) | Library `web-push` |
| PWA | Serwist | Service worker |
| Deploy | Vercel + Turso cloud | |

---

## Struktur Folder

```
src/
├── app/
│   ├── api/
│   │   ├── accounts/               — CRUD wallet accounts
│   │   ├── transactions/
│   │   │   ├── route.ts            — CRUD transaksi + auto-update saldo
│   │   │   ├── ocr/route.ts        — OCR struk → data transaksi (Gemini)
│   │   │   └── import/route.ts     — bulk import CSV
│   │   ├── bills/
│   │   │   ├── route.ts            — CRUD split bill
│   │   │   ├── [id]/               — detail, items, participants
│   │   │   └── ocr/route.ts        — OCR struk → item list (Gemini)
│   │   ├── bill-items/[id]/        — update/delete item + assign peserta
│   │   ├── bill-participants/[id]/ — update/delete peserta
│   │   ├── ai/status/route.ts      — GET: cek AI tersedia (admin-controlled)
│   │   ├── insights/ai/route.ts    — analisis keuangan bulanan (Gemini, premium)
│   │   ├── categories/             — CRUD kategori user
│   │   ├── subcategories/          — CRUD subkategori user
│   │   ├── budgets/                — CRUD budget per kategori
│   │   ├── notifications/          — list + mark read
│   │   ├── push/                   — subscribe/unsubscribe Web Push
│   │   ├── webhooks/
│   │   │   ├── telegram/route.ts   — Telegram bot handler
│   │   │   └── xendit/route.ts     — payment webhook
│   │   └── cron/weekly-summary/    — cron job ringkasan mingguan
│   └── dashboard/
│       ├── page.tsx                — beranda
│       ├── transactions/           — halaman daftar transaksi
│       ├── split-bill/[id]/        — editor split bill (halaman terbesar)
│       ├── accounts/               — manajemen akun keuangan
│       ├── categories/             — manajemen kategori
│       ├── budget/                 — manajemen budget
│       ├── insights/               — wawasan keuangan AI
│       ├── settings/               — pengaturan user
│       └── upgrade/                — halaman premium
├── components/
│   ├── ui/                         — shadcn/ui primitives (jangan diubah)
│   ├── common/                     — AmountInput, CategoryIcon, dll
│   ├── layout/                     — Sidebar, BottomNav, TopBar, MobileMenu
│   ├── dashboard/                  — QuickAddFab, widget beranda
│   ├── transactions/
│   │   ├── add-transaction-modal.tsx   — form transaksi (support initialValues dari OCR)
│   │   └── input-method-sheet.tsx      — sheet pilih manual/gambar/kamera + OCR flow
│   └── split-bill/
│       └── create-bill-modal.tsx       — buat bill (dari halaman split-bill list)
├── lib/
│   ├── schema.ts       — ⚠️ SUMBER KEBENARAN semua tabel DB (Drizzle)
│   ├── db.ts           — koneksi DB (Turso/LibSQL)
│   ├── gemini.ts       — shared Gemini utility (callGeminiVision, callGeminiText)
│   ├── api-auth.ts     — requireAuth(), generateId()
│   ├── bill-utils.ts   — computeBreakdown(bill), billGrandTotal(bill)
│   ├── push.ts         — sendPushToUser()
│   ├── telegram.ts     — Telegram bot helper
│   ├── utils.ts        — formatCurrency(), cn(), dll
│   └── hooks/          — use-transactions, use-accounts, use-ai-status, dll
├── providers/
│   └── data-provider.tsx   — global cache: accounts, transactions, categories, notifications
└── types/
    └── index.ts        — semua shared TypeScript types
```

---

## Database Schema

Schema lengkap di [`src/lib/schema.ts`](../src/lib/schema.ts). Ringkasan tabel dan hal penting:

### `transaction`
```
id, userId, walletAccountId, amount, type (income|expense),
category, subcategory, description, transactionDate,
source (manual|bot|import|split_bill),
billParticipantId (nullable — tracing dari split bill),
createdAt
```
- Saldo `walletAccount` **diupdate otomatis** di setiap POST/PATCH/DELETE — jangan update manual

### `bill_participant`
```
id, billId, name, contact, status (unpaid|paid),
transactionId (nullable — terisi saat peserta sync ke transaksi)
```
- Saat transaksi split_bill dibuat via POST /api/transactions dengan `billParticipantId`, handler otomatis mengisi `bill_participant.transactionId` (bidirectional tracing)

### `bill` + `bill_item` + `bill_item_assignment`
- Split bill modern berbasis OCR
- `bill.charges` disimpan sebagai JSON string (array `{name, amount}`)
- `billItemAssignment`: many-to-many antara item dan participant

### `wallet_account`
- `balance` diupdate atomik di setiap mutasi transaksi

### `user`
- `subscription_tier`: `free | premium | lifetime`
- `telegram_id`: Chat ID Telegram (untuk bot)
- `telegramPending`: JSON untuk multi-step bot flow

### Tabel lain
- `user_category`, `user_subcategory` — kategori kustom per user
- `budget` — limit per kategori/subkategori
- `notification` — riwayat notifikasi in-app
- `push_subscription` — VAPID endpoint per device
- `subscription` — riwayat billing Xendit
- `split_bill` — **legacy, tidak aktif dipakai**

---

## Pola Kode Wajib

### 1. Auth di API route
```ts
const { session, error } = await requireAuth(request)
if (error) return error
// session.user.id tersedia di sini
```

### 2. Gemini — selalu pakai utility, jangan fetch sendiri
```ts
import { callGeminiVision, callGeminiText } from "@/lib/gemini"

// Untuk OCR gambar:
const text = await callGeminiVision(PROMPT, base64Image, mimeType)

// Untuk analisis teks:
const text = await callGeminiText(prompt, { temperature: 0.7 })
```

### 3. Insert DB
```ts
import { generateId } from "@/lib/api-auth"

await db.insert(table).values({ id: generateId(), userId: session.user.id, ... })
```

### 4. Schema migration
```bash
# Development (langsung push ke db lokal):
pnpm drizzle-kit push

# Production (generate SQL migration dulu):
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### 5. Setelah mutasi — refresh DataProvider
```ts
const { refetch: refetchTransactions } = useTransactions()
const { refetch: refetchAccounts } = useAccounts()
// panggil setelah POST/PATCH/DELETE berhasil
await Promise.all([refetchTransactions(), refetchAccounts()])
```

---

## Admin Toggle AI

```
GEMINI_API_KEY tidak ada → AI otomatis off
AI_OCR_DISABLED=true     → AI dimatikan eksplisit oleh admin
```

- `GET /api/ai/status` → `{ available: boolean }` — dibaca frontend via `useAiStatus()` hook
- User **tidak bisa** override setting ini
- Saat AI off: InputMethodSheet skip OCR, langsung buka form kosong

---

## Alur OCR (Tombol +)

```
InputMethodSheet dibuka
  ├── Manual → AddTransactionModal (kosong)
  ├── Gambar / Kamera → user pilih file
  │     ↓
  │   Dialog "Buat apa?"
  │     ├── Transaksi
  │     │     ↓ POST /api/transactions/ocr
  │     │   AddTransactionModal (pre-filled dari OCR)
  │     └── Bagi Tagihan
  │           ↓ POST /api/bills/ocr → POST /api/bills → POST /api/bills/:id/items
  │         router.push(/dashboard/split-bill/:id)
  │
  └── Jika AI off atau OCR error → fallback ke form kosong + toast
```

`AddTransactionModal` menerima prop `initialValues?: TransactionInitialValues` untuk pre-fill dari OCR atau split bill sync.

---

## Split Bill → Transaksi Sync

Di halaman `/dashboard/split-bill/[id]`, setiap peserta breakdown punya tombol "Catat ke Transaksi":

1. Klik → `AddTransactionModal` terbuka dengan `initialValues` pre-filled (amount dari breakdown, description berisi daftar item, `billParticipantId`)
2. User submit → POST /api/transactions dengan `billParticipantId`
3. Handler otomatis update `bill_participant.transactionId = newTransaction.id`
4. UI refresh → tombol berubah jadi "✓ Sudah dicatat ke transaksi"

### Input Item Split Bill

Form input item pakai pola: **harga asli + diskon → harga bayar (dihitung otomatis)**

- `price` di DB = harga bayar = `originalPrice - discount`
- `originalPrice` di DB = harga sebelum diskon (null jika tidak ada diskon)
- Jika diskon = 0, `originalPrice` disimpan sebagai null
- UI menampilkan `~~originalPrice~~ finalPrice` saat ada diskon

---

## Telegram Bot

Handler: `src/app/api/webhooks/telegram/route.ts`

- Multi-step flow disimpan di `user.telegramPending` (JSON: `{ step, data }`)
- Steps: `select_account → select_category → confirm`
- Callback prefix: `acc:`, `cat:`, `confirm:yes`, `confirm:no`
- Commands: `/catat`, `/saldo`, `/ringkasan`, `/bantuan`

---

## Environment Variables

```env
DATABASE_URL=                       # Turso URL (wajib)
DATABASE_AUTH_TOKEN=                # Turso token (wajib di prod)
BETTER_AUTH_SECRET=                 # Auth secret (wajib)
GEMINI_API_KEY=                     # Google Gemini (wajib untuk AI)
AI_OCR_DISABLED=                    # "true" untuk matikan AI (opsional)
TELEGRAM_BOT_TOKEN=                 # Token bot Telegram (wajib untuk bot)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=       # VAPID public key
VAPID_PRIVATE_KEY=                  # VAPID private key
XENDIT_SECRET_KEY=                  # Xendit API key
XENDIT_WEBHOOK_TOKEN=               # Token verifikasi webhook Xendit
NEXT_PUBLIC_BASE_URL=               # URL aplikasi (wajib)
```

---

## Hal yang Perlu Diperhatikan

- `split_bill` tabel lama masih ada di schema tapi **tidak aktif** — split bill modern pakai tabel `bill`
- `bill.charges` adalah **JSON string**, bukan relasi — di-parse saat dibaca
- `ensureMigrations()` di `transactions/route.ts` dan `budgets/route.ts` adalah runtime migration legacy untuk Turso — jangan hapus
- `BUILTIN_CATEGORIES` di `src/components/common/category-icon.tsx` adalah fallback jika user belum punya custom category
