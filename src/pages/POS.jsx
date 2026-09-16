import { useEffect, useMemo, useState } from 'react';
import { ambilProduk, KELOMPOK_POS } from '../lib/produkService';
import { simpanPesanan } from '../lib/pesananService';
import { uang } from '../lib/format';
import StrukModal from '../components/Struk';

export default function POS({ user }) {
  const [produk, setProduk] = useState([]);
  const [kelompok, setKelompok] = useState('Semua');
  const [cart, setCart] = useState([]);
  const [catatan, setCatatan] = useState('');
  const [pesanan, setPesanan] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function muat() {
    try {
      setProduk(await ambilProduk());
    } catch (e) {
      setErr(e.message);
    }
  }
  useEffect(() => { muat(); }, []);

  const menu = useMemo(() => produk.filter((p) => p.jenis === 'menu'), [produk]);
  const listKelompok = useMemo(() => [...new Set(menu.map((p) => p.kelompok))].concat(KELOMPOK_POS.filter((k) => !menu.some((p) => p.kelompok === k))), [menu]);
  const tampil = kelompok === 'Semua' ? menu : menu.filter((p) => p.kelompok === kelompok);

  const total = cart.reduce((s, it) => s + Number(it.harga) * it.qty, 0);

  function tambah(p) {
    setCart((c) => {
      const ada = c.find((i) => i.produk_id === p.id);
      if (ada) return c.map((i) => i.produk_id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { produk_id: p.id, nama: p.nama, harga: Number(p.harga) || 0, qty: 1 }];
    });
  }
  function ubahQty(id, d) {
    setCart((c) => c
      .map((i) => i.produk_id === id ? { ...i, qty: Math.max(0, i.qty + d) } : i)
      .filter((i) => i.qty > 0));
  }

  async function simpan() {
    if (!cart.length) return;
    setErr(''); setBusy(true);
    try {
      const p = await simpanPesanan({
        items: cart, metode: 'hutang', bayar: 0, kembalian: 0,
        kasirId: user.id, namaKasir: user.nama, catatan
      });
      setPesanan(p);
      setCart([]); setCatatan('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pos">
      <div className="pos-left">
        <div className="chips">
          <button className={'chip' + (kelompok === 'Semua' ? ' on' : '')} onClick={() => setKelompok('Semua')}>Semua</button>
          {listKelompok.map((k) => (
            <button key={k} className={'chip' + (kelompok === k ? ' on' : '')} onClick={() => setKelompok(k)}>{k}</button>
          ))}
        </div>
        <div className="grid">
          {tampil.map((p) => (
            <button key={p.id} className="card product" onClick={() => tambah(p)}>
              <div className="p-name">{p.nama}</div>
              <div className="p-price">{uang(p.harga)}</div>
            </button>
          ))}
          {!tampil.length && <p className="muted">Tidak ada menu di kelompok ini.</p>}
        </div>
      </div>

      <div className="pos-right">
        <div className="card kranjang">
          <div className="k-head">Pesanan</div>
          {cart.length === 0 && <p className="muted small">Ketuk menu untuk menambah.</p>}
          {cart.map((it) => (
            <div className="k-row" key={it.produk_id}>
              <div className="k-info">
                <div className="k-name">{it.nama}</div>
                <div className="k-price">{Number(it.harga).toLocaleString('id-ID')}</div>
              </div>
              <div className="k-qty">
                <button className="qbt" onClick={() => ubahQty(it.produk_id, -1)}>−</button>
                <span>{it.qty}</span>
                <button className="qbt" onClick={() => ubahQty(it.produk_id, 1)}>+</button>
              </div>
              <div className="k-sub">{(Number(it.harga) * it.qty).toLocaleString('id-ID')}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="k-head">Nota</div>
          <div className="total-row"><span>Total</span><span className="total-num">{uang(total)}</span></div>
          <input className="input" placeholder="Catatan / nama pelanggan (opsional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          {err && <div className="err">{err}</div>}
          <button className="btn btn-primary btn-block" disabled={busy || !cart.length} onClick={simpan}>
            {busy ? 'Menyimpan…' : 'Simpan & Cetak Nota'}
          </button>
          <p className="muted small" style={{ marginTop: 8 }}>Pembayaran dilakukan nanti lewat halaman <b>Riwayat</b> — klik nota yang belum dibayar.</p>
        </div>
      </div>

      {pesanan && <StrukModal p={pesanan} autoPrint onClose={() => setPesanan(null)} />}
    </div>
  );
}