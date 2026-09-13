import { useState, useMemo } from 'react';
import { laporanStok, rekapHarian, transaksiTanggal, absensiRentang, transaksiRentang, mutasiStokBahan, agregasiMutasi } from '../lib/laporanService';
import { exportLaporanStok, exportRekapHarian, exportTransaksi, exportAbsensi, exportMutasiStok } from '../lib/excelExport';
import { uang, todayStr, fmtTgl } from '../lib/format';
import { useSupabaseQuery } from '../lib/useSupabaseQuery';

const TABS = ['Stok', 'Rekap Harian', 'Transaksi', 'Absensi', 'Stok Masuk/Keluar'];
const MODE_LABEL = { harian: 'Harian', mingguan: 'Mingguan', bulanan: 'Bulanan' };

export default function Laporan() {
  const [tab, setTab] = useState('Stok');
  const [dari, setDari] = useState(todayStr());
  const [sampai, setSampai] = useState(todayStr());
  const [tgl, setTgl] = useState(todayStr());
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('harian');
  const [openId, setOpenId] = useState(null);

  const stokQ = useSupabaseQuery(laporanStok);
  const rekapQ = useSupabaseQuery(() => rekapHarian(dari, sampai), [dari, sampai]);
  const transQ = useSupabaseQuery(() => transaksiTanggal(tgl), [tgl]);
  const absQ = useSupabaseQuery(() => absensiRentang(dari, sampai), [dari, sampai]);
  const mutQ = useSupabaseQuery(() => mutasiStokBahan(dari, sampai), [dari, sampai]);

  const mutAgg = useMemo(() =>
    agregasiMutasi(mutQ.data || { masuk: [], keluar: [] }, mode),
    [mutQ.data, mode]);

  const mutTotal = useMemo(() => {
    const t = { masuk: 0, keluar: 0 };
    for (const b of mutAgg.bahan) { t.masuk += b.masuk; t.keluar += b.keluar; }
    return t;
  }, [mutAgg]);

  async function run(name, fn) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  return (
    <div className="page">
      <div className="metodes">
        {TABS.map((t) => (
          <button key={t} className={'chip' + (tab === t ? ' on' : '')} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Stok' && (
        <div className="card">
          <div className="bar">
            <span className="k-head">Laporan Stok</span>
            <button className="btn" disabled={busy} onClick={() => run('s', () => exportLaporanStok(stokQ.data || [], `laporan-stok-${todayStr()}.xlsx`))}>⬇️ Excel</button>
          </div>
          {stokQ.data?.map((r) => (
            <div className="row" key={r.id}>
              <div className="row-main">
                <div><b>{r.nama}</b> <span className="muted small">{r.jenis}</span></div>
                <div className="muted small">{r.kelompok}</div>
              </div>
              <div className="row-end">
                <div>{r.jenis === 'menu' ? uang(r.harga) : `${Number(r.stok).toLocaleString('id-ID')} ${r.satuan}`}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Rekap Harian' && (
        <div className="card">
          <div className="bar">
            <input className="input" type="date" value={dari} onChange={(e) => setDari(e.target.value)} />
            <input className="input" type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} />
            <button className="btn" disabled={busy} onClick={() => run('r', () => exportRekapHarian(rekapQ.data || [], `rekap-harian-${dari}-${sampai}.xlsx`))}>⬇️ Excel</button>
          </div>
          {rekapQ.data?.map((r) => (
            <div className="row" key={r.tanggal}>
              <div className="row-main"><b>{r.tanggal}</b><div className="muted small">{r.jumlah} transaksi</div></div>
              <div className="row-end"><b>{uang(r.total)}</b><span className="muted small">T:{r.tunai} Q:{r.qris} D:{r.debit} H:{r.hutang}</span></div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Transaksi' && (
        <div className="card">
          <div className="bar">
            <input className="input" type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} />
            <button className="btn" disabled={busy} onClick={() => run('t', async () => {
              const all = await transaksiRentang(tgl, tgl);
              await exportTransaksi(all, `transaksi-${tgl}.xlsx`);
            })}>⬇️ Excel</button>
          </div>
          {transQ.data?.map((p) => (
            <div className="row" key={p.id}>
              <div className="row-main">
                <div><b>{p.id}</b></div>
                <div className="muted small">{fmtTgl(p.tanggal)} • {p.nama_kasir || '-'} • {metodeLabel(p.metode)}</div>
              </div>
              <div className="row-end"><b>{uang(p.total)}</b></div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Absensi' && (
        <div className="card">
          <div className="bar">
            <input className="input" type="date" value={dari} onChange={(e) => setDari(e.target.value)} />
            <input className="input" type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} />
            <button className="btn" disabled={busy} onClick={() => run('a', () => exportAbsensi(absQ.data || [], `absensi-${dari}-${sampai}.xlsx`))}>⬇️ Excel</button>
          </div>
          {absQ.data?.map((r) => (
            <div className="row" key={r.id}>
              <div className="row-main"><b>{r.karyawan?.nama}</b><div className="muted small">{r.tanggal}{r.menit_lembur ? ` • lembur ${r.menit_lembur} mnt` : ''}</div></div>
              <div className="row-end"><span className="badge">{r.status}</span></div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Stok Masuk/Keluar' && (
        <div className="card">
          <div className="bar">
            <input className="input" type="date" value={dari} onChange={(e) => setDari(e.target.value)} />
            <input className="input" type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} />
            <button className="btn" disabled={busy} onClick={async () => {
              const rows = mutAgg.bahan.flatMap((b) =>
                mutAgg.periode.map((p) => ({ periode: p, bahan: b.nama, masuk: b.per[p].masuk, keluar: b.per[p].keluar }))
              );
              await exportMutasiStok(rows, `mutasi-stok-${dari}-${sampai}-${mode}.xlsx`);
            }}>⬇️ Excel</button>
          </div>
          <div className="metodes">
            {Object.keys(MODE_LABEL).map((m) => (
              <button key={m} className={'chip' + (mode === m ? ' on' : '')} onClick={() => setMode(m)}>{MODE_LABEL[m]}</button>
            ))}
          </div>
          <div className="f-row">
            <span className="total-line">Total masuk: <b>{Number(mutTotal.masuk).toLocaleString('id-ID')}</b></span>
            <span className="total-line">Total keluar: <b>{Number(mutTotal.keluar).toLocaleString('id-ID')}</b></span>
          </div>
          <p className="muted small">Rentang {dari} s.d. {sampai} — {mutAgg.periode.length} periode ({MODE_LABEL[mode]}). Klik bahan untuk rincian per periode.</p>
          {mutAgg.bahan.length === 0 && <p className="muted">Belum ada mutasi pada rentang ini.</p>}
          {mutAgg.bahan.map((b) => (
            <div key={b.bahan_id}>
              <div className="row" onClick={() => setOpenId(openId === b.bahan_id ? null : b.bahan_id)}>
                <div className="row-main">
                  <div><b>{b.nama}</b></div>
                  <div className="muted small">{mutAgg.periode.length} periode</div>
                </div>
                <div className="row-end">
                  <div><b>{Number(b.masuk).toLocaleString('id-ID')}</b> masuk</div>
                  <div><b>{Number(b.keluar).toLocaleString('id-ID')}</b> keluar</div>
                </div>
              </div>
              {openId === b.bahan_id && (
                <div className="mut-detail">
                  {mutAgg.periode.map((p) => (
                    <div className="k-row" key={p}>
                      <div className="muted small">{p}</div>
                      <div>+{Number(b.per[p].masuk).toLocaleString('id-ID')} masuk</div>
                      <div>−{Number(b.per[p].keluar).toLocaleString('id-ID')} keluar</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}