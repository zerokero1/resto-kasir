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
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function jamTgl(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export const METODE = { tunai: 'Tunai', qris: 'QRIS', debit: 'Kartu/Cardless', hutang: 'Belum Bayar' };
export function metodeLabel(m) {
  return METODE[m] || m;
}

export function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function hariIni() {
  return new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}