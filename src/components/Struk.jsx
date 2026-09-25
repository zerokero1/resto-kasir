import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fmtTgl, metodeLabel } from '../lib/format';
import { bukaCetakBt, cetakWebBt, putusWebBt, cetakViaApk, bridgeApkAda } from '../lib/cetak';

export default function StrukModal({ p, onClose, autoPrint }) {
  const [items, setItems] = useState(null);
  const [itemErr, setItemErr] = useState('');
  const [btOn, setBtOn] = useState(() => localStorage.getItem('printBt') !== '0');
  const [st, setSt] = useState('');
  const [busy, setBusy] = useState(false);
  const diApk = bridgeApkAda();
  const itemsLoaded = items !== null;
  const itemRows = items || [];

  useEffect(() => {
    localStorage.setItem('printBt', btOn ? '1' : '0');
  }, [btOn]);

  useEffect(() => {
    let on = true;
    setItems(null);
    setItemErr('');
    supabase
      .from('resto_pesanan_item')
      .select('*')
      .eq('pesanan_id', p.id)
      .then(({ data, error }) => {
        if (!on) return;
        if (error) { setItemErr(error.message); setItems([]); return; }
        setItems(data || []);
      })
      .catch(() => { if (on) { setItemErr('Gagal memuat item'); setItems([]); } });
    return () => { on = false; };
  }, [p.id]);

  const barisStruk = useCallback(() => [
    { text: 'DAYANG RESTO', center: true, width: true },
    { text: 'Jl. Raya Dayang, Pangkalan Karang', center: true },
    { text: String(p.id) },
    { text: fmtTgl(p.tanggal) },
    { text: 'Kasir: ' + (p.nama_kasir || '-') },
    ...(p.lunas === false ? [{ text: 'STATUS: BELUM DIBAYAR' }] : []),
    { text: '===============================' },
    ...itemRows.flatMap((it) => [
      { text: `${Number(it.qty)} ${it.nama}` },
      { text: Number(it.subtotal).toLocaleString('id-ID') }
    ]),
    { text: '===============================' },
    ...(() => {
      const totalItem = itemRows.reduce((s, it) => s + (Number(it.subtotal) || 0), 0);
      const totalNota = Number(p.total) || 0;
      const selisih = totalNota - totalItem;
      return [
        ...(selisih > 0 ? [{ text: 'Tax/biaya tambahan' }, { text: selisih.toLocaleString('id-ID') }] : []),
        { text: '===============================' },
        { text: 'TOTAL', width: true },
        { text: totalNota.toLocaleString('id-ID'), width: true },
        ...(p.lunas !== false
          ? [
              { text: 'Metode: ' + metodeLabel(p.metode) },
              { text: 'Bayar: ' + Number(p.bayar).toLocaleString('id-ID') },
              { text: 'Kembalian: ' + Number(p.kembalian).toLocaleString('id-ID') }
            ]
          : [])
      ];
    })(),
    { text: '===============================' },
    { text: 'Terima kasih', center: true },
    { text: 'Semoga harimu menyenangkan', center: true }
  ], [p, itemRows]);

  useEffect(() => {
    if (autoPrint && btOn && itemsLoaded && itemRows.length > 0) {
      const t = setTimeout(async () => {
        try {
          if (diApk) cetakViaApk(barisStruk());
          else await bukaCetakBt(p.id, barisStruk());
        } catch (e) { setSt('Gagal: ' + e.message); }
      }, 600);
      return () => clearTimeout(t);
    }
  }, [p.id, autoPrint, btOn, itemsLoaded, itemRows.length, diApk, barisStruk]);

  async function cetakApp() {
    setBusy(true);
    setSt('Menyimpan struk…');
    try {
      await bukaCetakBt(p.id, barisStruk());
      setSt('Dibuka di aplikasi Bluetooth Print ✓');
    } catch (e) {
      setSt('Gagal: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function cetakWeb() {
    setBusy(true);
    setSt('Menghubungkan…');
    try {
      const nama = await cetakWebBt(barisStruk());
      setSt('Tercetak ke ' + nama + ' ✓');
    } catch (e) {
      setSt('Gagal: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  function cetakApk() {
    setBusy(true);
    setSt('Mengirim struk ke printer…');
    try {
      cetakViaApk(barisStruk());
      setSt('Struk dikirim ✓ (periksa pemberitahuan APK)');
    } catch (e) {
      setSt('Gagal: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card struk-btns">
        <label className="chk">
          <input type="checkbox" checked={btOn} onChange={(e) => setBtOn(e.target.checked)} />
          Cetak otomatis ke printer
        </label>
        {!itemsLoaded && <div className="cetak-st">Memuat item…</div>}
        {itemErr && <div className="cetak-st err">{itemErr}</div>}
        {diApk ? (
          <>
            <button className="btn btn-primary" disabled={busy || !itemsLoaded} onClick={cetakApk}>🖨️ Cetak APK</button>
            <button className="btn" onClick={() => window.print()}>🖨️ Cetak Browser</button>
          </>
        ) : (
          <>
            <button className="btn btn-primary" disabled={busy || !itemsLoaded} onClick={cetakWeb}>🖨️ Cetak BT Web</button>
            <button className="btn" disabled={busy || !itemsLoaded} onClick={cetakApp}>📡 Cetak App</button>
            <button className="btn" onClick={() => window.print()}>🖨️ Cetak Browser</button>
            <button className="btn" onClick={() => { putusWebBt(); setSt(''); }}>Putus BT</button>
          </>
        )}
        <button className="btn" onClick={onClose}>Tutup</button>
        {st && <div className={'cetak-st ' + (st.includes('✓') ? 'ok' : 'err')}>{st}</div>}
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
          {!itemsLoaded ? (
            <div className="s-line">Memuat item…</div>
          ) : itemRows.length === 0 ? (
            <div className="s-line">(tidak ada item)</div>
          ) : (
            itemRows.map((it) => (
              <div className="s-item" key={it.id}>
                <div>{Number(it.qty)} {it.nama}</div>
                <div>{Number(it.subtotal).toLocaleString('id-ID')}</div>
              </div>
            ))
          )}
          {(() => {
            const totalItem = itemRows.reduce((s, it) => s + (Number(it.subtotal) || 0), 0);
            const totalNota = Number(p.total) || 0;
            const selisih = totalNota - totalItem;
            return selisih > 0 ? (
              <div className="s-item"><span>Tax/biaya tambahan</span><span>{selisih.toLocaleString('id-ID')}</span></div>
            ) : null;
          })()}
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
