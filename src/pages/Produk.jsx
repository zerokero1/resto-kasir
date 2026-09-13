import { useEffect, useState } from 'react';
import {
  ambilSemuaProduk, tambahProduk, updateProduk,
  ambilResep, aturResep
} from '../lib/produkService';
import { ambilBahan } from '../lib/stokService';
import { uang } from '../lib/format';

export default function Produk() {
  const [tab, setTab] = useState('menu');
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [add, setAdd] = useState(false);
  const [form, setForm] = useState({ nama: '', kelompok: 'Makanan', harga: '', satuan: 'porsi', jenis: 'menu', stok: '', stok_min: '' });
  const [resepFor, setResepFor] = useState(null);
  const [bahan, setBahan] = useState([]);
  const [resep, setResep] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function muat() {
    try { setRows(await ambilSemuaProduk()); } catch (e) { setErr(e.message); }
  }
  useEffect(() => { muat(); }, []);

  const list = rows.filter((r) => r.jenis === tab && r.nama.toLowerCase().includes(q.toLowerCase()));

  async function simpan() {
    if (!form.nama.trim()) return;
    setErr(''); setBusy(true);
    try {
      const p = {
        nama: form.nama.trim(), kelompok: form.kelompok || 'Makanan',
        harga: Number(form.harga) || 0, jenis: tab,
        satuan: form.satuan || 'porsi',
        stok: tab === 'bahan' ? Number(form.stok) || 0 : 0,
        stok_min: tab === 'bahan' ? Number(form.stok_min) || 0 : 0
      };
      await tambahProduk(p);
      setAdd(false);
      setForm({ nama: '', kelompok: 'Makanan', harga: '', satuan: 'porsi', jenis: tab, stok: '', stok_min: '' });
      await muat();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function bukaResep(p) {
    setErr('');
    try {
      const [bs, rs] = await Promise.all([ambilBahan(), ambilResep()]);
      setBahan(bs);
      setResepFor(p);
      const map = {};
      for (const r of rs.filter((r) => r.produk_id === p.id)) map[r.bahan_id] = Number(r.qty) || 0;
      setResep(map);
    } catch (e) { setErr(e.message); }
  }

  async function simpanResep() {
    setBusy(true);
    try {
      const items = Object.entries(resep).filter(([, q]) => q > 0).map(([bahan_id, qty]) => ({ bahan_id: Number(bahan_id), qty }));
      await aturResep(resepFor.id, items);
      setResepFor(null);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="page">
      <div className="bar">
        <div className="metodes">
          <button className={'chip' + (tab === 'menu' ? ' on' : '')} onClick={() => setTab('menu')}>Menu</button>
          <button className={'chip' + (tab === 'bahan' ? ' on' : '')} onClick={() => setTab('bahan')}>Bahan</button>
        </div>
        <input className="input" placeholder="Cari…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-primary" onClick={() => setAdd(!add)}>{add ? 'Batal' : '+ Tambah'}</button>
      </div>

      {add && (
        <div className="card">
          <div className="k-head">Tambah {tab === 'menu' ? 'Menu' : 'Bahan'}</div>
          <div className="f-row"><input className="input" placeholder="Nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
          <div className="f-row">
            <input className="input" placeholder="Kelompok (contoh: Makanan)" value={form.kelompok} onChange={(e) => setForm({ ...form, kelompok: e.target.value })} />
            {tab === 'menu' && <input className="input" type="number" placeholder="Harga" value={form.harga} onChange={(e) => setForm({ ...form, harga: e.target.value })} />}
          </div>
          <div className="f-row">
            <input className="input" placeholder="Satuan (porsi/gram/ml/pack)" value={form.satuan} onChange={(e) => setForm({ ...form, satuan: e.target.value })} />
            {tab === 'bahan' && <input className="input" type="number" placeholder="Stok awal" value={form.stok} onChange={(e) => setForm({ ...form, stok: e.target.value })} />}
            {tab === 'bahan' && <input className="input" type="number" placeholder="Stok minimum" value={form.stok_min} onChange={(e) => setForm({ ...form, stok_min: e.target.value })} />}
          </div>
          {err && <div className="err">{err}</div>}
          <button className="btn btn-primary btn-block" disabled={busy} onClick={simpan}>{busy ? '…' : 'Simpan'}</button>
        </div>
      )}

      <div className="card">
        {list.map((r) => (
          <div className="row" key={r.id}>
            <div className="row-main">
              <div><b>{r.nama}</b> <span className="muted small">{r.kelompok}</span></div>
              <div className="muted small">
                {tab === 'menu' ? uang(r.harga) : `${Number(r.stok).toLocaleString('id-ID')} ${r.satuan} (min ${Number(r.stok_min).toLocaleString('id-ID')})`}
              </div>
            </div>
            <div className="row-end">
              {tab === 'menu' && <button className="btn btn-sm" onClick={() => bukaResep(r)}>Resep</button>}
              <button className={'chip' + (r.aktif ? ' on' : '')} onClick={() => updateProduk(r.id, { aktif: !r.aktif }).then(muat)}>
                {r.aktif ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>
          </div>
        ))}
        {!list.length && <p className="muted">Kosong.</p>}
      </div>

      {resepFor && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setResepFor(null); }}>
          <div className="card">
            <div className="k-head">Resep «{resepFor.nama}» <span className="muted small">(jumlah bahan per porsi)</span></div>
            {bahan.map((b) => (
              <div className="f-row" key={b.id}>
                <span className="row-main"><b>{b.nama}</b> <span className="muted small">({b.satuan})</span></span>
                <input className="input input-sm" type="number" inputMode="decimal" placeholder="0"
                  value={resep[b.id] || ''}
                  onChange={(e) => setResep({ ...resep, [b.id]: e.target.value })} />
              </div>
            ))}
            {err && <div className="err">{err}</div>}
            <div className="f-row end">
              <button className="btn" onClick={() => setResepFor(null)}>Batal</button>
              <button className="btn btn-primary" disabled={busy} onClick={simpanResep}>Simpan Resep</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}