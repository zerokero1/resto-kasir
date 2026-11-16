import { useEffect, useMemo, useState } from 'react';
import { ambilProduk, KELOMPOK_POS } from '../lib/produkService';
import { ambilItemPesanan, simpanEditTransaksi } from '../lib/pesananService';
import { uang, hitungPajakEdc, PAJAK_EDC_PERSEN, tglWib } from '../lib/format';

const METODE = [
  { v: 'tunai', label: '💵 Tunai' },
  { v: 'debit', label: '💳 Kartu/Cardless' },
  { v: 'qris', label: '📱 QRIS' },
  { v: 'hutang', label: '🕒 Belum Bayar' }
];

export default function EditTransaksiModal({ p, onClose, onSaved }) {
  const [items, setItems] = useState(null);
  const [produk, setProduk] = useState([]);
  const [kelompok, setKelompok] = useState('Semua');
  const [metode, setMetode] = useState(p.metode || 'tunai');
  const [diskon, setDiskon] = useState(p.diskon ? String(Number(p.diskon)) : '');
  const [tanggal, setTanggal] = useState(tglWib(p.tanggal));
  const [catatan, setCatatan] = useState(p.catatan || '');
  const [bayar, setBayar] = useState(p.metode === 'tunai' && Number(p.bayar) > 0 ? String(Number(p.bayar)) : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const [pr, it] = await Promise.all([ambilProduk(), ambilItemPesanan(p.id)]);
        if (!on) return;
        setProduk(pr);
        setItems(it.map((x) => ({
          id: x.id,
          produk_id: x.produk_id,
          nama: x.nama,
          harga: Number(x.harga) || 0,
          qty: Number(x.qty) || 0
        })));
      } catch (e) {
        if (on) setErr(e.message);
      }
    })();
    return () => { on = false; };
  }, [p.id]);

  const menu = useMemo(() => produk.filter((x) => x.jenis === 'menu'), [produk]);
  const listKelompok = useMemo(
    () => [...new Set(menu.map((x) => x.kelompok))].concat(KELOMPOK_POS.filter((k) => !menu.some((x) => x.kelompok === k))),
    [menu]
  );
  const tampil = kelompok === 'Semua' ? menu : menu.filter((x) => x.kelompok === kelompok);

  const itemSum = (items || []).reduce((s, it) => s + it.harga * it.qty, 0);
  const diskonNum = Math.min(Math.max(Number(diskon) || 0, 0), itemSum);
  const dasar = itemSum - diskonNum;
  const hutang = metode === 'hutang';
  const total = hutang ? dasar : (metode === 'debit' ? hitungPajakEdc(dasar) : dasar);
  const pajak = total - dasar;
  const uangBayar = Number(bayar) || 0;
  const kembalian = !hutang && metode === 'tunai' ? Math.max(0, uangBayar - total) : 0;

  function ubahQty(id, d) {
    setItems((list) => list.map((it) => (it.id === id ? { ...it, qty: Math.max(1, it.qty + d) } : it)));
  }

  function hapus(it) {
    if (busy) return;
    if (!window.confirm(`Hapus "${it.nama}" dari nota?`)) return;
    setItems((list) => list.filter((x) => x !== it));
  }

  function tambahMenu(x) {
    setItems((list) => {
      const ada = list.find((it) => it.produk_id === x.id);
      if (ada) return list.map((it) => (it.produk_id === x.id ? { ...it, qty: it.qty + 1 } : it));
      return [...list, { produk_id: x.id, nama: x.nama, harga: Number(x.harga) || 0, qty: 1 }];
    });
  }

  async function simpan() {
    if (busy || !items) return;
    setBusy(true);
    setErr('');
    try {
      const data = await simpanEditTransaksi(p, {
        items: items.map((it) => ({
          id: it.id,
          produk_id: it.produk_id,
          nama: it.nama,
          harga: it.harga,
          qty: it.qty
        })),
        metode,
        diskon: diskonNum,
        tanggal,
        catatan,
        bayar: Number(bayar) || 0
      });
      onSaved(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="card">
        <div className="k-head">✏️ Edit Transaksi — {p.id}</div>
        <p className="muted small">
          Kasir: {p.nama_kasir || '-'} • Total tercatat: {uang(p.total)}
        </p>

        <label className="lbl">Tanggal transaksi</label>
        <input className="input" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />

        <div className="rule" />
        <div className="k-head small">Item di nota</div>
        {items === null && <p className="muted small">Memuat item…</p>}
        {items?.length === 0 && <p className="muted small">Belum ada item.</p>}
        {(items || []).map((it) => (
          <div className="k-row" key={it.id ? 'i' + it.id : 'p' + it.produk_id}>
            <div className="k-info">
              <div className="k-name">{it.nama}</div>
              <div className="k-price">{uang(it.harga)}</div>
            </div>
            <div className="k-qty">
              <button className="qbt" disabled={busy} onClick={() => ubahQty(it.id, -1)}>−</button>
              <span>{it.qty}</span>
              <button className="qbt" disabled={busy} onClick={() => ubahQty(it.id, 1)}>+</button>
            </div>
            <div className="k-sub">{uang(it.harga * it.qty)}</div>
            <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => hapus(it)}>Hapus</button>
          </div>
        ))}

        <div className="rule" />
        <div className="k-head small">Tambah menu</div>
        <div className="chips">
          <button className={'chip' + (kelompok === 'Semua' ? ' on' : '')} onClick={() => setKelompok('Semua')}>Semua</button>
          {listKelompok.map((k) => (
            <button key={k} className={'chip' + (kelompok === k ? ' on' : '')} onClick={() => setKelompok(k)}>{k}</button>
          ))}
        </div>
        <div className="grid" style={{ maxHeight: 200, overflowY: 'auto' }}>
          {tampil.map((x) => (
            <button key={x.id} className="card product" disabled={busy} onClick={() => tambahMenu(x)}>
              <div className="p-name">{x.nama}</div>
              <div className="p-price">{uang(x.harga)}</div>
            </button>
          ))}
          {!tampil.length && <p className="muted">Tidak ada menu di kelompok ini.</p>}
        </div>

        <div className="rule" />
        <label className="lbl">Metode pembayaran</label>
        <div className="metodes">
          {METODE.map((m) => (
            <button
              key={m.v}
              className={'chip' + (metode === m.v ? ' on' : '')}
              disabled={busy}
              onClick={() => { setMetode(m.v); setBayar(''); }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <label className="lbl">Diskon (Rp) — opsional</label>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          min="0"
          placeholder="0"
          value={diskon}
          onChange={(e) => setDiskon(e.target.value)}
        />

        <div className="total-line">Subtotal item: <b>{uang(itemSum)}</b></div>
        {diskonNum > 0 && <div className="total-line">Diskon: <b>− {uang(diskonNum)}</b></div>}
        {pajak > 0 && <div className="total-line">Tax {PAJAK_EDC_PERSEN}% EDC: <b>{uang(pajak)}</b></div>}
        <div className="total-line" style={{ fontSize: 17 }}>Total: <b>{uang(total)}</b></div>

        {metode === 'tunai' && (
          <>
            <label className="lbl">Uang dibayar customer</label>
            <div className="f-row">
              <input
                className="input"
                type="number"
                inputMode="numeric"
                min="0"
                placeholder={String(total)}
                value={bayar}
                onChange={(e) => setBayar(e.target.value)}
              />
              <button className="btn btn-sm" disabled={busy} onClick={() => setBayar(String(total))}>Bayar Pas</button>
            </div>
            {uangBayar > 0 && <div className="total-line">Kembalian: <b>{uang(kembalian)}</b></div>}
          </>
        )}

        {hutang && (
          <p className="muted small">Nota akan berstatus <b>Belum Bayar</b> dan muncul di halaman Hutang.</p>
        )}

        <label className="lbl">Catatan (opsional)</label>
        <input className="input" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="mis. tanpa es, tambah sambal" />

        {err && <div className="err">{err}</div>}
        <div className="f-row end">
          <button className="btn" onClick={onClose} disabled={busy}>Batal</button>
          <button className="btn btn-primary" disabled={busy || !items?.length} onClick={simpan}>
            {busy ? 'Menyimpan…' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
}
