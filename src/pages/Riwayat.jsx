import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { transaksiTanggal, transaksiRentang } from '../lib/laporanService';
import { exportTransaksi } from '../lib/excelExport';
import { uang, todayStr, fmtTgl, metodeLabel } from '../lib/format';
import StrukModal from '../components/Struk';

export default function Riwayat() {
  const [tanggal, setTanggal] = useState(todayStr());
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [view, setView] = useState(null);
  const [busy, setBusy] = useState(false);

  const muat = useCallback(async (t = tanggal) => {
    const d = await transaksiTanggal(t);
    setRows(d);
    setTotal(d.reduce((s, p) => s + Number(p.total), 0));
  }, [tanggal]);

  useEffect(() => { muat(tanggal); }, [tanggal, muat]);

  useEffect(() => {
    const ch = supabase
      .channel('rc-riwayat-' + tanggal)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'resto_pesanan' }, () => muat())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tanggal, muat]);

  async function cetakExport() {
    setBusy(true);
    try {
      const all = await transaksiRentang(tanggal, tanggal);
      await exportTransaksi(all, `transaksi-${tanggal}.xlsx`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="bar">
        <input className="input" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        <button className="btn" disabled={busy} onClick={cetakExport}>⬇️ Excel</button>
      </div>
      <div className="card">
        <div className="total-line">Total {tanggal} : <b>{uang(total)}</b> ({rows.length} transaksi)</div>
        {rows.length === 0 && <p className="muted">Belum ada transaksi.</p>}
        {rows.map((p) => (
          <div className="row" key={p.id} onClick={() => setView(p)}>
            <div className="row-main">
              <div><b>{p.id}</b></div>
              <div className="muted small">{fmtTgl(p.tanggal)} • {p.nama_kasir || '-'} • {metodeLabel(p.metode)}{p.lunas === false ? ' • ⏳ belum dibayar' : ''}</div>
            </div>
            <div className="row-end"><b>{uang(p.total)}</b><span className="muted small">lihat ›</span></div>
          </div>
        ))}
      </div>
      {view && <StrukModal p={view} onClose={() => setView(null)} />}
    </div>
  );
}