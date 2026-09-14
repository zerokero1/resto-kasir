import { useState } from 'react';
import { rekapPeriode } from '../lib/laporanService';
import { exportRekapHarian } from '../lib/excelExport';
import { uang, todayStr } from '../lib/format';
import { useSupabaseQuery } from '../lib/useSupabaseQuery';

const MODE_LABEL = { harian: 'Harian', mingguan: 'Mingguan', bulanan: 'Bulanan' };

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function labelPeriode(periode, mode) {
  if (mode === 'harian') return periode;
  if (mode === 'bulanan') {
    const [y, m] = periode.split('-');
    return new Date(y, Number(m) - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }
  return `Minggu ke-${periode.slice(5)} (${periode.slice(0, 4)})`;
}

export default function Dashboard() {
  const [mode, setMode] = useState('harian');
  const [dari, setDari] = useState(daysAgo(29));
  const [sampai, setSampai] = useState(todayStr());
  const [busy, setBusy] = useState(false);

  const rekapQ = useSupabaseQuery(() => rekapPeriode(dari, sampai, mode), [dari, sampai, mode]);

  const rows = rekapQ.data || [];
  const total = rows.reduce((s, r) => s + r.total, 0);
  const jumlah = rows.reduce((s, r) => s + r.jumlah, 0);
  const tots = { tunai: 0, qris: 0, debit: 0, hutang: 0 };
  for (const r of rows) for (const k of Object.keys(tots)) tots[k] += r[k] || 0;

  async function run(fn) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  return (
    <div className="page">
      <div className="card">
        <div className="bar">
          <span className="k-head">Dashboard Pemasukan</span>
          <input className="input" type="date" value={dari} onChange={(e) => setDari(e.target.value)} />
          <input className="input" type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} />
          <button className="btn" disabled={busy} onClick={() => run(async () => {
            await exportRekapHarian(rekapQ.data || [], `dashboard-pemasukan-${dari}-${sampai}.xlsx`);
            })}>⬇️ Excel</button>
        </div>
        <div className="metodes">
          {Object.keys(MODE_LABEL).map((m) => (
            <button key={m} className={'chip' + (mode === m ? ' on' : '')} onClick={() => setMode(m)}>{MODE_LABEL[m]}</button>
          ))}
        </div>

        <div className="dash-cards">
          <div className="dash-card">
            <div className="dash-label">Pemasukan</div>
            <div className="dash-val">{uang(total)}</div>
            <div className="dash-sub">{jumlah} transaksi</div>
          </div>
          <div className="dash-card">
            <div className="dash-label">Rata-rata per {MODE_LABEL[mode].toLowerCase()}</div>
            <div className="dash-val">{uang(rows.length ? total / rows.length : 0)}</div>
            <div className="dash-sub">{rows.length} periode</div>
          </div>
          <div className="dash-card">
            <div className="dash-label">Tunai</div>
            <div className="dash-val">{uang(tots.tunai)}</div>
            <div className="dash-sub">{total ? Math.round((tots.tunai / total) * 100) : 0}%</div>
          </div>
          <div className="dash-card">
            <div className="dash-label">QRIS</div>
            <div className="dash-val">{uang(tots.qris)}</div>
            <div className="dash-sub">{total ? Math.round((tots.qris / total) * 100) : 0}%</div>
          </div>
          <div className="dash-card">
            <div className="dash-label">Debit</div>
            <div className="dash-val">{uang(tots.debit)}</div>
            <div className="dash-sub">{total ? Math.round((tots.debit / total) * 100) : 0}%</div>
          </div>
          <div className="dash-card">
            <div className="dash-label">Hutang</div>
            <div className="dash-val">{uang(tots.hutang)}</div>
            <div className="dash-sub">{total ? Math.round((tots.hutang / total) * 100) : 0}%</div>
          </div>
        </div>
      </div>

      <div className="card">
        <span className="k-head">Rincian per {MODE_LABEL[mode].toLowerCase()}</span>
        <p className="muted small">Rentang {dari} s.d. {sampai}</p>
        {rows.length === 0 && <p className="muted">Belum ada transaksi pada rentang/mode ini.</p>}
        {rows.map((r) => (
          <div className="row" key={r.periode}>
            <div className="row-main">
              <b>{labelPeriode(r.periode, mode)}</b>
              <div className="muted small">{r.jumlah} transaksi • T:{uang(r.tunai)} Q:{uang(r.qris)} D:{uang(r.debit)} H:{uang(r.hutang)}</div>
            </div>
            <div className="row-end"><b>{uang(r.total)}</b></div>
          </div>
        ))}
      </div>
    </div>
  );
}