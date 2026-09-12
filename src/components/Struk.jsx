import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fmtTgl } from '../lib/format';

export default function StrukModal({ p, onClose }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let on = true;
    supabase
      .from('resto_pesanan_item')
      .select('*')
      .eq('pesanan_id', p.id)
      .then(({ data }) => { if (on) setItems(data || []); });
    return () => { on = false; };
  }, [p.id]);

  return (
    <div className="overlay">
      <div className="card struk-btns">
        <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Cetak</button>
        <button className="btn" onClick={onClose}>Tutup</button>
      </div>
      <div className="print-wrap">
        <div id="print-area" className="struk">
          <div className="s-head">DAYANG RESTO</div>
          <div className="s-sub">Jl. Raya Dayang, Pangkalan Karang</div>
          <div className="s-line">{p.id}</div>
          <div className="s-line">{fmtTgl(p.tanggal)}</div>
          <div className="s-line">Kasir: {p.nama_kasir || '-'}</div>
          <div className="s-rule" />
          {items.map((it) => (
            <div className="s-item" key={it.id}>
              <div>{Number(it.qty)} {it.nama}</div>
              <div>{Number(it.subtotal).toLocaleString('id-ID')}</div>
            </div>
          ))}
          <div className="s-rule" />
          <div className="s-item"><b>TOTAL</b><b>{Number(p.total).toLocaleString('id-ID')}</b></div>
          <div className="s-item"><span>Metode</span><span className="cap">{p.metode}</span></div>
          <div className="s-item"><span>Bayar</span><span>{Number(p.bayar).toLocaleString('id-ID')}</span></div>
          <div className="s-item"><span>Kembalian</span><span>{Number(p.kembalian).toLocaleString('id-ID')}</span></div>
          <div className="s-rule" />
          <div className="s-foot">Terima kasih 🙏<br />Semoga harimu menyenangkan</div>
        </div>
      </div>
    </div>
  );
}