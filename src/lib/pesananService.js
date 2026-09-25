import { supabase } from './supabase';

export async function idPesananBaru() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const prefix = `TRX-${y}${m}${dd}-`;
  const { data, error } = await supabase
    .from('resto_pesanan')
    .select('id')
    .gte('id', prefix)
    .lt('id', prefix + '\uffff');
  if (error) throw new Error(error.message);
  const n = (data?.length ?? 0) + 1;
  return prefix + String(n).padStart(3, '0');
}

export async function simpanPesanan({ items, bayar, kembalian, metode, kasirId, namaKasir, catatan }) {
  const total = items.reduce((s, i) => s + (Number(i.harga) || 0) * (Number(i.qty) || 1), 0);
  const id = await idPesananBaru();

  const { data: pesanan, error } = await supabase
    .from('resto_pesanan')
    .insert({
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
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

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
 * Split bill per item: setiap pecahan disimpan sebagai nota terpisah.
 * parts[0] adalah nota induk (id asli), parts[1..] jadi nota baru ber-id
 * "<id induk>-S2", "-S3", dst dengan catatan "Split dari <id induk>".
 * Item hanya boleh dibagi per qty; total qty tiap item harus tetap sama.
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
  const anak = [];
  try {
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const idBaru = pesanan.id + '-S' + (i + 1);
      const { data: row, error: e1 } = await supabase
        .from('resto_pesanan')
        .insert({
          id: idBaru,
          tanggal: now,
          total: Number(part.total) || 0,
          bayar: Number(part.bayar) || 0,
          kembalian: Number(part.kembalian) || 0,
          metode: part.metode,
          user_id: pesanan.user_id ?? null,
          nama_kasir: pesanan.nama_kasir ?? null,
          catatan: 'Split dari ' + pesanan.id + ' (P' + (i + 1) + ')',
          lunas: true,
          tanggal_lunas: now
        })
        .select()
        .single();
      if (e1) throw new Error(e1.message);
      anak.push({ row, part });

      const itemRows = part.items.map((x) => {
        const src = mapAsli[x.id];
        const qty = Number(x.qty) || 0;
        return {
          pesanan_id: idBaru,
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

    const induk = parts[0];
    for (const it of asli) {
      const found = induk.items.find((x) => x.id === it.id);
      const qty = found ? Number(found.qty) || 0 : 0;
      if (qty <= 0) {
        const { error } = await supabase.from('resto_pesanan_item').delete().eq('id', it.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('resto_pesanan_item')
          .update({ qty, subtotal: (Number(it.harga) || 0) * qty })
          .eq('id', it.id);
        if (error) throw new Error(error.message);
      }
    }

    const { data: indukBaru, error: e3 } = await supabase
      .from('resto_pesanan')
      .update({
        total: Number(induk.total) || 0,
        bayar: Number(induk.bayar) || 0,
        kembalian: Number(induk.kembalian) || 0,
        metode: induk.metode,
        catatan: parts.length > 2 ? pesanan.catatan || 'Split bill' : pesanan.catatan,
        lunas: true,
        tanggal_lunas: now
      })
      .eq('id', pesanan.id)
      .select()
      .single();
    if (e3) throw new Error(e3.message);

    return [indukBaru, ...anak.map((a) => a.row)];
  } catch (err) {
    for (const a of anak) {
      await supabase.from('resto_pesanan_item').delete().eq('pesanan_id', a.row.id);
      await supabase.from('resto_pesanan').delete().eq('id', a.row.id);
    }
    throw err;
  }
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