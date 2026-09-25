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
        setCara({ 0: 'tunai', 1: 'debit' });
      })
      .catch((e) => { if (!batal) setItemErr(e.message); });
    return () => { batal = true; };
  }, [split, p.id]);

  function ubahQty(itemId, idx, val) {
    const sumber = items.find((it) => it.id === itemId);
    const maks = Number(sumber?.qty) || 0;
    let v = Math.max(0, Math.min(maks, Number(val) || 0));
    const lain = Object.entries(assign[itemId] || {})
      .filter(([k]) => Number(k) !== idx)
      .reduce((s, [, q]) => s + (Number(q) || 0), 0);
    v = Math.max(0, Math.min(v, maks - lain));
    setAssign((a) => ({ ...a, [itemId]: { ...(a[itemId] || {}), [idx]: v } }));
  }

  function pindahkanSemua(idx) {
    const a = {};
    for (const it of items) a[it.id] = { ...(assign[it.id] || {}), [idx]: Number(it.qty) || 0 };
    setAssign(a);
  }

  const payer = [];
  for (let i = 0; i < jumlahPayer; i++) {
    const m = cara[i] || 'tunai';
    let sub = 0;
    const itemsPayer = [];
    for (const it of items) {
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
                  <button className="btn btn-sm" type="button" onClick={() => pindahkanSemua(0)}>Semua ke P1</button>
                  <button className="btn btn-sm" type="button" onClick={() => pindahkanSemua(1)}>Semua ke P2</button>
                </div>

                {itemsi.map((it) => (
                  <div className="mut-detail" key={it.id} style={{ marginTop: 6 }}>
                    <div className="p-row">
                      <b>{it.nama}</b>
                      <span className="p-cell">{it.qty} x {uang(it.harga)}</span>
                    </div>
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
                  </div>
                ))}

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
                    {x.items.length === 0 && <div className="err">P{x.i + 1} belum dapat item.</div>}
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