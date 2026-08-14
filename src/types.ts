/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Airline = 'PT Sriwijaya Air' | 'PT NAM Air';

export type BillingCategory = 'CARGO' | 'OPERASIONAL';

export type TaxType = 'JASA' | 'BUKAN_JASA' | 'BEBAS_POTONGAN';

export type CargoVendor = 
  | 'PT 21 Express' 
  | 'PT Gatrans Mulia Indonesia' 
  | 'PT Mitra Kargo Nusantara';

export type OperationalVendorPreset =
  | 'PT Angkasa Pura Indonesia'
  | 'Halogen Hotel'
  | 'PT Parewa Asian Catering'
  | 'Cordia Hotel'
  | 'PT Gapura Angkasa'
  | 'PT Pertamina Patra Niaga';

export type Vendor = string;

export const DEFAULT_CARGO_VENDORS: string[] = [
  'PT 21 Express',
  'PT Gatrans Mulia Indonesia',
  'PT Mitra Kargo Nusantara',
];

export const DEFAULT_OPERATIONAL_VENDORS: string[] = [
  'PT Angkasa Pura Indonesia',
  'Halogen Hotel',
  'PT Parewa Asian Catering',
  'Cordia Hotel',
  'PT Gapura Angkasa',
  'PT Pertamina Patra Niaga',
];

export type StageKey = 
  | 'penerimaan_data'
  | 'irf'
  | 'irf_ho'
  | 'invoice'
  | 'faktur'
  | 'email_vendor'
  | 'pembayaran'
  | 'laporan_ho'
  | 'iom'
  | 'email_ho'
  | 'apgnr'
  | 'pembayaran_split';

export interface StageInfo {
  key: StageKey;
  label: string;
  shortLabel: string;
  description: string;
  order: number;
}

export const STAGES: StageInfo[] = [
  { key: 'penerimaan_data', label: 'Data Periode & Email Masuk', shortLabel: 'Penerimaan Data', description: 'Penerimaan data transaksi penerbangan & email masuk', order: 1 },
  { key: 'irf', label: 'IRF (Invoice Request Form)', shortLabel: 'IRF', description: 'Pengajuan IRF internal', order: 2 },
  { key: 'irf_ho', label: 'IRF HO', shortLabel: 'IRF HO', description: 'Persetujuan / Pengiriman IRF ke Head Office', order: 3 },
  { key: 'invoice', label: 'Invoice Penagihan', shortLabel: 'Invoice', description: 'Penerbitan & pemeriksaan dokumen Invoice', order: 4 },
  { key: 'faktur', label: 'Faktur Pajak', shortLabel: 'Faktur', description: 'Penerbitan & pencocokan Faktur Pajak', order: 5 },
  { key: 'email_vendor', label: 'Email Ke Vendor', shortLabel: 'Email Vendor', description: 'Pengiriman tagihan & dokumen ke Vendor', order: 6 },
  { key: 'pembayaran', label: 'Pembayaran Vendor', shortLabel: 'Pembayaran', description: 'Konfirmasi pembayaran & penerimaan dana dari Vendor', order: 7 },
  { key: 'laporan_ho', label: 'Laporan Ke HO', shortLabel: 'Laporan HO', description: 'Pelaporan resmi pembayaran & closing ke Head Office', order: 8 },
];

export const OPERATIONAL_STAGES: StageInfo[] = [
  { key: 'iom', label: 'IOM (Internal Office Memo)', shortLabel: 'IOM', description: 'Internal Office Memorandum diajukan ke HO', order: 1 },
  { key: 'email_ho', label: 'Email Ke HO', shortLabel: 'Email HO', description: 'Pengiriman berkas IOM & Tagihan ke Keuangan HO', order: 2 },
  { key: 'apgnr', label: 'APGNR (AP Goods/Non-Refundable)', shortLabel: 'APGNR', description: 'Dokumen / No. APGNR terbit dari Keuangan HO', order: 3 },
  { key: 'pembayaran_split', label: 'Pembayaran Split (Termin HO)', shortLabel: 'Pembayaran HO', description: 'Realisasi pencairan pembayaran bertahap/termin dari HO', order: 4 },
];

export interface PaymentInstallment {
  id: string;
  terminName: string; // e.g. "Termin 1 (DP 50%)", "Termin 2", "Pelunasan"
  paymentDate: string; // YYYY-MM-DD
  amount: number; // IDR
  status: 'Lunas' | 'Scheduled' | 'Pending';
  keterangan?: string;
  transferRef?: string;
}

export interface OperationalDetail {
  noIom?: string; // Internal Office Memorandum
  iomDate?: string;
  iomCompleted?: boolean;
  iomNotes?: string;

  emailHoDate?: string;
  emailHoCompleted?: boolean;
  emailHoNotes?: string;

  noApgnr?: string; // AP Goods/Service Non-Refundable
  apgnrDate?: string;
  apgnrCompleted?: boolean;
  apgnrNotes?: string;

  installments: PaymentInstallment[]; // Split payments from HO
}

export interface IRFItem {
  no: number;
  description: string;
  qty: number; // Koli / Weight / Units
  rate: number; // Price per unit / rate
  amount: number; // qty * rate
}

export interface IRFData {
  requestor: string; // e.g. "Fathul Aziz"
  department: string; // e.g. "Finance & GA"
  noIrf: string; // e.g. "002/SJ-CRG/SUB/VII/2026"
  date: string; // e.g. "29 Juli 2026"
  isRevision?: boolean; // false = New, true = Revision
  companyName: string; // e.g. "PT.ANDALAN 21 EXPRESS"
  companyAddress: string;
  contactPerson: string;
  phone: string;
  mobile: string;
  email: string;
  taxStatus: 'Included' | 'Excluded';
  reference: string;
  specialInstruction: string; // e.g. "PT. SRIWIJAYA AIR" or "PT. NAM AIR"
  items: IRFItem[];
  totalAmount: number;
}

export interface ChecklistStageItem {
  completed: boolean;
  emailDate: string; // YYYY-MM-DD or empty
  notes?: string;
  completedAt?: string;
}

export interface BillingPointItem {
  id: string;
  description: string; // Deskripsi point / rincian pekerjaan / item tagihan
  amount: number; // Nilai pokok (DPP) per point
}

export interface PeriodItem {
  id: string;
  periode: string; // e.g. "01 - 15 Feb 2026"
  nominal: number; // e.g. 50000000 (Bruto / DPP)
  taxType?: TaxType;
  deductionNominal?: number;
  netPaymentHo?: number;
  keterangan?: string; // e.g. "Periode I / Paruh Pertama"
}

export interface BillingRecord {
  id: string;
  category?: BillingCategory; // 'CARGO' or 'OPERASIONAL', default 'CARGO'
  airline: Airline;
  vendor: Vendor;
  periode: string; // e.g. "01 - 15 Jan 2026" or "Agustus 2026"
  periodItems?: PeriodItem[]; // Multi-periode & nominal breakdown in 1 tagihan
  billingPoints?: BillingPointItem[]; // Point-point rincian tagihan pokok (DPP)
  noInvoice?: string;
  noIrf?: string;
  noIom?: string; // For Operational
  noApgnr?: string; // For Operational
  dppAmount?: number; // Nilai Pokok / Dasar Pengenaan Pajak (DPP) dari point-point tagihan
  includePpn?: boolean; // Apakah dikenakan PPN 11% (true by default)
  ppnRate?: number; // 11 (%)
  ppnNominal?: number; // DPP * 11%
  nominal: number; // Total Nominal Tagihan (Bruto = DPP + PPN 11%) in IDR
  taxType?: TaxType; // 'JASA' (potong 2%), 'BUKAN_JASA' (potong 10%), 'BEBAS_POTONGAN' (0%)
  taxRate?: number; // 2, 10, or 0 (%)
  deductionNominal?: number; // Nominal Potongan Pajak PPh (DPP * taxRate%)
  netPaymentHo?: number; // Total Pembayaran dari HO (Patokan Netto = Total Tagihan - Potongan PPh)
  createdAt: string;
  updatedAt: string;
  stages: Record<string, ChecklistStageItem>;
  overallStatus: 'Draft' | 'In Progress' | 'Paid' | 'Completed HO' | 'Overdue' | 'Terbayar Parsial';
  catatanUtama?: string;
  irfDetail?: IRFData;
  operationalDetail?: OperationalDetail;
}

export interface FilterState {
  search: string;
  category: BillingCategory | 'ALL';
  airline: Airline | 'ALL';
  vendor: Vendor | 'ALL';
  status: string;
  period: string;
  completionStatus: 'ALL' | 'PENDING' | 'COMPLETED';
}

