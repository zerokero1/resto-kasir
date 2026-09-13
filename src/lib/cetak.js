import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ============ Aplikasi "Bluetooth Print" (mate.bluetoothprint) ============
// Struk disimpan sebagai file JSON publik di Supabase Storage (bucket "struk"),
// jadi URL GET balikin PERSIS isi file tanpa header auth.
// File berisi JSON *object* ber-index ({"0":{...},"1":{...}}), bukan array —
// karena aplikasi Bluetooth Print mem-parse JSONObject (contoh PHP mereka
// memakai json_encode($arr, JSON_FORCE_OBJECT)).
export function strukBtUrl(notaId) {
  return `${SUPABASE_URL}/storage/v1/object/public/struk/${encodeURIComponent(notaId)}.json`;
}

// Simpan struk ke bucket "struk", lalu beri URL publik-nya.
// baris = [{ text, center, width }] — dipakai juga untuk ESC/POS.
export async function sinkronStruk(notaId, baris) {
  const obj = {};
  baris.forEach((r, i) => {
    obj[String(i)] = {
      type: 0,
      content: (r.text ?? '').replace(/\s+$/, ''),
      bold: r.bold ? 1 : 0,
      align: r.center ? 1 : 0,
      format: r.width ? 3 : 0
    };
  });
  const { error } = await supabase.storage
    .from('struk')
    .upload(`${notaId}.json`, JSON.stringify(obj), { upsert: true, contentType: 'application/json' });
  if (error) throw new Error('Gagal simpan struk: ' + error.message);
  return strukBtUrl(notaId);
}

export async function bukaCetakBt(notaId, baris) {
  try {
    const url = await sinkronStruk(notaId, baris);
    const f = document.createElement('iframe');
    f.style.cssText = 'width:0;height:0;border:0;visibility:hidden';
    f.src = `my.bluetoothprint.scheme://${url}`;
    document.body.appendChild(f);
    setTimeout(() => { if (f.parentNode) f.parentNode.removeChild(f); }, 5000);
    return true;
  } catch {
    return false;
  }
}

// ============ Web Bluetooth (langsung, tanpa aplikasi pihak ketiga) ============
const LAYANAN_VENDOR = [
  '000018ff-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffb0-0000-1000-8000-00805f9b34fb',
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455'
];
const NM_PRN = 'btWebPrinter';

let perangkatTerhubung = null;
let karakterTulis = null;

// Susun perintah ESC/POS: init → baris teks → feed → potong kertas
function escposBuffer(baris) {
  const b = [];
  const teks = (s) => {
    const u = new TextEncoder().encode(s);
    for (const x of u) b.push(x);
  };
  b.push(0x1b, 0x40); // init printer
  for (const r of baris) {
    b.push(0x1b, 0x61, r.center ? 0x01 : 0x00); // align
    b.push(0x1d, 0x21, r.width ? 0x11 : 0x00); // dimensi
    teks((r.text ?? '').replace(/\s+$/, ''));
    b.push(0x0a); // newline
  }
  b.push(0x1b, 0x61, 0x01);
  for (let i = 0; i < 4; i++) b.push(0x0a); // sisa kertas
  b.push(0x1d, 0x56, 0x41); // potong kertas
  return new Uint8Array(b);
}

// Ambil/charm perangkat lalu kirim perintah cetak. Bisa dipanggil berulang (reuse koneksi).
export async function cetakWebBt(baris) {
  if (!navigator.bluetooth) throw new Error('Browser ini tidak mendukung Web Bluetooth. Pakai Chrome/Edge Android (HTTPS).');

  let device = perangkatTerhubung;
  if (!device) {
    device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: LAYANAN_VENDOR });
    localStorage.setItem(NM_PRN, device.name || '');
  }

  if (!device.gatt?.connected) {
    const gatt = await device.gatt.connect();
    karakterTulis = null;
    const servis = await gatt.getPrimaryServices();
    for (const s of servis) {
      const chars = await s.getCharacteristics().catch(() => []);
      for (const c of chars) {
        if (c.properties.writeWithoutResponse || c.properties.write) { karakterTulis = c; break; }
      }
      if (karakterTulis) break;
    }
    if (!karakterTulis) { device.gatt.disconnect(); throw new Error('Perangkat tidak punya layanan tulis — kemungkinan bukan printer BLE.'); }
    perangkatTerhubung = device;
  }
  if (!karakterTulis) throw new Error('Koneksi printer belum siap.');

  const buf = escposBuffer(baris);
  if (karakterTulis.writeWithoutResponse) await karakterTulis.writeValueWithoutResponse(buf);
  else await karakterTulis.writeValue(buf);
  return device.name || 'printer';
}

export function putusWebBt() {
  try { if (perangkatTerhubung?.gatt?.connected) perangkatTerhubung.gatt.disconnect(); } catch {}
  perangkatTerhubung = null;
  karakterTulis = null;
}

// ============ APK Resto Kasir (WebView + bridge AndroidPrint, Bluetooth Classic SPP) ============
export function bridgeApkAda() {
  return typeof window !== 'undefined' && !!window.AndroidPrint;
}

// Cetak lewat APK: kirim Base64 perintah ESC/POS → AndroidPrint.print().
// Printer Bluetooth Klasik (SPP) — tidak butuh aplikasi pihak ketiga.
export function cetakViaApk(baris) {
  if (!bridgeApkAda()) throw new Error('Tidak berjalan di dalam aplikasi Resto Kasir.');
  const buf = escposBuffer(baris);
  let s = '';
  for (let i = 0; i < buf.length; i += 8000) {
    s += String.fromCharCode.apply(null, buf.subarray(i, i + 8000));
  }
  window.AndroidPrint.print(btoa(s));
  return true;
}