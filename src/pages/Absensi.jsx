import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ambilAbsensiRentang, ambilKaryawanAbsensi, hapusAbsensi, hariBulan,
  isiSatuHari, LABEL_STATUS, simpanAbsensi, STATUS_ABSENSI, TOKEN_STATUS
} from '../lib/absensiService';
import { exportAbsensi } from '../lib/ekspor';
import { todayStr } from '../lib/format';

const REKAP = [
  { key: 'hadir', label: 'H', title: 'Hadir' },
  { key: 'telat', label: 'T', title: 'Telat' },
  { key: 'sakit', label: 'S', title: 'Sakit' },
  { key: 'izin', label: 'I', title: 'Izin' },
  { key: 'alpha', label: 'A', title: 'Alpha' },
  { key: 'lembur', label: 'L', title: 'Lembur (status lama)' },
  { key: 'menit', label: '+m', title: 'Total menit lembur' }
];

const FORM_KOSONG = { status: 'hadir', menit: '', catatan: '' };

export default function Absensi({ user }) {
  const [bulan, setBulan] = useState(() => todayStr().slice(0, 7));
  const [karyawan, setKaryawan] = useState([]);
  const [records, setRecords] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [pesan, setPesan] = useState('');
  const [sel, setSel] = useState(null);   // { karyawanId, tanggal }
  const [form, setForm] = useState(FORM_KOSONG);
  const [bulkTanggal, setBulkTanggal] = useState(todayStr());
  const [bulkStatus, setBulkStatus] = useState('hadir');

  const hari = useMemo(() => hariBulan(bulan), [bulan]);
  const dari = hari[0]?.tanggal || '';
  const sampai = hari[hari.length - 1]?.tanggal || '';

  const muatAbsensi = useCallback(async () => {
    if (!dari || !sampai) { setRecords([]); return; }
    setMemuat(true);
    try {
      setRecords(await ambilAbsensiRentang(dari, sampai));
    } catch (e) {
      setErr(e.message);
    } finally {
      setMemuat(false);
    }
  }, [dari, sampai]);

  useEffect(() => {
    ambilKaryawanAbsensi()
      .then(setKaryawan)
      .catch((e) => setErr(e.message));
  }, []);
  useEffect(() => { muatAbsensi(); }, [muatAbsensi]);

  const recMap = useMemo(() => {
    const m = new Map();
    for (const r of records) m.set(`${r.karyawan_id}|${r.tanggal}`, r);
    return m;
  }, [records]);

  const rekap = useMemo(() => {
    const out = {};
    for (const k of karyawan) {
      const t = { hadir: 0, telat: 0, sakit: 0, izin: 0, alpha: 0, lembur: 0, menit: 0 };
      for (const r of records) {
        if (r.karyawan_id !== k.id) continue;
        if (Object.prototype.hasOwnProperty.call(t, r.status)) t[r.status]++;
        t.menit += Number(r.menit_lembur) || 0;
      }
      out[k.id] = t;
    }
    return out;
  }, [karyawan, records]);

  const totalRekap = useMemo(() => {
    const t = { hadir: 0, telat: 0, sakit: 0, izin: 0, alpha: 0, lembur: 0, menit: 0 };
    for (const k of karyawan) {
      for (const c of REKAP) t[c.key] += rekap[k.id]?.[c.key] || 0;
    }
    return t;
  }, [karyawan, rekap]);

  const karyawanSel = sel ? karyawan.find((k) => k.id === sel.karyawanId) : null;
  const recSel = sel ? recMap.get(`${sel.karyawanId}|${sel.tanggal}`) : null;

  function bukaSel(k, tanggal) {
    const r = recMap.get(`${k.id}|${tanggal}`);
    setErr(''); setPesan('');
    setSel({ karyawanId: k.id, tanggal });
    setForm({
      status: r?.status || 'hadir',
      menit: r?.menit_lembur > 0 ? String(r.menit_lembur) : '',
      catatan: r?.catatan || ''
    });
  }

  function atur(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function simpanSel() {
    if (!sel) return;
    setErr(''); setPesan(''); setBusy(true);
    try {
      await simpanAbsensi({
        karyawanId: sel.karyawanId,
        tanggal: sel.tanggal,
        status: form.status,
        menitLembur: form.menit,
        catatan: form.catatan,
        userId: user?.id
      });
      setSel(null);
      setPesan(`Absensi ${karyawanSel?.nama || ''} tanggal ${sel.tanggal} tersimpan.`);
      await muatAbsensi();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function kosongkanSel() {
    if (!sel || !recSel) return;
    if (!window.confirm(`Kosongkan absensi ${karyawanSel?.nama} tanggal ${sel.tanggal}?`)) return;
    setErr(''); setPesan(''); setBusy(true);
    try {
      await hapusAbsensi(sel.karyawanId, sel.tanggal);
      setSel(null);
      setPesan('Absensi dikosongkan.');
      await muatAbsensi();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function isiSemua() {
    if (!bulkTanggal || !dari || !sampai) return;
    if (bulkTanggal < dari || bulkTanggal > sampai) {
      setErr('Tanggal borongan harus berada di bulan yang sedang dibuka.');
      return;
    }
    if (!karyawan.length) { setErr('Belum ada karyawan aktif.'); return; }
    const label = LABEL_STATUS[bulkStatus] || bulkStatus;
    if (!window.confirm(
      `Isi ${karyawan.length} karyawan dengan status "${label}" pada ${bulkTanggal}?\n\n` +
      'Catatan ini akan TIMPA absensi lama di tanggal itu, termasuk menit lembur dan catatan.'
    )) return;
    setErr(''); setPesan(''); setBusy(true);
    try {
      const n = await isiSatuHari({
        tanggal: bulkTanggal, status: bulkStatus, karyawan, userId: user?.id
      });
      setPesan(`${n} karyawan diisi dengan status "${label}" pada ${bulkTanggal}.`);
      await muatAbsensi();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function unduhExcel() {
    setErr(''); setPesan(''); setBusy(true);
    try {
      if (!records.length) { setPesan('Tidak ada absensi pada bulan ini.'); return; }
      await exportAbsensi(records, `absensi-${dari}-${sampai}.xlsx`);
      setPesan(`${records.length} catatan absensi diunduh.`);
    } catch (e) {
      setErr(`Gagal mengunduh: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <div className="bar">
          <span className="k-head">Absensi Bulanan</span>
          <button className="btn btn-sm" disabled={busy} onClick={muatAbsensi}>↻ Muat ulang</button>
          <button className="btn btn-sm" disabled={busy || !records.length} onClick={unduhExcel}>⬇️ Excel</button>
        </div>
        <div className="f-row">
          <label className="lbl" style={{ margin: 0 }}>Bulan</label>
          <input className="input" type="month" value={bulan}
            style={{ width: 'auto', flex: 1, minWidth: 150 }}
            onChange={(e) => { setBulan(e.target.value); setSel(null); setPesan(''); }} />
          <span className="muted small">{karyawan.length} karyawan aktif</span>
        </div>
        <p className="muted small" style={{ marginTop: 0 }}>
          Klik sel pada baris karyawan &amp; kolom tanggal untuk mengisi. <b>H</b> hadir,
          <b> T</b> telat, <b>S</b> sakit, <b>I</b> izin, <b>A</b> alpha, <b>L</b> lembur (data lama).
          Angka <span className="absen-ot">+n</span> berarti n menit lembur di hari itu.
          Kolom kanan dihitung otomatis dari sel yang terisi.
        </p>
        {err && <div className="err">{err}</div>}
        {pesan && <div className="ok">{pesan}</div>}
        {memuat && <p className="muted">Memuat absensi…</p>}
        {!memuat && (
          <div className="absen-wrap">
            <table className="absen-grid">
              <thead>
                <tr>
                  <th className="absen-nama">Nama</th>
                  {hari.map((h) => (
                    <th key={h.tanggal} className={h.isToday ? 'hari-ini' : ''} title={h.tanggal}>
                      <span className="absen-dow">{h.dow}</span>{h.hari}
                    </th>
                  ))}
                  {REKAP.map((c) => <th key={c.key} className="absen-rekap" title={c.title}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {karyawan.map((k, i) => (
                  <tr key={k.id}>
                    <td className="absen-nama">
                      <span className="absen-no">{i + 1}.</span> {k.nama}
                      {k.jabatan && <span className="absen-jabatan">{k.jabatan}</span>}
                    </td>
                    {hari.map((h) => {
                      const r = recMap.get(`${k.id}|${h.tanggal}`);
                      const menit = Number(r?.menit_lembur) || 0;
                      const judul = r
                        ? `${LABEL_STATUS[r.status] || r.status}${menit ? ` • lembur ${menit} mnt` : ''}${r.catatan ? ` • ${r.catatan}` : ''}`
                        : 'Kosong — klik untuk isi';
                      return (
                        <td
                          key={h.tanggal}
                          className={`absen-sel${r ? ' st-' + r.status : ''}${sel?.karyawanId === k.id && sel?.tanggal === h.tanggal ? ' terpilih' : ''}`}
                          title={judul}
                          onClick={() => bukaSel(k, h.tanggal)}
                        >
                          {TOKEN_STATUS[r?.status] || <span className="absen-kosong">·</span>}
                          {menit > 0 && <span className="absen-ot">+{menit}</span>}
                        </td>
                      );
                    })}
                    {REKAP.map((c) => (
                      <td key={c.key} className="absen-rekap">{rekap[k.id]?.[c.key] || ''}</td>
                    ))}
                  </tr>
                ))}
                {karyawan.length === 0 && (
                  <tr><td colSpan={hari.length + REKAP.length + 1}>Belum ada karyawan aktif. Tambahkan lewat menu 👥 Karyawan.</td></tr>
                )}
              </tbody>
              {karyawan.length > 0 && (
                <tfoot>
                  <tr>
                    <td className="absen-nama">TOTAL ({karyawan.length})</td>
                    <td colSpan={hari.length} className="absen-tengah">per tanggal</td>
                    {REKAP.map((c) => <td key={c.key} className="absen-rekap">{totalRekap[c.key] || ''}</td>)}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {sel && karyawanSel && (
        <div className="card absen-editor">
          <div className="bar">
            <span className="k-head">{karyawanSel.nama} • {sel.tanggal}</span>
            <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => setSel(null)}>Tutup</button>
          </div>
          <label className="lbl">Status</label>
          <div className="metodes">
            {STATUS_ABSENSI.map((s) => (
              <button key={s.value}
                className={'chip' + (form.status === s.value ? ' on' : '')}
                disabled={busy}
                onClick={() => atur('status', s.value)}>
                {s.token} {s.label}
              </button>
            ))}
          </div>
          <div className="f-row">
            <div style={{ flex: 1 }}>
              <label className="lbl">Menit lembur</label>
              <input className="input" type="number" min="0" placeholder="0"
                value={form.menit} onChange={(e) => atur('menit', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="lbl">Catatan</label>
              <input className="input" placeholder="opsional"
                value={form.catatan} onChange={(e) => atur('catatan', e.target.value)} />
            </div>
          </div>
          <p className="muted small" style={{ marginTop: 0 }}>
            Lembur bukan status terpisah — pilih <b>Hadir</b> lalu isi menitnya. Status <b>Lembur (lama)</b>
            hanya untuk data yang sudah ada sebelumnya.
          </p>
          <div className="f-row">
            <button className="btn btn-primary" disabled={busy} onClick={simpanSel}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </button>
            {recSel && <button className="btn btn-sm btn-ghost" disabled={busy} onClick={kosongkanSel}>Kosongkan</button>}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="bar"><span className="k-head">Isi satu hari untuk semua</span></div>
        <div className="f-row">
          <input className="input" type="date" min={dari} max={sampai} value={bulkTanggal}
            style={{ width: 'auto', flex: 1, minWidth: 150 }}
            onChange={(e) => setBulkTanggal(e.target.value)} />
          <select className="input" style={{ width: 'auto', flex: 1 }} value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}>
            {STATUS_ABSENSI.slice(0, 5).map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button className="btn btn-sm" disabled={busy || !karyawan.length} onClick={isiSemua}>Isi semua</button>
        </div>
        <p className="muted small" style={{ marginTop: 0 }}>
          Pintasan ini menimpa sel yang sudah terisi di tanggal tersebut, termasuk menit lembur dan catatannya.
        </p>
      </div>
    </div>
  );
}
