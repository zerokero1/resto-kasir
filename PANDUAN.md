# Panduan Dayang Resto — Aplikasi Kasir (PWA)

Panduan ini untuk semua yang memakai aplikasi kasir Dayang Resto: kasir, admin, dan bos.
Tidak perlu memasang aplikasi dari Play Store — aplikasi ini berjalan di browser dan bisa
"dipasang" ke layar HP seperti aplikasi biasa (PWA).

- **Alamat aplikasi:** https://zerokero1.github.io/resto-kasir/
- **Zona waktu:** semua tanggal & jam memakai **WIB**, walaupun HP disetel ke zona lain.
- **Data:** tersimpan di server (Supabase), jadi semua perangkat melihat data yang sama.

---

## 1. Akun dan hak akses

| Peran | Akun contoh | Bisa membuka |
|---|---|---|
| **Admin** | `admin@dayangresto.id` / `admin123` | Semua halaman, termasuk **Karyawan** dan **Dashboard** |
| **Kasir** | `kasir@dayangresto.id` / `kasir123` | Kasir, Riwayat, Belum Bayar, Stok, Produk, Laporan, Harian |
| **Bos** | `bos@dayangresto.id` / `bos123` | **Dashboard, Riwayat, Laporan** saja (hanya melihat) |

> Ganti sandi akun lewat menu **Karyawan → Tambah Akun Kasir** (admin) atau minta admin
> membuatkan akun baru. Jangan bagikan akun admin ke semua orang — gunakan akun kasir
> untuk pekerjaan harian.

Menu di bawah layar (bottom bar) menyesuaikan peran:

- **Kasir:** 🛒 Kasir · 🧾 Riwayat · ⏳ Belum Bayar · 📦 Stok · 🍽️ Produk · 📊 Laporan · 🗓️ Harian
- **Admin:** semua di atas + 📈 Dashboard + 👥 Karyawan
- **Bos:** 📈 Dashboard · 🧾 Riwayat · 📊 Laporan

---

## 2. Memasang aplikasi di HP / komputer

### Android (Chrome)
1. Buka https://zerokero1.github.io/resto-kasir/
2. Login sekali.
3. Tekan menu **⋮** → **Tambahkan ke layar utama** / **Instal aplikasi**.
4. Ikon "Dayang Resto" muncul di layar HP. Buka dari ikon itu.

### iPhone / iPad (Safari)
1. Buka alamat di atas dengan **Safari**.
2. Tekan tombol **Bagikan** (kotak dengan panah ke atas).
3. Pilih **Tambahkan ke Layar Utama** → **Tambah**.

### Laptop / PC (Chrome / Edge)
1. Buka alamat di atas.
2. Klik ikon **instal** di kanan address bar, atau menu **⋮ → Instal Dayang Resto**.

**Login bertahan sekitar seminggu.** Kalau diminta login lagi, masukkan email & sandi —
data tetap aman, tidak ada yang hilang.

---

## 3. Alur kerja harian kasir

### 3.1 Membuat pesanan (menu 🛒 Kasir)
1. Pilih kelompok menu (Semua / Makanan / Minuman / Snack / Dessert) atau langsung ketuk menu.
2. Ketuk menu untuk menambah. Gunakan **− / +** untuk mengubah jumlah.
3. Isi **Catatan** bila perlu (mis. "tanpa es", "nama pelanggan: Budi").
4. Pilih salah satu:
   - **Simpan Saja** → nota dibuat dengan status **Belum Bayar** (masuk ke halaman ⏳ Belum Bayar).
   - **💳 Bayar / Split Bill** → langsung membuka layar pembayaran.

### 3.2 Menerima pembayaran
Di layar **Terima Pembayaran**:

1. **Diskon (Rp)** — opsional. Isi bila pelanggan dapat potongan. Diskon mengurangi
   nilai dasar **sebelum** pajak 3% EDC dihitung.
2. Pilih metode:
   - **💵 Tunai** — masukkan uang yang diterima. Tombol cepat **Bayar Pas / 50rb / 100rb**
     tersedia. Kembalian dihitung otomatis.
   - **💳 Kartu/Cardless (EDC)** — total otomatis **+3%** (tax mesin EDC). Masukkan nominal
     yang tertera di mesin bila berbeda.
   - **📱 QRIS** — tanpa tambahan pajak. Masukkan nominal yang muncul di aplikasi QRIS.
3. Tekan **Bayar & Lunas**. Struk muncul dan otomatis disiapkan untuk dicetak.

**Aturan pajak yang dipakai aplikasi**

| Metode | Perhitungan total |
|---|---|
| Tunai | total = item − diskon |
| QRIS | total = item − diskon |
| Kartu/Cardless (EDC) | total = (item − diskon) × 1,03 → dibulatkan |
| Belum Bayar | total = item − diskon, status belum lunas |

### 3.3 Split bill (pembayaran dipecah)
1. Di layar pembayaran pilih **Split bill**.
2. Tentukan **jumlah orang**.
3. Untuk tiap orang (P1, P2, …): tekan **✓ Ambil** pada item yang dia bayar, atau
   **Ambil semua sisa**. Bisa juga mengatur qty bila satu item dibagi.
4. Pilih metode tiap orang (Tunai / EDC / QRIS) dan isi nominalnya.
5. Tekan **Simpan jadi N nota baru**.

Catatan: nota asal diganti menjadi beberapa nota baru bernomor `...-S2`, `...-S3`, dst.
Stok bahan **tidak** dipotong dua kali. Setelah tersimpan, cetak struk tiap nota dari Riwayat.

### 3.4 Cetak struk
- Setelah pembayaran, struk tampil otomatis. Tekan tombol cetak untuk printer Bluetooth.
- Untuk mencetak ulang: **Riwayat** → ketuk nota → tombol cetak.
- Di halaman **🗓️ Harian** ada tombol **🖨️ Cetak ke Bluetooth** untuk laporan harian.

---

## 4. Riwayat transaksi (🧾 Riwayat)

- Pilih **tanggal** di kiri atas. Ringkasan "Total <tanggal> : Rp … (N nota)" tampil di atas.
- **⬇️ Excel** mengunduh semua transaksi tanggal itu.
- Ketuk baris nota untuk melihat **struk**.
- Nota **Belum Bayar** punya tombol tambahan:
  - **➕ Ubah Orderan** — menambah item (belum lunas saja).
  - **💳 Bayar** — menerima pelunasan.
  - **🔀 Split Bill** — memecah nota.
  - **✕ Batalkan** — membatalkan nota; item & stok dikembalikan. Tidak bisa diurungkan.
- Semua nota punya tombol **✏️ Edit** (lihat bagian 5).

---

## 5. Edit transaksi dengan PIN admin (✏️ Edit)

Fitur ini untuk memperbaiki nota yang sudah tersimpan — misalnya salah input menu, salah
metode bayar, atau salah tanggal. **Wajib memasukkan PIN admin** setiap kali mengedit,
termasuk bila yang login adalah akun admin.

**PIN awal: `1234`**

### Cara mengedit
1. Buka **🧾 Riwayat**, pilih tanggal nota.
2. Tekan **✏️ Edit** pada nota yang ingin diperbaiki.
3. Masukkan **PIN admin** → **Buka**.
4. Di layar **Edit Transaksi** Anda bisa mengubah:
   - **Tanggal transaksi** (jam asli dipertahankan, hanya tanggalnya yang pindah).
   - **Item:** ubah qty dengan **− / +**, **Hapus** item, atau **Tambah menu** dari daftar.
   - **Metode pembayaran:** Tunai / Kartu-Cardless (EDC) / QRIS / Belum Bayar.
   - **Diskon** (Rp).
   - **Uang dibayar** (khusus tunai) — ada tombol **Bayar Pas**.
   - **Catatan.**
5. Periksa ringkasan **Subtotal → Diskon → Tax 3% EDC → Total**.
6. Tekan **Simpan Perubahan**.

### Yang terjadi setelah disimpan
- Total nota dihitung ulang otomatis dari item dan diskon.
- **Stok bahan ikut disesuaikan** dari selisih qty:
  - qty ditambah / item baru → stok berkurang.
  - qty dikurangi / item dihapus → stok dikembalikan.
- Bila metode diubah ke **Belum Bayar**, nota pindah ke halaman ⏳ Belum Bayar.
- Bila metode diubah dari EDC ke Tunai, pajak 3% dihapus dari total.
- Perubahan langsung terlihat di Riwayat, Laporan, dan Dashboard.

### Mengganti PIN admin
PIN tidak bisa dibaca dari aplikasi. Untuk mengganti, buka **Supabase → SQL Editor** dan
jalankan (ganti angka sesuai keinginan, 4–6 digit):

```sql
select public.ganti_pin_admin('1234', '5678');
```

Hasil `true` = berhasil, `false` = PIN lama salah. Simpan PIN baru di tempat aman dan
beritahu hanya admin.

> **Penting:** PIN ini adalah kunci koreksi data. Jangan ditulis di dekat meja kasir dan
> jangan dibagikan ke pelanggan.

---

## 6. Belum Bayar (⏳)

- Menampilkan semua nota yang statusnya belum lunas beserta total terutang.
- Ketuk nota → **💳 Bayar** untuk pelunasan, atau **✏️ Edit** bila perlu koreksi dulu.
- Nota yang sudah lunas otomatis hilang dari daftar ini.

---

## 7. Stok (📦)

Halaman stok menampilkan daftar bahan. Bahan dengan stok ≤ stok minimum ditandai
**⚠️ stok menipis**.

1. Ketuk bahan di kiri.
2. Pilih tab:
   - **masuk** — barang datang (isi jumlah & catatan, mis. `Belanja pasar Rp150.000`).
   - **keluar** — pemakaian/buang (isi alasan).
   - **opname** — hitung stok fisik; isi hasil hitung, sistem menyesuaikan.
3. Isi **tanggal**, jumlah, lalu **Simpan**.
4. Di bawahnya tampil riwayat 5 mutasi terakhir (masuk / keluar / opname).

**Catatan penting:** stok bahan berkurang **otomatis** saat menu terjual, berdasarkan
**resep** menu (lihat bagian 8). Karena itu resep harus benar agar stok akurat.

---

## 8. Produk & resep (🍽️)

Dua tab: **Menu** dan **Bahan**.

- **Bahan** — nama, satuan (gr, ml, pcs, …), stok, stok minimum.
- **Menu** — nama, kelompok, harga jual, dan **resep**.
- **Resep** = daftar bahan + jumlah per 1 porsi. Contoh: 1 Nasi Campur memakai 150 gr beras,
  100 gr ayam, dst. Saat menu terjual, stok bahan dipotong sesuai resep × qty.

Bila harga menu berubah, transaksi lama **tidak** ikut berubah (harga tersimpan di item nota).

---

## 9. Karyawan & absensi (👥 — admin)

- **Absensi hari ini** — tandai status tiap karyawan (hadir / izin / sakit / alpa, dst).
- **Tambah Karyawan** — data karyawan (nama, telepon, jabatan).
- **Daftar Karyawan** — aktif/nonaktif.
- **Tambah Akun Kasir** — membuat akun login baru (email + sandi) dengan peran kasir.

---

## 10. Laporan (📊)

Ada 9 tab di halaman Laporan:

| Tab | Isi |
|---|---|
| **Stok** | Stok semua bahan & menu saat ini |
| **Rekap Harian** | Jumlah nota + total per hari (Tunai / QRIS / Debit / Belum Bayar) |
| **Transaksi** | Daftar nota satu tanggal |
| **Absensi** | Rekap kehadiran |
| **Stok Masuk/Keluar** | Mutasi bahan (harian/mingguan/bulanan) |
| **Pemakaian Stok** | Pemakaian bahan satu tanggal |
| **Pengeluaran Stok** | Belanja/pengeluaran per hari |
| **Pendapatan per Bagian** | Omzet per departemen + jumlah item terjual |
| **Laporan Kas** | Laporan kas per departemen (format Excel resto) |

Setiap tab punya tombol **⬇️ Excel** untuk mengunduh data.

### 10.1 Rumus Laporan Kas

Departemen: **Kitchen**, **Coffee**, **Bar**, dan **Operasional** (khusus pengeluaran).

| Kolom | Arti |
|---|---|
| **Revenue** | Subtotal item yang terjual (sebelum pajak) |
| **Cash** | Bagian yang dibayar tunai |
| **Pengeluaran** | Belanja/pengeluaran hari itu |
| **Sisa Cash** | Cash − Pengeluaran |
| **EDC** | Bagian yang dibayar kartu (sebelum +3%) |
| **Qris** | Bagian yang dibayar QRIS |
| **3%** | Pajak EDC = 3% × EDC |
| **Total** | **(Cash − Pengeluaran) + (EDC + 3%) + Qris** |

**GRAND TOTAL** di bawah adalah jumlah seluruh rentang tanggal yang dipilih.

Sumber **Pengeluaran** (berurutan prioritas):
1. Tabel `resto_pengeluaran` bila sudah diisi (per departemen).
2. Input manual di halaman Laporan Kas (tersimpan di perangkat itu saja).
3. Otomatis dari catatan pembelian stok yang mengandung `Rp…`
   (mis. catatan `Belanja pasar Rp150.000` → terhitung Rp150.000).

> **Catatan diskon:** diskon tercatat di nota & struk, tetapi **Revenue/Cash/EDC/QRIS di
> Laporan Kas memakai subtotal item**, sehingga diskon tidak mengurangi omzet laporan.
> Bila ingin laporan kas sama persis dengan uang yang masuk, catat diskon sebagai
> pengeluaran, atau minta penyesuaian rumus.

### 10.2 Memilih rentang tanggal
Isi dua kolom tanggal (dari–sampai) di tab Rekap Harian, Absensi, Stok Masuk/Keluar,
Pengeluaran Stok, Pendapatan per Bagian, dan Laporan Kas. Tab Transaksi dan Pemakaian
Stok memakai satu tanggal.

---

## 11. Dashboard (📈 — admin & bos)

Ringkasan pemasukan dengan mode **Harian / Mingguan / Bulanan**:

- **Pemasukan** total + jumlah transaksi.
- **Rata-rata per periode**.
- Persentase **Tunai / QRIS / Debit / Belum Bayar**.
- **Rincian per hari/minggu/bulan**, bisa diunduh ke Excel.

Rentang bawaan: **30 hari terakhir**. Dashboard mengambil **semua** nota pada rentang itu
(tidak terpotong di 1.000 baris). Saat pertama dibuka, angka bisa tampil beberapa detik
lebih lambat karena data diambil bertahap — tunggu sampai terisi.

---

## 12. Laporan Harian (🗓️)

Laporan satu hari yang siap dicetak:

- Ringkasan pemasukan & jumlah transaksi.
- Pendapatan per bagian.
- Metode pembayaran.
- **Menu terlaris**.
- Penjualan per jam.
- Rincian per kelompok menu.
- Daftar transaksi.
- Tombol **🖨️ Cetak ke Bluetooth**.

---

## 13. Kalau ada masalah

### Aplikasi menampilkan versi lama / halaman kosong / tombol baru tidak muncul
Aplikasi menyimpan versi lama di cache (service worker). Lakukan salah satu:

**Cara mudah**
1. Tutup aplikasi sepenuhnya (bukan hanya pindah ke belakang).
2. Buka lagi. Bila masih lama, tarik ke bawah untuk reload.

**Cara paksa (Chrome di Android/PC)**
1. Buka aplikasi → menu **⋮** → **Setelan situs** → **Hapus data** / **Hapus cache**.
2. Buka lagi https://zerokero1.github.io/resto-kasir/ lalu login.

**Cara paling bersih (PC, sekali saja)**
1. Tekan **F12** → tab **Application**.
2. **Service Workers** → **Unregister**.
3. **Storage** → **Clear site data**.
4. Tutup tab, buka lagi alamat aplikasi.

### Muncul tulisan "Fitur PIN belum aktif"
Database belum menjalankan migrasi PIN. Admin perlu menjalankan
`supabase/migrasi-pin-edit.sql` di **Supabase → SQL Editor** (lihat bagian 15).

### "PIN salah" padahal yakin benar
- Pastikan hanya angka, tanpa spasi.
- PIN awal `1234`; bila pernah diganti, tanyakan ke admin.
- Bila lupa PIN, admin bisa menggantinya lewat SQL (bagian 5).

### Data tidak muncul / angka Rp 0
1. Cek koneksi internet.
2. Pastikan tanggal/rentang yang dipilih benar.
3. Muat ulang halaman.
4. Bila hanya satu halaman yang error, buka halaman lain — aplikasi tetap bisa dipakai.

### Login terus diminta
Login bertahan sekitar seminggu. Setelah itu masukkan email & sandi lagi. Jangan gunakan
mode Incognito/Private karena login tidak tersimpan.

### Nota tidak bisa diedit / tombol Edit tidak ada
Pastikan aplikasi sudah versi terbaru (bagian 13 "versi lama"). Bila tetap tidak ada,
migrasi PIN belum dijalankan di server.

---

## 14. Aturan data yang perlu diingat

1. **Jangan menghapus nota** kecuali memang batal. Gunakan **✕ Batalkan** agar stok kembali.
2. **Edit transaksi mengubah laporan** — laporan hari itu langsung ikut berubah.
3. **Tanggal memakai WIB.** Nota setelah tengah malam tetap masuk tanggal yang benar.
4. **Harga di nota tidak berubah** walau harga menu diubah kemudian.
5. **Stok otomatis** hanya seakurat resepnya. Perbaiki resep bila pemakaian bahan tidak cocok.
6. **Satu nota = satu metode bayar.** Pembayaran campuran gunakan **Split Bill**.
7. **Belum Bayar** tidak dihitung sebagai uang masuk di laporan kas (kolomnya terpisah).

---

## 15. Untuk teknisi / admin sistem

### Struktur singkat
- Frontend: React + Vite + PWA, di-deploy ke GitHub Pages.
- Database: Supabase (PostgreSQL + REST/PostgREST).
- Repo: `D:\resto-kasir` → GitHub `zerokero1/resto-kasir` (branch `main`).
- Deploy otomatis: `.github/workflows/pages.yml` setiap push ke `main`.

### Menjalankan di komputer
```powershell
cd D:\resto-kasir
npm install
npm run dev        # pengembangan
npm run build      # produksi ke folder dist
```

### Deploy
```powershell
cd D:\resto-kasir
npm run build
git add -A
git commit -m "pesan perubahan"
git push origin main
gh run list --workflow=pages.yml --limit 1
```
Tunggu workflow **Deploy to GitHub Pages** selesai (centang hijau), lalu buka PWA.
Bila PWA masih memuat versi lama, lakukan pembersihan cache di bagian 13.

### Migrasi database yang wajib
- `supabase/schema.sql` — struktur lengkap untuk instalasi baru.
- `supabase/migrasi-pin-edit.sql` — **wajib** untuk fitur Edit + PIN pada database yang
  sudah berjalan. Isinya:
  - tabel `resto_pengaturan` (PIN tersimpan, RLS aktif tanpa policy select),
  - fungsi `cek_pin_admin(pin)` — verifikasi tanpa mengirim PIN ke klien,
  - fungsi `ganti_pin_admin(pin_lama, pin_baru)`,
  - PIN awal `1234`.

Jalankan di **Supabase → SQL Editor → New query → Run**. Setelah itu uji:

```sql
select public.cek_pin_admin('1234');  -- harus true
select public.cek_pin_admin('0000');  -- harus false
```

### Keamanan PIN
- PIN tidak pernah dikirim ke browser; verifikasi terjadi di database (`security definer`).
- Tabel `resto_pengaturan` tidak bisa dibaca lewat REST karena RLS aktif tanpa policy SELECT.
- Fungsi hanya bisa dipanggil dengan `execute` oleh `anon`/`authenticated`.
- PIN 4–6 angka; batasi akses SQL Editor hanya untuk admin.
- PIN adalah pengaman di sisi aplikasi (mencegah kasir mengoreksi nota tanpa izin).
  Karena aplikasi memakai kunci publik (anon key), orang yang paham teknis dan memegang
  kunci itu masih bisa menulis langsung ke API. Untuk keamanan tingkat lanjut, aktifkan
  RLS ketat + Supabase Auth dan batasi `insert/update/delete` hanya untuk pengguna login.

### Catatan teknis penting
- PostgREST membatasi **1.000 baris per permintaan**; laporan memakai paginasi
  (`ambilSemua`) agar rekap >1.000 nota tidak terpotong.
- Tanggal disimpan UTC, ditampilkan WIB (offset +7 jam).
- Diskon mengurangi dasar sebelum pajak 3% EDC.
- Edit transaksi menyesuaikan stok dari selisih qty item.

### Backup
- Supabase → **Database → Backups** (sesuai paket) atau ekspor tabel lewat SQL.
- Simpan salinan file Excel laporan bulanan sebagai cadangan tambahan.

---

## 16. Ringkasan cepat (tempel di dekat kasir)

1. **Buka aplikasi** → login → 🛒 Kasir.
2. **Ketuk menu** → atur qty → **Bayar**.
3. Pilih **Tunai / EDC (+3%) / QRIS** → isi uang → **Bayar & Lunas** → cetak.
4. Pelanggan belum bayar? **Simpan Saja** → nanti dibayar di ⏳ Belum Bayar.
5. Salah input? **Riwayat → ✏️ Edit → PIN admin** → perbaiki → **Simpan Perubahan**.
6. Cek uang harian? **🗓️ Harian** atau **📊 Laporan → Laporan Kas**.
7. Aplikasi aneh / versi lama? **Tutup total → buka lagi**; bila tetap, hapus cache (bagian 13).
