import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { transaksiTanggal, transaksiRentang } from '../lib/laporanService';
import { exportTransaksi } from '../lib/excelExport';
import { uang, todayStr, fmtTgl, metodeLabel } from '../lib/format';
import StrukModal from '../components/Struk';
import PaymentModal from '../components/Payment';
import TambahItemModal from '../components/TambahItem';
import { simpanSplitBayar } from '../lib/pesananService';

export default function Riwayat() {
  const [tanggal, setTanggal] = useState(todayStr());
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [view, setView] = useState(null);
  const [payFor, setPayFor] = useState(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const [editFor, setEditFor] = useState(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

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

  async function bayar(p, metode, bayarMasuk, totalFinal) {
    setBusy(true);
    try {
      const total = Number(totalFinal || p.total);
      const jumlah = Number(bayarMasuk) || 0;
      if (metode === 'tunai' && jumlah < total) throw new Error('Uang dibayar kurang dari total.');
      if (metode !== 'tunai' && jumlah > 0 && jumlah < total) {
        throw new Error('Nominal mesin kurang dari total ' + uang(total) + '.');
      }
      const body = {
        lunas: true,
        tanggal_lunas: new Date().toISOString(),
        metode,
        total,
        bayar: jumlah > 0 ? jumlah : total,
        kembalian: metode === 'tunai' ? Math.max(0, jumlah - total) : 0
      };
      const { data, error } = await supabase.from('resto_pesanan').update(body).eq('id', p.id).select().single();
      if (error) throw new Error(error.message);
      setPayFor(null);
      setSplitOpen(false);
      setAutoPrint(true);
      setView(data);
      await muat();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function bayarSplit(p, parts) {
    setBusy(true);
    try {
      const hasil = await simpanSplitBayar(p, parts);
      setPayFor(null);
      setSplitOpen(false);
      await muat();
      setAutoPrint(true);
      setView(hasil[0]);
      setInfo('Split tersimpan: ' + hasil.map((x) => x.id).join(' • ') + '. Cetak struk tiap nota satu-satu dari daftar di bawah.');
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
          <div className="row" key={p.id} onClick={() => (p.lunas === false ? (setSplitOpen(false), setPayFor(p)) : setView(p))}>
            <div className="row-main">
              <div><b>{p.id}</b>{p.lunas === false && <span className="badge-utang">belum bayar</span>}</div>
              <div className="muted small">{fmtTgl(p.tanggal)} • {p.nama_kasir || '-'} • {metodeLabel(p.metode)}</div>
              {p.lunas === false && (
                <div className="f-row" style={{ marginTop: 6 }}>
                  <button
                    className="btn btn-sm"
                    style={{ marginTop: 6 }}
                    onClick={(e) => { e.stopPropagation(); setAutoPrint(false); setEditFor(p); }}
                  >
                    ➕ Ubah Orderan
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    style={{ marginTop: 6 }}
                    onClick={(e) => { e.stopPropagation(); setSplitOpen(false); setPayFor(p); }}
                  >
                    💳 Bayar
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ marginTop: 6 }}
                    onClick={(e) => { e.stopPropagation(); setSplitOpen(true); setPayFor(p); }}
                  >
                    🔀 Split Bill
                  </button>
                </div>
              )}
            </div>
            <div className="row-end"><b>{uang(p.total)}</b><span className="muted small">{p.lunas === false ? 'klik → bayar' : 'lihat ›'}</span></div>
          </div>
        ))}
        {err && <div className="err">{err}</div>}
        {info && <div className="total-line">{info}</div>}
      </div>
      {view && <StrukModal p={view} autoPrint={autoPrint} onClose={() => { setAutoPrint(false); setView(null); }} />}
      {payFor && (
        <PaymentModal
          p={payFor}
          mulaiSplit={splitOpen}
          onClose={() => { setSplitOpen(false); setPayFor(null); }}
          onBayar={bayar}
          onBayarSplit={bayarSplit}
          busy={busy}
        />
      )}
      {editFor && (
        <TambahItemModal
          p={editFor}
          onClose={() => setEditFor(null)}
          onSimpan={async (data, cetak) => {
            setEditFor(null);
            await muat();
            if (cetak) { setAutoPrint(true); setView(data); }
          }}
        />
      )}
    </div>
  );
}