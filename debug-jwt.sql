-- Fungsi sementara untuk debug: melihat persis apa yang dibaca Postgres
-- dari JWT sesi yang sedang login (dipanggil dari browser, bukan SQL Editor).
-- Aman dihapus lagi setelah selesai debug.

create or replace function public.debug_jwt()
returns jsonb
language sql
security invoker
as $$
  select auth.jwt();
$$;

grant execute on function public.debug_jwt() to authenticated;
