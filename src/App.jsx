import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { getProfile, onAuth, loadLogin } from './lib/authService';
import Login from './pages/Login';
import Layout from './components/Layout';
import POS from './pages/POS';
import Riwayat from './pages/Riwayat';
import Hutang from './pages/Hutang';
import Stok from './pages/Stok';
import Produk from './pages/Produk';
import Laporan from './pages/Laporan';
import LaporanHarian from './pages/LaporanHarian';
import Karyawan from './pages/Karyawan';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Pulihkan login dari cache secepat mungkin (tidak menunggu sesi supabase),
    // lalu update bila akun masih valid. Sesi gagal refresh TIDAK menghapus login.
    setUser(loadLogin());
    getProfile().then((p) => { setUser(p); setReady(true); });
    const sub = onAuth(() => {});
    return () => sub.data?.unsubscribe?.();
  }, []);

  if (!ready) return <div className="splash">Resto Kasir…</div>;
  if (!user) return <Login onLogin={async () => setUser(await getProfile())} />;

  return (
    <Layout user={user} onLogout={() => setUser(null)}>
      <Routes>
        <Route path="/" element={<POS user={user} />} />
        <Route path="/dashboard" element={user.role === 'admin' ? <Dashboard /> : null} />
        <Route path="/riwayat" element={<Riwayat />} />
        <Route path="/hutang" element={<Hutang />} />
        <Route path="/stok" element={<Stok user={user} />} />
        <Route path="/produk" element={<Produk />} />
        <Route path="/laporan" element={<Laporan />} />
        <Route path="/laporan-harian" element={<LaporanHarian />} />
        <Route path="/karyawan" element={<Karyawan user={user} />} />
      </Routes>
    </Layout>
  );
}