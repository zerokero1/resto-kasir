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

function PaymentModal({ p, onClose, onBayar, onBayarSplit, busy, mulaiSplit }) {
  const [metode, setMetode] = useState('tunai');
  const [bayar, setBayar] = useState('');
  const [split, setSplit] = useState(!!mulaiSplit);
  const [items, setItems] = useState(null);
  const [itemErr, setItemErr] = useState('');
  const [jumlahPayer, setJumlahPayer] = useState(2);
  const [assign, setAssign] = useState({});
  const [step, setStep] = useState(0);
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
        setStep(0);
        setJumlahPayer((n) => Math.min(Math.max(n, 2), Math.max(2, rows.length)));
        const c = {};
        for (let i = 0; i < jumlahPayer; i++) c[i] = 'tunai';
        setCara(c);
      })
      .catch((e) => { if (!batal) setItemErr(e.message); });
    return () => { batal = true; };
  }, [split, p.id]);

  // Alokasi item diikat ke payer yang sedang diisi (step). Payer sebelumnya
  // terkunci supaya tidak bisa diubah diam-diam; untuk memperbaikinya, kasir
  // menekan "Ubah" pada payer itu lalu dialokasikan ulang.
  function alokasi(itemId) {
    return (assign[itemId] || {})[step] || 0;
  }

  function sudahDibagi(itemId) {
    return Object.entries(assign[itemId] || {})
      .filter(([i, q]) => Number(i) !== step && Number(q) > 0)
      .map(([i, q]) => 'P' + (Number(i) + 1) + (Number(q) > 1 ? '·' + q : ''));
  }

  function ambilItem(itemId) {
    const sumber = itemsi.find((it) => it.id === itemId);
    const total = Math.floor(Number(sumber?.qty) || 0);
    const terpakai = Object.values(assign[itemId] || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    const sisa = total - terpakai;
    if (sisa <= 0) return;
    setAssign((a) => ({ ...a, [itemId]: { ...(a[itemId] || {}), [step]: (Number(a[itemId]?.[step]) || 0) + sisa } }));
  }

  function lepasItem(itemId) {
    setAssign((a) => {
      const next = { ...(a[itemId] || {}) };
      delete next[step];
      return { ...a, [itemId]: next };
    });
  }

  function ubahQtyPayer(itemId, val) {
    const sumber = itemsi.find((it) => it.id === itemId);
    const total = Math.floor(Number(sumber?.qty) || 0);
    const terpakaiSendiri = Number(assign[itemId]?.[step]) || 0;
    const terpakaiLain = Object.entries(assign[itemId] || {})
      .filter(([i]) => Number(i) !== step)
      .reduce((s, [, v]) => s + (Number(v) || 0), 0);
    const maks = total - terpakaiLain;
    const v = Math.max(0, Math.min(maks, Math.floor(Number(val) || 0)));
    setAssign((a) => ({ ...a, [itemId]: { ...(a[itemId] || {}), [step]: v } }));
  }

  function ambilSemuaSisa() {
    setAssign((a) => {
      const next = { ...a };
      for (const it of itemsi) {
        const total = Math.floor(Number(it.qty) || 0);
        const terpakai = Object.values(next[it.id] || {}).reduce((s, v) => s + (Number(v) || 0), 0);
        const sisa = total - terpakai;
        next[it.id] = { ...(next[it.id] || {}), [step]: (Number(next[it.id]?.[step]) || 0) + Math.max(0, sisa) };
      }
      return next;
    });
  }

  const terkunci = step > 0 || jumlahPayer === 1;
  const bisaUbahPayerLama = step > 0;

  function kePayer(n) {
    if (n < 0 || n >= jumlahPayer) return;
    setStep(n);
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
  const semuaTerbagi = itemsi.every((it) => {
    const jml = Object.values(assign[it.id] || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    return jml === Math.floor(Number(it.qty) || 0);
  });
  const sisaBelumDibagi = itemsi.reduce((s, it) => {
    const total = Math.floor(Number(it.qty) || 0);
    const jml = Object.values(assign[it.id] || {}).reduce((a, v) => a + (Number(v) || 0), 0);
    return s + (total - jml);
  }, 0);
  const stepSiap = payer[step] && payer[step].items.length > 0;
  const kurangBayar = payer.some((x) => x.bayar > 0 && x.bayar < x.total);
  const terakhir = step === jumlahPayer - 1;
  const splitSiap = itemsSiap && semuaTerbagi && jumlahPayer > 0 && !kurangBayar;

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
        {split && itemsSiap && (
          <div className="total-line" style={{ fontWeight: 700 }}>
            Mode Split Bill — tiap orang jadi 1 nota baru.
          </div>
        )}

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
              Tentukan isi pesanan tiap orang. Qty tiap item harus tetap sama seperti nota {p.id}.
            </div>
            {itemErr && <div className="err">{itemErr}</div>}
            {!itemsSiap && !itemErr && <p className="muted">Memuat item…</p>}
            {itemsSiap && (
              <>
                <div className="f-row" style={{ marginTop: 8 }}>
                  <span className="k-head" style={{ flex: 1 }}>Jumlah orang</span>
                  <button className="btn btn-sm" type="button" disabled={terkunci} onClick={() => setJumlahPayer((n) => Math.max(2, n - 1))}>−</button>
                  <b>{jumlahPayer}</b>
                  <button
                    className="btn btn-sm"
                    type="button"
                    disabled={terkunci || jumlahPayer >= Math.max(2, itemsi.length)}
                    onClick={() => setJumlahPayer((n) => Math.min(Math.max(2, itemsi.length), n + 1))}
                  >+</button>
                </div>

                <div className="rule" />
                <div className="k-head" style={{ marginBottom: 6 }}>
                  Orang {step + 1} dari {jumlahPayer} — pilih apa yang dia bayar
                </div>
                <div className="f-row">
                  {payer.map((x) => {
                    const aktif = x.i === step;
                    const jmlItem = x.items.length;
                    const jmlQty = x.items.reduce((s, y) => s + (Number(y.qty) || 0), 0);
                    return (
                      <button
                        key={x.i}
                        type="button"
                        className={'btn btn-sm' + (aktif ? ' btn-primary' : '')}
                        onClick={() => kePayer(x.i)}
                      >
                        P{x.i + 1}{jmlItem > 0 ? ' · ' + jmlQty : ''}
                      </button>
                    );
                  })}
                </div>

                <div className="muted small" style={{ marginTop: 6 }}>
                  Sisa belum dibagi: <b>{sisaBelumDibagi}</b> item. Tekan "Ambil" untuk masukkan item ke P{step + 1}.
                </div>

                {itemsi.map((it) => {
                  const punyaSaya = alokasi(it.id);
                  const punyaLain = sudahDibagi(it.id);
                  const habis = punyaSaya <= 0 && punyaLain.length > 0;
                  return (
                    <div className="mut-detail" key={it.id} style={{ marginTop: 6 }}>
                      <div className="p-row">
                        <b>{it.nama}</b>
                        <span className="p-cell">{it.qty} x {uang(it.harga)} = {uang(it.subtotal)}</span>
                      </div>
                      <div className="f-row" style={{ marginTop: 4 }}>
                        {punyaSaya > 0 ? (
                          <>
                            <span className="muted small">P{step + 1} bayar {punyaSaya}</span>
                            <button className="btn btn-sm" type="button" onClick={() => lepasItem(it.id)}>Lepas</button>
                          </>
                        ) : (
                          <button
                            className="btn btn-sm"
                            type="button"
                            disabled={habis || semuaTerbagi}
                            onClick={() => ambilItem(it.id)}
                          >
                            {habis ? 'Sudah di P' + punyaLain.join('+P').replace('P', '') : '✓ Ambil'}
                          </button>
                        )}
                        {Math.floor(Number(it.qty) || 0) > 1 && punyaSaya > 0 && (
                          <label className="lbl" style={{ flex: 1, margin: 0, maxWidth: 90 }}>
                            qty
                            <input
                              className="input"
                              type="number"
                              inputMode="numeric"
                              min="0"
                              max={it.qty}
                              value={punyaSaya}
                              onChange={(e) => ubahQtyPayer(it.id, e.target.value)}
                            />
                          </label>
                        )}
                      </div>
                      {punyaLain.length > 0 && <div className="muted small">Sudah diambil P{punyaLain.join(' & P')}</div>}
                    </div>
                  );
                })}

                <div className="f-row" style={{ marginTop: 8 }}>
                  <button className="btn btn-sm" type="button" onClick={ambilSemuaSisa}>Ambil semua sisa untuk P{step + 1}</button>
                </div>

                <div className="rule" />
                <div className="p-row">
                  <b>Bayar P{step + 1}</b>
                  <span className="p-cell">{uang(payer[step]?.subtotal)}{payer[step]?.pajak ? ' + tax ' + uang(payer[step].pajak) : ''} = <b>{uang(payer[step]?.total || 0)}</b></span>
                </div>
                <div className="f-row" style={{ marginTop: 4 }}>
                  {METODE_PILIHAN.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={'btn btn-sm' + ((cara[step] || 'tunai') === m ? ' btn-primary' : '')}
                      onClick={() => setCara((c) => ({ ...c, [step]: m }))}
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
                    placeholder={(cara[step] || 'tunai') === 'tunai' ? 'Uang tunai' : 'Nominal mesin'}
                    value={cara['b' + step] ?? ''}
                    onChange={(e) => setCara((c) => ({ ...c, ['b' + step]: e.target.value }))}
                  />
                  <button
                    className="btn btn-sm"
                    type="button"
                    onClick={() => setCara((c) => ({ ...c, ['b' + step]: String(payer[step]?.total || 0) }))}
                  >Bayar Pas</button>
                </div>
                {payer[step]?.bayar > 0 && payer[step].bayar < payer[step].total && (
                  <div className="err">P{step + 1} kurang {uang(payer[step].total - payer[step].bayar)}.</div>
                )}

                <div className="total-line">Total semua orang: <b>{uang(totalAkhirSplit)}</b></div>
                {totalAkhirSplit !== totalMenu + totalPajakSplit && (
                  <div className="err">
                    Total yang dibagi ({uang(totalAkhirSplit)}) tidak sama dengan nota + tax ({uang(totalMenu + totalPajakSplit)}).
                  </div>
                )}
                {!semuaTerbagi && (
                  <div className="muted small">Masih ada {sisaBelumDibagi} item yang belum masuk payer mana pun.</div>
                )}

                <div className="rule" />
                <div className="f-row end">
                  <button className="btn" type="button" onClick={onClose} disabled={busy}>Batal</button>
                  {!terakhir && (
                    <button className="btn" type="button" disabled={busy || !stepSiap} onClick={() => kePayer(step + 1)}>
                      Lanjut ke P{step + 2} →
                    </button>
                  )}
                  <button className="btn btn-primary" type="submit" disabled={busy || !splitSiap || !terakhir}>
                    {busy ? 'Memproses…' : 'Simpan jadi ' + jumlahPayer + ' nota baru'}
                  </button>
                </div>
                {itemsSiap && !busy && !terakhir && !stepSiap && (
                  <div className="err">P{step + 1} belum dapat item. Tekan "Ambil" pada minimal satu item.</div>
                )}
                {itemsSiap && !busy && terakhir && !splitSiap && (
                  <div className="err">
                    {!semuaTerbagi
                      ? 'Masih ada ' + sisaBelumDibagi + ' item belum dibagi — kembali ke P1 untuk membagikannya.'
                      : kurangBayar ? 'Ada nominal yang kurang dari totalnya.' : ''}
                  </div>
                )}
                <p className="muted small" style={{ marginTop: 8 }}>
                  Nota {p.id} akan diganti {jumlahPayer} nota bernomor baru ({jumlahPayer} orang), lalu dicetak satu per satu dari daftar
                  nota. Stok bahan tidak dipotong dua kali.
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