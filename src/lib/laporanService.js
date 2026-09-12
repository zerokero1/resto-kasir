import { supabase } from './supabase';

export async function laporanStok() {
  const { data, error } = await supabase
    .from('resto_produk')
    .select('*')
    .order('jenis')
    .order('nama', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function transaksiTanggal(tgl) {
  const { data, error } = await supabase
    .from('resto_pesanan')
    .select('*')
    .gte('tanggal', tgl + 'T00:00:00')
    .lt('tanggal', tgl + 'T23:59:59')
    .order('tanggal', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function transaksiRentang(dari, sampai) {
  const { data, error } = await supabase
    .from('resto_pesanan')
    .select('*, items:resto_pesanan_item(*)')
    .gte('tanggal', dari + 'T00:00:00')
    .lte('tanggal', sampai + 'T23:59:59')
    .order('tanggal', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function rekapHarian(dari, sampai) {
  const { data, error } = await supabase.from('resto_pesanan').select('tanggal, total, metode').gte('tanggal', dari + 'T00:00:00').lte('tanggal', sampai + 'T23:59:59');
  if (error) throw new Error(error.message);
  const map = {};
  for (const p of data) {
    const k = p.tanggal.slice(0, 10);
    if (!map[k]) map[k] = { tanggal: k, jumlah: 0, total: 0, tunai: 0, qris: 0, debit: 0, hutang: 0 };
    const q = map[k];
    q.jumlah += 1;
    q.total += Number(p.total) || 0;
    if (q[p.metode] !== undefined) q[p.metode] += Number(p.total) || 0;
  }
  return Object.values(map).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

export async function absensiRentang(dari, sampai) {
  const { data, error } = await supabase
    .from('resto_absensi')
    .select('*, karyawan:karyawan_id(nama)')
    .gte('tanggal', dari)
    .lte('tanggal', sampai)
    .order('tanggal', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}