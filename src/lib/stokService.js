import { supabase } from './supabase';

export async function ambilBahan() {
  const { data, error } = await supabase
    .from('resto_produk')
    .select('*')
    .eq('jenis', 'bahan')
    .order('nama');
  if (error) throw new Error(error.message);
  return data;
}

export async function barangMasuk(bahanId, qty, catatan, userId) {
  const { error: e1 } = await supabase.from('resto_barang_masuk').insert({ bahan_id: bahanId, qty, catatan, user_id: userId });
  if (e1) throw new Error(e1.message);
  const { data: b } = await supabase.from('resto_produk').select('stok').eq('id', bahanId).single();
  const baru = (Number(b?.stok) || 0) + Number(qty);
  const { error: e2 } = await supabase.from('resto_produk').update({ stok: baru }).eq('id', bahanId);
  if (e2) throw new Error(e2.message);
}

export async function barangKeluar(bahanId, qty, alasan, userId) {
  const { data: b } = await supabase.from('resto_produk').select('stok').eq('id', bahanId).single();
  const stok = Number(b?.stok) || 0;
  if (qty > stok) throw new Error('Stok tidak cukup');
  const { error: e1 } = await supabase.from('resto_barang_keluar').insert({ bahan_id: bahanId, qty, alasan, user_id: userId });
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await supabase.from('resto_produk').update({ stok: stok - qty }).eq('id', bahanId);
  if (e2) throw new Error(e2.message);
}

export async function opname(bahanId, stokFisik, userId) {
  const { error: e1 } = await supabase.from('resto_opname').insert({ bahan_id: bahanId, stok_fisik: stokFisik, user_id: userId });
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await supabase.from('resto_produk').update({ stok: stokFisik }).eq('id', bahanId);
  if (e2) throw new Error(e2.message);
}

export async function mutasiBahan(bahanId) {
  const [masuk, keluar, op] = await Promise.all([
    supabase.from('resto_barang_masuk').select('*').eq('bahan_id', bahanId).order('tanggal', { ascending: false }).limit(50),
    supabase.from('resto_barang_keluar').select('*').eq('bahan_id', bahanId).order('tanggal', { ascending: false }).limit(50),
    supabase.from('resto_opname').select('*').eq('bahan_id', bahanId).order('tanggal', { ascending: false }).limit(50)
  ]);
  return {
    masuk: masuk.data || [],
    keluar: keluar.data || [],
    opname: op.data || []
  };
}