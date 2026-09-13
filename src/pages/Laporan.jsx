import { useState } from 'react';
import { laporanStok, rekapHarian, transaksiTanggal, absensiRentang, transaksiRentang } from '../lib/laporanService';
import { exportLaporanStok, exportRekapHarian, exportTransaksi, exportAbsensi } from '../lib/excelExport';
import { uang, todayStr, fmtTgl, metodeLabel } from '../lib/format';
import { useSupabaseQuery } from '../lib/useSupabaseQuery';

const TABS = ['Stok', 'Rekap Harian', 'Transaksi', 'Absensi'];

export default function Laporan() {
  const [tab, setTab] = useState('Stok');
  const [dari, setDari] = useState(todayStr());
  const [sampai, setSampai] = useState(todayStr());
  const [tgl, setTgl] = useState(todayStr());
  const [busy, setBusy] = useState(false);

  const stokQ = useSupabaseQuery(laporanStok);
  const rekapQ = useSupabaseQuery(() => rekapHarian(dari, sampai), [dari, sampai]);
  const transQ = useSupabaseQuery(() => transaksiTanggal(tgl), [tgl]);
  const absQ = useSupabaseQuery(() => absensiRentang(dari, sampai), [dari, sampai]);

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
    </div>
  );
}