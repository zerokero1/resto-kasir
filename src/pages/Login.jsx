import { useState } from 'react';
import { signIn } from '../lib/authService';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function masuk(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      await onLogin();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="card login-card">
        <div className="logo">🍜</div>
        <h1>Dayang Resto</h1>
        <p className="muted">Kasir • Stok • Laporan</p>
        <form onSubmit={masuk}>
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          <input className="input" type="password" placeholder="Sandi" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          {err && <div className="err">{err}</div>}
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Memproses…' : 'Masuk'}</button>
        </form>
        <p className="muted small">Login seminggu sekali cukup — data tampil otomatis.</p>
      </div>
    </div>
  );
}