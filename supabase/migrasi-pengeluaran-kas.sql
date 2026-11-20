-- Tabel pendukung tombol 💾 Simpan di Laporan Kas.
-- Jalankan sekali di Supabase → SQL Editor → New query → Run.
-- Aman untuk dijalankan ulang (idempotent).

create table if not exists public.resto_pengeluaran (
  id bigint generated always as identity primary key,
  tanggal date not null,
  departemen text not null,
  nama text,
  qty text,
  nominal numeric not null default 0,
  catatan text,
  created_at timestamptz not null default now()
);

create index if not exists idx_resto_pengeluaran_tanggal
  on public.resto_pengeluaran (tanggal);

alter table public.resto_pengeluaran enable row level security;

-- Hanya user yang sudah login (token Supabase Auth) yang boleh membaca/menulis.
-- Kunci anon saja tidak cukup.
revoke all on public.resto_pengeluaran from anon;
grant select, insert, update, delete on public.resto_pengeluaran to authenticated;

drop policy if exists "pengeluaran kas authenticated" on public.resto_pengeluaran;
create policy "pengeluaran kas authenticated"
  on public.resto_pengeluaran
  for all
  to authenticated
  using (true)
  with check (true);
