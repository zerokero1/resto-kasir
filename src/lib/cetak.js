const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// URL GET yang mengembalikan JSON array baris-baris struk.
// Bluetooth Print melakukan GET tanpa header, jadi apikey dikirim lewat query param.
// PostgREST mendukung filter view via GET → ?nota_id=eq.<ID>&select=...&order=...
export function strukBtUrl(notaId) {
  const base = `${SUPABASE_URL}/rest/v1/v_struk`;
  const params = new URLSearchParams({
    nota_id: `eq.${notaId}`,
    select: 'type,content,bold,align,format',
    order: 'urut',
    apikey: ANON_KEY
  });
  return `${base}?${params}`;
}

export function bukaCetakBt(notaId) {
  try {
    const url = `my.bluetoothprint.scheme://${strukBtUrl(notaId)}`;
    const f = document.createElement('iframe');
    f.style.cssText = 'width:0;height:0;border:0;visibility:hidden';
    f.src = url;
    document.body.appendChild(f);
    setTimeout(() => { if (f.parentNode) f.parentNode.removeChild(f); }, 5000);
    return true;
  } catch {
    return false;
  }
}