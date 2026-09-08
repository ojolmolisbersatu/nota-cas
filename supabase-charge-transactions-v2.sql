-- NOTA CHARGE V2 - migration aman untuk tabel charge_transactions yang sudah ada.
-- Jalankan setelah supabase-charge-transactions.sql dari versi awal.

alter table public.charge_transactions
  add column if not exists payment_status text not null default 'UNPAID'
    check (payment_status in ('UNPAID','PAID','EXPIRED','CANCELLED')),
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists qris_payload text,
  add column if not exists qris_expires_at timestamptz,
  add column if not exists paid_at timestamptz;

create index if not exists idx_charge_transactions_payment_status
  on public.charge_transactions (payment_status);

-- Perbaiki policy agar hanya admin yang boleh membaca/membuat transaksi.
drop policy if exists "Admin can select charge_transactions" on public.charge_transactions;
create policy "Admin can select charge_transactions"
  on public.charge_transactions for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin can insert charge_transactions" on public.charge_transactions;
create policy "Admin can insert charge_transactions"
  on public.charge_transactions for insert
  to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Tidak ada UPDATE/DELETE policy dari aplikasi.
