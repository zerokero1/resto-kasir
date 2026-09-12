import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { onAuth, getProfile } from './lib/authService';
import Login from './pages/Login';
import Layout from './components/Layout';
import POS from './pages/POS';
import Riwayat from './pages/Riwayat';
import Stok from './pages/Stok';
import Produk from './pages/Produk';
import Laporan from './pages/Laporan';
import Karyawan from './pages/Karyawan';

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      setUser(p);
      setReady(true);
    });
    const sub = onAuth(async (u) => {
      if (u) {
        const p = await getProfile();
        setUser(p);
      } else {
        setUser(null);
      }
    });
    return () => sub.data?.unsubscribe?.();
  }, []);

  if (!ready) return <div className="splash">Resto Kasir…</div>;
  if (!user) return <Login />;

  return (
    <Layout user={user} onLogout={() => setUser(null)}>
      <Routes>
        <Route path="/" element={<POS user={user} />} />
        <Route path="/riwayat" element={<Riwayat />} />
        <Route path="/stok" element={<Stok user={user} />} />
        <Route path="/produk" element={<Produk />} />
        <Route path="/laporan" element={<Laporan />} />
        <Route path="/karyawan" element={<Karyawan user={user} />} />
      </Routes>
    </Layout>
  );
}