import { useState, useEffect, Component } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err, info) {
    console.error('Render error:', err, info);
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="page">
        <div className="card">
          <div className="k-head">Terjadi kesalahan di halaman ini</div>
          <p className="muted">Halaman lain masih bisa dipakai. Muat ulang untuk mencoba lagi.</p>
          <pre className="sql-box">{String(this.state.err?.message || this.state.err)}</pre>
          <button className="btn btn-primary btn-block" onClick={() => window.location.reload()}>Muat Ulang</button>
        </div>
      </div>
    );
  }
}

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
      <ErrorBoundary>
        <Routes>
        <Route
          path="/"
          element={user.role === 'boss'
            ? <Navigate to="/dashboard" replace />
            : <POS user={user} />}
        />
        <Route
          path="/dashboard"
          element={(user.role === 'admin' || user.role === 'boss')
            ? <Dashboard />
            : <TidakAda judul="Dashboard" pesan="Halaman ini hanya untuk akun Admin." />}
        />
        <Route path="/riwayat" element={<Riwayat />} />
        <Route
          path="/hutang"
          element={user.role === 'boss'
            ? <TidakAda judul="Belum Bayar" pesan="Akun Bos hanya bisa membuka Dashboard, Riwayat, dan Laporan." />
            : <Hutang />}
        />
        <Route
          path="/stok"
          element={user.role === 'boss'
            ? <TidakAda judul="Stok" pesan="Akun Bos hanya bisa membuka Dashboard, Riwayat, dan Laporan." />
            : <Stok user={user} />}
        />
        <Route
          path="/produk"
          element={user.role === 'boss'
            ? <TidakAda judul="Produk" pesan="Akun Bos hanya bisa membuka Dashboard, Riwayat, dan Laporan." />
            : <Produk />}
        />
        <Route path="/laporan" element={<Laporan />} />
        <Route
          path="/laporan-harian"
          element={user.role === 'boss'
            ? <TidakAda judul="Harian" pesan="Akun Bos hanya bisa membuka Dashboard, Riwayat, dan Laporan." />
            : <LaporanHarian />}
        />
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
      </ErrorBoundary>
    </Layout>
  );
}