import ExcelJS from 'exceljs';
import { jamTgl } from './format';

function unduh(buffer, nama) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nama;
  a.click();
  // tunda revoke agar browser sempat memulai download (hindari gagal di HP/PWA)
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function bukaBuku() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Resto Kasir';
  return wb;
}

export async function exportLaporanStok(rows, fileName = 'laporan-stok.xlsx') {
  const wb = bukaBuku();
  const ws = wb.addWorksheet('Stok');
  ws.columns = [
    { header: 'Jenis', key: 'jenis', width: 10 },
    { header: 'Nama', key: 'nama', width: 30 },
    { header: 'Kelompok', key: 'kelompok', width: 15 },
    { header: 'Harga', key: 'harga', width: 14, style: { numFmt: '#,##0' } },
    { header: 'Satuan', key: 'satuan', width: 10 },
    { header: 'Stok', key: 'stok', width: 12, style: { numFmt: '#,##0.00' } },
    { header: 'Stok Min', key: 'stok_min', width: 12, style: { numFmt: '#,##0.00' } }
  ];
  for (const r of rows) ws.addRow(r);
  ws.getRow(1).font = { bold: true };
  const buf = await wb.xlsx.writeBuffer();
  unduh(buf, fileName);
}

export async function exportRekapHarian(rows, fileName = 'rekap-harian.xlsx') {
  const wb = bukaBuku();
  const ws = wb.addWorksheet('Rekap');
  ws.columns = [
    { header: 'Tanggal', key: 'tanggal', width: 14 },
    { header: 'Jumlah Transaksi', key: 'jumlah', width: 18 },
    { header: 'Tunai', key: 'tunai', width: 16, style: { numFmt: '#,##0' } },
    { header: 'QRIS', key: 'qris', width: 16, style: { numFmt: '#,##0' } },
    { header: 'Debit', key: 'debit', width: 16, style: { numFmt: '#,##0' } },
    { header: 'Hutang', key: 'hutang', width: 16, style: { numFmt: '#,##0' } },
    { header: 'TOTAL', key: 'total', width: 18, style: { numFmt: '#,##0' } }
  ];
  for (const r of rows) ws.addRow(r);
  ws.getRow(1).font = { bold: true };
  const buf = await wb.xlsx.writeBuffer();
  unduh(buf, fileName);
}

export async function exportTransaksi(pesanan, fileName = 'transaksi.xlsx') {
  const wb = bukaBuku();
  const ws = wb.addWorksheet('Transaksi');
  ws.columns = [
    { header: 'ID', key: 'id', width: 22 },
    { header: 'Waktu', key: 'waktu', width: 18 },
    { header: 'Kasir', key: 'kasir', width: 18 },
    { header: 'Metode', key: 'metode', width: 10 },
    { header: 'Total', key: 'total', width: 16, style: { numFmt: '#,##0' } }
  ];
  for (const p of pesanan) {
    ws.addRow({
      id: p.id,
      waktu: p.tanggal?.slice(0, 16).replace('T', ' '),
      kasir: p.nama_kasir || '',
      metode: p.metode,
      total: Number(p.total) || 0
    });
  }
  ws.getRow(1).font = { bold: true };
  const ws2 = wb.addWorksheet('Detail');
  ws2.columns = [
    { header: 'ID', key: 'id', width: 22 },
    { header: 'Item', key: 'item', width: 30 },
    { header: 'Harga', key: 'harga', width: 14, style: { numFmt: '#,##0' } },
    { header: 'Qty', key: 'qty', width: 8 },
    { header: 'Subtotal', key: 'subtotal', width: 14, style: { numFmt: '#,##0' } }
  ];
  for (const p of pesanan) {
    for (const it of p.items || []) {
      ws2.addRow({ id: p.id, item: it.nama, harga: Number(it.harga) || 0, qty: it.qty, subtotal: Number(it.subtotal) || 0 });
    }
  }
  ws2.getRow(1).font = { bold: true };
  const buf = await wb.xlsx.writeBuffer();
  unduh(buf, fileName);
}

export async function exportAbsensi(rows, fileName = 'absensi.xlsx') {
  const wb = bukaBuku();
  const ws = wb.addWorksheet('Absensi');
  ws.columns = [
    { header: 'Tanggal', key: 'tanggal', width: 14 },
    { header: 'Karyawan', key: 'karyawan', width: 24 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Lembur (mnt)', key: 'mnt', width: 13 },
    { header: 'Catatan', key: 'catatan', width: 24 }
  ];
  for (const r of rows) {
    ws.addRow({ tanggal: r.tanggal, karyawan: r.karyawan?.nama || '', status: r.status, mnt: r.menit_lembur, catatan: r.catatan || '' });
  }
  ws.getRow(1).font = { bold: true };
  const buf = await wb.xlsx.writeBuffer();
  unduh(buf, fileName);
}

// rows: [{ periode, bahan, masuk, keluar }] — satu baris per bahan per periode
export async function exportMutasiStok(rows, fileName = 'mutasi-stok.xlsx') {
  const wb = bukaBuku();
  wsHelper(wb, 'Masuk/Keluar', [
    { header: 'Periode', key: 'periode', width: 14 },
    { header: 'Bahan', key: 'bahan', width: 26 },
    { header: 'Masuk', key: 'masuk', width: 12, style: { numFmt: '#,##0.00' } },
    { header: 'Keluar', key: 'keluar', width: 12, style: { numFmt: '#,##0.00' } }
  ], rows);
  const buf = await wb.xlsx.writeBuffer();
  unduh(buf, fileName);
}

function wsHelper(wb, name, cols, rows) {
  const ws = wb.addWorksheet(name);
  ws.columns = cols;
  for (const r of rows) ws.addRow(r);
  ws.getRow(1).font = { bold: true };
  return ws;
}

// rows: [{ nama, satuan, qty, stok }] pemakaian bahan dari transaksi
export async function exportPemakaian(rows, fileName = 'pemakaian-stok.xlsx') {
  const wb = bukaBuku();
  wsHelper(wb, 'Pemakaian', [
    { header: 'Bahan', key: 'nama', width: 26 },
    { header: 'Satuan', key: 'satuan', width: 10 },
    { header: 'Terpakai', key: 'qty', width: 14, style: { numFmt: '#,##0.00' } },
    { header: 'Stok Sekarang', key: 'stok', width: 14, style: { numFmt: '#,##0.00' } }
  ], rows);
  const buf = await wb.xlsx.writeBuffer();
  unduh(buf, fileName);
}

// data: hasil pendapatanPerBagian() — pisahkan tax 3% (EDC) dan bagi per bagian
export async function exportPendapatanBagian(data, fileName = 'pendapatan-bagian.xlsx') {
  const wb = bukaBuku();
  const d = data || {};
  const bagian = d.bagian || { Kitchen: 0, Bar: 0, Kopi: 0 };
  const jml = d.jumlahItem || { Kitchen: 0, Bar: 0, Kopi: 0 };
  const namaBagian = { Kitchen: 'Kitchen', Bar: 'Bar', Kopi: 'Kopi' };

  const ws = wb.addWorksheet('Pendapatan per Bagian');
  ws.columns = [
    { header: 'Bagian', key: 'bagian', width: 16 },
    { header: 'Omzet (tanpa tax)', key: 'omzet', width: 20, style: { numFmt: '#,##0' } },
    { header: 'Item Terjual', key: 'qty', width: 14, style: { numFmt: '#,##0' } }
  ];
  for (const k of Object.keys(namaBagian)) {
    ws.addRow({ bagian: namaBagian[k], omzet: bagian[k] || 0, qty: jml[k] || 0 });
  }
  ws.addRow({});
  ws.addRow({ bagian: 'Total Revenue tanpa 3%', omzet: d.totalTanpaPajak || 0 });
  ws.addRow({ bagian: 'Total Revenue 3%', omzet: d.totalPajak3 || 0 });
  ws.addRow({ bagian: 'TOTAL REVENUE', omzet: d.totalRevenue || 0 });
  ws.getRow(1).font = { bold: true };
  ws.getRow(ws.rowCount).font = { bold: true };

  const wsk = wb.addWorksheet('Per Kelompok');
  wsk.columns = [
    { header: 'Kelompok', key: 'kelompok', width: 22 },
    { header: 'Bagian', key: 'bagian', width: 12 },
    { header: 'Omzet (tanpa tax)', key: 'omzet', width: 20, style: { numFmt: '#,##0' } },
    { header: 'Qty', key: 'qty', width: 12, style: { numFmt: '#,##0' } }
  ];
  for (const r of d.perKelompok || []) wsk.addRow(r);
  wsk.getRow(1).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  unduh(buf, fileName);
}

// data: hasil laporanHarian() — ringkasan harian + rincian per bagian
export async function exportLaporanHarian(data, fileName = 'laporan-harian.xlsx') {
  const wb = bukaBuku();
  const d = data || {};
  const bagian = d.bagian || { Kitchen: 0, Bar: 0, Kopi: 0 };
  const jml = d.jumlahItem || { Kitchen: 0, Bar: 0, Kopi: 0 };
  const label = { tunai: 'Tunai', qris: 'QRIS', debit: 'EDC/Debit', hutang: 'Belum Bayar' };

  const ws = wb.addWorksheet('Rekap Harian');
  ws.columns = [
    { header: 'Keterangan', key: 'k', width: 30 },
    { header: 'Nilai', key: 'v', width: 20, style: { numFmt: '#,##0' } },
    { header: 'Keterangan 2', key: 'k2', width: 26 },
    { header: 'Nilai 2', key: 'v2', width: 18, style: { numFmt: '#,##0' } }
  ];
  ws.addRow({ k: 'Tanggal', v: d.tanggal || '' });
  ws.addRow({ k: 'Jumlah Transaksi', v: d.jumlahNota || 0 });
  ws.addRow({ k: 'Item Terjual', v: d.itemTerjual || 0 });
  ws.addRow({});
  const bagianRows = Object.keys(bagian).map((b) => ({ k: 'Pendapatan ' + b, v: bagian[b] || 0, k2: 'Item ' + b, v2: jml[b] || 0 }));
  for (const r of bagianRows) ws.addRow(r);
  ws.addRow({});
  ws.addRow({ k: 'Total Revenue tanpa 3%', v: d.totalTanpaPajak || 0 });
  ws.addRow({ k: 'Total Revenue 3%', v: d.totalPajak3 || 0 });
  ws.addRow({ k: 'TOTAL REVENUE', v: d.totalRevenue || 0 });
  ws.addRow({});
  for (const m of ['tunai', 'qris', 'debit', 'hutang']) {
    ws.addRow({ k: label[m], v: d.metode?.[m] || 0, k2: 'Transaksi', v2: d.jumlahMetode?.[m] || 0 });
  }
  ws.getRow(1).font = { bold: true };

  const wsk = wb.addWorksheet('Per Kelompok');
  wsk.columns = [
    { header: 'Kelompok', key: 'kelompok', width: 22 },
    { header: 'Bagian', key: 'bagian', width: 12 },
    { header: 'Omzet (tanpa tax)', key: 'omzet', width: 20, style: { numFmt: '#,##0' } },
    { header: 'Qty', key: 'qty', width: 12, style: { numFmt: '#,##0' } }
  ];
  for (const r of d.perKelompok || []) wsk.addRow(r);
  wsk.getRow(1).font = { bold: true };

  const wsp = wb.addWorksheet('Transaksi');
  wsp.columns = [
    { header: 'Nota', key: 'id', width: 20 },
    { header: 'Jam', key: 'jam', width: 8 },
    { header: 'Kasir', key: 'kasir', width: 16 },
    { header: 'Metode', key: 'metode', width: 14 },
    { header: 'Item', key: 'item', width: 44 },
    { header: 'Total', key: 'total', width: 14, style: { numFmt: '#,##0' } }
  ];
  for (const p of d.pesanan || []) {
    wsp.addRow({
      id: p.id, jam: jamTgl(p.tanggal), kasir: p.nama_kasir || '-',
      metode: label[p.metode] || p.metode || '-',
      item: p.item.map((i) => `${i.qty}x ${i.nama}`).join(', '), total: p.total
    });
  }
  wsp.getRow(1).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  unduh(buf, fileName);
}

// rows: [{ tanggal, bahan, satuan, masuk, keluar, sisa }] pengeluaran stok harian
export async function exportPengeluaranStok(rows, fileName = 'pengeluaran-stok.xlsx') {
  const wb = bukaBuku();
  const ws = wb.addWorksheet('Rekap');
  ws.columns = [
    { header: 'Tanggal', key: 'tanggal', width: 14 },
    { header: 'Jumlah Masuk', key: 'j_masuk', width: 14, style: { numFmt: '#,##0.00' } },
    { header: 'Jumlah Keluar', key: 'j_keluar', width: 14, style: { numFmt: '#,##0.00' } },
    { header: 'Bahan', key: 'nama', width: 26 },
    { header: 'Satuan', key: 'satuan', width: 10 },
    { header: 'Masuk', key: 'masuk', width: 12, style: { numFmt: '#,##0.00' } },
    { header: 'Keluar', key: 'keluar', width: 12, style: { numFmt: '#,##0.00' } },
    { header: 'Sisa Stok', key: 'sisa', width: 12, style: { numFmt: '#,##0.00' } }
  ];
  for (const r of rows) ws.addRow(r);
  ws.getRow(1).font = { bold: true };
  const buf = await wb.xlsx.writeBuffer();
  unduh(buf, fileName);
}

// data: hasil laporanKas() — tabel persis template Excel (per hari + Deskripsi + TOTAL)
export async function exportLaporanKas(data, fileName = 'laporan-kas.xlsx') {
  const wb = bukaBuku();
  const ws = wb.addWorksheet('Laporan Resto');
  const DEPT = ['Kitchen', 'Coffee', 'Bar', 'Operasional'];
  const numCols = [4, 6, 8, 10, 12, 13, 14, 15]; // D,F,H,J,L,M,N,O

  const lebar = [11, 12, 4, 12, 4, 12, 4, 12, 4, 12, 4, 11, 9, 8, 8, 4];
  for (let i = 0; i < lebar.length; i++) ws.getColumn(i + 1).width = lebar[i];

  const head = { A1: 'TANGGAL', B1: 'DESKRIPSI', D1: 'REVENUE', F1: 'CASH', H1: 'PENGELUARAN', J1: 'SISA CASH', L1: 'CARD (EDC)', M1: 'QRIS', N1: '3%', O1: 'TOTAL' };
  for (const [c, v] of Object.entries(head)) {
    ws.getCell(c).value = v;
    ws.getCell(c).font = { bold: true };
  }
  for (const [a, b] of [['B', 'C'], ['D', 'E'], ['F', 'G'], ['H', 'I'], ['J', 'K'], ['O', 'P']]) {
    ws.mergeCells(a + '1:' + b + '1');
  }
  borderBaris(ws, 1);

  let r = 2;
  for (const h of data || []) {
    for (const dept of DEPT) {
      const x = h.baris?.[dept] || { rev: 0, cash: 0, edc: 0, qris: 0 };
      const peng = h.peng?.[dept];
      ws.getCell('A' + r).value = new Date(h.tanggal + 'T12:00:00');
      ws.getCell('A' + r).numFmt = 'dd-mm-yy';
      ws.getCell('B' + r).value = dept;
      ws.getCell('D' + r).value = x.rev;
      ws.getCell('F' + r).value = x.cash;
      ws.getCell('H' + r).value = peng ?? (dept === 'Kitchen' ? h.pengeluaran : 0);
      ws.getCell('J' + r).value = x.cash - (peng ?? (dept === 'Kitchen' ? h.pengeluaran : 0));
      ws.getCell('L' + r).value = x.edc;
      ws.getCell('M' + r).value = x.qris;
      ws.getCell('N' + r).value = Math.round(x.edc * 0.03);
      ws.getCell('O' + r).value = x.rev;
      for (const col of numCols) ws.getCell(String.fromCharCode(64 + col) + r).numFmt = '#,##0';
      borderBaris(ws, r);
      r += 1;
    }
    const t = h.total || { rev: 0, cash: 0, edc: 0, qris: 0 };
    const totalPeng = h.totalPeng ?? h.pengeluaran ?? 0;
    const edc3 = Math.round(t.edc * 0.03);
    ws.getCell('B' + r).value = 'TOTAL';
    ws.getCell('D' + r).value = t.rev;
    ws.getCell('F' + r).value = t.cash;
    ws.getCell('H' + r).value = totalPeng;
    ws.getCell('J' + r).value = t.cash - totalPeng;
    ws.getCell('L' + r).value = t.edc;
    ws.getCell('M' + r).value = t.qris;
    ws.getCell('N' + r).value = edc3;
    ws.getCell('O' + r).value = t.cash + t.edc + t.qris + edc3 - totalPeng;
    for (const col of numCols) ws.getCell(String.fromCharCode(64 + col) + r).numFmt = '#,##0';
    ws.getRow(r).font = { bold: true };
    borderBaris(ws, r);
    r += 2;
  }

  const buf = await wb.xlsx.writeBuffer();
  unduh(buf, fileName);
}

function borderBaris(ws, r) {
  ws.getRow(r).eachCell({ includeEmpty: true }, (c) => {
    c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });
}