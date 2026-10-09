import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from '../lib/authService';
import { hariIni } from '../lib/format';

const tabs = [
  { to: '/', label: 'Kasir', icon: '🛒' },
  { to: '/dashboard', label: 'Dashboard', icon: '📈', admin: true, boss: true },
  { to: '/riwayat', label: 'Riwayat', icon: '🧾', boss: true },
  { to: '/hutang', label: 'Belum Bayar', icon: '⏳' },
  { to: '/stok', label: 'Stok', icon: '📦' },
  { to: '/produk', label: 'Produk', icon: '🍽️' },
  { to: '/laporan', label: 'Laporan', icon: '📊', boss: true },
  { to: '/laporan-harian', label: 'Harian', icon: '🗓️' },
  { to: '/karyawan', label: 'Karyawan', icon: '👥', admin: true }
];

export default function Layout({ user, children, onLogout }) {
  const nav = useNavigate();
  const isAdmin = user?.role === 'admin';
  const isBoss = user?.role === 'boss';

  const tampil = tabs.filter((t) => {
    if (isBoss) return !!t.boss;
    if (t.admin && !isAdmin) return false;
    return true;
  });
  const judulRole = isBoss ? 'Bos' : isAdmin ? 'Admin' : 'Kasir';

  async function keluar() {
    await signOut();
    nav('/');
    if (onLogout) onLogout();
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="top-title">Dayang Resto</div>
          <div className="top-sub">{hariIni()}</div>
        </div>
        <div className="top-user">
          <span>{user?.nama}</span>
          <span className="badge">{judulRole}</span>
          <button className="btn btn-ghost" onClick={keluar}>Keluar</button>
        </div>
      </header>
      <main className="content">{children}</main>
      <nav className="bottombar">
        {tampil.map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}>
              <span className="tab-ic">{t.icon}</span>
              <span>{t.label}</span>
            </NavLink>
          )
        )}
      </nav>
    </div>
  );
}