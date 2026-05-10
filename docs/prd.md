# MoneyNote — Product Overview

> Dokumen ini diperbarui setiap ada update signifikan pada produk.  
> **Versi terakhir:** Mei 2026

---

## Apa itu MoneyNote?

MoneyNote adalah aplikasi pencatat keuangan pribadi berbasis web yang bisa diinstall di HP seperti aplikasi biasa. Tujuannya sederhana: **mempermudah pencatatan pengeluaran dan pemasukan sehari-hari**, sehingga pengguna punya gambaran jelas tentang kondisi keuangannya tanpa repot.

---

## Untuk Siapa?

Individu yang ingin mengelola keuangan pribadi dengan cara yang mudah dan cepat — tidak perlu aplikasi terpisah, cukup lewat browser atau Telegram.

---

## Model Bisnis

| Tier | Harga | Akses |
|------|-------|-------|
| **Gratis** | Rp0 / selamanya | Semua fitur dasar |
| **Premium Bulanan** | Berbayar / bulan | Fitur AI mendalam |
| **Premium Tahunan** | Berbayar / tahun | Fitur AI mendalam |
| **Lifetime** | Sekali bayar | Akses selamanya |

---

## Fitur Utama

### 1. Catat Transaksi — 3 Cara

Pengguna bisa mencatat pengeluaran/pemasukan dengan tiga cara:

- **Manual** — isi form langsung di aplikasi
- **Foto Struk** — ambil foto atau upload gambar struk, AI secara otomatis membaca nominal, tanggal, nama toko, dan kategori
- **Kamera Langsung** — buka kamera dari aplikasi, foto struk, langsung diproses

> Jika fitur AI sedang dinonaktifkan oleh admin, opsi foto tetap tersedia — pengguna cukup isi form secara manual sambil melihat foto referensi.

---

### 2. Bagi Tagihan (Split Bill)

Cocok untuk makan bersama, patungan, atau tagihan grup:

1. Foto struk atau input manual
2. AI membaca semua item beserta harganya
3. Tentukan siapa memesan apa
4. Aplikasi otomatis menghitung total per orang (termasuk service charge, pajak)
5. Kirim rincian tagihan ke masing-masing orang via WhatsApp

**Fitur Sync:** Setelah split bill selesai, bagian kamu sendiri bisa langsung dicatat sebagai transaksi di aplikasi — jadi semua pengeluaran tetap terlacak dengan rapi.

---

### 3. Telegram Bot

Pengguna bisa mencatat transaksi cukup dengan mengirim pesan ke bot Telegram — tanpa perlu buka aplikasi. Cocok untuk yang lebih sering di Telegram.

Contoh:
```
50000 - gopay - makanan - makan siang warteg
```
Atau singkat:
```
50000 makan siang
```
Bot akan memandu sisanya melalui pilihan akun dan kategori.

---

### 4. Kategori & Budget

- Kategori pengeluaran bisa dikustomisasi sesuai kebutuhan
- Setiap kategori bisa punya subkategori (misal: Makanan → Sarapan, Makan Siang, Cemilan)
- Bisa set batas budget per kategori
- Aplikasi otomatis memberikan notifikasi saat pengeluaran mendekati atau melebihi budget

---

### 5. Wawasan Keuangan AI *(Premium)*

Setiap bulan, AI menganalisis pola pengeluaran dan memberikan:
- Ringkasan kondisi keuangan bulan ini
- Hal positif yang perlu dipertahankan
- Peringatan jika ada pengeluaran yang perlu diwaspadai
- Tips konkret untuk bulan berikutnya
- Prediksi jika pola saat ini berlanjut

---

### 6. Notifikasi Push

Notifikasi langsung ke HP/browser pengguna untuk:
- Konfirmasi setiap transaksi dicatat
- Peringatan budget hampir habis
- Ringkasan mingguan otomatis

---

### 7. Multi-Akun

Pengguna bisa punya beberapa akun (rekening bank, e-wallet, tunai) dan saldo masing-masing akun terupdate otomatis setiap ada transaksi masuk atau keluar.

---

### 8. Import CSV

Punya data lama di Excel atau aplikasi lain? Bisa langsung diimpor massal ke MoneyNote.

---

## Kontrol Admin

Beberapa pengaturan hanya bisa diubah oleh admin (pemilik aplikasi), bukan oleh pengguna:

| Pengaturan | Keterangan |
|-----------|-----------|
| **Fitur AI On/Off** | Admin bisa mematikan OCR dan AI sepenuhnya, misalnya saat token API habis. Pengguna tetap bisa pakai aplikasi secara manual. |

---

## Platform

- **Web** — bisa diakses dari browser manapun (PC, laptop, HP)
- **PWA** — bisa diinstall di HP seperti aplikasi biasa (Android/iOS)
- **Telegram** — via bot untuk pencatatan cepat

---

## Fitur yang Direncanakan

| Fitur | Keterangan |
|-------|-----------|
| WhatsApp Bot | Pencatatan via WhatsApp (untuk pengguna Premium) |
| Auto Bank Sync | Tarik data mutasi bank/e-wallet secara otomatis |
| Pengingat Split Bill | Pengingat otomatis ke teman yang belum bayar via chat |

---

## Riwayat Update

### Mei 2026 — OCR Transaksi & Split Bill Sync
- Tombol tambah transaksi kini punya 3 pilihan: Manual, Gambar, atau Kamera
- AI membaca struk secara otomatis (nominal, tanggal, toko, kategori)
- Pilihan setelah foto: catat sebagai transaksi pribadi ATAU bagi tagihan ke beberapa orang
- Porsi split bill bisa langsung disinkronkan ke daftar transaksi pribadi
- Admin bisa nonaktifkan fitur AI tanpa mengubah code

### Sebelumnya — Fondasi Aplikasi
- Sistem pencatatan transaksi manual lengkap (pengeluaran & pemasukan)
- Multi-akun keuangan dengan saldo real-time
- Bagi tagihan dengan OCR struk dan kalkulasi per orang
- Telegram bot dengan pencatatan natural language
- Sistem kategori & subkategori kustom
- Budget per kategori dengan notifikasi otomatis
- Web Push Notification
- Import data via CSV
- Wawasan keuangan AI bulanan (fitur Premium)
- Sistem langganan (bulanan / tahunan / lifetime) via Xendit
- Ringkasan keuangan mingguan otomatis
