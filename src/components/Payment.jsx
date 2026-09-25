import { useEffect, useState } from 'react';
import { uang, hitungPajakEdc, PAJAK_EDC_PERSEN } from '../lib/format';
import { ambilItemPesanan } from '../lib/pesananService';

export const METODES_BAYAR = [
  { v: 'tunai', label: '💵 Tunai', desc: 'Bayar langsung dengan uang tunai' },
  { v: 'debit', label: '💳 Kartu/Cardless', desc: 'Pembayaran lewat kartu (mesin EDC)' },
  { v: 'qris', label: '📱 QRIS', desc: 'Scan QR pembayaran' }
];

const METODE_PILIHAN = METODES_BAYAR.map((m) => m.v);

export function hitungBagian(subtotalMenu, metode) {
  const total = metode === 'debit' ? hitungPajakEdc(subtotalMenu) : Number(subtotalMenu) || 0;
  return { total, pajak: total - (Number(subtotalMenu) || 0) };
}

function PaymentModal({ p, onClose, onBayar, onBayarSplit, busy }) {
  const [metode, setMetode] = useState('tunai');
  const [bayar, setBayar] = useState('');
  const [split, setSplit] = useState(false);
  const [items, setItems] = useState(null);
  const [itemErr, setItemErr] = useState('');
  const [jumlahPayer, setJumlahPayer] = useState(2);
  const [assign, setAssign] = useState({});
  const [pecah, setPecah] = useState({});
  const [cara, setCara] = useState({});
  const totalMenu = Number(p.total);
  const pakaiPajak = metode === 'debit';
  const total = pakaiPajak ? hitungPajakEdc(totalMenu) : totalMenu;
  const pajak = total - totalMenu;
  const uangBayar = Number(bayar) || 0;
  const kembalian = Math.max(0, uangBayar - total);

  const itemsi = items || [];
  const itemsSiap = items !== null && items.length > 0;

  useEffect(() => {
    if (!split) return;
    let batal = false;
    setItems(null);
    setItemErr('');
    ambilItemPesanan(p.id)
      .then((rows) => {
        if (batal) return;
        setItems(rows);
        const a = {};
        for (const it of rows) a[it.id] = { 0: Number(it.qty) || 0 };
        setAssign(a);
        setJumlahPayer((n) => Math.min(Math.max(n, 2), Math.max(2, rows.length)));
        const c = {};
        for (let i = 0; i < jumlahPayer; i++) c[i] = 'tunai';
        setCara(c);
        setPecah({});
      })
      .catch((e) => { if (!batal) setItemErr(e.message); });
    return () => { batal = true; };
  }, [split, p.id]);

  function ubahQty(itemId, idx, val) {
    const sumber = itemsi.find((it) => it.id === itemId);
    const maks = Number(sumber?.qty) || 0;
    const diminta = Math.max(0, Math.min(maks, Math.floor(Number(val) || 0)));
    const dist = { ...(assign[itemId] || {}) };
    let kurang = diminta - (Number(dist[idx]) || 0);
    if (kurang > 0) {
      const lain = Object.keys(dist)
        .filter((k) => Number(k) !== idx && (Number(dist[k]) || 0) > 0)
        .sort((a, b) => (Number(dist[b]) || 0) - (Number(dist[a]) || 0));
      for (const k of lain) {
        if (kurang <= 0) break;
        const ambil = Math.min(kurang, Number(dist[k]) || 0);
        dist[k] = (Number(dist[k]) || 0) - ambil;
        kurang -= ambil;
      }
    }
    if (kurang > 0) return;
    dist[idx] = diminta;
    setAssign((a) => ({ ...a, [itemId]: dist }));
  }

  function pilihPayer(itemId, idx) {
    const sumber = itemsi.find((it) => it.id === itemId);
    const qty = Math.floor(Number(sumber?.qty) || 0);
    if (!qty) return;
    setAssign((a) => ({ ...a, [itemId]: { [idx]: qty } }));
  }

  function togglePecah(itemId) {
    setPecah((s) => {
      if (s[itemId]) {
        const next = { ...s };
        delete next[itemId];
        return next;
      }
      const sumber = itemsi.find((it) => it.id === itemId);
      const qty = Math.floor(Number(sumber?.qty) || 0);
      const sekarang = assign[itemId] || {};
      const punya = Object.keys(sekarang).filter((k) => (Number(sekarang[k]) || 0) > 0);
      if (punya.length === 1 && qty > 1) {
        const dari = Number(punya[0]);
        const Elsewhere = (dari + 1) % Math.max(2, jumlahPayer);
        const ambil = Math.floor(qty / 2);
        setAssign((a) => ({ ...a, [itemId]: { [dari]: dari - ambil, [ Elsewhere]: ambil } }));
      }
      return { ...s, [itemId]: true };
    });
  }

  function pindahkanSemua(idx) {
    const a = {};
    for (const it of itemsi) a[it.id] = { [idx]: Number(it.qty) || 0 };
    setAssign(a);
  }

  function splitRata() {
    const a = {};
    let giliran = 0;
    for (const it of itemsi) {
      const qty = Math.floor(Number(it.qty) || 0);
      if (qty <= 0) { a[it.id] = { 0: 0 }; continue; }
      const isi = {};
      const jumlah = Math.min(jumlahPayer, qty);
      for (let k = 0; k < jumlah; k++) {
        const idx = (giliran + k) % jumlahPayer;
        isi[idx] = (isi[idx] || 0) + 1;
      }
      if (qty > jumlah) isi[giliran % jumlahPayer] += qty - jumlah;
      a[it.id] = isi;
      giliran = (giliran + jumlah) % jumlahPayer;
    }
    setAssign(a);
  }

  const payer = [];
  for (let i = 0; i < jumlahPayer; i++) {
    const m = cara[i] || 'tunai';
    let sub = 0;
    const itemsPayer = [];
    for (const it of itemsi) {
      const q = Number(assign[it.id]?.[i]) || 0;
      if (q > 0) {
        sub += (Number(it.harga) || 0) * q;
        itemsPayer.push({ id: it.id, qty: q });
      }
    }
    const { total: tot, pajak: pjk } = hitungBagian(sub, m);
    const b = Number(cara['b' + i]) || 0;
    payer.push({ i, metode: m, subtotal: sub, pajak: pjk, total: tot, bayar: b, items: itemsPayer });
  }

  const totalPajakSplit = payer.reduce((s, x) => s + x.pajak, 0);
  const totalAkhirSplit = payer.reduce((s, x) => s + x.total, 0);
  const splitSiap = itemsSiap && payer.every((x) => x.items.length > 0) && payer.every((x) => !(x.bayar > 0 && x.bayar < x.total));

  function kirim(e) {
    e.preventDefault();
    onBayar(p, metode, bayar, total);
  }

  function kirimSplit(e) {
    e.preventDefault();
    onBayarSplit(
      p,
      payer.map((x) => ({
        items: x.items,
        metode: x.metode,
        total: x.total,
        bayar: x.bayar > 0 ? x.bayar : x.total,
        kembalian: x.metode === 'tunai' ? Math.max(0, x.bayar - x.total) : 0
      }))
    );
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card">
        <div className="k-head">Terima Pembayaran</div>
        <div className="total-line">{p.id} — total <b>{uang(totalMenu)}</b></div>

        <div className="f-row" style={{ marginTop: 8 }}>
          <button className={'btn btn-sm' + (split ? '' : ' btn-ghost')} onClick={() => setSplit(false)}>Bayar biasa</button>
          <button className={'btn btn-sm' + (split ? '' : ' btn-ghost')} onClick={() => setSplit(true)}>Split bill</button>
        </div>

        {!split && (
          <>
            {pakaiPajak && (
              <div className="total-line">
                Tax {PAJAK_EDC_PERSEN}% EDC: <b>{uang(pajak)}</b>
              </div>
            )}
            <div className="total-line" style={{ fontSize: 17 }}>
              Total dibayar: <b>{uang(total)}</b>
            </div>
            <label className="lbl">Metode pembayaran yang dipilih customer</label>
            <div className="pay-methods">
              {METODES_BAYAR.map((m) => (
                <button key={m.v} className={'pay-m' + (metode === m.v ? ' sel' : '')} onClick={() => setMetode(m.v)}>
                  <span className="pay-ic">{m.label.split(' ')[0]}</span>
                  <span className="pay-lb">{m.label}</span>
                  <span className="pay-ds">{m.desc}</span>
                </button>
              ))}
            </div>
            {metode === 'tunai' ? (
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
            ) : (
              <>
                <label className="lbl">Nominal yang tertera di mesin EDC / QRIS</label>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  placeholder={String(total)}
                  value={bayar}
                  onChange={(e) => setBayar(e.target.value)}
                />
                <div className="f-row">
                  <button className="btn btn-sm" onClick={() => setBayar('')}>Kosongkan</button>
                  <button className="btn btn-sm" onClick={() => setBayar(String(total))}>Bayar Pas {uang(total)}</button>
                </div>
                <div className="muted small" style={{ marginTop: 6 }}>
                  {metode === 'debit'
                    ? 'Mesin EDC menambah tax ' + PAJAK_EDC_PERSEN + '% dari ' + uang(totalMenu) + '. Cocokkan nominal di layar mesin, lalu masukkan di atas bila berbeda.'
                    : 'Masukkan nominal yang tertera di aplikasi QRIS.'}
                </div>
              </>
            )}
            <div className="rule" />
            <div className="f-row end">
              <button className="btn" onClick={onClose} disabled={busy}>Batal</button>
              <button className="btn btn-primary" disabled={busy || !metode} onClick={kirim}>{busy ? 'Memproses…' : 'Bayar & Lunas'}</button>
            </div>
            {uangBayar > 0 && uangBayar < total && (
              <div className="err">
                {metode === 'tunai' ? 'Uang kurang' : 'Nominal kurang'} {uang(total - uangBayar)} dari total {uang(total)}.
              </div>
            )}
            {!pakaiPajak && metode !== 'tunai' && (
              <div className="muted small">Total tanpa tax — QRIS tidak menambah pajak.</div>
            )}
          </>
        )}

        {split && (
          <form onSubmit={kirimSplit}>
            <div className="muted small" style={{ marginTop: 8 }}>
              Bagi item ke tiap orang. Qty tiap item harus tetap seperti nota awal.
            </div>
            {itemErr && <div className="err">{itemErr}</div>}
            {!itemsSiap && !itemErr && <p className="muted">Memuat item…</p>}
            {itemsSiap && (
              <>
                <div className="f-row" style={{ marginTop: 8 }}>
                  <span className="k-head" style={{ flex: 1 }}>Jumlah payer</span>
                  <button className="btn btn-sm" type="button" onClick={() => setJumlahPayer((n) => Math.max(2, n - 1))}>−</button>
                  <b>{jumlahPayer}</b>
                  <button
                    className="btn btn-sm"
                    type="button"
                    onClick={() => setJumlahPayer((n) => Math.min(Math.max(2, items.length), n + 1))}
                  >+</button>
                </div>
                <div className="f-row" style={{ marginTop: 4 }}>
                  <button className="btn btn-sm" type="button" onClick={splitRata}>⚡ Split rata</button>
                  <button className="btn btn-sm" type="button" onClick={() => pindahkanSemua(0)}>Semua ke P1</button>
                  <button className="btn btn-sm" type="button" onClick={() => pindahkanSemua(1)}>Semua ke P2</button>
                </div>
                <p className="muted small" style={{ marginTop: 6 }}>
                  Ketuk P1/P2/… pada tiap item untuk memindahkannya ke orang itu. Kalau qty mau dipecah, tekan ⚖️ Pecah lalu ubah angkanya.
                </p>

                {itemsi.map((it) => {
                  const punya = Object.entries(assign[it.id] || {}).filter(([, q]) => Number(q) > 0);
                  return (
                    <div className="mut-detail" key={it.id} style={{ marginTop: 6 }}>
                      <div className="p-row">
                        <b>{it.nama}</b>
                        <span className="p-cell">{it.qty} x {uang(it.harga)} = {uang(it.subtotal)}</span>
                      </div>
                      <div className="f-row" style={{ marginTop: 4 }}>
                        {Array.from({ length: jumlahPayer }, (_, i) => {
                          const punyaP = Number(assign[it.id]?.[i]) || 0;
                          return (
                            <button
                              key={i}
                              type="button"
                              className={'btn btn-sm' + (punyaP > 0 ? ' btn-primary' : '')}
                              onClick={() => pilihPayer(it.id, i)}
                            >
                              P{i + 1}{punyaP > 0 ? ' · ' + punyaP : ''}
                            </button>
                          );
                        })}
                        {Math.floor(Number(it.qty) || 0) > 1 && (
                          <button
                            className={'btn btn-sm' + (pecah[it.id] ? ' btn-primary' : '')}
                            type="button"
                            onClick={() => togglePecah(it.id)}
                          >
                            ⚖️ Pecah
                          </button>
                        )}
                      </div>
                      {(pecah[it.id] || punya.length > 1) && (
                        <div className="f-row" style={{ marginTop: 4 }}>
                          {Array.from({ length: jumlahPayer }, (_, i) => (
                            <label key={i} className="lbl" style={{ flex: 1, margin: 0 }}>
                              P{i + 1}
                              <input
                                className="input"
                                type="number"
                                inputMode="numeric"
                                min="0"
                                max={it.qty}
                                value={assign[it.id]?.[i] ?? 0}
                                onChange={(e) => ubahQty(it.id, i, e.target.value)}
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="rule" />
                {payer.map((x) => (
                  <div className="mut-detail" key={x.i} style={{ marginBottom: 8 }}>
                    <div className="p-row">
                      <b>P{x.i + 1}</b>
                      <span className="p-cell">{uang(x.subtotal)}{x.pajak ? ' + tax ' + uang(x.pajak) : ''} = <b>{uang(x.total)}</b></span>
                    </div>
                    <div className="f-row" style={{ marginTop: 4 }}>
                      {METODE_PILIHAN.map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={'btn btn-sm' + (x.metode === m ? ' btn-primary' : '')}
                          onClick={() => setCara((c) => ({ ...c, [x.i]: m }))}
                        >
                          {m === 'tunai' ? 'Tunai' : m === 'debit' ? 'EDC' : 'QRIS'}
                        </button>
                      ))}
                    </div>
                    <div className="f-row" style={{ marginTop: 4 }}>
                      <input
                        className="input"
                        type="number"
                        inputMode="numeric"
                        placeholder={x.metode === 'tunai' ? 'Uang tunai' : 'Nominal mesin'}
                        value={cara['b' + x.i] ?? ''}
                        onChange={(e) => setCara((c) => ({ ...c, ['b' + x.i]: e.target.value }))}
                      />
                      <button
                        className="btn btn-sm"
                        type="button"
                        onClick={() => setCara((c) => ({ ...c, ['b' + x.i]: String(x.total) }))}
                      >Bayar Pas</button>
                    </div>
                    {x.items.length === 0 && <div className="muted small">P{x.i + 1} belum dapat item.</div>}
                    {x.bayar > 0 && x.bayar < x.total && (
                      <div className="err">P{x.i + 1} kurang {uang(x.total - x.bayar)}.</div>
                    )}
                  </div>
                ))}

                <div className="total-line">Total tanpa 3%: <b>{uang(totalMenu)}</b></div>
                <div className="total-line">Total tax 3%: <b>{uang(totalPajakSplit)}</b></div>
                <div className="total-line" style={{ fontSize: 17 }}>Total semua payer: <b>{uang(totalAkhirSplit)}</b></div>
                {totalAkhirSplit !== totalMenu + totalPajakSplit && (
                  <div className="err">
                    Total payer ({uang(totalAkhirSplit)}) tidak sama dengan nota + tax ({uang(totalMenu + totalPajakSplit)}).
                  </div>
                )}

                <div className="rule" />
                <div className="f-row end">
                  <button className="btn" type="button" onClick={onClose} disabled={busy}>Batal</button>
                  <button className="btn btn-primary" type="submit" disabled={busy || !splitSiap}>
                    {busy ? 'Memproses…' : 'Bayar & Lunas' + (jumlahPayer > 1 ? ' ' + jumlahPayer + ' orang' : '')}
                  </button>
                </div>
                {!splitSiap && itemsSiap && !busy && (
                  <div className="err">
                    {payer.some((x) => x.items.length === 0)
                      ? 'Masih ada payer tanpa item: ' + payer.filter((x) => x.items.length === 0).map((x) => 'P' + (x.i + 1)).join(', ') + '. Ketuk tombol P pada item, atau pakai "Split rata".'
                      : 'Ada nominal payer yang kurang dari totalnya.'}
                  </div>
                )}
                <p className="muted small" style={{ marginTop: 8 }}>
                  Tiap payer disimpan jadi nota terpisah (P1 = {p.id}, P2 = {p.id}-S2, dst) supaya total revenue &amp; pajak tetap akurat.
                </p>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default PaymentModal;