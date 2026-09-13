-- CETAK OTOMATIS KE PRINTER THERMAL via aplikasi "Bluetooth Print" (mate.bluetoothprint)
-- Jalankan sekali di SQL Editor proyek Supabase resto-kasir.
-- Membuat bucket penyimpanan "struk" (publik) tempat PWA menyimpan file JSON struk.
-- URL yang dibaca Bluetooth Print (GET, tanpa auth):
--   https://voemheywaxhpgfzajgxi.supabase.co/storage/v1/object/public/struk/<ID-NOTA>.json

insert into storage.buckets (id, name, public)
values ('struk', 'struk', true)
on conflict (id) do nothing;

drop policy if exists "struk_public_read" on storage.objects;
drop policy if exists "struk_insert" on storage.objects;
drop policy if exists "struk_update" on storage.objects;
drop policy if exists "struk_delete" on storage.objects;

create policy "struk_public_read" on storage.objects for select using (bucket_id = 'struk');
create policy "struk_insert"    on storage.objects for insert with check (bucket_id = 'struk');
create policy "struk_update"    on storage.objects for update using (bucket_id = 'struk');
create policy "struk_delete"    on storage.objects for delete using (bucket_id = 'struk');

-- Uji cepat (opsional): wajib mengembalikan 1 baris tanpa error
--   select id, bucket_id, name from storage.objects where bucket_id = 'struk' limit 1;