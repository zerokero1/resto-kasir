import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { transaksiTanggal, transaksiRentang } from '../lib/laporanService';
import { exportTransaksi } from '../lib/excelExport';
import { uang, todayStr, fmtTgl, metodeLabel } from '../lib/format';
import StrukModal from '../components/Struk';
import PaymentModal from '../components/Payment';

export default function Riwayat() {
  const [tanggal, setTanggal] = useState(todayStr());
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [view, setView] = useState(null);
  const [payFor, setPayFor] = useState(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

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

  async function bayar(p, metode, bayarMasuk) {
    setBusy(true);
    try {
      const jumlah = Number(bayarMasuk) || 0;
      if (metode === 'tunai' && jumlah < Number(p.total)) throw new Error('Uang dibayar kurang dari total.');
      const body = {
        lunas: true,
        tanggal_lunas: new Date().toISOString(),
        metode,
        bayar: metode === 'tunai' ? jumlah : Number(p.total),
        kembalian: metode === 'tunai' ? Math.max(0, jumlah - Number(p.total)) : 0
      };
      const { data, error } = await supabase.from('resto_pesanan').update(body).eq('id', p.id).select().single();
      if (error) throw new Error(error.message);
      setPayFor(null);
      setAutoPrint(true);
      setView(data);
      await muat();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

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
        <div className="total-line">Total {tanggal} : <b>{uang(total)}</b> ({rows.length} nota)</div>
        {rows.length === 0 && <p className="muted">Belum ada transaksi.</p>}
        {rows.map((p) => (
          <div className="row" key={p.id} onClick={() => (p.lunas === false ? setPayFor(p) : setView(p))}>
            <div className="row-main">
              <div><b>{p.id}</b>{p.lunas === false && <span className="badge-utang">belum bayar</span>}</div>
              <div className="muted small">{fmtTgl(p.tanggal)} • {p.nama_kasir || '-'} • {metodeLabel(p.metode)}</div>
            </div>
            <div className="row-end"><b>{uang(p.total)}</b><span className="muted small">{p.lunas === false ? 'klik → bayar' : 'lihat ›'}</span></div>
          </div>
        ))}
        {err && <div className="err">{err}</div>}
      </div>
      {view && <StrukModal p={view} autoPrint={autoPrint} onClose={() => { setAutoPrint(false); setView(null); }} />}
      {payFor && <PaymentModal p={payFor} onClose={() => setPayFor(null)} onBayar={bayar} busy={busy} />}
    </div>
  );
}