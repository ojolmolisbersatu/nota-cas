# Nota Charge Motor

Web app kasir nota biaya jasa charge motor listrik. Pakai project Supabase yang sama
dengan **OMB Absensi** (data member `anggota_omb_public`, login admin yang sama).

## Struktur
- `login.html` — login operator (akun admin OMB yang sama)
- `kasir.html` — buat nota: cari member, isi kWh & tarif, simpan, bagikan
- `riwayat.html` — cari member, lihat ringkasan & daftar semua transaksi charge-nya
- `supabase.js` — konfigurasi client Supabase (URL + anon key, sudah diisi)
- `supabase-charge-transactions.sql` — script tabel baru + RLS, **wajib dijalankan dulu**

## Setup

1. **Jalankan SQL** — buka Supabase SQL Editor pada project yang sama dengan OMB
   Absensi, jalankan isi `supabase-charge-transactions.sql`. Ini hanya menambah
   tabel baru `charge_transactions`, tidak mengubah tabel yang sudah ada.
2. **Deploy** — upload semua file ke repo GitHub baru, aktifkan GitHub Pages
   (branch utama, root folder), sama seperti OMB Absensi.
3. **Login** — buka `index.html`, login pakai akun admin OMB yang sudah ada
   (role `admin` di `app_metadata`). Tidak perlu bikin akun baru.

## Alur pemakaian
1. Operator login di `login.html`.
2. Di `kasir.html`: cari & pilih member (nama/ID), isi jumlah pemakaian (kWh) dan
   tarif jasa (default Rp 2.000/kWh, bisa diubah). Saat member dipilih, langsung
   muncul ringkasan riwayat singkat (sudah berapa kali & total kWh).
3. Klik **Buat Nota** → nomor nota otomatis (increment dari database, konsisten
   walau dipakai dari HP berbeda), nota tampil siap dibagikan lewat tombol **Bagikan**.
4. **Lihat Riwayat Member Ini** dari nota, atau **Cari Riwayat Member** dari halaman
   kasir, untuk buka `riwayat.html` — menampilkan ringkasan total & daftar lengkap
   semua transaksi charge member tersebut.

## Catatan
- Istilah di nota sengaja pakai "biaya jasa" / "tarif jasa", bukan "harga kWh/listrik"
  — kWh hanya ditampilkan sebagai keterangan dasar hitung.
- Nota tidak bisa diedit/dihapus dari aplikasi (seperti nota fisik). Kalau perlu
  koreksi data, lakukan manual lewat Supabase SQL Editor.
- Nama usaha di header nota tersimpan per-perangkat (localStorage), bukan di database.
