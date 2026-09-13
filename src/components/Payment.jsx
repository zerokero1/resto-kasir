import { useState } from 'react';
import { uang } from '../lib/format';

export const METODES_BAYAR = [
  { v: 'tunai', label: '💵 Tunai', desc: 'Bayar langsung dengan uang tunai' },
  { v: 'debit', label: '💳 Kartu/Cardless', desc: 'Pembayaran lewat kartu (mesin EDC)' },
  { v: 'qris', label: '📱 QRIS', desc: 'Scan QR pembayaran' }
];

export default function PaymentModal({ p, onClose, onBayar, busy }) {
  const [metode, setMetode] = useState('tunai');
  const [bayar, setBayar] = useState('');
  const total = Number(p.total);
  const uangBayar = Number(bayar) || 0;
  const kembalian = Math.max(0, uangBayar - total);

  function kirim(e) {
    e.preventDefault();
    onBayar(p, metode, bayar);
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card">
        <div className="k-head">Terima Pembayaran</div>
        <div className="total-line">{p.id} — total <b>{uang(total)}</b></div>
        <label className="lbl">Metode pembayaran yang dipilih customer</label>
        <div className="pay-methods">
          {METODES_BAYAR.map((m) => (
            <button key={m.v} className={'pay-m' + (metode === m.v ? ' sel' : '')} onClick={() => setMetode(m.v)}>
              <span className="pay-ic">{m.label.split(' ')[0]}</span>
              <span className="pay-lb">{m.label}</span>
              <span className="pay-ds">{m.desc}</span>
            </button>
          ))}
        </div>
        {metode === 'tunai' && (
          <>
            <label className="lbl">Uang dibayar customer</label>
            <input className="input" type="number" inputMode="numeric" placeholder="Uang tunai" value={bayar} onChange={(e) => setBayar(e.target.value)} />
            <div className="f-row">
              {[total, 50000, 100000].map((q) => (
                <button key={q} className="btn btn-sm" onClick={() => setBayar(String(q))}>
                  {q === total ? 'Bayar Pas' : Math.round(q / 1000) + 'rb'}
                </button>
              ))}
            </div>
            {uangBayar >= total && uangBayar > 0 && (
              <div className="total-line">Kembalian: <b>{uang(kembalian)}</b></div>
            )}
          </>
        )}
        <div className="rule" />
        <div className="f-row end">
          <button className="btn" onClick={onClose} disabled={busy}>Batal</button>
          <button className="btn btn-primary" disabled={busy || !metode} onClick={kirim}>{busy ? 'Memproses…' : 'Bayar & Lunas'}</button>
        </div>
        {metode === 'tunai' && uangBayar > 0 && uangBayar < total && (
          <div className="err">Uang kurang {uang(total - uangBayar)} dari total.</div>
        )}
      </div>
    </div>
  );
}