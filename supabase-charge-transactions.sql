-- =========================================================
-- NOTA CHARGE MOTOR — setup tabel riwayat transaksi
-- Jalankan di Supabase SQL Editor (project yang sama dengan OMB Absensi)
-- Tabel ini BARU, tidak menyentuh tabel/kolom yang sudah ada
-- (anggota_omb, anggota_omb_public, events, event_sessions, attendance)
-- =========================================================

create table if not exists public.charge_transactions (
  id uuid primary key default gen_random_uuid(),
  nota_number bigint generated always as identity,
  member_id text not null,
  member_nama text not null,
  kwh numeric(10,2) not null check (kwh > 0),
  tarif numeric(12,2) not null check (tarif > 0),
  total numeric(14,2) not null,
  business_name text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_charge_transactions_member
  on public.charge_transactions (member_id);

alter table public.charge_transactions enable row level security;

-- Hanya admin (app_metadata.role = 'admin') yang boleh baca riwayat transaksi
drop policy if exists "Admin can select charge_transactions" on public.charge_transactions;
create policy "Admin can select charge_transactions"
  on public.charge_transactions for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Hanya admin yang boleh membuat nota baru
drop policy if exists "Admin can insert charge_transactions" on public.charge_transactions;
create policy "Admin can insert charge_transactions"
  on public.charge_transactions for insert
  to authenticated
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Catatan:
-- - created_by terisi otomatis dari auth.uid() lewat default kolom, aplikasi
--   tidak perlu mengirim field ini saat insert
-- - Tidak ada policy update/delete: nota tidak bisa diedit/dihapus dari aplikasi
--   (by design, seperti nota fisik). Kalau perlu koreksi, lakukan manual lewat SQL Editor.
