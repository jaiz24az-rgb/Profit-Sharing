import * as XLSX from 'xlsx';
import { BillingRecord, STAGES } from '../types';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function exportToExcel(records: BillingRecord[], fileName = 'Checklist_Penagihan_HO.xlsx') {
  // Build a flat table matching the Excel matrix format from the user prompt:
  // Maskapai | Vendor | Periode | Invoice No | IRF No | Nominal | Penerimaan Data (Tgl & Check) | IRF | IRF HO | Invoice | Faktur | Email Vendor | Pembayaran | Laporan HO

  const rows = records.map((rec) => {
    return {
      'Maskapai / Penerbit': rec.airline,
      'Instansi / Vendor': rec.vendor,
      'Data Periode': rec.periode,
      'No. Invoice': rec.noInvoice || '-',
      'No. IRF': rec.noIrf || '-',
      'Nominal Tagihan (Rp)': rec.nominal,
      'Status Utama': rec.overallStatus,
      'Penerimaan Data - Tgl Email': rec.stages.penerimaan_data?.emailDate || '',
      'Penerimaan Data - Checklist': rec.stages.penerimaan_data?.completed ? 'CHECKED' : 'PENDING',
      'IRF - Tgl Email': rec.stages.irf?.emailDate || '',
      'IRF - Checklist': rec.stages.irf?.completed ? 'CHECKED' : 'PENDING',
      'IRF HO - Tgl Email': rec.stages.irf_ho?.emailDate || '',
      'IRF HO - Checklist': rec.stages.irf_ho?.completed ? 'CHECKED' : 'PENDING',
      'Invoice - Tgl Email': rec.stages.invoice?.emailDate || '',
      'Invoice - Checklist': rec.stages.invoice?.completed ? 'CHECKED' : 'PENDING',
      'Faktur - Tgl Email': rec.stages.faktur?.emailDate || '',
      'Faktur - Checklist': rec.stages.faktur?.completed ? 'CHECKED' : 'PENDING',
      'Email Vendor - Tgl Email': rec.stages.email_vendor?.emailDate || '',
      'Email Vendor - Checklist': rec.stages.email_vendor?.completed ? 'CHECKED' : 'PENDING',
      'Pembayaran - Tgl Bayar': rec.stages.pembayaran?.emailDate || '',
      'Pembayaran - Checklist': rec.stages.pembayaran?.completed ? 'CHECKED' : 'PENDING',
      'Laporan HO - Tgl Laporan': rec.stages.laporan_ho?.emailDate || '',
      'Laporan HO - Checklist': rec.stages.laporan_ho?.completed ? 'CHECKED' : 'PENDING',
      'Catatan': rec.catatanUtama || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Checklist Penagihan');

  // Auto column width calculation
  const max_widths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length + 3, 15)
  }));
  worksheet['!cols'] = max_widths;

  XLSX.writeFile(workbook, fileName);
}

export function generateHOEmailSummary(records: BillingRecord[]): string {
  const total = records.length;
  const paid = records.filter(r => r.stages.pembayaran.completed);
  const reportedHO = records.filter(r => r.stages.laporan_ho.completed);
  const totalAmount = records.reduce((sum, r) => sum + r.nominal, 0);
  const totalPaidAmount = paid.reduce((sum, r) => sum + r.nominal, 0);

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let text = `Yth. Tim Head Office (HO) Keuangan & Revenue Accounting,\n\n`;
  text += `Berikut disampaikan Laporan Perkembanan Checklist Penagihan Cargo (${dateStr}):\n\n`;
  text += `📊 RINGKASAN EKSEKUTIF:\n`;
  text += `- Total Tagihan Terdata: ${total} Berkas (${formatRupiah(totalAmount)})\n`;
  text += `- Tagihan Lunas Diterima: ${paid.length} Berkas (${formatRupiah(totalPaidAmount)})\n`;
  text += `- Sudah dilaporkan ke HO: ${reportedHO.length} Berkas\n\n`;

  text += `📋 DETAIL MONITORING PER MASKAPAI & VENDOR:\n`;
  
  const airlines = ['PT Sriwijaya Air', 'PT NAM Air'] as const;
  airlines.forEach(air => {
    const airRecs = records.filter(r => r.airline === air);
    if (airRecs.length > 0) {
      text += `\n✈️ ${air.toUpperCase()}:\n`;
      airRecs.forEach((r, idx) => {
        const completedStagesCount = STAGES.filter(s => r.stages[s.key]?.completed).length;
        text += `  ${idx + 1}. [${r.vendor}] - Periode: ${r.periode}\n`;
        text += `     • Invoice: ${r.noInvoice || 'Belum Terbit'} | Nominal: ${formatRupiah(r.nominal)}\n`;
        text += `     • Progress: ${completedStagesCount}/8 Tahap | Status: ${r.overallStatus}\n`;
        text += `     • Pembayaran: ${r.stages.pembayaran.completed ? '✅ Lunas (' + r.stages.pembayaran.emailDate + ')' : '⏳ Belum Bayar'}\n`;
        text += `     • Laporan HO: ${r.stages.laporan_ho.completed ? '✅ Selesai (' + r.stages.laporan_ho.emailDate + ')' : '⏳ Belum Report'}\n`;
      });
    }
  });

  text += `\nMohon petunjuk dan arahan lebih lanjut.\n\nSalam,\nTim Manajemen Penagihan Operations`;
  return text;
}
