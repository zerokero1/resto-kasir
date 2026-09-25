import { useState } from 'react';
import { laporanHarian } from '../lib/laporanService';
import { exportLaporanHarian } from '../lib/excelExport';
import { uang, todayStr, metodeLabel, jamTgl } from '../lib/format';
import { useSupabaseQuery } from '../lib/useSupabaseQuery';

const BAGIAN = ['Kitchen', 'Bar', 'Kopi'];
const METODE = ['tunai', 'qris', 'debit', 'hutang'];

export default function LaporanHarian() {
  const [tgl, setTgl] = useState(todayStr());
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState(null);
  const q = useSupabaseQuery(() => laporanHarian(tgl), [tgl]);
  const d = q.data;

  async function unduh() {
    setBusy(true);
    try { await exportLaporanHarian(d, `laporan-harian-${tgl}.xlsx`); } finally { setBusy(false); }
  }

  return (
    <div className="page">
      <div className="card">
        <div className="bar">
          <span className="k-head">Laporan Harian</span>
          <input className="input" type="date" value={tgl} max={todayStr()} onChange={(e) => { setTgl(e.target.value); setOpenId(null); }} />
          <button className="btn" disabled={busy || !d} onClick={unduh}>⬇️ Excel</button>
        </div>
        {q.error && <div className="err">{q.error.message}</div>}
        {q.loading && <p className="muted">Memuat…</p>}
      </div>

      {d && (
        <>
          <div className="card">
            <div className="k-head">Ringkasan {d.tanggal}</div>
            <div className="mut-detail">
              <div className="p-row" style={{ fontSize: 16 }}>
                <b>Total Revenue tanpa 3%</b>
                <span className="p-cell" style={{ fontSize: 16 }}><b>{uang(d.totalTanpaPajak)}</b></span>
              </div>
              <div className="p-row" style={{ fontSize: 16 }}>
                <b>Total Revenue 3%</b>
                <span className="p-cell" style={{ fontSize: 16 }}><b>{uang(d.totalPajak3)}</b></span>
              </div>
              <div className="p-row" style={{ fontSize: 18, borderTop: '2px solid #333' }}>
                <b>TOTAL REVENUE</b>
                <span className="p-cell" style={{ fontSize: 18 }}><b>{uang(d.totalRevenue)}</b></span>
              </div>
              <div className="p-row muted small">
                <span>{d.jumlahNota} transaksi • {d.itemTerjual} item terjual</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="k-head">Pendapatan per Bagian</div>
            {BAGIAN.map((b) => {
              const v = d.bagian[b] || 0;
              const pct = d.totalTanpaPajak ? (v / d.totalTanpaPajak) * 100 : 0;
              return (
                <div className="row" key={b}>
                  <div className="row-main">
                    <div><b>{b}</b></div>
                    <div className="muted small">{Number(d.jumlahItem[b] || 0).toLocaleString('id-ID')} item • {pct.toFixed(1)}%</div>
                  </div>
                  <div className="row-end"><b>{uang(v)}</b></div>
                </div>
              );
            })}
            <div className="row">
              <div className="row-main"><div><b>Jumlah menu</b></div></div>
              <div className="row-end"><b>{uang(BAGIAN.reduce((s, b) => s + (d.bagian[b] || 0), 0))}</b></div>
            </div>
          </div>

          <div className="card">
            <div className="k-head">Metode Pembayaran</div>
            {METODE.map((m) => (
              <div className="row" key={m}>
                <div className="row-main">
                  <div><b>{metodeLabel(m)}</b></div>
                  <div className="muted small">{d.jumlahMetode[m] || 0} transaksi</div>
                </div>
                <div className="row-end"><b>{uang(d.metode[m] || 0)}</b></div>
              </div>
            ))}
            <p className="muted small">Tax 3% hanya dari pembayaran EDC (Kartu/Cardless). Tunai, QRIS, dan Belum Bayar tidak menambah pajak.</p>
          </div>

          {d.perJam.length > 0 && (
            <div className="card">
              <div className="k-head">Penjualan per Jam</div>
              {d.perJam.map((h) => (
                <div className="row" key={h.jam}>
                  <div className="row-main">
                    <div><b>{h.jam}:00</b></div>
                    <div className="muted small">{h.jumlah} transaksi • tax {uang(h.totalPajak3)}</div>
                  </div>
                  <div className="row-end"><b>{uang(h.total)}</b></div>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div className="k-head">Rincian per Kelompok Menu</div>
            {d.perKelompok.length === 0 && <p className="muted">Tidak ada penjualan pada tanggal ini.</p>}
            {d.perKelompok.map((k) => (
              <div className="row" key={k.kelompok}>
                <div className="row-main">
                  <div><b>{k.kelompok}</b> <span className="badge">{k.bagian}</span></div>
                  <div className="muted small">{Number(k.qty).toLocaleString('id-ID')} item</div>
                </div>
                <div className="row-end"><b>{uang(k.omzet)}</b></div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="k-head">Daftar Transaksi ({d.pesanan.length})</div>
            {d.pesanan.length === 0 && <p className="muted">Belum ada transaksi pada {d.tanggal}.</p>}
            {d.pesanan.map((p) => (
              <div key={p.id}>
                <div className="row" onClick={() => setOpenId(openId === p.id ? null : p.id)}>
                  <div className="row-main">
                    <div><b>{p.id}</b></div>
                    <div className="muted small">
                      {jamTgl(p.tanggal)} • {metodeLabel(p.metode)} • {p.nama_kasir || '-'}
                      {p.lunas === false ? ' • BELUM BAYAR' : ''}
                    </div>
                  </div>
                  <div className="row-end"><b>{uang(p.total)}</b></div>
                </div>
                {openId === p.id && (
                  <div className="mut-detail">
                    {p.item.map((it, i) => (
                      <div className="p-row" key={i}>
                        <span>{it.qty}x {it.nama} <span className="badge">{it.bagian}</span></span>
                        <span className="p-cell">{uang(it.subtotal)}</span>
                      </div>
                    ))}
                    <div className="p-row muted small"><span>Bayar / Kembalian</span><span className="p-cell">{uang(p.bayar)} / {uang(p.kembalian)}</span></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
