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
  if (!tgl) return [];
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
  if (!dari || !sampai) return [];
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
  if (!dari || !sampai) return [];
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
  if (!dari || !sampai) return [];
  const { data, error } = await supabase
    .from('resto_absensi')
    .select('*, karyawan:karyawan_id(nama)')
    .gte('tanggal', dari)
    .lte('tanggal', sampai)
    .order('tanggal', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export const BAGIAN_PENDAPATAN = ['Kitchen', 'Bar', 'Kopi'];

const KELOMPOK_BAR = new Set(['Smoothie Bowl', 'Minuman', 'Mineral Water']);
const KELOMPOK_KOPI = new Set([
  'Espresso', 'Milk Coffee', 'Flavored Latte', 'Coffee + Chocolate', 'Matcha',
  'Smoothies', 'Juice', 'Milkshake', 'Tea'
]);

export function kelompokKeBagian(kelompok) {
  if (KELOMPOK_BAR.has(kelompok)) return 'Bar';
  if (KELOMPOK_KOPI.has(kelompok)) return 'Kopi';
  return 'Kitchen';
}

function rekapPendapatan(pesanan) {
  const res = {
    totalRevenue: 0, totalTanpaPajak: 0, totalPajak3: 0,
    jumlahNota: 0, itemTerjual: 0,
    bagian: { Kitchen: 0, Bar: 0, Kopi: 0 },
    jumlahItem: { Kitchen: 0, Bar: 0, Kopi: 0 },
    perKelompok: [],
    metode: { tunai: 0, qris: 0, debit: 0, hutang: 0 },
    jumlahMetode: { tunai: 0, qris: 0, debit: 0, hutang: 0 }
  };
  if (!pesanan.length) return res;

  const perKelompok = {};
  for (const p of pesanan) {
    res.jumlahNota += 1;
    const totalNota = Number(p.total) || 0;
    const items = p.items || [];
    const totalItem = items.reduce((s, it) => s + (Number(it.subtotal) || 0), 0);
    const pajak = p.metode === 'debit' ? Math.max(0, totalNota - totalItem) : 0;

    res.totalRevenue += totalNota;
    res.totalPajak3 += pajak;
    res.totalTanpaPajak += totalNota - pajak;
    res.itemTerjual += items.length;
    if (res.metode[p.metode] !== undefined) {
      res.metode[p.metode] += totalNota;
      res.jumlahMetode[p.metode] += 1;
    }

    for (const it of items) {
      const kelompok = p._mapProduk?.[it.produk_id]?.kelompok || 'Kitchen';
      const bagian = kelompokKeBagian(kelompok);
      const sub = Number(it.subtotal) || 0;
      const qty = Number(it.qty) || 0;
      res.bagian[bagian] += sub;
      res.jumlahItem[bagian] += qty;
      if (!perKelompok[kelompok]) perKelompok[kelompok] = { kelompok, bagian, omzet: 0, qty: 0 };
      perKelompok[kelompok].omzet += sub;
      perKelompok[kelompok].qty += qty;
    }
  }
  res.perKelompok = Object.values(perKelompok).sort((a, b) => b.omzet - a.omzet);
  return res;
}

async function ambilPesananBerisiItems(dari, sampai) {
  const pesanan = await transaksiRentang(dari, sampai);
  if (!pesanan.length) return [];
  const { data: produk } = await supabase.from('resto_produk').select('id,nama,kelompok').eq('jenis', 'menu');
  const mapProduk = {};
  for (const x of produk || []) mapProduk[x.id] = x;
  return pesanan.map((p) => ({ ...p, _mapProduk: mapProduk }));
}

export async function pendapatanPerBagian(dari, sampai) {
  if (!dari || !sampai) return rekapPendapatan([]);
  return rekapPendapatan(await ambilPesananBerisiItems(dari, sampai));
}

/** Laporan satu hari: rekap harian + rincian per bagian + daftar transaksi. */
export async function laporanHarian(tgl) {
  if (!tgl) return { ...rekapPendapatan([]), tanggal: tgl, pesanan: [], perJam: [] };
  const enriched = await ambilPesananBerisiItems(tgl, tgl);
  const res = rekapPendapatan(enriched);
  const perJam = {};
  for (const p of enriched) {
    const jam = p.tanggal ? new Date(p.tanggal).getHours() : 0;
    const jamKey = String(jam).padStart(2, '0');
    if (!perJam[jamKey]) perJam[jamKey] = { jam: jamKey, jumlah: 0, total: 0, totalTanpaPajak: 0, totalPajak3: 0 };
    const q = perJam[jamKey];
    const totalNota = Number(p.total) || 0;
    const totalItem = (p.items || []).reduce((s, it) => s + (Number(it.subtotal) || 0), 0);
    const pajak = p.metode === 'debit' ? Math.max(0, totalNota - totalItem) : 0;
    q.jumlah += 1;
    q.total += totalNota;
    q.totalPajak3 += pajak;
    q.totalTanpaPajak += totalNota - pajak;
  }
  return {
    ...res,
    tanggal: tgl,
    perJam: Object.values(perJam).sort((a, b) => a.jam.localeCompare(b.jam)),
    pesanan: enriched.map((p) => ({
      id: p.id, tanggal: p.tanggal, metode: p.metode, lunas: p.lunas,
      total: Number(p.total) || 0, bayar: Number(p.bayar) || 0,
      kembalian: Number(p.kembalian) || 0, nama_kasir: p.nama_kasir,
      item: (p.items || []).map((it) => ({
        nama: p._mapProduk?.[it.produk_id]?.nama || '#' + it.produk_id,
        kelompok: p._mapProduk?.[it.produk_id]?.kelompok || '-',
        bagian: kelompokKeBagian(p._mapProduk?.[it.produk_id]?.kelompok || 'Kitchen'),
        qty: Number(it.qty) || 0, subtotal: Number(it.subtotal) || 0
      }))
    }))
  };
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
  if (!dari || !sampai) return { masuk: [], keluar: [] };
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
  if (!tgl) return { nota: 0, pendapatan: 0, bahan: [] };
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
  if (!dari || !sampai) return [];
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