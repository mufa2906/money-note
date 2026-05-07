export const DEFAULT_SUBCATEGORIES: Record<string, { name: string; label: string; position: number }[]> = {
  makanan: [
    { name: "makan_utama", label: "Makan Utama", position: 0 },
    { name: "camilan_minuman", label: "Camilan & Minuman", position: 1 },
    { name: "belanja_dapur", label: "Belanja Dapur", position: 2 },
    { name: "dll", label: "Dll", position: 3 },
  ],
  transportasi: [
    { name: "bbm", label: "BBM", position: 0 },
    { name: "parkir_tol", label: "Parkir & Tol", position: 1 },
    { name: "ojek_online", label: "Ojek/Taksi Online", position: 2 },
    { name: "servis", label: "Servis Kendaraan", position: 3 },
    { name: "dll", label: "Dll", position: 4 },
  ],
  belanja: [
    { name: "kebutuhan_rumah", label: "Kebutuhan Rumah", position: 0 },
    { name: "fashion", label: "Pakaian & Fashion", position: 1 },
    { name: "online_shop", label: "Online Shop", position: 2 },
    { name: "dll", label: "Dll", position: 3 },
  ],
  hiburan: [
    { name: "nongkrong", label: "Nongkrong", position: 0 },
    { name: "streaming", label: "Streaming & Langganan", position: 1 },
    { name: "liburan", label: "Liburan", position: 2 },
    { name: "dll", label: "Dll", position: 3 },
  ],
  tagihan: [
    { name: "listrik_air", label: "Listrik & Air", position: 0 },
    { name: "internet_hp", label: "Internet & HP", position: 1 },
    { name: "sewa_kpr", label: "Sewa / KPR", position: 2 },
    { name: "asuransi", label: "Asuransi", position: 3 },
    { name: "dll", label: "Dll", position: 4 },
  ],
  kesehatan: [
    { name: "dokter", label: "Dokter & Klinik", position: 0 },
    { name: "obat", label: "Obat & Apotek", position: 1 },
    { name: "olahraga", label: "Olahraga & Gym", position: 2 },
    { name: "dll", label: "Dll", position: 3 },
  ],
  pendidikan: [
    { name: "kursus", label: "Kursus & Les", position: 0 },
    { name: "buku_materi", label: "Buku & Materi", position: 1 },
    { name: "biaya_sekolah", label: "Biaya Sekolah/Kuliah", position: 2 },
    { name: "dll", label: "Dll", position: 3 },
  ],
  gaji: [
    { name: "gaji_pokok", label: "Gaji Pokok", position: 0 },
    { name: "freelance", label: "Freelance & Proyek", position: 1 },
    { name: "bonus_thr", label: "Bonus & THR", position: 2 },
    { name: "dll", label: "Dll", position: 3 },
  ],
  lainnya: [
    { name: "donasi", label: "Donasi & Sedekah", position: 0 },
    { name: "tabungan", label: "Tabungan", position: 1 },
    { name: "investasi", label: "Investasi", position: 2 },
    { name: "dll", label: "Dll", position: 3 },
  ],
}
