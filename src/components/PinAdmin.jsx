import { useState } from 'react';
import { cekPinAdmin } from '../lib/pengaturanService';

export default function PinAdminModal({ judul = 'PIN Admin', pesan, onClose, onSukses }) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function kirim(e) {
    e?.preventDefault?.();
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      const ok = await cekPinAdmin(pin);
      if (!ok) {
        setErr('PIN salah. Coba lagi.');
        setPin('');
        return;
      }
      onSukses();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <form className="card" onSubmit={kirim}>
        <div className="k-head">🔒 {judul}</div>
        <p className="muted small">{pesan || 'Masukkan PIN admin untuk melanjutkan.'}</p>
        <label className="lbl">PIN Admin</label>
        <input
          className="input"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={6}
          placeholder="••••"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
        />
        {err && <div className="err">{err}</div>}
        <div className="f-row end">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>Batal</button>
          <button type="submit" className="btn btn-primary" disabled={busy || pin.length < 4}>
            {busy ? 'Memeriksa…' : 'Buka'}
          </button>
        </div>
      </form>
    </div>
  );
}
