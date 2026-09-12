-- ============================================================
-- RESTO KASIR - Dayang Resto (Supabase)
-- Jalankan di: Dashboard Supabase -> SQL Editor -> New query -> Paste -> Run
--
-- SEBELUMNYA (sekali saja, 2 klik):
--   Dashboard -> Authentication -> Providers -> Email -> matikan "Confirm email"
--   (agar akun kasir yang dibuat via tombol "Tambah kasir" langsung bisa login)
--
-- Semua tabel memakai awalan resto_ agar tidak bentrok dengan aplikasi Dayang Spa.
-- ============================================================

-- ---------- USERS (relasi ke Supabase Auth) ----------
create table if not exists public.resto_users (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  role text not null default 'kasir' check (role in ('admin','kasir')),
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- PRODUK / MENU ----------
create table if not exists public.resto_produk (
  id bigserial primary key,
  nama text not null,
  kelompok text not null default 'Minuman',
  harga numeric(12,0) not null default 0,
  jenis text not null default 'menu' check (jenis in ('menu','bahan')),
  satuan text default 'porsi',
  stok numeric(12,2) not null default 0,
  stok_min numeric(12,2) not null default 0,
  aktif boolean not null default true,
  urutan int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- RESEP (menu -> bahan baku) ----------
create table if not exists public.resto_resep (
  id bigserial primary key,
  produk_id bigint not null references public.resto_produk(id) on delete cascade,
  bahan_id bigint not null references public.resto_produk(id) on delete cascade,
  qty numeric(12,2) not null default 1,
  created_at timestamptz not null default now()
);

-- ---------- PESANAN / TRANSAKSI ----------
create table if not exists public.resto_pesanan (
  id text primary key,
  tanggal timestamptz not null default now(),
  total numeric(12,0) not null default 0,
  bayar numeric(12,0) not null default 0,
  kembalian numeric(12,0) not null default 0,
  metode text not null default 'tunai' check (metode in ('tunai','qris','debit','hutang')),
  user_id uuid references public.resto_users(id),
  nama_kasir text,
  catatan text
);

create table if not exists public.resto_pesanan_item (
  id bigserial primary key,
  pesanan_id text not null references public.resto_pesanan(id) on delete cascade,
  produk_id bigint references public.resto_produk(id),
  nama text not null,
  harga numeric(12,0) not null default 0,
  qty numeric(12,2) not null default 1,
  subtotal numeric(12,0) not null default 0
);

-- ---------- STOK BAHAN ----------
create table if not exists public.resto_barang_masuk (
  id bigserial primary key,
  bahan_id bigint not null references public.resto_produk(id),
  qty numeric(12,2) not null default 0,
  tanggal timestamptz not null default now(),
  catatan text,
  user_id uuid references public.resto_users(id)
);

create table if not exists public.resto_barang_keluar (
  id bigserial primary key,
  bahan_id bigint not null references public.resto_produk(id),
  qty numeric(12,2) not null default 0,
  tanggal timestamptz not null default now(),
  alasan text,
  user_id uuid references public.resto_users(id)
);

create table if not exists public.resto_opname (
  id bigserial primary key,
  bahan_id bigint not null references public.resto_produk(id),
  stok_fisik numeric(12,2) not null default 0,
  tanggal timestamptz not null default now(),
  user_id uuid references public.resto_users(id)
);

-- ---------- KARYAWAN & ABSENSI ----------
create table if not exists public.resto_karyawan (
  id bigserial primary key,
  nama text not null,
  telp text default '',
  jabatan text default 'kasir',
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.resto_absensi (
  id bigserial primary key,
  karyawan_id bigint not null references public.resto_karyawan(id),
  tanggal date not null default current_date,
  status text not null check (status in ('hadir','sakit','izin','telat','alpha','lembur')),
  menit_lembur int not null default 0,
  catatan text,
  user_id uuid references public.resto_users(id)
);

-- ---------- RLS: semua role (anon) boleh akses tabel kasir ----------
-- (aplikasi ini internal; gerbang keamanan lewat login Auth)
alter table public.resto_users enable row level security;
alter table public.resto_produk enable row level security;
alter table public.resto_resep enable row level security;
alter table public.resto_pesanan enable row level security;
alter table public.resto_pesanan_item enable row level security;
alter table public.resto_barang_masuk enable row level security;
alter table public.resto_barang_keluar enable row level security;
alter table public.resto_opname enable row level security;
alter table public.resto_karyawan enable row level security;
alter table public.resto_absensi enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'resto_users','resto_produk','resto_resep','resto_pesanan','resto_pesanan_item',
    'resto_barang_masuk','resto_barang_keluar','resto_opname','resto_karyawan','resto_absensi'
  ] loop
    execute format('drop policy if exists "all_access_%s" on public.%I', t, t);
    execute format('create policy "all_access_%s" on public.%I for all using (true) with check (true)', t, t);
  end loop;
end $$;

-- ---------- SEED: akun admin awal ----------
-- Admin: admin@dayangresto.id / admin123
-- Kasir: kasir@dayangresto.id  / kasir123
do $$
declare
  v_admin uuid := gen_random_uuid();
  v_kasir uuid := gen_random_uuid();
begin
  if not exists (select 1 from auth.users where email = 'admin@dayangresto.id') then
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_admin, 'authenticated', 'authenticated',
      'admin@dayangresto.id',
      crypt('admin123', gen_salt('bf')),
      now(), now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid()::text, v_admin,
      jsonb_build_object('sub', v_admin::text, 'email', 'admin@dayangresto.id',
                         'email_verified', false, 'phone_verified', false),
      'email', now(), now(), now()
    );
    insert into public.resto_users (id, nama, role) values (v_admin, 'Admin', 'admin');
  end if;
  if not exists (select 1 from auth.users where email = 'kasir@dayangresto.id') then
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_kasir, 'authenticated', 'authenticated',
      'kasir@dayangresto.id',
      crypt('kasir123', gen_salt('bf')),
      now(), now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid()::text, v_kasir,
      jsonb_build_object('sub', v_kasir::text, 'email', 'kasir@dayangresto.id',
                         'email_verified', false, 'phone_verified', false),
      'email', now(), now(), now()
    );
    insert into public.resto_users (id, nama, role) values (v_kasir, 'Kasir', 'kasir');
  end if;
end $$;