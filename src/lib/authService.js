import { supabase } from './supabase';

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('resto_users').select('*').eq('id', user.id).maybeSingle();
  if (data) return { ...data, email: user.email };
  return { id: user.id, email: user.email, nama: user.email, role: 'kasir', aktif: true };
}

export function onAuth(cb) {
  return supabase.auth.onAuthStateChange((event, session) => cb(session?.user ?? null));
}

export async function registerKasir(email, password, nama) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Akun belum terkonfirmasi. Pastikan "Confirm email" dimatikan di Supabase.');
  const { error: e2 } = await supabase.from('resto_users').insert({ id: data.user.id, nama, role: 'kasir' });
  if (e2) throw new Error(e2.message);
  return data;
}