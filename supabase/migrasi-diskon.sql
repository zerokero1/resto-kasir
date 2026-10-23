-- Migrasi: kolom diskon di setiap nota/pembayaran
-- Jalankan di Supabase SQL Editor (Database > SQL Editor > New query), lalu klik "Run"
alter table public.resto_pesanan
  add column if not exists diskon numeric(12,0) not null default 0;