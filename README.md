# Nota Charge App V2

Web app kasir nota biaya jasa charge motor listrik, siap di-deploy ke GitHub Pages.
Versi V2 memperbaiki ketergantungan CDN dengan fallback beberapa CDN, memperketat
validasi payload QRIS, membersihkan file debug/temporary, dan memperbaiki proses
share nota.

## Struktur
- `index.html` — redirect login/kasir
- `login.html` — login operator admin
- `kasir.html` — buat nota, QR, dan share
- `riwayat.html` — riwayat member
- `supabase.js` — URL + anon key Supabase
- `js/vendor-loader.js` — fallback CDN untuk Supabase, QRCode, html2canvas
- `js/qris.js` — builder + validator TLV/CRC QRIS
- `js/kasir.js` — transaksi dan share nota
- `js/riwayat.js` — riwayat member
- `supabase-charge-transactions.sql` — setup tabel awal
- `supabase-charge-transactions-v2.sql` — migration V2

## Deploy GitHub Pages
1. Upload seluruh isi folder ini ke repository GitHub.
2. Settings → Pages → Deploy from branch → pilih branch utama + `/ (root)`.
3. Buka URL Pages dan login dengan akun Supabase yang mempunyai
   `app_metadata.role = admin`.

## Supabase
Jika tabel `charge_transactions` belum ada, jalankan:
`supabase-charge-transactions.sql`

Jika tabel versi lama sudah ada, jalankan:
`supabase-charge-transactions-v2.sql`

Jangan pernah memasukkan `service_role` key ke `supabase.js`.

## QRIS — penting
V2 membuat payload QR berdasarkan QRIS statis yang dikonfigurasi, mengubah
Point of Initiation Method menjadi `12`, memasukkan nominal pada Tag 54,
dan menghitung ulang CRC. Ini **bukan** API Dynamic QRIS resmi dari PJP/payment
gateway dan tidak menjamin transaksi akan diterima oleh semua aplikasi pembayaran.
Untuk produksi, gunakan Dynamic QRIS dari PJP/acquirer/payment gateway dan webhook.

V2 juga memvalidasi nominal, POI, dan CRC sebelum QR digambar.

## CDN
Aplikasi tidak bergantung pada satu CDN saja. `js/vendor-loader.js` mencoba
beberapa sumber untuk library frontend. Supabase tetap memerlukan koneksi internet
karena database/auth berada di cloud.

## Catatan transaksi
- Nomor nota dibuat oleh PostgreSQL identity sehingga aman dipakai dari beberapa perangkat.
- Tidak ada fitur edit/hapus nota dari UI.
- Status pembayaran V2 disiapkan di database, tetapi belum otomatis berubah menjadi
  `PAID` karena belum terhubung webhook payment gateway.

## Catatan V2
`payment_status` disimpan sebagai `UNPAID` saat nota dibuat. V2 belum otomatis
mengubahnya menjadi `PAID`; itu baru aman dilakukan setelah Dynamic QRIS resmi
terhubung ke webhook payment provider.
