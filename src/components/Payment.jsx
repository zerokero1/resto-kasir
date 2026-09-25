import { useState } from 'react';
import { uang, hitungPajakEdc, PAJAK_EDC_PERSEN } from '../lib/format';

export const METODES_BAYAR = [
  { v: 'tunai', label: '💵 Tunai', desc: 'Bayar langsung dengan uang tunai' },
  { v: 'debit', label: '💳 Kartu/Cardless', desc: 'Pembayaran lewat kartu (mesin EDC)' },
  { v: 'qris', label: '📱 QRIS', desc: 'Scan QR pembayaran' }
];

export default function PaymentModal({ p, onClose, onBayar, busy }) {
  const [metode, setMetode] = useState('tunai');
  const [bayar, setBayar] = useState('');
  const totalMenu = Number(p.total);
  const pakaiPajak = metode === 'debit';
  const total = pakaiPajak ? hitungPajakEdc(totalMenu) : totalMenu;
  const pajak = total - totalMenu;
  const uangBayar = Number(bayar) || 0;
  const kembalian = Math.max(0, uangBayar - total);

  function kirim(e) {
    e.preventDefault();
    onBayar(p, metode, bayar, total);
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card">
        <div className="k-head">Terima Pembayaran</div>
        <div className="total-line">{p.id} — total <b>{uang(totalMenu)}</b></div>
        {pakaiPajak && (
          <div className="total-line">
            Tax {PAJAK_EDC_PERSEN}% EDC: <b>{uang(pajak)}</b>
          </div>
        )}
        <div className="total-line" style={{ fontSize: 17 }}>
          Total dibayar: <b>{uang(total)}</b>
        </div>
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
        {metode === 'tunai' ? (
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
        ) : (
          <>
            <label className="lbl">Nominal yang tertera di mesin EDC / QRIS</label>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              placeholder={String(total)}
              value={bayar}
              onChange={(e) => setBayar(e.target.value)}
            />
            <div className="f-row">
              <button className="btn btn-sm" onClick={() => setBayar('')}>Kosongkan</button>
              <button className="btn btn-sm" onClick={() => setBayar(String(total))}>
                {metode === 'debit' ? 'Bayar Pas ' + uang(total) : 'Bayar Pas ' + uang(total)}
              </button>
            </div>
            <div className="muted small" style={{ marginTop: 6 }}>
              {metode === 'debit'
                ? 'Mesin EDC menambah tax ' + PAJAK_EDC_PERSEN + '% dari ' + uang(totalMenu) + '. Cocokkan nominal di layar mesin, lalu masukkan di atas bila berbeda.'
                : 'Masukkan nominal yang tertera di aplikasi QRIS.'}
            </div>
          </>
        )}
        <div className="rule" />
        <div className="f-row end">
          <button className="btn" onClick={onClose} disabled={busy}>Batal</button>
          <button className="btn btn-primary" disabled={busy || !metode} onClick={kirim}>{busy ? 'Memproses…' : 'Bayar & Lunas'}</button>
        </div>
        {uangBayar > 0 && uangBayar < total && (
          <div className="err">
            {metode === 'tunai' ? 'Uang kurang' : 'Nominal kurang'} {uang(total - uangBayar)} dari total {uang(total)}.
          </div>
        )}
        {!pakaiPajak && metode !== 'tunai' && (
          <div className="muted small">Total tanpa tax — QRIS tidak menambah pajak.</div>
        )}
      </div>
    </div>
  );
}