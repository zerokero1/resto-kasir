import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fmtTgl, metodeLabel } from '../lib/format';
import { bukaCetakBt } from '../lib/cetak';

export default function StrukModal({ p, onClose }) {
  const [items, setItems] = useState([]);
  const [btOn, setBtOn] = useState(() => localStorage.getItem('printBt') !== '0');

  useEffect(() => {
    localStorage.setItem('printBt', btOn ? '1' : '0');
  }, [btOn]);

  useEffect(() => {
    let on = true;
    supabase
      .from('resto_pesanan_item')
      .select('*')
      .eq('pesanan_id', p.id)
      .then(({ data }) => { if (on) setItems(data || []); });
    return () => { on = false; };
  }, [p.id]);

  useEffect(() => {
    if (btOn && p.lunas !== false) {
      const t = setTimeout(() => bukaCetakBt(p.id), 800);
      return () => clearTimeout(t);
    }
  }, [p.id, p.lunas, btOn]);

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card struk-btns">
        <label className="chk">
          <input type="checkbox" checked={btOn} onChange={(e) => setBtOn(e.target.checked)} />
          Cetak otomatis ke printer BT
        </label>
        <button className="btn btn-primary" onClick={() => bukaCetakBt(p.id)}>🖨️ Cetak BT</button>
        <button className="btn" onClick={() => window.print()}>🖨️ Cetak Browser</button>
        <button className="btn" onClick={onClose}>Tutup</button>
      </div>
      <div className="print-wrap">
        <div id="print-area" className="struk">
          <div className="s-head">DAYANG RESTO</div>
          <div className="s-sub">Jl. Raya Dayang, Pangkalan Karang</div>
          <div className="s-line">{p.id}</div>
          <div className="s-line">{fmtTgl(p.tanggal)}</div>
          <div className="s-line">Kasir: {p.nama_kasir || '-'}</div>
          {p.lunas === false && <div className="s-line" style={{ fontWeight: 800 }}>STATUS: BELUM DIBAYAR</div>}
          <div className="s-rule" />
          {items.map((it) => (
            <div className="s-item" key={it.id}>
              <div>{Number(it.qty)} {it.nama}</div>
              <div>{Number(it.subtotal).toLocaleString('id-ID')}</div>
            </div>
          ))}
          <div className="s-rule" />
          <div className="s-item"><b>TOTAL</b><b>{Number(p.total).toLocaleString('id-ID')}</b></div>
          {p.lunas !== false && (
            <>
              <div className="s-item"><span>Metode</span><span>{metodeLabel(p.metode)}</span></div>
              <div className="s-item"><span>Bayar</span><span>{Number(p.bayar).toLocaleString('id-ID')}</span></div>
              <div className="s-item"><span>Kembalian</span><span>{Number(p.kembalian).toLocaleString('id-ID')}</span></div>
            </>
          )}
          <div className="s-rule" />
          <div className="s-foot">Terima kasih 🙏<br />Semoga harimu menyenangkan</div>
        </div>
      </div>
    </div>
  );
}