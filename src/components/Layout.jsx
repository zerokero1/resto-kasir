import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from '../lib/authService';
import { hariIni } from '../lib/format';

const tabs = [
  { to: '/', label: 'Kasir', icon: '🛒' },
  { to: '/riwayat', label: 'Riwayat', icon: '🧾' },
  { to: '/hutang', label: 'Hutang', icon: '⏳' },
  { to: '/stok', label: 'Stok', icon: '📦' },
  { to: '/produk', label: 'Produk', icon: '🍽️' },
  { to: '/laporan', label: 'Laporan', icon: '📊' },
  { to: '/karyawan', label: 'Karyawan', icon: '👥' }
];

export default function Layout({ user, children, onLogout }) {
  const nav = useNavigate();
  const isAdmin = user?.role === 'admin';

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
          <span className="badge">{isAdmin ? 'Admin' : 'Kasir'}</span>
          <button className="btn btn-ghost" onClick={keluar}>Keluar</button>
        </div>
      </header>
      <main className="content">{children}</main>
      <nav className="bottombar">
        {tabs.map((t) =>
          (t.to === '/karyawan' && !isAdmin) ? null : (
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