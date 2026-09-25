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

function TidakAda({ judul, pesan }) {
  return (
    <div className="page">
      <div className="card">
        <div className="k-head">{judul}</div>
        <p className="muted">{pesan}</p>
        <a className="btn btn-primary btn-block" href="#/">← Kembali ke Kasir</a>
      </div>
    </div>
  );
}

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
        <Route
          path="/dashboard"
          element={user.role === 'admin'
            ? <Dashboard />
            : <TidakAda judul="Dashboard" pesan="Halaman ini hanya untuk akun Admin." />}
        />
        <Route path="/riwayat" element={<Riwayat />} />
        <Route path="/hutang" element={<Hutang />} />
        <Route path="/stok" element={<Stok user={user} />} />
        <Route path="/produk" element={<Produk />} />
        <Route path="/laporan" element={<Laporan />} />
        <Route path="/laporan-harian" element={<LaporanHarian />} />
        <Route
          path="/karyawan"
          element={user.role === 'admin'
            ? <Karyawan user={user} />
            : <TidakAda judul="Karyawan" pesan="Halaman ini hanya untuk akun Admin." />}
        />
        <Route
          path="*"
          element={<TidakAda judul="Halaman tidak ditemukan" pesan="Alamat yang dibuka tidak ada. Mungkin aplikasi perlu diperbarui — tutup lalu buka lagi Dayang Resto." />}
        />
      </Routes>
    </Layout>
  );
}