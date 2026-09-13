const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// URL JSON struk yang dibaca aplikasi "Bluetooth Print" (mate.bluetoothprint)
// PostgREST menerima apikey sebagai url param, jadi aman untuk GET tanpa header.
export function strukBtUrl(notaId) {
  return `${SUPABASE_URL}/rest/v1/rpc/struk_nota?pesanan_id=${encodeURIComponent(notaId)}&apikey=${encodeURIComponent(ANON_KEY)}`;
}

// Buka skema khusus Android agar aplikasi Bluetooth Print menangkap URL lalu mencetak otomatis.
// Tidak mengubah halaman (pakai iframe tersembunyi), jadi tetap aman di PWA.
export function bukaCetakBt(notaId) {
  try {
    const url = `my.bluetoothprint.scheme://${strukBtUrl(notaId)}`;
    const f = document.createElement('iframe');
    f.style.width = '0';
    f.style.height = '0';
    f.style.visibility = 'hidden';
    f.setAttribute('aria-hidden', 'true');
    f.src = url;
    document.body.appendChild(f);
    setTimeout(() => { if (f.parentNode) f.parentNode.removeChild(f); }, 5000);
    return true;
  } catch {
    return false;
  }
}