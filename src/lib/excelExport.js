import ExcelJS from 'exceljs';

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