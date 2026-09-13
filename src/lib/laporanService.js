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

export function periodKey(ts, mode) {
  const s = String(ts).slice(0, 10);
  if (mode === 'harian') return s;
  if (mode === 'bulanan') return s.slice(0, 7);
  const d = new Date(ts);
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export async function mutasiStokBahan(dari, sampai) {
  const [m, k] = await Promise.all([
    supabase
      .from('resto_barang_masuk')
      .select('bahan_id, qty, tanggal, resto_produk(nama)')
      .gte('tanggal', dari + 'T00:00:00')
      .lte('tanggal', sampai + 'T23:59:59'),
    supabase
      .from('resto_barang_keluar')
      .select('bahan_id, qty, tanggal, resto_produk(nama)')
      .gte('tanggal', dari + 'T00:00:00')
      .lte('tanggal', sampai + 'T23:59:59')
  ]);
  if (m.error) throw new Error(m.error.message);
  if (k.error) throw new Error(k.error.message);
  return { masuk: m.data || [], keluar: k.data || [] };
}

export function agregasiMutasi({ masuk, keluar }, mode) {
  const periodeSet = new Set();
  const perBahan = {};

  function push(list, jenis) {
    for (const r of list) {
      const key = periodKey(r.tanggal, mode);
      periodeSet.add(key);
      const id = r.bahan_id;
      if (!perBahan[id]) perBahan[id] = { bahan_id: id, nama: r.resto_produk?.nama || '?', masuk: 0, keluar: 0, per: {} };
      if (!perBahan[id].per[key]) perBahan[id].per[key] = { masuk: 0, keluar: 0 };
      const q = Number(r.qty) || 0;
      if (jenis === 'masuk') { perBahan[id].masuk += q; perBahan[id].per[key].masuk += q; }
      else { perBahan[id].keluar += q; perBahan[id].per[key].keluar += q; }
    }
  }
  push(masuk, 'masuk');
  push(keluar, 'keluar');

  const periode = [...periodeSet].sort();
  const bahan = Object.values(perBahan).map((b) => ({
    ...b,
    per: Object.fromEntries(periode.map((p) => [p, b.per[p] || { masuk: 0, keluar: 0 }]))
  }));
  return { periode, bahan };
}