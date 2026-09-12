import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { registerKasir } from '../lib/authService';
import { todayStr } from '../lib/format';

const STATUS = ['hadir', 'sakit', 'izin', 'telat', 'alpha', 'lembur'];

export default function Karyawan({ user }) {
  const [karyawan, setKaryawan] = useState([]);
  const [tab, setTab] = useState('Absen');
  const [nama, setNama] = useState('');
  const [telp, setTelp] = useState('');
  const [jabatan, setJabatan] = useState('kasir');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [namaK, setNamaK] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [absen, setAbsen] = useState({ karyawan_id: '', status: 'hadir', menit_lembur: '', catatan: '' });

  async function muat() {
    const { data } = await supabase.from('resto_karyawan').select('*').order('nama').eq('aktif', true);
    setKaryawan(data || []);
    setAbsen((a) => ({ ...a, karyawan_id: a.karyawan_id || data?.[0]?.id || '' }));
  }
  useEffect(() => { muat(); }, []);

  async function tambahKaryawan() {
    if (!nama.trim()) return;
    setErr(''); setBusy(true);
    try {
      await supabase.from('resto_karyawan').insert({ nama: nama.trim(), telp, jabatan });
      setNama(''); setTelp(''); setJabatan('kasir');
      await muat();
      setOk('Karyawan ditambahkan.');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function tambahKasir() {
    if (!email.trim() || !pw.trim() || !namaK.trim()) { setErr('Isi email, sandi, dan nama.'); return; }
    setErr(''); setBusy(true);
    try {
      await registerKasir(email.trim(), pw, namaK.trim());
      setEmail(''); setPw(''); setNamaK('');
      setOk('Akun kasir dibuat. Pastikan "Confirm email" mati agar bisa langsung login.');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function simpanAbsen() {
    if (!absen.karyawan_id) return;
    setErr(''); setBusy(true);
    try {
      const { error } = await supabase.from('resto_absensi').upsert(
        { karyawan_id: absen.karyawan_id, tanggal: todayStr(), status: absen.status, menit_lembur: Number(absen.menit_lembur) || 0, catatan: absen.catatan || null, user_id: user.id },
        { onConflict: 'karyawan_id,tanggal' }
      );
      if (error) throw new Error(error.message);
      setOk('Absensi tersimpan.');
      setAbsen((a) => ({ ...a, menit_lembur: '', catatan: '' }));
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="page">
      <div className="metodes">
        {['Absen', 'Karyawan', 'Kasir'].map((t) => (
          <button key={t} className={'chip' + (tab === t ? ' on' : '')} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Absen' && (
        <div className="card">
          <div className="k-head">Absensi {todayStr()}</div>
          <label className="lbl">Nama</label>
          <select className="input" value={absen.karyawan_id} onChange={(e) => setAbsen({ ...absen, karyawan_id: e.target.value })}>
            {karyawan.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
          <label className="lbl">Status</label>
          <div className="metodes">
            {STATUS.map((s) => (
              <button key={s} className={'chip' + (absen.status === s ? ' on' : '')} onClick={() => setAbsen({ ...absen, status: s })}>{s}</button>
            ))}
          </div>
          {absen.status === 'lembur' && (
            <>
              <label className="lbl">Menit lembur</label>
              <input className="input" type="number" value={absen.menit_lembur} onChange={(e) => setAbsen({ ...absen, menit_lembur: e.target.value })} />
            </>
          )}
          <label className="lbl">Catatan</label>
          <input className="input" value={absen.catatan} onChange={(e) => setAbsen({ ...absen, catatan: e.target.value })} />
          {err && <div className="err">{err}</div>}{ok && <div className="ok">{ok}</div>}
          <button className="btn btn-primary btn-block" disabled={busy} onClick={simpanAbsen}>{busy ? '…' : 'Simpan Absensi'}</button>
        </div>
      )}

      {tab === 'Karyawan' && (
        <div className="card">
          <div className="k-head">Tambah Karyawan</div>
          <input className="input with-mb" placeholder="Nama" value={nama} onChange={(e) => setNama(e.target.value)} />
          <div className="f-row">
            <input className="input" placeholder="No. HP" value={telp} onChange={(e) => setTelp(e.target.value)} />
            <input className="input" placeholder="Jabatan" value={jabatan} onChange={(e) => setJabatan(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-block" onClick={tambahKaryawan}>Tambah Karyawan</button>
          <div className="rule" />
          <div className="k-head">Daftar Karyawan</div>
          {karyawan.map((k) => (
            <div className="row" key={k.id}>
              <div className="row-main"><b>{k.nama}</b><div className="muted small">{k.jabatan} {k.telp && `• ${k.telp}`}</div></div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Kasir' && user.role === 'admin' && (
        <div className="card">
          <div className="k-head">Tambah Akun Kasir</div>
          <input className="input with-mb" placeholder="Email (untuk login)" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="f-row">
            <input className="input" placeholder="Nama tampilan" value={namaK} onChange={(e) => setNamaK(e.target.value)} />
            <input className="input" placeholder="Sandi" type="text" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          {ok && <div className="ok">{ok}</div>}
          {err && <div className="err">{err}</div>}
          <button className="btn btn-primary btn-block" disabled={busy} onClick={tambahKasir}>{busy ? '…' : 'Buat Akun Kasir'}</button>
        </div>
      )}
    </div>
  );
}