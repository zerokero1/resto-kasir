import { supabase } from './supabase';

/** Verifikasi PIN admin lewat fungsi database (PIN tidak pernah dikirim ke aplikasi). */
export async function cekPinAdmin(pin) {
  const { data, error } = await supabase.rpc('cek_pin_admin', { pin: String(pin || '') });
  if (error) {
    if (/Could not find the function|schema cache/i.test(error.message)) {
      throw new Error('Fitur PIN belum aktif. Jalankan supabase/migrasi-pin-edit.sql di Supabase SQL Editor.');
    }
    throw new Error(error.message);
  }
  return data === true;
}

/** Ganti PIN admin. Mengembalikan false bila PIN lama salah. */
export async function gantiPinAdmin(pinLama, pinBaru) {
  const { data, error } = await supabase.rpc('ganti_pin_admin', {
    pin_lama: String(pinLama || ''),
    pin_baru: String(pinBaru || '')
  });
  if (error) throw new Error(error.message);
  return data === true;
}
