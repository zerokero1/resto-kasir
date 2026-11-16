-- ============================================================
-- PIN ADMIN untuk Edit Transaksi
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

-- Tabel pengaturan (PIN disimpan di sini, TIDAK bisa dibaca lewat REST biasa
-- karena RLS aktif tanpa policy select).
create table if not exists public.resto_pengaturan (
  kunci text primary key,
  nilai text not null,
  updated_at timestamptz not null default now()
);

insert into public.resto_pengaturan (kunci, nilai)
values ('pin_admin', '1234')
on conflict (kunci) do nothing;

alter table public.resto_pengaturan enable row level security;

-- Verifikasi PIN tanpa pernah mengirim PIN tersimpan ke aplikasi.
create or replace function public.cek_pin_admin(pin text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.resto_pengaturan
    where kunci = 'pin_admin' and nilai = pin
  );
$$;

revoke all on function public.cek_pin_admin(text) from public;
grant execute on function public.cek_pin_admin(text) to anon, authenticated;

-- Ganti PIN (butuh PIN lama). PIN baru harus 4-6 angka.
create or replace function public.ganti_pin_admin(pin_lama text, pin_baru text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if pin_baru !~ '^[0-9]{4,6}$' then
    raise exception 'PIN baru harus 4-6 angka';
  end if;
  if not exists (
    select 1 from public.resto_pengaturan
    where kunci = 'pin_admin' and nilai = pin_lama
  ) then
    return false;
  end if;
  update public.resto_pengaturan
     set nilai = pin_baru, updated_at = now()
   where kunci = 'pin_admin';
  return true;
end;
$$;

revoke all on function public.ganti_pin_admin(text, text) from public;
grant execute on function public.ganti_pin_admin(text, text) to anon, authenticated;

-- Cek hasil
select kunci, nilai from public.resto_pengaturan where kunci = 'pin_admin';
