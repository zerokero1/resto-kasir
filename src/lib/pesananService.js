import { supabase } from './supabase';
import { tglWib } from './format';

/**
 * Nomor nota harian "TRX-YYYYMMDD-NNN" dengan tanggal versi WIB.
 * Angka diambil dari NOMOR TERTINGGI yang sudah ada (bukan jumlah baris), lalu
 * dilewati ke nomor berikutnya — jumlah baris bisa mundur saat ada nota dihapus
 * sehingga sering menghasilkan ID yang bentrok.
 *
 * tanggalAcuan dipakai saat membagi nota: nomor barunya mengikuti tanggal nota
 * asal, bukan tanggal hari ini, supaya split nota kemarin tetap tercatat di
 * laporan kemarin.
 */
export async function idPesananBaru(tanggalAcuan) {
  const acuan = tanggalAcuan ? new Date(tanggalAcuan) : new Date();
  const prefix = 'TRX-' + tglWib(acuan.toISOString()).replace(/-/g, '') + '-';
  const { data, error } = await supabase
    .from('resto_pesanan')
    .select('id')
    .gte('id', prefix)
    .lt('id', prefix + '\uffff');
  if (error) throw new Error(error.message);
  let maks = 0;
  for (const r of data || []) {
    // abaikan nota anak split ("...-S2")
    const m = String(r.id).slice(prefix.length).match(/^(\d{3})$/);
    if (m) maks = Math.max(maks, Number(m[1]));
  }
  return prefix + String(maks + 1).padStart(3, '0');
}

export async function simpanPesanan({ items, bayar, kembalian, metode, kasirId, namaKasir, catatan }) {
  if (!Array.isArray(items) || !items.length) throw new Error('Pesanan kosong — tidak bisa disimpan.');
  const total = items.reduce((s, i) => s + (Number(i.harga) || 0) * (Number(i.qty) || 1), 0);
  if (total <= 0) throw new Error('Total pesanan Rp 0 — periksa itemnya.');

  // Nomor nota dihitung di luar database, jadi dua kasir yang menekan simpan
  // bersamaan bisa mendapat nomor yang sama. Jika PostgreSQL menolak dengan
  // 23505 (duplicate key), ambil nomor baru lalu coba lagi.
  const body = (id) => ({
    id,
    total,
    bayar: bayar ?? total,
    kembalian: kembalian ?? 0,
    metode,
    user_id: kasirId,
    nama_kasir: namaKasir,
    catatan: catatan || null,
    lunas: metode !== 'hutang',
    tanggal_lunas: metode !== 'hutang' ? new Date().toISOString() : null
  });

  let pesanan = null;
  let pesanError = '';
  for (let percobaan = 1; percobaan <= 6; percobaan++) {
    const id = await idPesananBaru();
    const { data, error } = await supabase.from('resto_pesanan').insert(body(id)).select().single();
    if (!error) { pesanan = data; break; }
    pesanError = error.message;
    if (error.code === '23505') continue;
    throw new Error(error.message);
  }
  if (!pesanan) {
    throw new Error('Gagal membuat nomor nota karena dipakai kasir lain. Silakan tekan Simpan sekali lagi. (' + pesanError + ')');
  }
  const id = pesanan.id;

  const itemRows = items.map((i) => ({
    pesanan_id: id,
    produk_id: i.produk_id,
    nama: i.nama,
    harga: i.harga,
    qty: i.qty,
    subtotal: (Number(i.harga) || 0) * (Number(i.qty) || 1)
  }));
  const { error: e2 } = await supabase.from('resto_pesanan_item').insert(itemRows);
  if (e2) throw new Error(e2.message);

  await kurangiStokBahan(items);
  return pesanan;
}

function notaBisaDiubah(pesanan) {
  return pesanan.lunas === false;
}

export async function ambilItemPesanan(pesananId) {
  const { data, error } = await supabase
    .from('resto_pesanan_item')
    .select('*')
    .eq('pesanan_id', pesananId)
    .order('id', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function tambahItemPesanan(pesanan, items) {
  if (!items.length) return pesanan;
  if (!notaBisaDiubah(pesanan)) throw new Error('Nota sudah lunas — tidak bisa ditambah.');

  const tambahan = items.reduce((s, i) => s + (Number(i.harga) || 0) * (Number(i.qty) || 1), 0);
  const totalBaru = Number(pesanan.total) + tambahan;

  const rows = items.map((i) => ({
    pesanan_id: pesanan.id,
    produk_id: i.produk_id,
    nama: i.nama,
    harga: i.harga,
    qty: i.qty,
    subtotal: (Number(i.harga) || 0) * (Number(i.qty) || 1)
  }));
  const { error: e1 } = await supabase.from('resto_pesanan_item').insert(rows);
  if (e1) throw new Error(e1.message);

  const { data, error: e2 } = await supabase
    .from('resto_pesanan')
    .update({ total: totalBaru, bayar: totalBaru, kembalian: 0 })
    .eq('id', pesanan.id)
    .select()
    .single();
  if (e2) throw new Error(e2.message);

  await kurangiStokBahan(items);
  return data;
}

export async function hapusItemPesanan(pesanan, itemId) {
  if (!notaBisaDiubah(pesanan)) throw new Error('Nota sudah lunas — tidak bisa diubah.');

  const { data: item, error: e0 } = await supabase
    .from('resto_pesanan_item')
    .select('*')
    .eq('id', itemId)
    .single();
  if (e0) throw new Error(e0.message);
  if (item.pesanan_id !== pesanan.id) throw new Error('Item bukan milik nota ini.');

  // Dicek SEBELUM delete: kalau ini item terakhir, tolak. Kalau dicek sesudah,
  // nota justru tertinggal tanpa item dan totalnya tidak ikut turun.
  const { count: sisa, error: eC } = await supabase
    .from('resto_pesanan_item')
    .select('id', { count: 'exact', head: true })
    .eq('pesanan_id', pesanan.id);
  if (eC) throw new Error(eC.message);
  if ((sisa ?? 0) <= 1) {
    throw new Error('Item terakhir tidak bisa dihapus satu per satu. Gunakan "Batalkan Nota" untuk membatalkan pesanan ini.');
  }

  const { error: e1 } = await supabase.from('resto_pesanan_item').delete().eq('id', itemId);
  if (e1) throw new Error(e1.message);

  const totalBaru = Math.max(0, Number(pesanan.total) - Number(item.subtotal));
  const { data, error: e2 } = await supabase
    .from('resto_pesanan')
    .update({ total: totalBaru, bayar: totalBaru, kembalian: 0 })
    .eq('id', pesanan.id)
    .select()
    .single();
  if (e2) throw new Error(e2.message);

  await kembalikanStokBahan([item]);
  return data;
}

/**
 * Batalkan nota yang belum dibayar: hapus item, kembalikan stok, lalu hapus nota.
 * Ini jalur yang benar untuk nota yang isinya sudah tidak relevan — mencegah
 * nota yatim dengan 0 item dan total Rp 0.
 */
export async function batalkanPesanan(pesanan) {
  if (!notaBisaDiubah(pesanan)) throw new Error('Nota sudah lunas — tidak bisa dibatalkan.');
  const items = await ambilItemPesanan(pesanan.id);
  await kembalikanStokBahan(items);
  const { error: e1 } = await supabase.from('resto_pesanan_item').delete().eq('pesanan_id', pesanan.id);
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await supabase.from('resto_pesanan').delete().eq('id', pesanan.id);
  if (e2) throw new Error(e2.message);
  return true;
}

/**
 * Membagi satu nota menjadi beberapa nota baru.
 *
 * Cara baca kasirnya sederhana: "pesanan itu pecah jadi beberapa transaksi".
 * Karena itu SETIAP payer — termasuk P1 — disimpan sebagai nota baru dengan
 * nomor TRX sungguhan (mis. TRX-20260927-006, -007, -008), bukan memakai nota
 * lama lalu diturunkan jadi "-S2", "-S3". Nomor nota jadi urut dan mudah
 * dibaca, dan tidak ada lagi nomor turunan yang aneh-aneh saat dicetak.
 *
 * Nota asal dihapus setelah semua nota baru berhasil dibuat supaya tidak ada
 * nota Rp 0 atau nota yatim di laporan. Stok bahan TIDAK disentuh: item-nya
 * dipindah, bukan dijual dua kali (sudah dipotong saat nota asal dibuat).
 * Tanggal nota baru mewarisi tanggal nota asal agar laporan harian tetap benar.
 */
export async function simpanSplitBayar(pesanan, parts) {
  if (!notaBisaDiubah(pesanan)) throw new Error('Nota sudah lunas — tidak bisa di-split.');
  if (!Array.isArray(parts) || parts.length < 2) throw new Error('Split minimal 2 payer.');

  const asli = await ambilItemPesanan(pesanan.id);
  const mapAsli = {};
  for (const it of asli) mapAsli[it.id] = it;

  for (const part of parts) {
    if (!part.items.length) throw new Error('Ada payer tanpa item.');
    for (const it of part.items) {
      const src = mapAsli[it.id];
      if (!src) throw new Error('Item tidak dikenal.');
      if ((Number(it.qty) || 0) <= 0) throw new Error('Qty payer tidak valid.');
      if ((Number(it.qty) || 0) > (Number(src.qty) || 0)) {
        throw new Error(`Qty ${src.nama} melebihi qty nota (${src.qty}).`);
      }
    }
    if (Number(part.total) < 0) throw new Error('Total payer tidak valid.');
  }

  for (const it of asli) {
    const jml = parts.reduce((s, part) => {
      const found = part.items.find((x) => x.id === it.id);
      return s + (found ? Number(found.qty) || 0 : 0);
    }, 0);
    if (Math.abs(jml - (Number(it.qty) || 0)) > 0.0001) {
      throw new Error(`Total qty ${it.nama} harus tetap ${it.qty}, saat ini ${jml}.`);
    }
  }

  const now = new Date().toISOString();
  const tanggal = pesanan.tanggal || now;
  let pesanError = '';

  for (let percobaan = 1; percobaan <= 6; percobaan++) {
    const dibuat = [];
    try {
      const idBaru = await idPesananBatch(pesanan, parts.length, tanggal, percobaan === 1);
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const { data: row, error: e1 } = await supabase
          .from('resto_pesanan')
          .insert({
            id: idBaru[i],
            tanggal,
            total: Number(part.total) || 0,
            bayar: Number(part.bayar) || 0,
            kembalian: Number(part.kembalian) || 0,
            metode: part.metode,
            user_id: pesanan.user_id ?? null,
            nama_kasir: pesanan.nama_kasir ?? null,
            catatan: 'Pecah dari ' + pesanan.id + ' — P' + (i + 1) + ' dari ' + parts.length,
            lunas: true,
            tanggal_lunas: now
          })
          .select()
          .single();
        if (e1) {
          if (e1.code === '23505') throw Object.assign(new Error('23505'), { retry: true });
          throw new Error(e1.message);
        }
        dibuat.push(row);

        const itemRows = part.items.map((x) => {
          const src = mapAsli[x.id];
          const qty = Number(x.qty) || 0;
          return {
            pesanan_id: idBaru[i],
            produk_id: src.produk_id,
            nama: src.nama,
            harga: src.harga,
            qty,
            subtotal: (Number(src.harga) || 0) * qty
          };
        });
        const { error: e2 } = await supabase.from('resto_pesanan_item').insert(itemRows);
        if (e2) throw new Error(e2.message);
      }

      // Semua nota baru sudah aman. Sekarang rapikan nota asal.
      const { error: e3 } = await supabase.from('resto_pesanan_item').delete().eq('pesanan_id', pesanan.id);
      if (e3) throw new Error(e3.message);
      const { error: e4 } = await supabase.from('resto_pesanan').delete().eq('id', pesanan.id);
      if (e4) throw new Error(e4.message);

      return dibuat;
    } catch (err) {
      for (const row of dibuat) {
        await supabase.from('resto_pesanan_item').delete().eq('pesanan_id', row.id);
        await supabase.from('resto_pesanan').delete().eq('id', row.id);
      }
      if (err.retry) {
        pesanError = 'Nomor nota dipakai kasir lain';
        continue;
      }
      throw err;
    }
  }
  throw new Error('Gagal membuat nomor nota karena dipakai kasir lain. Tekan Simpan sekali lagi. (' + pesanError + ')');
}

/**
 * Reserves N consecutive nota numbers on the same date prefix as the source
 * nota, without touching the database — a duplicate-key error from the insert
 * is what signals a collision.
 *
 * pakaiAcuanId hanya untuk percobaan pertama: nomor diturunkan langsung dari
 * id nota asal tanpa query. Kalau nomor itu ternyata sudah dipakai kasir lain,
 * percobaan berikutnya wajib menghitung ulang dari database, karena menghitung
 * ulang dari id asal yang sama akan menghasilkan nomor yang sama terus-menerus.
 */
async function idPesananBatch(pesanan, jumlah, tanggalAcuan, pakaiAcuanId = true) {
  const pola = pakaiAcuanId ? String(pesanan.id).match(/^(TRX-\d{8}-)(\d{3})$/) : null;
  if (pola) {
    const mulai = Number(pola[2]);
    return Array.from({ length: jumlah }, (_, i) => pola[1] + String(mulai + 1 + i).padStart(3, '0'));
  }
  // nota asal bukan format TRX-YYYYMMDD-NNN (mis. id manual) atau ini percobaan
  // ulang: pindai nomor tertinggi yang benar-benar terpakai, lalu lanjutkan.
  const acuan = await idPesananBaru(tanggalAcuan);
  const m = acuan.match(/^(TRX-\d{8}-)(\d{3})$/);
  if (!m) throw new Error('Format id nota tidak dikenali: ' + pesanan.id);
  const mulai = Number(m[2]) - 1;
  return Array.from({ length: jumlah }, (_, i) => m[1] + String(mulai + 1 + i).padStart(3, '0'));
}

async function kurangiStokBahan(items) {
  const menuIds = items.map((i) => i.produk_id).filter(Boolean);
  if (!menuIds.length) return;
  const { data: resep } = await supabase
    .from('resto_resep')
    .select('bahan_id, qty, produk_id')
    .in('produk_id', menuIds);
  if (!resep || !resep.length) return;

  const nat = items
    .filter((i) => i.produk_id)
    .map((i) => ({ pid: i.produk_id, qty: Number(i.qty) || 1 }));

  const usage = {};
  for (const r of resep) {
    for (const it of nat) {
      if (it.pid === r.produk_id) {
        usage[r.bahan_id] = (usage[r.bahan_id] || 0) + (Number(r.qty) || 0) * it.qty;
      }
    }
  }
  for (const [bahanId, qty] of Object.entries(usage)) {
    const { data: b } = await supabase.from('resto_produk').select('stok').eq('id', bahanId).single();
    if (!b) continue;
    const baru = Math.max(0, (Number(b.stok) || 0) - qty);
    await supabase.from('resto_produk').update({ stok: baru }).eq('id', bahanId);
  }
}

async function kembalikanStokBahan(items) {
  const menuIds = items.map((i) => i.produk_id).filter(Boolean);
  if (!menuIds.length) return;
  const { data: resep } = await supabase
    .from('resto_resep')
    .select('bahan_id, qty, produk_id')
    .in('produk_id', menuIds);
  if (!resep || !resep.length) return;

  const nat = items
    .filter((i) => i.produk_id)
    .map((i) => ({ pid: i.produk_id, qty: Number(i.qty) || 1 }));

  const usage = {};
  for (const r of resep) {
    for (const it of nat) {
      if (it.pid === r.produk_id) {
        usage[r.bahan_id] = (usage[r.bahan_id] || 0) + (Number(r.qty) || 0) * it.qty;
      }
    }
  }
  for (const [bahanId, qty] of Object.entries(usage)) {
    const { data: b } = await supabase.from('resto_produk').select('stok').eq('id', bahanId).single();
    if (!b) continue;
    await supabase.from('resto_produk').update({ stok: (Number(b.stok) || 0) + qty }).eq('id', bahanId);
  }
}