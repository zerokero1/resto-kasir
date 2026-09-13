import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { uang, todayStr, fmtTgl } from '../lib/format';
import StrukModal from '../components/Struk';

export default function Hutang() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [view, setView] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [needMigrasi, setNeedMigrasi] = useState(false);

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

  async function tandaiLunas(p) {
    setBusy(true);
    try {
      const { error } = await supabase
        .from('resto_pesanan')
        .update({ lunas: true, tanggal_lunas: new Date().toISOString(), bayar: Number(p.total), kembalian: 0 })
        .eq('id', p.id);
      if (error) throw new Error(error.message);
      setView(null);
      await muat();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  if (needMigrasi) {
    return (
      <div className="page">
        <div className="card">
          <div className="k-head">⏳ Hutang</div>
          <p className="muted">Daftar hutang belum aktif.</p>
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
              <div className="muted small">{fmtTgl(p.tanggal)} • {p.nama_kasir || '-'} • <span className="cap">{p.metode}</span></div>
            </div>
            <div className="row-end">
              <div><b>{uang(p.total)}</b></div>
              <div className="f-row end" style={{ margin: 0 }}>
                <button className="btn btn-sm" onClick={() => setView(p)}>Struk</button>
                <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => tandaiLunas(p)}>Lunas</button>
              </div>
            </div>
          </div>
        ))}
        {err && <div className="err">{err}</div>}
      </div>
      {view && <StrukModal p={view} onClose={() => setView(null)} />}
    </div>
  );
}