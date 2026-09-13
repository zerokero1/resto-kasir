import { supabase } from './supabase';

export async function idPesananBaru() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const prefix = `TRX-${y}${m}${dd}-`;
  const { data, error } = await supabase
    .from('resto_pesanan')
    .select('id')
    .gte('id', prefix)
    .lt('id', prefix + '\uffff');
  if (error) throw new Error(error.message);
  const n = (data?.length ?? 0) + 1;
  return prefix + String(n).padStart(3, '0');
}

export async function simpanPesanan({ items, bayar, kembalian, metode, kasirId, namaKasir, catatan }) {
  const total = items.reduce((s, i) => s + (Number(i.harga) || 0) * (Number(i.qty) || 1), 0);
  const id = await idPesananBaru();

  const { data: pesanan, error } = await supabase
    .from('resto_pesanan')
    .insert({
      id,
      total,
      bayar: bayar ?? total,
      kembalian: kembalian ?? 0,
      metode,
      user_id: kasirId,
      nama_kasir: namaKasir,
      catatan: catatan || null,
      lunas: metode !== 'hutang',
      tanggal_lunas: metode !== 'hutang' ? new Date().toISOString() : null
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const itemRows = items.map((i) => ({
    pesanan_id: id,
    produk_id: i.produk_id,
    nama: i.nama,
    harga: i.harga,
    qty: i.qty,
    subtotal: (Number(i.harga) || 0) * (Number(i.qty) || 1)
  }));
  const { error: e2 } = await supabase.from('resto_pesanan_item').insert(itemRows);
  if (e2) throw new Error(e2.message);

  await kurangiStokBahan(items);
  return pesanan;
}

async function kurangiStokBahan(items) {
  const menuIds = items.map((i) => i.produk_id).filter(Boolean);
  if (!menuIds.length) return;
  const { data: resep } = await supabase
    .from('resto_resep')
    .select('bahan_id, qty, produk_id')
    .in('produk_id', menuIds);
  if (!resep || !resep.length) return;

  const nat = items
    .filter((i) => i.produk_id)
    .map((i) => ({ pid: i.produk_id, qty: Number(i.qty) || 1 }));

  const usage = {};
  for (const r of resep) {
    for (const it of nat) {
      if (it.pid === r.produk_id) {
        usage[r.bahan_id] = (usage[r.bahan_id] || 0) + (Number(r.qty) || 0) * it.qty;
      }
    }
  }
  for (const [bahanId, qty] of Object.entries(usage)) {
    const { data: b } = await supabase.from('resto_produk').select('stok').eq('id', bahanId).single();
    if (!b) continue;
    const baru = Math.max(0, (Number(b.stok) || 0) - qty);
    await supabase.from('resto_produk').update({ stok: baru }).eq('id', bahanId);
  }
}