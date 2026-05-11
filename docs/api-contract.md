# MoneyNote — API Contract

> Base URL: `https://<domain>` (lokal: `http://localhost:3000`)  
> Semua endpoint butuh session cookie dari Better Auth kecuali yang ditandai **Auth: Tidak**.  
> Untuk testing lokal: login dulu via browser, copy cookie `better-auth.session_token`, pakai di header `Cookie`.

---

## Auth

```
Cookie: better-auth.session_token=<token>
```

Semua request ke endpoint yang butuh auth harus menyertakan cookie ini.  
Jika tidak ada / expired → response `401 Unauthorized`.

---

## Akun Keuangan

### `GET /api/accounts`
Ambil semua akun keuangan user. Auto-buat akun "Tunai" jika belum ada.

**Response**
```json
[
  {
    "id": "abc123",
    "userId": "user1",
    "accountType": "cash",
    "accountName": "Tunai",
    "balance": 150000,
    "color": "#3b82f6",
    "icon": "Wallet"
  }
]
```

---

### `POST /api/accounts`
Buat akun baru.

**Body**
```json
{
  "accountType": "bank",
  "accountName": "BCA",
  "balance": 1000000,
  "color": "#3b82f6",
  "icon": "Building2"
}
```
`accountType`: `"bank"` | `"ewallet"` | `"cash"`  
`balance`, `color`, `icon` opsional.

**Response** `201`
```json
{ "id": "abc123", "accountName": "BCA", ... }
```

---

### `PATCH /api/accounts`
Update akun.

**Body**
```json
{ "id": "abc123", "accountName": "BCA Baru", "balance": 2000000 }
```

---

### `DELETE /api/accounts?id=abc123`
Hapus akun.

**Response** `200`
```json
{ "success": true }
```

---

## Transaksi

### `GET /api/transactions?limit=100`
Ambil transaksi user, diurutkan terbaru dulu.

| Query | Tipe | Default | Keterangan |
|-------|------|---------|-----------|
| `limit` | number | 500 | Jumlah maksimal |

**Response**
```json
[
  {
    "id": "tx1",
    "userId": "user1",
    "walletAccountId": "acc1",
    "amount": 25000,
    "type": "expense",
    "category": "makanan",
    "subcategory": "makan siang",
    "description": "Warteg",
    "transactionDate": "2026-05-10",
    "source": "manual",
    "billParticipantId": null,
    "createdAt": "..."
  }
]
```

---

### `POST /api/transactions`
Catat transaksi baru. Saldo akun diupdate otomatis.

**Body**
```json
{
  "walletAccountId": "acc1",
  "amount": 25000,
  "type": "expense",
  "category": "makanan",
  "subcategory": "makan siang",
  "description": "Warteg",
  "transactionDate": "2026-05-10",
  "source": "manual",
  "billParticipantId": null
}
```

| Field | Wajib | Tipe | Keterangan |
|-------|-------|------|-----------|
| `walletAccountId` | Ya | string | ID akun keuangan |
| `amount` | Ya | number | Nominal positif |
| `type` | Ya | `"income"` \| `"expense"` | |
| `category` | Ya | string | Nama kategori |
| `subcategory` | Tidak | string \| null | |
| `description` | Ya | string | |
| `transactionDate` | Ya | string | Format `YYYY-MM-DD` |
| `source` | Tidak | `"manual"` \| `"bot"` \| `"import"` \| `"split_bill"` | Default `"manual"` |
| `billParticipantId` | Tidak | string \| null | Diisi saat sync dari split bill |

**Response** `201`
```json
{ "id": "tx1", "amount": 25000, ... }
```

---

### `PATCH /api/transactions`
Update transaksi. Saldo akun direcalculate otomatis.

**Body**
```json
{
  "id": "tx1",
  "amount": 30000,
  "description": "Warteg + es teh"
}
```

---

### `DELETE /api/transactions?id=tx1`
Hapus transaksi. Saldo akun diupdate otomatis.

**Response** `200`
```json
{ "success": true }
```

---

### `POST /api/transactions/ocr`
Baca struk via AI (Gemini), return data untuk pre-fill form transaksi.

**Body**
```json
{
  "image": "<base64 string>",
  "mimeType": "image/jpeg"
}
```

**Response** `200`
```json
{
  "amount": 45000,
  "date": "2026-05-10",
  "description": "Kopi Kenangan",
  "type": "expense",
  "category": "makanan"
}
```
`date` bisa `null` jika tidak terdeteksi.  
Jika AI tidak aktif → `503 Service Unavailable`.

---

## Kategori

### `GET /api/categories`
Ambil semua kategori user. Auto-buat 9 kategori default jika belum ada.

**Response**
```json
[
  {
    "id": "cat1",
    "name": "makanan",
    "label": "Makanan",
    "color": "#f97316",
    "icon": "UtensilsCrossed",
    "position": 0
  }
]
```

---

### `POST /api/categories`
Buat kategori kustom.

**Body**
```json
{
  "name": "hobi",
  "label": "Hobi",
  "color": "#8b5cf6",
  "icon": "Gamepad2"
}
```

---

### `PATCH /api/categories`
Update kategori.

**Body**
```json
{ "id": "cat1", "label": "Makan & Minum" }
```

---

### `DELETE /api/categories?id=cat1`
Hapus kategori. Gagal `409` jika kategori masih dipakai di transaksi.

---

## Budget

### `GET /api/budgets`
Ambil semua budget user.

**Response**
```json
[
  {
    "id": "bud1",
    "category": "makanan",
    "subcategory": null,
    "amount": 500000
  }
]
```

---

### `POST /api/budgets`
Set budget per kategori. Satu kategori + subcategory hanya boleh satu budget (`409` jika duplikat).

**Body**
```json
{
  "category": "makanan",
  "subcategory": null,
  "amount": 500000
}
```

---

## Split Bill

### `GET /api/bills`
Ambil semua bill user.

**Response**
```json
[
  {
    "id": "bill1",
    "title": "Makan Siang Bareng",
    "description": null,
    "paymentInfo": null,
    "charges": [],
    "createdAt": "..."
  }
]
```

---

### `POST /api/bills`
Buat bill baru.

**Body**
```json
{
  "title": "Makan Siang Bareng",
  "description": "Warung Pak Joko",
  "charges": [
    { "name": "Service Charge", "amount": 5000 }
  ]
}
```

**Response** `201`
```json
{ "id": "bill1", "title": "Makan Siang Bareng", ... }
```

---

### `POST /api/bills/ocr`
Baca struk via AI, return daftar item untuk dibuat bill.

**Body**
```json
{
  "image": "<base64 string>",
  "mimeType": "image/jpeg"
}
```

**Response** `200`
```json
{
  "title": "Kafe Sore",
  "items": [
    { "name": "Kopi Susu", "price": 28000, "originalPrice": null, "qty": 2 },
    { "name": "Croissant", "price": 18000, "originalPrice": 22000, "qty": 1 }
  ],
  "charges": [
    { "name": "Service Charge", "amount": 5000 }
  ]
}
```

---

### `GET /api/bills/:id`
Ambil detail bill + semua item + semua peserta.

**Response**
```json
{
  "id": "bill1",
  "title": "Makan Siang Bareng",
  "charges": [],
  "paymentInfo": {
    "method": "BCA",
    "account": "1234567890",
    "accountName": "Budi"
  },
  "items": [
    {
      "id": "item1",
      "name": "Nasi Goreng",
      "price": 20000,
      "originalPrice": null,
      "qty": 1,
      "position": 0,
      "participantIds": ["p1", "p2"]
    }
  ],
  "participants": [
    {
      "id": "p1",
      "name": "Budi",
      "contact": "081234567890",
      "status": "unpaid",
      "transactionId": null
    }
  ]
}
```

---

### `PATCH /api/bills/:id`
Update judul, deskripsi, rekening tujuan, atau biaya tambahan.

**Body** (semua opsional)
```json
{
  "title": "Makan Malam",
  "description": "Restoran Padang",
  "paymentInfo": {
    "method": "GoPay",
    "account": "081234567890",
    "accountName": "Budi"
  },
  "charges": [
    { "name": "PPN", "amount": 10000 }
  ]
}
```
Set `paymentInfo: null` untuk hapus rekening tujuan.

---

### `DELETE /api/bills/:id`
Hapus bill beserta semua item dan pesertanya.

---

### `POST /api/bills/:id/items`
Tambah item ke bill.

**Body**
```json
{
  "name": "Nasi Goreng",
  "price": 18000,
  "originalPrice": 22000,
  "qty": 2
}
```
`price` = harga setelah diskon, `originalPrice` = harga asli (opsional).

**Response** `201`
```json
{ "id": "item1", "name": "Nasi Goreng", "price": 18000, ... }
```

---

### `PATCH /api/bill-items/:id`
Update item. Field `participantIds` dipakai untuk assign/unassign peserta ke item ini.

**Body** (semua opsional)
```json
{
  "name": "Nasi Goreng Spesial",
  "price": 20000,
  "originalPrice": null,
  "qty": 1,
  "participantIds": ["p1", "p2"]
}
```

---

### `DELETE /api/bill-items/:id`
Hapus item dari bill.

---

### `POST /api/bills/:id/participants`
Tambah peserta ke bill.

**Body**
```json
{
  "name": "Budi",
  "contact": "081234567890"
}
```
`contact` opsional (nomor WA untuk kirim tagihan).

**Response** `201`
```json
{ "id": "p1", "name": "Budi", "contact": "081234567890", "status": "unpaid", "transactionId": null }
```

---

### `PATCH /api/bill-participants/:id`
Update peserta. Biasanya dipakai untuk tandai lunas/belum.

**Body** (semua opsional)
```json
{
  "name": "Budi Santoso",
  "contact": "081234567890",
  "status": "paid"
}
```
`status`: `"paid"` | `"unpaid"`

---

### `DELETE /api/bill-participants/:id`
Hapus peserta dari bill. Assignment item ke peserta ini ikut terhapus.

---

## AI & Utilitas

### `GET /api/ai/status`
Cek apakah fitur AI aktif. **Auth: Tidak diperlukan.**

**Response**
```json
{ "available": true }
```
`false` jika `GEMINI_API_KEY` tidak ada atau `AI_OCR_DISABLED=true`.

---

### `GET /api/user`
Ambil profil user yang sedang login.

**Response**
```json
{
  "id": "user1",
  "name": "Budi",
  "email": "budi@email.com",
  "subscriptionTier": "free",
  "subscriptionEndsAt": null,
  "telegramId": null
}
```

---

### `PATCH /api/user`
Update profil user.

**Body** (semua opsional)
```json
{
  "name": "Budi Santoso",
  "telegramId": "123456789"
}
```

---

## Notifikasi

### `GET /api/notifications`
Ambil 50 notifikasi terbaru.

**Response**
```json
[
  {
    "id": "notif1",
    "kind": "budget_warning",
    "title": "Budget hampir habis",
    "body": "Pengeluaran Makanan sudah 85% dari budget.",
    "isRead": false,
    "createdAt": "..."
  }
]
```
`kind`: `"transaction_added"` | `"budget_warning"` | `"split_reminder"` | `"weekly_summary"` | `"system"`

---

### `PATCH /api/notifications`
Tandai notifikasi sudah dibaca.

**Body**
```json
{ "id": "notif1" }
```
Kirim tanpa `id` → tandai **semua** notifikasi sudah dibaca.

---

## Contoh Curl

```bash
# Ambil semua akun
curl http://localhost:3000/api/accounts \
  -H "Cookie: better-auth.session_token=<token>"

# Catat transaksi baru
curl -X POST http://localhost:3000/api/transactions \
  -H "Cookie: better-auth.session_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAccountId": "acc1",
    "amount": 25000,
    "type": "expense",
    "category": "makanan",
    "description": "Warteg",
    "transactionDate": "2026-05-10"
  }'

# Buat split bill
curl -X POST http://localhost:3000/api/bills \
  -H "Cookie: better-auth.session_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{ "title": "Makan Siang" }'

# Tambah item ke bill
curl -X POST http://localhost:3000/api/bills/bill1/items \
  -H "Cookie: better-auth.session_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Nasi Goreng", "price": 20000, "qty": 1 }'

# Tandai peserta lunas
curl -X PATCH http://localhost:3000/api/bill-participants/p1 \
  -H "Cookie: better-auth.session_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "paid" }'

# Cek status AI (tanpa auth)
curl http://localhost:3000/api/ai/status
```
