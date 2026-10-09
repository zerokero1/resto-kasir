-- Migrasi: tambah role 'boss' (hanya lihat Dashboard, Riwayat, Laporan)
-- Jalankan di Supabase SQL Editor (Database > SQL Editor > New query), lalu klik "Run"
do $$
declare c text;
begin
  for c in
    select conname
    from pg_constraint
    join pg_class on pg_class.oid = conrelid
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    join pg_attribute on pg_attribute.attrelid = pg_class.oid
                    and pg_attribute.attnum = any(conkey)
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'resto_users'
      and pg_attribute.attname = 'role'
      and contype = 'c'
  loop
    execute format('alter table public.resto_users drop constraint %I', c);
  end loop;
end $$;
alter table public.resto_users
  add constraint resto_users_role_check check (role in ('admin','kasir','boss'));