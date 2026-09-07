-- 1) Perbaiki policy SELECT (qual sebelumnya kosong/null, ini akar masalahnya)
drop policy if exists "Admin can select charge_transactions" on public.charge_transactions;
create policy "Admin can select charge_transactions"
  on public.charge_transactions for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 2) Kembalikan policy INSERT ke versi yang benar (tadi sempat dibuka penuh utk tes)
drop policy if exists "TEMP - buka semua insert" on public.charge_transactions;
drop policy if exists "Admin can insert charge_transactions" on public.charge_transactions;
create policy "Admin can insert charge_transactions"
  on public.charge_transactions for insert
  to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 3) Verifikasi: qual & with_check dua-duanya harus TERISI (bukan null)
select policyname, cmd, qual, with_check
from pg_policies
where tablename = 'charge_transactions';
