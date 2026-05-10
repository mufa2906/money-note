# MoneyNote — Functional Flow Diagrams

> Diagram alur per fitur. Dibaca dari atas ke bawah.  
> Render otomatis di GitHub, VS Code (Mermaid extension), dan GitLab.

---

## 1. Input Transaksi (Tombol +)

```mermaid
flowchart TD
    A([User tap tombol +]) --> B[InputMethodSheet terbuka]
    B --> C{Pilih metode}

    C --> D[Manual]
    C --> E[Gambar / Kamera]

    D --> F[AddTransactionModal kosong]
    F --> G[User isi form]
    G --> H[POST /api/transactions]
    H --> I([Transaksi tersimpan\nSaldo akun terupdate])

    E --> J[User pilih file / ambil foto]
    J --> K{AI tersedia?}

    K -- Tidak --> L{Pilih tujuan}
    K -- Ya --> M[Dialog: Buat apa?]
    M --> L

    L --> N[Transaksi]
    L --> O[Bagi Tagihan]

    N -- AI tidak tersedia --> F
    N -- AI tersedia --> P[POST /api/transactions/ocr\nGemini baca struk]
    P --> Q{OCR berhasil?}
    Q -- Ya --> R[AddTransactionModal\npre-filled dari OCR]
    Q -- Gagal --> F
    R --> G

    O -- AI tidak tersedia --> S[POST /api/bills\ntagihan kosong]
    O -- AI tersedia --> T[POST /api/bills/ocr\nGemini baca item struk]
    T --> U{OCR berhasil?}
    U -- Ya --> V[POST /api/bills\n+ POST /api/bills/:id/items]
    U -- Gagal --> S
    S --> W([Navigasi ke editor\n/split-bill/:id])
    V --> W
```

---

## 2. Split Bill — Buat & Edit

```mermaid
flowchart TD
    A([Buka editor /split-bill/:id]) --> B[GET /api/bills/:id\nLoad bill + items + participants]

    B --> C[Tampil editor]

    C --> D[Edit judul / deskripsi]
    C --> E[Kelola Item]
    C --> F[Kelola Biaya Tambahan\nservice charge, PPN, dll]
    C --> G[Kelola Peserta]

    E --> E1[Tambah item:\nHarga asli + Diskon → Harga bayar]
    E --> E2[Assign item ke peserta]
    E --> E3[Edit / Hapus item]

    G --> G1[Tambah Saya\nauto-fill nama user login]
    G --> G2[Tambah peserta manual\nnama + no. WA]
    G --> G3[Hapus peserta]
    G1 --> G4[Simpan ID peserta\ndi localStorage]

    E2 & G1 & G2 --> H[Hitung Breakdown\ncomputeBreakdown]

    H --> I[Rincian per Orang\nditampilkan]
    I --> J{Peserta Saya?}
    J -- Ya --> K[Card di urutan pertama\nwarna berbeda\nTombol Catat Bagian Saya]
    J -- Tidak --> L[Card biasa]
```

---

## 3. Split Bill — Distribusi & Sync

```mermaid
flowchart TD
    A([Rincian per Orang sudah tampil]) --> B{Aksi user}

    B --> C[Kirim WA]
    B --> D[Tandai Lunas / Belum Lunas]
    B --> E[Catat ke Transaksi]

    C --> F[Buka wa.me dengan\nteks rincian pre-filled]

    D --> G[PATCH /api/bill-participants/:id\nstatus: paid / unpaid]

    E --> H[AddTransactionModal\npre-filled:\n- nominal dari breakdown\n- deskripsi daftar item\n- billParticipantId]

    H --> I[User pilih akun & kategori]
    I --> J[POST /api/transactions\nbillParticipantId disertakan]

    J --> K[Handler simpan transaksi]
    K --> L[Update bill_participant.transactionId]
    K --> M[Update saldo wallet akun]

    L --> N([Tombol berubah:\nSudah dicatat ke transaksi])
```

---

## 4. AI OCR — Status & Fallback

```mermaid
flowchart TD
    A([Frontend load]) --> B[GET /api/ai/status]

    B --> C{GEMINI_API_KEY ada?\nAI_OCR_DISABLED = false?}

    C -- Keduanya OK --> D[AI tersedia\naiAvailable = true]
    C -- Salah satu gagal --> E[AI tidak tersedia\naiAvailable = false]

    D --> F[Tombol Gambar/Kamera\ntampil normal]
    E --> G[Tombol Gambar/Kamera\ntampil label manual]

    F --> H[User pilih gambar]
    H --> I[POST /api/.../ocr\ncallGeminiVision prompt + base64]
    I --> J{Gemini response OK?}
    J -- Ya --> K[Parse JSON dari response]
    J -- Gagal / timeout --> L[Fallback: form kosong\n+ toast error]
    K --> M[Pre-fill form dengan data OCR]
```

---

## 5. Telegram Bot — Catat Transaksi

```mermaid
flowchart TD
    A([User kirim pesan ke bot]) --> B{Jenis pesan}

    B --> C[Perintah /catat]
    B --> D[Teks natural\ncontoh: 50000 makan siang]
    B --> E[Perintah lain\n/saldo /ringkasan /bantuan]

    C --> F[Bot balas: Masukkan nominal]
    D --> F

    F --> G[User kirim nominal]
    G --> H[Bot deteksi kategori\ndari teks natural]
    H --> I[Bot kirim inline keyboard\npilih akun]

    I --> J[User pilih akun\ncallback: acc:id]
    J --> K[Bot kirim inline keyboard\npilih kategori]

    K --> L[User pilih kategori\ncallback: cat:nama]
    L --> M[Bot kirim konfirmasi\nringkasan transaksi]

    M --> N{User konfirmasi?}
    N -- confirm:yes --> O[POST /api/transactions\nsource: bot]
    N -- confirm:no --> P([Bot: Dibatalkan])

    O --> Q[Simpan transaksi\nUpdate saldo]
    Q --> R([Bot kirim notif konfirmasi\nke user])

    E --> S[Bot balas info sesuai perintah]
```

---

## 6. Budget — Warning & Notifikasi

```mermaid
flowchart TD
    A([POST /api/transactions berhasil]) --> B[Hitung total pengeluaran\nbulan ini per kategori]

    B --> C[GET budget user\nuntuk kategori tersebut]

    C --> D{Budget ada?}
    D -- Tidak --> E([Selesai, tidak ada cek])
    D -- Ya --> F{Persentase pemakaian}

    F --> G[< 80%\nAman]
    F --> H[80% - 99%\nMendekati limit]
    F --> I[>= 100%\nMelebihi limit]

    H --> J[Simpan notifikasi\nkind: budget_warning]
    I --> J

    J --> K[sendPushToUser\nkirim Web Push ke device]
    K --> L([Notifikasi muncul\ndi HP / browser])
```

---

## 7. Ringkasan Mingguan (Cron)

```mermaid
flowchart TD
    A([Cron trigger\n/api/cron/weekly-summary]) --> B[Ambil semua user aktif]

    B --> C[Loop per user]
    C --> D[Hitung transaksi\n7 hari terakhir]

    D --> E{Ada transaksi?}
    E -- Tidak --> F([Skip user ini])
    E -- Ya --> G[Hitung total\nper kategori]

    G --> H[Buat teks ringkasan]
    H --> I{User punya\nTelegram ID?}

    I -- Ya --> J[Kirim via Telegram Bot]
    I -- Tidak --> K[Kirim via Web Push]

    J & K --> L([Ringkasan terkirim])
    L --> C
```
