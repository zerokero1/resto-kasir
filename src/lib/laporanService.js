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

// Pemasukan per periode (menu: 'harian' | 'mingguan' | 'bulanan') untuk dashboard admin
export async function rekapPeriode(dari, sampai, mode) {
  const harian = await rekapHarian(dari, sampai);
  const map = {};
  for (const h of harian) {
    const k = periodKey(h.tanggal + 'T00:00:00Z', mode);
    if (!map[k]) map[k] = { periode: k, jumlah: 0, total: 0, tunai: 0, qris: 0, debit: 0, hutang: 0 };
    const q = map[k];
    q.jumlah += h.jumlah;
    q.total += h.total;
    q.tunai += h.tunai;
    q.qris += h.qris;
    q.debit += h.debit;
    q.hutang += h.hutang;
  }
  return Object.values(map).sort((a, b) => a.periode.localeCompare(b.periode));
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

// Pemakaian bahan dari transaksi (closingan): Σ qty item × resep per bahan
export async function pemakaianTanggal(tgl) {
  const pesanan = await transaksiRentang(tgl, tgl);
  const nota = pesanan.length;
  const pendapatan = pesanan.reduce((s, p) => s + Number(p.total), 0);
  const items = pesanan.flatMap((p) => p.items || []);
  const menuIds = [...new Set(items.map((i) => i.produk_id).filter(Boolean))];
  if (!menuIds.length) return { nota, pendapatan, bahan: [] };

  const [{ data: resep }, { data: produk }] = await Promise.all([
    supabase.from('resto_resep').select('produk_id,bahan_id,qty').in('produk_id', menuIds),
    supabase.from('resto_produk').select('id,nama,satuan,stok').eq('jenis', 'bahan')
  ]);

  const usage = {};
  for (const it of items) {
    const q = Number(it.qty) || 1;
    for (const r of resep || []) {
      if (r.produk_id === it.produk_id) usage[r.bahan_id] = (usage[r.bahan_id] || 0) + (Number(r.qty) || 0) * q;
    }
  }
  const bmap = {};
  for (const b of produk || []) bmap[b.id] = b;

  const bahan = Object.entries(usage)
    .map(([id, qty]) => ({
      bahan_id: Number(id),
      nama: bmap[id]?.nama || '#' + id,
      satuan: bmap[id]?.satuan || '',
      qty,
      stok: Number(bmap[id]?.stok) || 0
    }))
    .sort((a, b) => b.qty - a.qty);
  return { nota, pendapatan, bahan };
}

/**
 * Pengeluaran Stok harian:
 *  - keluar : dihitung otomatis dari penjualan makanan/minuman (orders × resep)
 *  - masuk  : inputan pembelian barang per hari (resto_barang_masuk)
 *  - sisa   : stok bahan baku saat ini (resto_produk.stok)
 * Mengembalikan array per tanggal: { tanggal, masuk, keluar, bahan:[{nama,satuan,masuk,keluar,sisa}] }
 */
export async function pengeluaranStokHarian(dari, sampai) {
  let resep = [];
  const [pesanan, masuk] = await Promise.all([
    transaksiRentang(dari, sampai),
    supabase
      .from('resto_barang_masuk')
      .select('bahan_id, qty, tanggal')
      .gte('tanggal', dari + 'T00:00:00')
      .lte('tanggal', sampai + 'T23:59:59')
  ]);
  if (masuk.error) throw new Error(masuk.error.message);

  const items = pesanan.flatMap((p) =>
    (p.items || []).map((it) => ({ ...it, hari: (p.tanggal || '').slice(0, 10), q: Number(it.qty) || 1 }))
  );
  const menuIds = [...new Set(items.map((i) => i.produk_id).filter(Boolean))];
  if (menuIds.length) {
    const r = await supabase.from('resto_resep').select('produk_id,bahan_id,qty').in('produk_id', menuIds);
    if (r.error) throw new Error(r.error.message);
    resep = r.data || [];
  }
  const { data: bahanList } = await supabase.from('resto_produk').select('id,nama,satuan,stok').eq('jenis', 'bahan');
  const bmap = {};
  for (const b of bahanList || []) bmap[b.id] = b;

  const keluarPer = {};
  for (const it of items) {
    for (const r of resep) {
      if (r.produk_id === it.produk_id) {
        if (!keluarPer[it.hari]) keluarPer[it.hari] = {};
        keluarPer[it.hari][r.bahan_id] = (keluarPer[it.hari][r.bahan_id] || 0) + (Number(r.qty) || 0) * it.q;
      }
    }
  }

  const masukPer = {};
  for (const m of masuk.data || []) {
    const hari = (m.tanggal || '').slice(0, 10);
    if (!masukPer[hari]) masukPer[hari] = {};
    masukPer[hari][m.bahan_id] = (masukPer[hari][m.bahan_id] || 0) + (Number(m.qty) || 0);
  }

  const hariSet = new Set([...Object.keys(keluarPer), ...Object.keys(masukPer)]);
  return [...hariSet]
    .sort()
    .map((hari) => {
      const ids = new Set([...Object.keys(keluarPer[hari] || {}), ...Object.keys(masukPer[hari] || {})]);
      const bahan = [...ids]
        .map((id) => {
          const b = bmap[id] || { nama: '#' + id, satuan: '' };
          return {
            bahan_id: Number(id),
            nama: b.nama,
            satuan: b.satuan || '',
            masuk: Number(masukPer[hari]?.[id]) || 0,
            keluar: Number(keluarPer[hari]?.[id]) || 0,
            sisa: Number(b.stok) || 0
          };
        })
        .sort((a, b) => b.keluar - a.keluar || b.masuk - a.masuk);
      const j = { masuk: 0, keluar: 0 };
      for (const x of bahan) { j.masuk += x.masuk; j.keluar += x.keluar; }
      return { tanggal: hari, ...j, bahan };
    });
}