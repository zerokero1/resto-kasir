-- MIGRASI: kolom status lunas (jalankan di SQL Editor proyek resto-kasir)
alter table public.resto_pesanan add column if not exists lunas boolean not null default false;
alter table public.resto_pesanan add column if not exists tanggal_lunas timestamptz;
update public.resto_pesanan set lunas = true, tanggal_lunas = coalesce(tanggal_lunas, now()) where metode <> 'hutang';