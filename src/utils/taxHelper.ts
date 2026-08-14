import { BillingRecord, TaxType } from '../types';

export function getTaxRate(taxType?: TaxType): number {
  if (taxType === 'BUKAN_JASA') return 10;
  if (taxType === 'BEBAS_POTONGAN') return 0;
  return 2; // Default Jasa 2%
}

export function getTaxLabel(taxType?: TaxType): string {
  if (taxType === 'BUKAN_JASA') return 'Bukan Jasa (Potongan 10%)';
  if (taxType === 'BEBAS_POTONGAN') return 'Bebas Potongan (0%)';
  return 'Jasa (Potongan 2%)';
}

export function getTaxShortBadge(taxType?: TaxType): string {
  if (taxType === 'BUKAN_JASA') return 'Non-Jasa -10%';
  if (taxType === 'BEBAS_POTONGAN') return 'Tanpa Potongan';
  return 'Jasa -2%';
}

export interface TaxCalculationResult {
  dppAmount: number;        // Dasar Pengenaan Pajak (Subtotal point-point tagihan)
  includePpn: boolean;      // Apakah dikenakan PPN 11%
  ppnRate: number;          // 11%
  ppnNominal: number;       // DPP * 11%
  grossAmount: number;      // Total Tagihan / Invoice = DPP + PPN
  taxType: TaxType;         // Jasa (2%), Bukan Jasa (10%), Bebas (0%)
  rate: number;             // 2, 10, or 0
  deduction: number;        // Potongan PPh = DPP * rate%
  netPaymentHo: number;     // Total Patokan Pembayaran HO = Gross (DPP + PPN) - Potongan PPh
}

/**
 * Calculates complete billing breakdown:
 * 1. DPP (Dasar Pengenaan Pajak / Point tagihan)
 * 2. PPN 11% (Dikenakan sebelum dipotong jasa/non-jasa)
 * 3. Total Tagihan / Nilai Invoice = DPP + PPN 11%
 * 4. Potongan PPh (2% Jasa / 10% Bukan Jasa) dari DPP
 * 5. Total Pembayaran Patokan dari HO (Netto yang ditransfer) = Total Tagihan - Potongan PPh
 */
export function calculateTaxAndNet(
  dppOrGross: number,
  taxType: TaxType = 'JASA',
  includePpn: boolean = true,
  isInputGross: boolean = false
): TaxCalculationResult {
  const ppnRate = 11;
  const pphRate = getTaxRate(taxType);

  let dpp = 0;
  let ppn = 0;
  let gross = 0;

  if (isInputGross) {
    // If input is already Total Tagihan (Gross including PPN)
    if (includePpn) {
      dpp = Math.round(dppOrGross / 1.11);
      ppn = dppOrGross - dpp;
      gross = dppOrGross;
    } else {
      dpp = dppOrGross;
      ppn = 0;
      gross = dppOrGross;
    }
  } else {
    // Standard: Input is DPP (Subtotal point tagihan pokok)
    dpp = Math.round(dppOrGross);
    ppn = includePpn ? Math.round((dpp * ppnRate) / 100) : 0;
    gross = dpp + ppn;
  }

  // PPh deduction is calculated on DPP (Dasar Pengenaan Pajak)
  const deduction = Math.round((dpp * pphRate) / 100);
  // Total patokan pembayaran yang dicairkan/ditransfer oleh HO
  const netPaymentHo = Math.max(0, gross - deduction);

  return {
    dppAmount: dpp,
    includePpn,
    ppnRate: includePpn ? ppnRate : 0,
    ppnNominal: ppn,
    grossAmount: gross,
    taxType,
    rate: pphRate,
    deduction,
    netPaymentHo,
  };
}

export function getRecordNetPaymentHo(record: BillingRecord): number {
  if (typeof record.netPaymentHo === 'number' && record.netPaymentHo >= 0) {
    return record.netPaymentHo;
  }
  const taxType = record.taxType || 'JASA';
  const includePpn = record.includePpn !== undefined ? record.includePpn : true;
  const dpp = record.dppAmount || (includePpn ? Math.round(record.nominal / 1.11) : record.nominal);
  return calculateTaxAndNet(dpp, taxType, includePpn, false).netPaymentHo;
}

export function getRecordDeduction(record: BillingRecord): number {
  if (typeof record.deductionNominal === 'number' && record.deductionNominal >= 0) {
    return record.deductionNominal;
  }
  const taxType = record.taxType || 'JASA';
  const includePpn = record.includePpn !== undefined ? record.includePpn : true;
  const dpp = record.dppAmount || (includePpn ? Math.round(record.nominal / 1.11) : record.nominal);
  return calculateTaxAndNet(dpp, taxType, includePpn, false).deduction;
}

export function getRecordPpn(record: BillingRecord): number {
  if (typeof record.ppnNominal === 'number' && record.ppnNominal >= 0) {
    return record.ppnNominal;
  }
  const includePpn = record.includePpn !== undefined ? record.includePpn : true;
  if (!includePpn) return 0;
  const dpp = record.dppAmount || Math.round(record.nominal / 1.11);
  return Math.round((dpp * 11) / 100);
}

export function getRecordDpp(record: BillingRecord): number {
  if (typeof record.dppAmount === 'number' && record.dppAmount > 0) {
    return record.dppAmount;
  }
  const includePpn = record.includePpn !== undefined ? record.includePpn : true;
  return includePpn ? Math.round(record.nominal / 1.11) : record.nominal;
}
