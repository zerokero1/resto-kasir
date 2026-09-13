import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { uang, fmtTgl, metodeLabel } from '../lib/format';
import StrukModal from '../components/Struk';

export default function Hutang() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [payFor, setPayFor] = useState(null);
  const [strukP, setStrukP] = useState(null);
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

  async function bayar(p, metode, bayarMasuk) {
    setBusy(true);
    try {
      const jumlah = Number(bayarMasuk) || 0;
      const body = {
        lunas: true,
        tanggal_lunas: new Date().toISOString(),
        metode,
        bayar: metode === 'tunai' ? jumlah : Number(p.total),
        kembalian: metode === 'tunai' ? Math.max(0, jumlah - Number(p.total)) : 0
      };
      if (metode === 'tunai' && jumlah < Number(p.total)) throw new Error('Uang dibayar kurang dari total.');
      const { data, error } = await supabase.from('resto_pesanan').update(body).eq('id', p.id).select().single();
      if (error) throw new Error(error.message);
      setPayFor(null);
      setStrukP(data);
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
              <div className="muted small">{fmtTgl(p.tanggal)} • {p.nama_kasir || '-'}</div>
            </div>
            <div className="row-end">
              <div><b>{uang(p.total)}</b></div>
              <div className="f-row end" style={{ margin: 0 }}>
                <button className="btn btn-sm" onClick={() => setStrukP(p)}>Struk</button>
                <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => setPayFor(p)}>Bayar</button>
              </div>
            </div>
          </div>
        ))}
        {err && <div className="err">{err}</div>}
      </div>

      {payFor && <PaymentModal p={payFor} onClose={() => setPayFor(null)} onBayar={bayar} busy={busy} />}
      {strukP && <StrukModal p={strukP} onClose={() => setStrukP(null)} />}
    </div>
  );
}

const METODES = [
  { v: 'tunai', label: '💵 Tunai', desc: 'Bayar langsung dengan uang tunai' },
  { v: 'debit', label: '💳 Kartu/Cardless', desc: 'Pembayaran lewat kartu (mesin EDC)' },
  { v: 'qris', label: '📱 QRIS', desc: 'Scan QR pembayaran' }
];

function PaymentModal({ p, onClose, onBayar, busy }) {
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
        <div className="total-line">{p.id} — terutang <b>{uang(total)}</b></div>
        <label className="lbl">Metode pembayaran yang dipilih customer</label>
        <div className="pay-methods">
          {METODES.map((m) => (
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
      </div>
    </div>
  );
}