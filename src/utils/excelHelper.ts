import * as XLSX from 'xlsx';
import { IRFItem, IRFData, BillingRecord, Airline, Vendor } from '../types';
import { buildDefaultIRFData, generateOfficialIRFNumber } from './irfHelper';

export interface ParsedExcelResult {
  headerInfo?: Partial<IRFData>;
  items: IRFItem[];
  detectedRecord?: Partial<BillingRecord>;
  rawRows: any[];
}

/**
 * Parses an uploaded Excel (.xlsx, .xls, .csv) file to extract IRF items and metadata
 */
export async function parseExcelForIRF(file: File): Promise<ParsedExcelResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('File Excel tidak memiliki sheet.');
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON array of objects
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
        
        if (rawRows.length === 0) {
          throw new Error('File Excel kosong atau format tidak terbaca.');
        }

        const items: IRFItem[] = [];
        let totalSum = 0;
        let detectedCompanyName = '';
        let detectedRequestor = '';
        let detectedNoIrf = '';
        let detectedSpecialInst = '';
        let detectedAirline: Airline | undefined = undefined;
        let detectedVendor: Vendor | undefined = undefined;
        let detectedPeriode = '';

        rawRows.forEach((row, index) => {
          // Normalize column keys (lowercase, trim)
          const normalizedKeys: Record<string, any> = {};
          Object.keys(row).forEach((k) => {
            normalizedKeys[k.trim().toLowerCase()] = row[k];
          });

          // Extract Description
          const desc = 
            normalizedKeys['description'] || 
            normalizedKeys['deskripsi'] || 
            normalizedKeys['rincian'] || 
            normalizedKeys['keterangan'] || 
            normalizedKeys['uraian'] || 
            normalizedKeys['smu'] || 
            normalizedKeys['awb'] || 
            `Item ${index + 1}`;

          // Extract Qty / Koli
          const qtyVal = 
            normalizedKeys['qty'] || 
            normalizedKeys['koli'] || 
            normalizedKeys['jumlah'] || 
            normalizedKeys['units'] || 
            normalizedKeys['berat'] || 
            1;
          const qty = Number(qtyVal) || 1;

          // Extract Rate / Tarif
          const rateVal = 
            normalizedKeys['rate'] || 
            normalizedKeys['tarif'] || 
            normalizedKeys['harga'] || 
            normalizedKeys['price'] || 
            250;
          const rate = Number(rateVal) || 250;

          // Extract Amount
          let amountVal = 
            normalizedKeys['amount'] || 
            normalizedKeys['total'] || 
            normalizedKeys['nominal'] || 
            normalizedKeys['jumlah rupiah'] || 
            normalizedKeys['subtotal'];

          let amount = Number(amountVal);
          if (isNaN(amount) || amount <= 0) {
            amount = qty * rate;
          }

          items.push({
            no: index + 1,
            description: String(desc),
            qty,
            rate,
            amount
          });

          totalSum += amount;

          // Metadata extraction if present in rows
          if (normalizedKeys['company'] || normalizedKeys['perusahaan'] || normalizedKeys['pelanggan']) {
            detectedCompanyName = String(normalizedKeys['company'] || normalizedKeys['perusahaan'] || normalizedKeys['pelanggan']);
          }
          if (normalizedKeys['no irf'] || normalizedKeys['irf']) {
            detectedNoIrf = String(normalizedKeys['no irf'] || normalizedKeys['irf']);
          }
          if (normalizedKeys['maskapai'] || normalizedKeys['airline']) {
            const airStr = String(normalizedKeys['maskapai'] || normalizedKeys['airline']).toLowerCase();
            if (airStr.includes('sriwijaya')) detectedAirline = 'PT Sriwijaya Air';
            if (airStr.includes('nam')) detectedAirline = 'PT NAM Air';
          }
          if (normalizedKeys['vendor'] || normalizedKeys['ekspedisi']) {
            const vStr = String(normalizedKeys['vendor'] || normalizedKeys['ekspedisi']).toLowerCase();
            if (vStr.includes('21 express')) detectedVendor = 'PT 21 Express';
            if (vStr.includes('gatrans')) detectedVendor = 'PT Gatrans Mulia Indonesia';
            if (vStr.includes('mitra kargo') || vStr.includes('mkn')) detectedVendor = 'PT Mitra Kargo Nusantara';
          }
          if (normalizedKeys['periode']) {
            detectedPeriode = String(normalizedKeys['periode']);
          }
        });

        const headerInfo: Partial<IRFData> = {};
        if (detectedCompanyName) headerInfo.companyName = detectedCompanyName;
        if (detectedNoIrf) headerInfo.noIrf = detectedNoIrf;
        if (detectedSpecialInst) headerInfo.specialInstruction = detectedSpecialInst;

        const detectedRecord: Partial<BillingRecord> = {};
        if (detectedAirline) detectedRecord.airline = detectedAirline;
        if (detectedVendor) detectedRecord.vendor = detectedVendor;
        if (detectedPeriode) detectedRecord.periode = detectedPeriode;
        detectedRecord.nominal = totalSum;

        resolve({
          headerInfo,
          items,
          detectedRecord,
          rawRows
        });
      } catch (err: any) {
        reject(err || new Error('Gagal memproses file Excel.'));
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Downloads a standard template Excel file for IRF creation
 */
export function downloadIRFTemplateExcel() {
  const sampleData = [
    {
      'No': 1,
      'Deskripsi': 'Tagihan Incoming Periode Januari 2026',
      'Koli': 1846,
      'Tarif': 250,
      'Total': 461500,
      'Maskapai': 'PT Sriwijaya Air',
      'Vendor': 'PT 21 Express',
      'Periode': '01 - 15 Jan 2026'
    },
    {
      'No': 2,
      'Deskripsi': 'Tagihan Incoming Periode Februari 2026',
      'Koli': 2440,
      'Tarif': 250,
      'Total': 610000,
      'Maskapai': 'PT Sriwijaya Air',
      'Vendor': 'PT 21 Express',
      'Periode': '01 - 15 Jan 2026'
    },
    {
      'No': 3,
      'Deskripsi': 'Tagihan Incoming Periode Maret 2026',
      'Koli': 1148,
      'Tarif': 250,
      'Total': 287000,
      'Maskapai': 'PT Sriwijaya Air',
      'Vendor': 'PT 21 Express',
      'Periode': '01 - 15 Jan 2026'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },   // No
    { wch: 42 },  // Deskripsi
    { wch: 12 },  // Koli
    { wch: 12 },  // Tarif
    { wch: 16 },  // Total
    { wch: 20 },  // Maskapai
    { wch: 24 },  // Vendor
    { wch: 18 },  // Periode
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap_IRF_Template');

  XLSX.writeFile(workbook, 'Template_Invoicing_Request_Form_IRF.xlsx');
}
