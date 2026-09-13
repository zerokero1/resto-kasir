-- CETAK OTOMATIS KE PRINTER THERMAL via aplikasi "Bluetooth Print" (mate.bluetoothprint)
-- Jalankan sekali di SQL Editor proyek Supabase resto-kasir.
-- URL GET (bukan POST) yang dibaca Bluetooth Print:
--   https://voemheywaxhpgfzajgxi.supabase.co/rest/v1/v_struk?nota_id=eq.<ID>&select=type,content,bold,align,format&order=urut&apikey=<ANON KEY>

drop view if exists public.v_struk cascade;

create or replace view public.v_struk as
with nota as (
  select id,
         tanggal at time zone 'Asia/Jakarta' as tgl_local,
         nama_kasir, lunas, metode, bayar, kembalian, total
  from resto_pesanan
),
r as (
  -- header
  select id as nota_id, 0 as urut, 0 as type, 'DAYANG RESTO'::text as content, 1 as bold, 1 as align, 3 as format from nota
  union all select id, 1, 0, 'Jl. Raya Dayang, Pangkalan Karang', 0, 1, 4 from nota
  union all select id, 2, 0, id, 0, 0, 0 from nota
  union all select id, 3, 0, to_char(tgl_local, 'DD-MM-YYYY HH24:MI'), 0, 0, 0 from nota
  union all select id, 4, 0, 'Kasir: ' || coalesce(nama_kasir, '-'), 0, 0, 0 from nota
  union all select id, 5, 0, '================================', 0, 0, 0 from nota

  -- item: nama
  union all
  select i.pesanan_id, 100 + i.id::int * 2, 0,
         rtrim(rtrim(to_char(i.qty, 'FM999.99'), '0'), '.') || ' ' || i.nama,
         0, 0, 0
  from resto_pesanan_item i

  -- item: harga
  union all
  select i.pesanan_id, 101 + i.id::int * 2, 0,
         replace(to_char(i.subtotal, 'FM999G999G999'), ',', '.'),
         0, 2, 0
  from resto_pesanan_item i

  -- total
  union all select id, 500, 0, '================================', 0, 0, 0 from nota
  union all select id, 501, 0, 'TOTAL', 1, 0, 3 from nota
  union all select id, 502, 0, replace(to_char(total, 'FM999G999G999'), ',', '.'), 1, 2, 3 from nota

  -- pembayaran (hanya jika lunas)
  union all
  select id, 510, 0,
         'Metode: ' || case metode when 'tunai' then 'Tunai' when 'qris' then 'QRIS' when 'debit' then 'Kartu/Cardless' else coalesce(metode, '-') end,
         0, 0, 0
  from nota where lunas = true
  union all select id, 511, 0, 'Bayar: '    || replace(to_char(bayar,     'FM999G999G999'), ',', '.'), 0, 0, 0 from nota where lunas = true
  union all select id, 512, 0, 'Kembalian: ' || replace(to_char(kembalian, 'FM999G999G999'), ',', '.'), 0, 0, 0 from nota where lunas = true

  -- footer
  union all select id, 520, 0, '================================', 0, 0, 0 from nota
  union all select id, 521, 0, 'Terima kasih', 0, 1, 0 from nota
  union all select id, 522, 0, 'Semoga harimu menyenangkan', 0, 1, 0 from nota
  union all select id, 523, 0, ' ', 0, 0, 0 from nota
)
select * from r;

grant select on public.v_struk to anon, authenticated;

-- Uji cepat (opsional):
--   select type, content, bold, align from public.v_struk where nota_id = 'TRX-20260913-010' order by urut;