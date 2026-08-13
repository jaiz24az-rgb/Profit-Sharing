/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Airline = 'PT Sriwijaya Air' | 'PT NAM Air';

export type Vendor = 
  | 'PT 21 Express' 
  | 'PT Gatrans Mulia Indonesia' 
  | 'PT Mitra Kargo Nusantara';

export type StageKey = 
  | 'penerimaan_data'
  | 'irf'
  | 'irf_ho'
  | 'invoice'
  | 'faktur'
  | 'email_vendor'
  | 'pembayaran'
  | 'laporan_ho';

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

export interface BillingRecord {
  id: string;
  airline: Airline;
  vendor: Vendor;
  periode: string; // e.g. "01 - 15 Jan 2026"
  noInvoice?: string;
  noIrf?: string;
  nominal: number; // in IDR
  createdAt: string;
  updatedAt: string;
  stages: Record<StageKey, ChecklistStageItem>;
  overallStatus: 'Draft' | 'In Progress' | 'Paid' | 'Completed HO' | 'Overdue';
  catatanUtama?: string;
  irfDetail?: IRFData;
}

export interface FilterState {
  search: string;
  airline: Airline | 'ALL';
  vendor: Vendor | 'ALL';
  status: string;
  period: string;
  completionStatus: 'ALL' | 'PENDING' | 'COMPLETED';
}
