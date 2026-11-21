-- Halaman "Pengeluaran Supplier": catatan pembayaran/belanja ke supplier.
-- Tabel ini sengaja dipisah dari resto_pengeluaran (data impor + MANUAL_KAS)
-- supaya tidak dobel hitung dengan tombol Simpan di Laporan Kas.
-- Jalankan sekali di Supabase → SQL Editor → New query → Run. Aman diulang.

create table if not exists public.resto_pengeluaran_supplier (
  id bigint generated always as identity primary key,
  tanggal date not null,
  supplier text not null,
  departemen text not null default 'Operasional'
    check (departemen in ('Kitchen', 'Coffee', 'Bar', 'Operasional')),
  nama text not null,
  qty text,
  nominal numeric not null default 0 check (nominal >= 0),
  catatan text,
  created_at timestamptz not null default now()
);

create index if not exists idx_resto_pengeluaran_supplier_tanggal
  on public.resto_pengeluaran_supplier (tanggal);

alter table public.resto_pengeluaran_supplier enable row level security;

-- Hanya user login (token Supabase Auth) yang boleh membaca/menulis.
revoke all on public.resto_pengeluaran_supplier from anon;
grant select, insert, update, delete on public.resto_pengeluaran_supplier to authenticated;

drop policy if exists "pengeluaran supplier authenticated" on public.resto_pengeluaran_supplier;
create policy "pengeluaran supplier authenticated"
  on public.resto_pengeluaran_supplier
  for all
  to authenticated
  using (true)
  with check (true);
