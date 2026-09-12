import { supabase } from './supabase';

export const KELOMPOK_POS = ['Makanan', 'Minuman', 'Snack', 'Dessert'];

export async function ambilProduk() {
  const { data, error } = await supabase
    .from('resto_produk')
    .select('*')
    .eq('aktif', true)
    .order('urutan', { ascending: true })
    .order('nama', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function ambilSemuaProduk() {
  const { data, error } = await supabase.from('resto_produk').select('*').order('nama');
  if (error) throw new Error(error.message);
  return data;
}

export async function tambahProduk(p) {
  const { data, error } = await supabase.from('resto_produk').insert(p).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProduk(id, patch) {
  const { data, error } = await supabase.from('resto_produk').update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function hapusProduk(id) {
  const { error } = await supabase.from('resto_produk').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function ambilResep() {
  const { data, error } = await supabase.from('resto_resep').select('*, produk:produk_id(nama), bahan:bahan_id(nama)');
  if (error) throw new Error(error.message);
  return data;
}

export async function aturResep(produkId, items) {
  const { error: del } = await supabase.from('resto_resep').delete().eq('produk_id', produkId);
  if (del) throw new Error(del.message);
  if (!items.length) return;
  const rows = items.map((b) => ({ produk_id: produkId, bahan_id: b.bahan_id, qty: b.qty }));
  const { error } = await supabase.from('resto_resep').insert(rows);
  if (error) throw new Error(error.message);
}