import { supabase } from './supabase';

const LOGIN_KEY = 'resto_login_v1';

// Simpan profil login secara lokal agar aplikasi TIDAK log out sendiri
// saat sesi supabase bermasalah (refresh token gagal karena offline /
// tab dirusak browser / token bentrok antar-tab).
export function loadLogin() {
  try {
    const raw = localStorage.getItem(LOGIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLogin(p) {
  try { localStorage.setItem(LOGIN_KEY, JSON.stringify(p)); } catch { /* abaikan */ }
}

export function clearLogin() {
  try { localStorage.removeItem(LOGIN_KEY); } catch { /* abaikan */ }
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  try { await supabase.auth.signOut(); } catch { /* abaikan */ }
  clearLogin();
}

export async function getProfile() {
  const cached = loadLogin();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('resto_users').select('*').eq('id', user.id).maybeSingle();
      const p = data
        ? { ...data, email: user.email }
        : { id: user.id, email: user.email, nama: user.email, role: 'kasir', aktif: true };
      saveLogin(p);
      return p;
    }
  } catch (e) {
    // Sesi sedang gagal refresh (offline dll) — pakai login tersimpan.
  }
  return cached; // null bila benar-benar belum pernah login
}

export function onAuth(cb) {
  return supabase.auth.onAuthStateChange((event, session) => {
    // Token refresh gagal → jangan langsung logout; login lokal tetap aktif.
    if (event === 'TOKEN_REFRESH_FAILED') return;
    cb(session?.user ?? null);
  });
}

export async function registerKasir(email, password, nama) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Akun belum terkonfirmasi. Pastikan "Confirm email" dimatikan di Supabase.');
  const { error: e2 } = await supabase.from('resto_users').insert({ id: data.user.id, nama, role: 'kasir' });
  if (e2) throw new Error(e2.message);
  return data;
}