import { supabase } from './supabase';

export const KELOMPOK_POS = ['Makanan', 'Minuman', 'Snack', 'Dessert'];

/**
 * Sequence `id` di resto_produk tertinggal di belakang data (data sudah di-seed
 * dengan id manual), sehingga insert tanpa id eksplisit ditolak PostgreSQL dengan
 * 23505 duplicate key. Jadi id dihitung dari id tertinggi yang ada, lalu dirotasi
 * bila ternyata bentrok dengan penulisan bersamaan.
 */
export async function idProdukBaru() {
  const { data, error } = await supabase.from('resto_produk').select('id').order('id', { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  return (Number(data?.[0]?.id) || 0) + 1;
}

async function urutanBaru() {
  const { data, error } = await supabase.from('resto_produk').select('urutan').order('urutan', { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  return (Number(data?.[0]?.urutan) || 0) + 1;
}

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
  // `urutan` hanya diisi bila pemanggil tidak menetapkannya sendiri.
  const isi = { ...p };
  if (isi.urutan === undefined || isi.urutan === null || isi.urutan === '') isi.urutan = await urutanBaru();

  let pesanError = '';
  for (let percobaan = 1; percobaan <= 6; percobaan++) {
    const { data, error } = await supabase.from('resto_produk').insert({ id: await idProdukBaru(), ...isi }).select().single();
    if (!error) return data;
    pesanError = error.message;
    if (error.code !== '23505') break;
  }
  throw new Error(pesanError || 'Gagal menyimpan produk.');
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