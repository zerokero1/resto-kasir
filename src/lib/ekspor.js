// Pembungkus ekspor Excel dengan dynamic import.
// ExcelJS (~1 MB) tidak ikut masuk bundle utama, jadi kasir yang tidak pernah
// mengunduh laporan tidak perlu mengunduh/meng-parse library ini saat buka PWA.
function muat() {
  return import('./excelExport');
}

export async function exportLaporanStok(...a) { return (await muat()).exportLaporanStok(...a); }
export async function exportRekapHarian(...a) { return (await muat()).exportRekapHarian(...a); }
export async function exportTransaksi(...a) { return (await muat()).exportTransaksi(...a); }
export async function exportAbsensi(...a) { return (await muat()).exportAbsensi(...a); }
export async function exportMutasiStok(...a) { return (await muat()).exportMutasiStok(...a); }
export async function exportPemakaian(...a) { return (await muat()).exportPemakaian(...a); }
export async function exportPengeluaranStok(...a) { return (await muat()).exportPengeluaranStok(...a); }
export async function exportPendapatanBagian(...a) { return (await muat()).exportPendapatanBagian(...a); }
export async function exportLaporanKas(...a) { return (await muat()).exportLaporanKas(...a); }
export async function exportLaporanHarian(...a) { return (await muat()).exportLaporanHarian(...a); }
