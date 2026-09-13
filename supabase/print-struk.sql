-- CETAK OTOMATIS KE PRINTER THERMAL via aplikasi "Bluetooth Print" (mate.bluetoothprint)
-- Jalankan sekali di SQL Editor proyek Supabase resto-kasir.
-- Fungsi ini menghasilkan JSON struk per nota, dibaca dari URL:
--   https://voemheywaxhpgfzajgxi.supabase.co/rest/v1/rpc/struk_nota?pesanan_id=<ID>&apikey=<ANON KEY>
-- lalu dipakai lewat:  my.bluetoothprint.scheme://<URL di atas>

drop function if exists public.struk_nota(text);

create or replace function public.struk_nota(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
  n record;
  r record;
  m text;
begin
  select * into n from public.resto_pesanan where id = p_id;
  if not found then
    return '[]'::jsonb;
  end if;

  v := '[]'::jsonb;
  v := v || jsonb_build_array(
    jsonb_build_object('type', 0, 'content', 'DAYANG RESTO', 'bold', 1, 'align', 1, 'format', 3),
    jsonb_build_object('type', 0, 'content', 'Jl. Raya Dayang, Pangkalan Karang', 'bold', 0, 'align', 1, 'format', 4),
    jsonb_build_object('type', 0, 'content', n.id, 'bold', 0, 'align', 0),
    jsonb_build_object('type', 0, 'content', to_char(n.tanggal at time zone 'Asia/Jakarta', 'DD-MM-YYYY HH24:MI'), 'bold', 0, 'align', 0),
    jsonb_build_object('type', 0, 'content', 'Kasir: ' || coalesce(n.nama_kasir, '-'), 'bold', 0, 'align', 0)
  );
  if coalesce(n.lunas, false) = false then
    v := v || jsonb_build_array(jsonb_build_object('type', 0, 'content', 'STATUS: BELUM DIBAYAR', 'bold', 1, 'align', 0));
  end if;
  v := v || jsonb_build_array(jsonb_build_object('type', 0, 'content', '================================', 'bold', 0, 'align', 0));

  for r in
    select nama, qty, subtotal
    from public.resto_pesanan_item
    where pesanan_id = p_id
    order by id
  loop
    v := v || jsonb_build_array(
      jsonb_build_object('type', 0, 'content',
        rtrim(rtrim(to_char(r.qty, 'FM999.99'), '0'), '.') || ' ' || r.nama,
        'bold', 0, 'align', 0),
      jsonb_build_object('type', 0, 'content',
        replace(to_char(r.subtotal, 'FM999G999G999'), ',', '.'),
        'bold', 0, 'align', 2)
    );
  end loop;

  v := v || jsonb_build_array(
    jsonb_build_object('type', 0, 'content', '================================', 'bold', 0, 'align', 0),
    jsonb_build_object('type', 0, 'content', 'TOTAL', 'bold', 1, 'align', 0, 'format', 3),
    jsonb_build_object('type', 0, 'content', replace(to_char(n.total, 'FM999G999G999'), ',', '.'), 'bold', 1, 'align', 2, 'format', 3)
  );

  if coalesce(n.lunas, false) = true then
    case n.metode
      when 'tunai' then m := 'Tunai';
      when 'qris' then m := 'QRIS';
      when 'debit' then m := 'Kartu/Cardless';
      else m := coalesce(n.metode, '-');
    end case;
    v := v || jsonb_build_array(
      jsonb_build_object('type', 0, 'content', 'Metode: ' || m, 'bold', 0, 'align', 0),
      jsonb_build_object('type', 0, 'content', 'Bayar: ' || replace(to_char(n.bayar, 'FM999G999G999'), ',', '.'), 'bold', 0, 'align', 0),
      jsonb_build_object('type', 0, 'content', 'Kembalian: ' || replace(to_char(n.kembalian, 'FM999G999G999'), ',', '.'), 'bold', 0, 'align', 0)
    );
  end if;

  v := v || jsonb_build_array(
    jsonb_build_object('type', 0, 'content', '================================', 'bold', 0, 'align', 0),
    jsonb_build_object('type', 0, 'content', 'Terima kasih', 'bold', 0, 'align', 1),
    jsonb_build_object('type', 0, 'content', 'Semoga harimu menyenangkan', 'bold', 0, 'align', 1),
    jsonb_build_object('type', 0, 'content', ' ', 'bold', 0, 'align', 0)
  );

  return v;
end $$;

grant execute on function public.struk_nota(text) to anon, authenticated;

-- Uji cepat (opsional) — harus mengembalikan array JSON dengan 2+ baris:
--   select public.struk_nota('TRX-20260913-001');