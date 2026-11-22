import { supabase } from './supabase';
import { ambilSemua } from './laporanService';
import { todayStr } from './format';

/**
 * Halaman Absensi memakai tabel resto_absensi yang sudah ada. Tabel produksi
 * TIDAK punya unique constraint untuk (karyawan_id, tanggal), jadi penulisan
 * memakai pola cari dulu: update bila baris ada, insert bila belum ada.
 * Tidak menambah kolom jam datang/pulang/shift supaya tidak perlu migrasi.
 */
export const STATUS_ABSENSI = [
  { value: 'hadir', label: 'Hadir', token: 'H' },
  { value: 'telat', label: 'Telat', token: 'T' },
  { value: 'sakit', label: 'Sakit', token: 'S' },
  { value: 'izin', label: 'Izin', token: 'I' },
  { value: 'alpha', label: 'Alpha', token: 'A' },
  { value: 'lembur', label: 'Lembur (lama)', token: 'L' }
];

export const TOKEN_STATUS = Object.fromEntries(STATUS_ABSENSI.map((s) => [s.value, s.token]));
export const LABEL_STATUS = Object.fromEntries(STATUS_ABSENSI.map((s) => [s.value, s.label]));

const HARI = ['Mi', 'Se', 'Sl', 'Rb', 'Km', 'Jm', 'Sb'];

function validTanggal(t) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(t || ''));
}

function cekStatus(status) {
  if (!STATUS_ABSENSI.some((s) => s.value === status)) throw new Error('Status absensi tidak valid.');
}

/** Daftar tanggal dalam satu bulan 'YYYY-MM', lengkap dengan nama hari WIB. */
export function hariBulan(bulan) {
  if (!/^\d{4}-\d{2}$/.test(String(bulan || ''))) return [];
  const [tahun, bulanAngka] = pecahBulan(bulan);
  const jumlah = new Date(Date.UTC(tahun, bulanAngka, 0)).getUTCDate();
  const hariIni = todayStr();
  const out = [];
  for (let d = 1; d <= jumlah; d++) {
    const tanggal = `${bulan}-${String(d).padStart(2, '0')}`;
    out.push({
      tanggal,
      hari: d,
      dow: HARI[new Date(`${tanggal}T00:00:00Z`).getUTCDay()],
      isToday: tanggal === hariIni
    });
  }
  return out;
}

function pecahBulan(bulan) {
  const [t, b] = bulan.split('-').map(Number);
  return [t, b];
}

export async function ambilKaryawanAbsensi() {
  const { data, error } = await supabase
    .from('resto_karyawan')
    .select('id, nama, jabatan')
    .eq('aktif', true)
    .order('nama', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function ambilAbsensiRentang(dari, sampai) {
  if (!validTanggal(dari) || !validTanggal(sampai)) return [];
  return ambilSemua(() => supabase
    .from('resto_absensi')
    .select('*, karyawan:karyawan_id(nama)')
    .gte('tanggal', dari)
    .lte('tanggal', sampai)
    .order('tanggal', { ascending: true }));
}

function barisAbsensi({ karyawanId, tanggal, status, menitLembur, catatan, userId }) {
  if (!karyawanId) throw new Error('Pilih karyawan dulu.');
  if (!validTanggal(tanggal)) throw new Error('Tanggal tidak valid.');
  cekStatus(status);
  return {
    karyawan_id: Number(karyawanId),
    tanggal,
    status,
    menit_lembur: Math.max(0, Number(menitLembur) || 0),
    catatan: String(catatan || '').trim() || null,
    user_id: userId || null
  };
}

/** Cari baris lama. DB tidak punya constraint unik, jadi ini wajib sebelum menulis. */
async function cariBaris(karyawanId, tanggal) {
  const { data, error } = await supabase
    .from('resto_absensi')
    .select('id')
    .eq('karyawan_id', Number(karyawanId))
    .eq('tanggal', tanggal);
  if (error) throw new Error(error.message);
  return data || [];
}

/** Update semua baris yang sudah ada, atau insert satu baris bila belum ada. */
async function tulisBaris(row, lama) {
  if (lama?.length) {
    const { error } = await supabase
      .from('resto_absensi')
      .update(row)
      .in('id', lama.map((r) => r.id));
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from('resto_absensi').insert(row);
  if (error) throw new Error(error.message);
}

export async function simpanAbsensi(args) {
  const row = barisAbsensi(args);
  await tulisBaris(row, await cariBaris(row.karyawan_id, row.tanggal));
}

export async function hapusAbsensi(karyawanId, tanggal) {
  if (!validTanggal(tanggal)) throw new Error('Tanggal tidak valid.');
  const { error } = await supabase
    .from('resto_absensi')
    .delete()
    .eq('karyawan_id', Number(karyawanId))
    .eq('tanggal', tanggal);
  if (error) throw new Error(error.message);
}

/** Isi satu tanggal untuk semua karyawan aktif (menimpa catatan lama). */
export async function isiSatuHari({ tanggal, status, karyawan, userId }) {
  if (!validTanggal(tanggal)) throw new Error('Tanggal tidak valid.');
  cekStatus(status);
  if (!karyawan?.length) return 0;
  const rows = karyawan.map((k) => barisAbsensi({
    karyawanId: k.id, tanggal, status, menitLembur: 0, catatan: '', userId
  }));
  const { data, error } = await supabase
    .from('resto_absensi')
    .select('id, karyawan_id')
    .eq('tanggal', tanggal)
    .in('karyawan_id', rows.map((r) => r.karyawan_id));
  if (error) throw new Error(error.message);
  const lama = new Map();
  for (const r of data || []) {
    const daftar = lama.get(r.karyawan_id) || [];
    daftar.push(r);
    lama.set(r.karyawan_id, daftar);
  }
  // Berurutan: menjaga RW tidak menimpa sendiri bila ada baris ganda lama.
  for (const row of rows) await tulisBaris(row, lama.get(row.karyawan_id));
  return rows.length;
}
