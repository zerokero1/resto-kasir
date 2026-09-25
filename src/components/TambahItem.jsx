import { useEffect, useMemo, useState } from 'react';
import { ambilProduk, KELOMPOK_POS } from '../lib/produkService';
import { ambilItemPesanan, tambahItemPesanan, hapusItemPesanan } from '../lib/pesananService';
import { uang } from '../lib/format';

export default function TambahItemModal({ p, onClose, onSimpan }) {
  const [produk, setProduk] = useState([]);
  const [kelompok, setKelompok] = useState('Semua');
  const [cart, setCart] = useState([]);
  const [itemNota, setItemNota] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const [pr, it] = await Promise.all([ambilProduk(), ambilItemPesanan(p.id)]);
        if (!on) return;
        setProduk(pr);
        setItemNota(it);
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

  const totalTambah = cart.reduce((s, i) => s + Number(i.harga) * i.qty, 0);
  const totalAkhir = Number(p.total) + totalTambah;

  function tambah(x) {
    setCart((c) => {
      const ada = c.find((i) => i.produk_id === x.id);
      if (ada) return c.map((i) => (i.produk_id === x.id ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { produk_id: x.id, nama: x.nama, harga: Number(x.harga) || 0, qty: 1 }];
    });
  }
  function ubahQty(id, d) {
    setCart((c) => c.map((i) => (i.produk_id === id ? { ...i, qty: Math.max(0, i.qty + d) } : i)).filter((i) => i.qty > 0));
  }

  async function simpan() {
    setBusy(true);
    setErr('');
    try {
      const data = await tambahItemPesanan(p, cart);
      onSimpan(data, true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function hapus(item) {
    if (busy) return;
    if (!window.confirm(`Hapus "${item.nama}" dari nota?`)) return;
    setBusy(true);
    setErr('');
    try {
      const data = await hapusItemPesanan(p, item.id);
      onSimpan(data, false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="card">
        <div className="k-head">Ubah Orderan — {p.id}</div>
        <div className="total-line">Total nota saat ini <b>{uang(p.total)}</b></div>

        <div className="rule" />
        <div className="k-head small">Item di nota ini</div>
        {itemNota.length === 0 && <p className="muted small">Belum ada item.</p>}
        {itemNota.map((it) => (
          <div className="k-row" key={it.id}>
            <div className="k-info">
              <div className="k-name">{Number(it.qty)} {it.nama}</div>
              <div className="k-price">{Number(it.subtotal).toLocaleString('id-ID')}</div>
            </div>
            <button className="btn btn-sm" disabled={busy} onClick={() => hapus(it)}>Hapus</button>
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
        <div className="grid" style={{ maxHeight: 220, overflowY: 'auto' }}>
          {tampil.map((x) => (
            <button key={x.id} className="card product" onClick={() => tambah(x)}>
              <div className="p-name">{x.nama}</div>
              <div className="p-price">{uang(x.harga)}</div>
            </button>
          ))}
          {!tampil.length && <p className="muted">Tidak ada menu di kelompok ini.</p>}
        </div>

        {cart.length > 0 && (
          <>
            <div className="rule" />
            <div className="k-head small">Akan ditambahkan</div>
            {cart.map((i) => (
              <div className="k-row" key={i.produk_id}>
                <div className="k-info">
                  <div className="k-name">{i.nama}</div>
                  <div className="k-price">{Number(i.harga).toLocaleString('id-ID')}</div>
                </div>
                <div className="k-qty">
                  <button className="qbt" onClick={() => ubahQty(i.produk_id, -1)}>−</button>
                  <span>{i.qty}</span>
                  <button className="qbt" onClick={() => ubahQty(i.produk_id, 1)}>+</button>
                </div>
                <div className="k-sub">{(Number(i.harga) * i.qty).toLocaleString('id-ID')}</div>
              </div>
            ))}
          </>
        )}

        <div className="rule" />
        <div className="total-line">Total setelah ditambah: <b>{uang(totalAkhir)}</b></div>
        {err && <div className="err">{err}</div>}
        <div className="f-row end">
          <button className="btn" onClick={onClose} disabled={busy}>Tutup</button>
          <button className="btn btn-primary" disabled={busy || !cart.length} onClick={simpan}>
            {busy ? 'Menyimpan…' : 'Simpan & Cetak'}
          </button>
        </div>
      </div>
    </div>
  );
}
