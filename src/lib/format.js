// ---- Zona waktu usaha: WIB (UTC+7) ----
// Kolom `tanggal` di Supabase tersimpan sebagai UTC (new Date().toISOString()),
// sedangkan kasir thinks in tanggal lokal. Tanpa konversi, nota yang dibuat
// setelah tengah malam WIB (00:00-06:59) punya tanggal UTC "kemarin" sehingga
// hilang dari laporan hari itu dan masuk ke laporan sehari sebelumnya.
export const OFFSET_WIB_MS = 7 * 60 * 60 * 1000;

// Geser timestamptable UTC agaruggah terbaca sebagai waktu WIB,
// lalu format dengan timeZone:'UTC' supaya hasilnya sama di semua perangkat.
const keWib = (ts) => new Date(new Date(ts).getTime() + OFFSET_WIB_MS);

export function rupiah(n) {
  const v = Number(n) || 0;
  return 'Rp ' + v.toLocaleString('id-ID');
}

export const uang = rupiah;

export function angka(n) {
  return Number(n) || 0;
}

export const PAJAK_EDC_PERSEN = 3;

export function hitungPajakEdc(nilaiDasar, persen = PAJAK_EDC_PERSEN) {
  const dasar = Number(nilaiDasar) || 0;
  return Math.round(dasar * (1 + persen / 100));
}

export function fmtTgl(ts) {
  if (!ts) return '';
  const d = keWib(ts);
  return d.toLocaleDateString('id-ID', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('id-ID', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
}

export function jamTgl(ts) {
  if (!ts) return '';
  return keWib(ts).toLocaleTimeString('id-ID', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false });
}

export const METODE = { tunai: 'Tunai', qris: 'QRIS', debit: 'Kartu/Cardless', hutang: 'Belum Bayar' };
export function metodeLabel(m) {
  return METODE[m] || m;
}

/** Tanggal hari ini versi WIB — bukan zona waktu perangkat, supaya tidak bergeser. */
export function todayStr() {
  return tglWib(new Date().toISOString());
}

// ---- Zona waktu usaha: WIB (UTC+7) ----
// Lihat catatan OFFSET_WIB_MS di atas.

// 'YYYY-MM-DD' versi WIB -> rentang UTC [dari, sampai) untuk filter PostgREST
export function rentangUtcWib(tgl) {
  const awal = new Date(tgl + 'T00:00:00+07:00');
  return { dari: awal.toISOString(), sampai: new Date(awal.getTime() + 24 * 60 * 60 * 1000).toISOString() };
}

// timestamptable UTC -> tanggal 'YYYY-MM-DD' versi WIB
export function tglWib(tanggal) {
  if (!tanggal) return '';
  return new Date(new Date(tanggal).getTime() + OFFSET_WIB_MS).toISOString().slice(0, 10);
}

// timestamptable UTC -> jam (0-23) versi WIB
export function jamWib(tanggal) {
  if (!tanggal) return 0;
  return new Date(new Date(tanggal).getTime() + OFFSET_WIB_MS).getUTCHours();
}

export function hariIni() {
  return new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}