-- TES SEMENTARA — jangan dibiarkan permanen, cuma untuk diagnosis.
-- Ini membuka izin insert tanpa syarat apa pun.
drop policy if exists "Admin can insert charge_transactions" on public.charge_transactions;
create policy "TEMP - buka semua insert"
  on public.charge_transactions for insert
  to authenticated
  with check (true);
