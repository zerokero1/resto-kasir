import { useEffect, useMemo, useState } from 'react';
import { ambilBahan, barangMasuk, barangKeluar, opname, mutasiBahan } from '../lib/stokService';
import { fmtTgl } from '../lib/format';

const TAB = ['masuk', 'keluar', 'opname'];

export default function Stok({ user }) {
  const [bahan, setBahan] = useState([]);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState('masuk');
  const [nilai, setNilai] = useState('');
  const [alasan, setAlasan] = useState('');
  const [mutasi, setMutasi] = useState(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  async function muat() {
    try { setBahan(await ambilBahan()); } catch (e) { setErr(e.message); }
  }
  useEffect(() => { muat(); }, []);

  useEffect(() => {
    if (!sel) { setMutasi(null); return; }
    mutasiBahan(sel.id).then((m) => setMutasi(m)).catch(() => {});
  }, [sel]);

  const list = useMemo(() => bahan.filter((b) => b.nama.toLowerCase().includes(q.toLowerCase())), [bahan, q]);

  async function jalan() {
    if (!sel || nilai === '') return;
    setErr(''); setOk(''); setBusy(true);
    try {
      const qty = Number(nilai);
      if (tab === 'masuk') await barangMasuk(sel.id, qty, alasan, user.id);
      if (tab === 'keluar') await barangKeluar(sel.id, qty, alasan, user.id);
      if (tab === 'opname') await opname(sel.id, qty, user.id);
      setOk('Tersimpan.');
      setNilai(''); setAlasan('');
      await muat();
      setMutasi(await mutasiBahan(sel.id));
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="bar">
        <input className="input" placeholder="Cari bahan…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="stok-flex">
        <div className="card">
          {list.length === 0 && <p className="muted">Tidak ada bahan.</p>}
          {list.map((b) => (
            <div key={b.id} className={'row' + (sel?.id === b.id ? ' sel' : '')} onClick={() => setSel(b)}>
              <div className="row-main">
                <div><b>{b.nama}</b> <span className="muted small">({b.satuan})</span></div>
                <div className={'small ' + (Number(b.stok) <= Number(b.stok_min) ? 'low' : 'muted')}>
                  {Number(b.stok).toLocaleString('id-ID')} {b.satuan} {Number(b.stok) <= Number(b.stok_min) ? '⚠️ stok menipis' : ''}
                </div>
              </div>
              <div className="row-end" />
            </div>
          ))}
        </div>

        {sel && (
          <div className="card">
            <div className="k-head">Stok {sel.nama}</div>
            <div className="metodes">
              {TAB.map((t) => (
                <button key={t} className={'chip' + (tab === t ? ' on' : '')} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>
            <label className="lbl">{tab === 'opname' ? 'Stok fisik (hitung)' : tab === 'masuk' ? 'Jumlah masuk' : 'Jumlah keluar'}</label>
            <input className="input" type="number" inputMode="decimal" value={nilai} onChange={(e) => setNilai(e.target.value)} />
            <label className="lbl">{tab === 'masuk' ? 'Catatan' : tab === 'keluar' ? 'Alasan/pemakaian' : 'Catatan (opsional)'}</label>
            <input className="input" value={alasan} onChange={(e) => setAlasan(e.target.value)} />
            {err && <div className="err">{err}</div>}
            {ok && <div className="ok">{ok}</div>}
            <button className="btn btn-primary btn-block" disabled={busy} onClick={jalan}>{busy ? 'Memproses…' : 'Simpan'}</button>
            <div className="rule" />
            <div className="k-head">Stok sekarang: <b>{Number(sel.stok).toLocaleString('id-ID')} {sel.satuan}</b></div>
            {mutasi && (
              <>
                <p className="muted small"><b>Barang masuk</b></p>
                {mutasi.masuk.slice(0, 5).map((m) => <div key={m.id} className="mut">+{m.qty} • {fmtTgl(m.tanggal)}</div>)}
                <p className="muted small"><b>Barang keluar</b></p>
                {mutasi.keluar.slice(0, 5).map((m) => <div key={m.id} className="mut">−{m.qty} • {fmtTgl(m.tanggal)}</div>)}
                <p className="muted small"><b>Opname</b></p>
                {mutasi.opname.slice(0, 5).map((m) => <div key={m.id} className="mut">= {m.stok_fisik} • {fmtTgl(m.tanggal)}</div>)}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}