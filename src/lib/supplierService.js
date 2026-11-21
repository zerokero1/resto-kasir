import { supabase } from './supabase';

const TABEL = 'resto_pengeluaran_supplier';
const DEPT_PENGELUARAN = ['Kitchen', 'Coffee', 'Bar', 'Operasional'];

function pesanTabel(e) {
  const s = String(e || '');
  if (/Could not find the table|relation .* does not exist|schema cache/i.test(s)) {
    return 'Tabel pengeluaran supplier belum ada. Jalankan supabase/migrasi-pengeluaran-supplier.sql di SQL Editor Supabase.';
  }
  return s;
}

/**
 * Ambil semua catatan supplier (terbaru dulu). Dipakai halaman Supplier.
 * Memakai pagination karena PostgREST membatasi 1.000 baris per permintaan.
 */
export async function ambilPengeluaranSupplier() {
  const rows = await ambilPengeluaranSupplierLaporan();
  return rows.reverse();
}

/**
 * Ambil semua baris untuk laporan/unduhan, opsional dalam rentang tanggal.
 * PostgREST membatasi 1.000 baris per request, jadi diambil per halaman.
 */
export async function ambilPengeluaranSupplierLaporan(dari, sampai) {
  const hasil = [];
  const ukuran = 1000;
  let offset = 0;
  for (;;) {
    let q = supabase
      .from(TABEL)
      .select('*')
      .order('tanggal', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + ukuran - 1);
    if (dari) q = q.gte('tanggal', dari);
    if (sampai) q = q.lte('tanggal', sampai);
    const { data, error } = await q;
    if (error) throw new Error(pesanTabel(error.message));
    hasil.push(...(data || []));
    if (!data || data.length < ukuran) break;
    offset += ukuran;
  }
  return hasil;
}

/** Ambil rentang tanggal — dipakai Laporan Kas lewat laporanService. */
export async function ambilPengeluaranSupplierRentang(dari, sampai) {
  const { data, error } = await supabase
    .from(TABEL)
    .select('tanggal, departemen, nominal')
    .gte('tanggal', dari)
    .lte('tanggal', sampai);
  if (error) throw new Error(pesanTabel(error.message));
  return data || [];
}

function bersihkan(row) {
  const tanggal = String(row.tanggal || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error('Tanggal tidak valid.');
  const supplier = String(row.supplier || '').trim();
  const nama = String(row.nama || '').trim();
  if (!supplier) throw new Error('Nama supplier wajib diisi.');
  if (!nama) throw new Error('Nama barang/jasa wajib diisi.');
  if (!DEPT_PENGELUARAN.includes(row.departemen)) throw new Error('Departemen tidak valid.');
  const nominal = Number(row.nominal);
  if (!Number.isFinite(nominal) || nominal <= 0) throw new Error('Nominal harus lebih dari 0.');
  return {
    tanggal,
    supplier: supplier.slice(0, 120),
    departemen: row.departemen,
    nama: nama.slice(0, 160),
    qty: String(row.qty || '').trim().slice(0, 60) || '-',
    nominal: Math.round(nominal),
    catatan: String(row.catatan || '').trim().slice(0, 300) || null
  };
}

export async function tambahPengeluaranSupplier(row) {
  const { data, error } = await supabase.from(TABEL).insert(bersihkan(row)).select().single();
  if (error) throw new Error(pesanTabel(error.message));
  return data;
}

export async function ubahPengeluaranSupplier(id, row) {
  const { data, error } = await supabase
    .from(TABEL)
    .update(bersihkan(row))
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(pesanTabel(error.message));
  return data;
}

export async function hapusPengeluaranSupplier(id) {
  const { error } = await supabase.from(TABEL).delete().eq('id', id);
  if (error) throw new Error(pesanTabel(error.message));
}
