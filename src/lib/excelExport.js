import ExcelJS from 'exceljs';

function unduh(buffer, nama) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nama;
  a.click();
  URL.revokeObjectURL(a.href);
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