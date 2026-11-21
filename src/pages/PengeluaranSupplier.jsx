import { useEffect, useMemo, useState } from 'react';
import {
  ambilPengeluaranSupplier, tambahPengeluaranSupplier,
  ubahPengeluaranSupplier, hapusPengeluaranSupplier
} from '../lib/supplierService';
import { DEPT_PENGELUARAN } from '../lib/laporanService';
import { todayStr, uang } from '../lib/format';

const FORM_KOSONG = {
  tanggal: todayStr(), supplier: '', departemen: 'Kitchen',
  nama: '', qty: '', nominal: '', catatan: ''
};

export default function PengeluaranSupplier({ user }) {
  const [daftar, setDaftar] = useState([]);
  const [form, setForm] = useState(FORM_KOSONG);
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [memuat, setMemuat] = useState(true);

  async function muat() {
    setMemuat(true); setErr('');
    try {
      setDaftar(await ambilPengeluaranSupplier());
    } catch (e) {
      setErr(e.message);
    } finally {
      setMemuat(false);
    }
  }
  useEffect(() => { muat(); }, []);

  const ringkas = useMemo(() => {
    const t = { total: 0 };
    for (const d of DEPT_PENGELUARAN) t[d] = 0;
    for (const x of daftar) {
      const n = Number(x.nominal) || 0;
      t.total += n;
      if (DEPT_PENGELUARAN.includes(x.departemen)) t[x.departemen] += n;
    }
    return t;
  }, [daftar]);

  function atur(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function reset() {
    setForm({ ...FORM_KOSONG, tanggal: todayStr() });
    setEditId(null);
  }

  async function simpan(e) {
    e?.preventDefault();
    setErr(''); setInfo(''); setBusy(true);
    try {
      if (editId) {
        await ubahPengeluaranSupplier(editId, form);
        setInfo('Perubahan tersimpan.');
      } else {
        await tambahPengeluaranSupplier(form);
        setInfo('Pengeluaran supplier tersimpan.');
      }
      reset();
      await muat();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  function edit(x) {
    setEditId(x.id);
    setErr(''); setInfo('');
    setForm({
      tanggal: x.tanggal, supplier: x.supplier || '', departemen: x.departemen,
      nama: x.nama || '', qty: x.qty || '', nominal: String(x.nominal ?? ''),
      catatan: x.catatan || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function hapus(x) {
    if (!window.confirm(`Hapus catatan ${x.nama} — ${x.supplier} (${uang(x.nominal)})?`)) return;
    setErr(''); setInfo(''); setBusy(true);
    try {
      await hapusPengeluaranSupplier(x.id);
      if (editId === x.id) reset();
      setInfo('Catatan dihapus.');
      await muat();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <div className="bar">
          <span className="k-head">{editId ? 'Ubah Pengeluaran Supplier' : 'Catat Pengeluaran Supplier'}</span>
          {editId && <button className="btn btn-sm" onClick={reset}>Batal edit</button>}
        </div>
        <p className="muted small" style={{ marginTop: 0 }}>
          Satu baris = satu item. Untuk satu nota dengan beberapa item, isi beberapa baris dengan
          supplier &amp; tanggal yang sama. Nominalnya otomatis masuk ke <b>Laporan Kas</b> sebagai
          pengeluaran sesuai departemen.
        </p>
        <form onSubmit={simpan}>
          <label className="lbl">Tanggal</label>
          <input className="input" type="date" max={todayStr()} value={form.tanggal}
            onChange={(e) => atur('tanggal', e.target.value)} />

          <label className="lbl">Nama supplier / toko</label>
          <input className="input" placeholder="Mis. CV Maju, Toko Bu Tani" value={form.supplier}
            onChange={(e) => atur('supplier', e.target.value)} />

          <label className="lbl">Departemen</label>
          <select className="input" value={form.departemen}
            onChange={(e) => atur('departemen', e.target.value)}>
            {DEPT_PENGELUARAN.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <label className="lbl">Nama barang / jasa</label>
          <input className="input" placeholder="Mis. Ayam fillet, servis AC" value={form.nama}
            onChange={(e) => atur('nama', e.target.value)} />

          <div className="f-row">
            <div style={{ flex: 1 }}>
              <label className="lbl">Jumlah / qty (opsional)</label>
              <input className="input" placeholder="Mis. 2 kg / 1 unit" value={form.qty}
                onChange={(e) => atur('qty', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="lbl">Nominal (Rp)</label>
              <input className="input" type="number" inputMode="numeric" min="1" placeholder="0"
                value={form.nominal} onChange={(e) => atur('nominal', e.target.value)} />
            </div>
          </div>

          <label className="lbl">Catatan / no nota (opsional)</label>
          <input className="input" placeholder="Mis. Nota No. 123, sudah transfer" value={form.catatan}
            onChange={(e) => atur('catatan', e.target.value)} />

          {err && <div className="err">{err}</div>}
          {info && <div className="ok">{info}</div>}
          <button className="btn btn-primary btn-block" disabled={busy} type="submit">
            {busy ? 'Menyimpan…' : editId ? 'Simpan Perubahan' : '＋ Tambah Pengeluaran'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="bar">
          <span className="k-head">Riwayat Pengeluaran Supplier</span>
          <button className="btn btn-sm" disabled={busy} onClick={muat}>↻ Muat ulang</button>
        </div>
        <p className="muted small" style={{ marginTop: 0 }}>
          {DEPT_PENGELUARAN.map((d) => `${d} ${uang(ringkas[d])}`).join(' • ')}<br />
          <b>Total {uang(ringkas.total)}</b> ({daftar.length} catatan)
        </p>
        {memuat && <p className="muted">Memuat…</p>}
        {!memuat && daftar.length === 0 && <p className="muted">Belum ada pengeluaran supplier.</p>}
        {daftar.map((x) => (
          <div className="row" key={x.id}>
            <div className="row-main">
              <div><b>{x.nama}</b> <span className="muted small">{x.qty || '-'}</span></div>
              <div className="muted small">
                {x.tanggal} • {x.supplier} • {x.departemen}
                {x.catatan ? ` • ${x.catatan}` : ''}
              </div>
            </div>
            <div className="row-end">
              <div><b>{uang(x.nominal)}</b></div>
              <div className="f-row" style={{ gap: 4 }}>
                <button className="btn btn-sm" disabled={busy} onClick={() => edit(x)}>Ubah</button>
                <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => hapus(x)}>Hapus</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="muted small" style={{ marginTop: 10 }}>
        Dicatat oleh {user?.nama || 'kasir'}. Data tersimpan di server dan langsung dibaca Laporan Kas.
      </p>
    </div>
  );
}
