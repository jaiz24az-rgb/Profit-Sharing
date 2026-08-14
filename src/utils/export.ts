import * as XLSX from 'xlsx';
import { BillingRecord, STAGES } from '../types';
import { getRecordNetPaymentHo, getRecordDeduction, getTaxLabel, getTaxRate } from './taxHelper';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function exportToExcel(records: BillingRecord[], fileName = 'Checklist_Penagihan_HO.xlsx') {
  const rows = records.map((rec) => {
    const taxType = rec.taxType || 'JASA';
    const rate = getTaxRate(taxType);
    const deduction = getRecordDeduction(rec);
    const netPaymentHo = getRecordNetPaymentHo(rec);
    const dpp = rec.dppAmount !== undefined ? rec.dppAmount : (rec.nominal || 0);
    const ppnNominal = rec.ppnNominal !== undefined ? rec.ppnNominal : (rec.includePpn !== false ? Math.round(dpp * 0.11) : 0);

    return {
      'Maskapai / Penerbit': rec.airline,
      'Instansi / Vendor': rec.vendor,
      'Kategori': rec.category || 'CARGO',
      'Data Periode': rec.periode,
      'No. Invoice': rec.noInvoice || '-',
      'No. IRF / IOM': rec.noIrf || rec.noIom || '-',
      'Jenis Tagihan PPh': getTaxLabel(taxType),
      'Dasar Pengenaan Pajak / DPP (Rp)': dpp,
      'Status PPN': rec.includePpn !== false ? 'PPN 11%' : 'Non PPN',
      'Nominal PPN 11% (Rp)': ppnNominal,
      'Total Nilai Tagihan Bruto (Rp)': rec.nominal,
      'Tarif Potongan PPh': `${rate}%`,
      'Potongan Pajak PPh (Rp)': deduction,
      'Total Pembayaran HO Netto (Rp)': netPaymentHo,
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
  const paid = records.filter(r => r.stages.pembayaran?.completed);
  const reportedHO = records.filter(r => r.stages.laporan_ho?.completed);
  
  const totalGrossAmount = records.reduce((sum, r) => sum + r.nominal, 0);
  const totalDeduction = records.reduce((sum, r) => sum + getRecordDeduction(r), 0);
  const totalNetPaymentHo = records.reduce((sum, r) => sum + getRecordNetPaymentHo(r), 0);
  const totalPaidNet = paid.reduce((sum, r) => sum + getRecordNetPaymentHo(r), 0);

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let text = `Yth. Tim Head Office (HO) Keuangan & Revenue Accounting,\n\n`;
  text += `Berikut disampaikan Laporan Perkembangan Checklist Penagihan & Perhitungan Pembayaran HO (${dateStr}):\n\n`;
  text += `📊 RINGKASAN EKSEKUTIF PEMBAYARAN HO:\n`;
  text += `- Total Tagihan Terdata: ${total} Berkas\n`;
  text += `  • Total Nilai Tagihan (Bruto): ${formatRupiah(totalGrossAmount)}\n`;
  text += `  • Total Potongan Pajak (2% Jasa / 10% Non-Jasa): - ${formatRupiah(totalDeduction)}\n`;
  text += `  • Total Target Pembayaran HO (Netto): ${formatRupiah(totalNetPaymentHo)}\n`;
  text += `- Realisasi Pembayaran HO (Lunas): ${paid.length} Berkas (${formatRupiah(totalPaidNet)})\n`;
  text += `- Berkas Telah Dilaporkan ke HO: ${reportedHO.length} Berkas\n\n`;

  text += `📋 DETAIL MONITORING & PERHITUNGAN PEMBAYARAN PER MASKAPAI:\n`;
  
  const airlines = ['PT Sriwijaya Air', 'PT NAM Air'] as const;
  airlines.forEach(air => {
    const airRecs = records.filter(r => r.airline === air);
    if (airRecs.length > 0) {
      text += `\n✈️ ${air.toUpperCase()}:\n`;
      airRecs.forEach((r, idx) => {
        const completedStagesCount = STAGES.filter(s => r.stages[s.key]?.completed).length;
        const taxType = r.taxType || 'JASA';
        const deduction = getRecordDeduction(r);
        const netHo = getRecordNetPaymentHo(r);
        const taxBadge = taxType === 'JASA' ? 'Jasa (-2%)' : taxType === 'BUKAN_JASA' ? 'Bukan Jasa (-10%)' : '0%';

        text += `  ${idx + 1}. [${r.vendor}] - Periode: ${r.periode}\n`;
        text += `     • No. Invoice: ${r.noInvoice || 'Belum Terbit'}\n`;
        text += `     • Nilai Bruto: ${formatRupiah(r.nominal)} | Tipe: ${taxBadge}\n`;
        text += `     • Potongan: - ${formatRupiah(deduction)} ➔ Total Bayar HO (Netto): ${formatRupiah(netHo)}\n`;
        text += `     • Checklist: ${completedStagesCount}/8 Tahap | Status: ${r.overallStatus}\n`;
        text += `     • Pembayaran: ${r.stages.pembayaran?.completed ? '✅ Lunas (' + r.stages.pembayaran.emailDate + ')' : '⏳ Belum Bayar'}\n`;
        text += `     • Laporan HO: ${r.stages.laporan_ho?.completed ? '✅ Selesai (' + r.stages.laporan_ho.emailDate + ')' : '⏳ Belum Report'}\n`;
      });
    }
  });

  text += `\nMohon petunjuk dan arahan pencairan lebih lanjut.\n\nSalam,\nTim Penagihan Operasional & Cargo Station`;
  return text;
}
