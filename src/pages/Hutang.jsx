import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { uang, fmtTgl } from '../lib/format';
import StrukModal from '../components/Struk';
import PaymentModal from '../components/Payment';
import TambahItemModal from '../components/TambahItem';
import { simpanSplitBayar, batalkanPesanan } from '../lib/pesananService';

export default function Hutang() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [payFor, setPayFor] = useState(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const [strukP, setStrukP] = useState(null);
  const [editFor, setEditFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [needMigrasi, setNeedMigrasi] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);

  const muat = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('resto_pesanan')
        .select('*')
        .eq('lunas', false)
        .order('tanggal', { ascending: false });
      if (error) {
        if (/(column|does not exist|lunas)/i.test(error.message)) setNeedMigrasi(true);
        else setErr(error.message);
        return;
      }
      setNeedMigrasi(false);
      setRows(data || []);
      setTotal((data || []).reduce((s, p) => s + Number(p.total), 0));
    } catch (e) { setErr(e.message); }
  }, []);

  useEffect(() => { muat(); }, [muat]);

  useEffect(() => {
    const ch = supabase
      .channel('rc-hutang')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resto_pesanan' }, () => muat())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [muat]);

  async function bayar(p, metode, bayarMasuk, totalFinal) {
    setBusy(true);
    try {
      const total = Number(totalFinal || p.total);
      const jumlah = Number(bayarMasuk) || 0;
      const body = {
        lunas: true,
        tanggal_lunas: new Date().toISOString(),
        metode,
        total,
        bayar: jumlah > 0 ? jumlah : total,
        kembalian: metode === 'tunai' ? Math.max(0, jumlah - total) : 0
      };
      if (metode === 'tunai' && jumlah < total) throw new Error('Uang dibayar kurang dari total.');
      if (metode !== 'tunai' && jumlah > 0 && jumlah < total) {
        throw new Error('Nominal mesin kurang dari total ' + uang(total) + '.');
      }
      const { data, error } = await supabase.from('resto_pesanan').update(body).eq('id', p.id).select().single();
      if (error) throw new Error(error.message);
      setPayFor(null);
      setAutoPrint(true);
      setStrukP(data);
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
      setStrukP(hasil[0]);
      setInfo('Split tersimpan: ' + hasil.map((x) => x.id).join(' • ') + '. Cetak struk tiap nota satu-satu dari daftar di atas.');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function batalkan(p) {
    if (!window.confirm('Batalkan nota ' + p.id + '? Item dan stok akan dikembalikan. Tindakan ini tidak bisa dibatalkan.')) return;
    setBusy(true);
    setErr('');
    try {
      await batalkanPesanan(p);
      setInfo('Nota ' + p.id + ' dibatalkan.');
      await muat();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  if (needMigrasi) {
    return (
      <div className="page">
        <div className="card">
          <div className="k-head">⏳ Belum Bayar</div>
          <p className="muted">Daftar belum bayar belum aktif.</p>
          <p className="small">Jalankan dulu di <b>SQL Editor</b> Supabase proyek resto-kasir:</p>
          <pre className="sql-box">alter table public.resto_pesanan add column if not exists lunas boolean not null default false;
update public.resto_pesanan set lunas = true where metode &lt;&gt; 'hutang';</pre>
          <button className="btn btn-primary btn-block" onClick={muat}>Sudah dijalankan — Muat Ulang</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <div className="k-head">⏳ Belum Bayar — total terutang: <b>{uang(total)}</b></div>
        {rows.length === 0 && <p className="muted">Semua transaksi sudah lunas 🎉</p>}
        {rows.map((p) => (
          <div className="row" key={p.id}>
            <div className="row-main">
              <div><b>{p.id}</b></div>
              <div className="muted small">{fmtTgl(p.tanggal)} • {p.nama_kasir || '-'}</div>
            </div>
            <div className="row-end">
              <div><b>{uang(p.total)}</b></div>
              <div className="f-row end" style={{ margin: 0 }}>
                <button className="btn btn-sm" onClick={() => { setAutoPrint(false); setEditFor(p); }}>➕ Orderan</button>
                <button className="btn btn-sm" onClick={() => { setAutoPrint(false); setStrukP(p); }}>Struk</button>
                <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => { setSplitOpen(false); setPayFor(p); }}>💳 Bayar</button>
                <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => batalkan(p)}>✕ Batalkan</button>
                <button className="btn btn-sm" disabled={busy} onClick={() => { setSplitOpen(true); setPayFor(p); }}>🔀 Split Bill</button>
              </div>
            </div>
          </div>
        ))}
        {err && <div className="err">{err}</div>}
        {info && <div className="total-line">{info}</div>}
      </div>

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
      {strukP && <StrukModal p={strukP} autoPrint={autoPrint} onClose={() => { setAutoPrint(false); setStrukP(null); }} />}
      {editFor && (
        <TambahItemModal
          p={editFor}
          onClose={() => setEditFor(null)}
          onSimpan={async (data, cetak) => {
            setEditFor(null);
            await muat();
            if (cetak) { setAutoPrint(true); setStrukP(data); }
          }}
        />
      )}
    </div>
  );
}