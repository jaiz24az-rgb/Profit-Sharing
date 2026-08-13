import { Airline, Vendor, IRFData, IRFItem, BillingRecord } from '../types';

/**
 * Converts a month number (1-12) or Date to Roman Numeral (I - XII)
 */
export function getRomanMonth(monthNumber: number): string {
  const romanMap = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const index = Math.max(0, Math.min(11, monthNumber - 1));
  return romanMap[index];
}

/**
 * Generates official IRF Number following the exact format from user's document:
 * Format: {NomorUrut}/{KodeMaskapai}-CRG/{Cabang}/{BulanRomawi}/{Tahun}
 * Example Sriwijaya Air: 002/SJ-CRG/SUB/VII/2026
 * Example NAM Air:       002/IN-CRG/SUB/VII/2026
 */
export function generateOfficialIRFNumber(
  airline: Airline,
  sequenceNumber: number = 2,
  branchCode: string = 'SUB',
  date: Date = new Date()
): string {
  const paddedSeq = String(sequenceNumber).padStart(3, '0');
  const airlineCode = airline === 'PT Sriwijaya Air' ? 'SJ-CRG' : 'IN-CRG';
  const romanMonth = getRomanMonth(date.getMonth() + 1);
  const year = date.getFullYear();

  return `${paddedSeq}/${airlineCode}/${branchCode}/${romanMonth}/${year}`;
}

/**
 * Default Vendor Profile Data from user's official IRF forms
 */
export const VENDOR_PROFILES: Record<Vendor, {
  companyName: string;
  companyAddress: string;
  contactPerson: string;
  phone: string;
  mobile: string;
  email: string;
  reference: string;
  taxStatus: 'Included' | 'Excluded';
}> = {
  'PT 21 Express': {
    companyName: 'PT.ANDALAN 21 EXPRESS',
    companyAddress: 'Jl.Jemur Andayani 50 Blok D 101-102 Surabaya',
    contactPerson: 'SUTOPO',
    phone: '031-8472140',
    mobile: '081330073456',
    email: 'sutopo_21express@yahoo.com',
    reference: "smu.21sub@g21express.co.id'",
    taxStatus: 'Excluded'
  },
  'PT Gatrans Mulia Indonesia': {
    companyName: 'PT GATRANS MULIA INDONESIA',
    companyAddress: 'Jl. Perak Timur No. 120 Surabaya',
    contactPerson: 'HERI',
    phone: '031-3551234',
    mobile: '081234567890',
    email: 'finance@gatrans.co.id',
    reference: 'ops.surabaya@gatrans.co.id',
    taxStatus: 'Excluded'
  },
  'PT Mitra Kargo Nusantara': {
    companyName: 'PT MITRA KARGO NUSANTARA',
    companyAddress: 'Ruko Gateway Waru Sidoarjo - Surabaya',
    contactPerson: 'BAMBANG',
    phone: '031-8559876',
    mobile: '081987654321',
    email: 'ar.mkn@mitrakargo.co.id',
    reference: 'mkn.sub@mitrakargo.co.id',
    taxStatus: 'Excluded'
  }
};

/**
 * Generates default IRFData structure matching the user's uploaded form exactly
 */
export function buildDefaultIRFData(
  record: Partial<BillingRecord> & { airline: Airline; vendor: Vendor; nominal: number }
): IRFData {
  const vendorProfile = VENDOR_PROFILES[record.vendor] || VENDOR_PROFILES['PT 21 Express'];
  const today = new Date();
  
  // Indonesian date string e.g. "29 Juli 2026"
  const dateFormatted = today.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const irfNo = record.noIrf && record.noIrf.includes('/') 
    ? record.noIrf 
    : generateOfficialIRFNumber(record.airline, 2, 'SUB', today);

  const specialInst = record.airline === 'PT Sriwijaya Air' ? 'PT. SRIWIJAYA AIR' : 'PT. NAM AIR';

  // Sample Breakdown Items similar to the uploaded image table (or single item based on record)
  const items: IRFItem[] = [
    {
      no: 1,
      description: `Tagihan Incoming Periode ${record.periode || 'Januari 2026'}`,
      qty: Math.round(record.nominal / 250) || 1846,
      rate: 250,
      amount: record.nominal || 461500
    }
  ];

  return {
    requestor: 'Fathul Aziz',
    department: 'Finance & GA',
    noIrf: irfNo,
    date: dateFormatted,
    isRevision: false,
    companyName: vendorProfile.companyName,
    companyAddress: vendorProfile.companyAddress,
    contactPerson: vendorProfile.contactPerson,
    phone: vendorProfile.phone,
    mobile: vendorProfile.mobile,
    email: vendorProfile.email,
    taxStatus: vendorProfile.taxStatus,
    reference: vendorProfile.reference,
    specialInstruction: specialInst,
    items,
    totalAmount: record.nominal || 461500
  };
}
