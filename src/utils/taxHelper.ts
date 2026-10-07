import { BillingRecord, TaxType, VendorInvoiceItem } from '../types';

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
  adjustment: number;       // Penyesuaian (+-) angka agar sesuai dengan tagihan invoice vendor
  grossAmount: number;      // Total Tagihan / Invoice = DPP + PPN +/- Penyesuaian
  taxType: TaxType;         // Jasa (2%), Bukan Jasa (10%), Bebas (0%)
  rate: number;             // 2, 10, or 0
  deduction: number;        // Potongan PPh = DPP * rate%
  netPaymentHo: number;     // Total Patokan Pembayaran HO = Gross (DPP + PPN +/- Penyesuaian) - Potongan PPh
}

/**
 * Calculates tax breakdown for a single invoice item
 */
export function calculateInvoiceTax(inv: VendorInvoiceItem): VendorInvoiceItem & TaxCalculationResult {
  const taxType = inv.taxType || 'JASA';
  const includePpn = inv.includePpn !== undefined ? inv.includePpn : true;
  const adjustment = Number(inv.adjustment) || 0;
  
  // Calculate DPP from billing points if available, else from inv.amount
  let dpp = 0;
  if (inv.billingPoints && inv.billingPoints.length > 0) {
    dpp = inv.billingPoints.reduce((s, p) => s + (p.amount || 0), 0);
  } else {
    dpp = Number(inv.amount) || 0;
  }

  const taxResult = calculateTaxAndNet(dpp, taxType, includePpn, false, adjustment);

  return {
    ...inv,
    amount: dpp,
    taxType,
    includePpn,
    adjustment,
    adjustmentReason: inv.adjustmentReason,
    ppnNominal: taxResult.ppnNominal,
    grossAmount: taxResult.grossAmount,
    deductionNominal: taxResult.deduction,
    netPaymentHo: taxResult.netPaymentHo,
    ...taxResult,
  };
}

/**
 * Aggregates all invoices in a record into a combined tax and total summary
 */
export function calculateRecordFromInvoices(invoices: VendorInvoiceItem[]) {
  const calculatedInvoices = invoices.map(inv => calculateInvoiceTax(inv));

  const totalDpp = calculatedInvoices.reduce((s, i) => s + (i.dppAmount || 0), 0);
  const totalPpn = calculatedInvoices.reduce((s, i) => s + (i.ppnNominal || 0), 0);
  const totalAdjustment = calculatedInvoices.reduce((s, i) => s + (Number(i.adjustment) || 0), 0);
  const totalGross = calculatedInvoices.reduce((s, i) => s + (i.grossAmount || 0), 0);
  const totalDeduction = calculatedInvoices.reduce((s, i) => s + (i.deductionNominal || 0), 0);
  const totalNetPaymentHo = calculatedInvoices.reduce((s, i) => s + (i.netPaymentHo || 0), 0);

  return {
    invoices: calculatedInvoices,
    totalDpp,
    totalPpn,
    totalAdjustment,
    totalGross,
    totalDeduction,
    totalNetPaymentHo,
  };
}

/**
 * Calculates complete billing breakdown:
 * 1. DPP (Dasar Pengenaan Pajak / Point tagihan)
 * 2. PPN 11% (Dikenakan sebelum dipotong jasa/non-jasa)
 * 3. Penyesuaian (+-) angka pembulatan / selisih invoice
 * 4. Total Tagihan / Nilai Invoice = DPP + PPN 11% +/- Penyesuaian
 * 5. Potongan PPh (2% Jasa / 10% Bukan Jasa) dari DPP
 * 6. Total Pembayaran Patokan dari HO (Netto yang ditransfer) = Total Tagihan - Potongan PPh
 */
export function calculateTaxAndNet(
  dppOrGross: number,
  taxType: TaxType = 'JASA',
  includePpn: boolean = true,
  isInputGross: boolean = false,
  adjustment: number = 0
): TaxCalculationResult {
  const ppnRate = 11;
  const pphRate = getTaxRate(taxType);
  const adj = Number(adjustment) || 0;

  let dpp = 0;
  let ppn = 0;
  let gross = 0;

  if (isInputGross) {
    // If input is already Total Tagihan (Gross including PPN & adjustment)
    const baseGross = dppOrGross - adj;
    if (includePpn) {
      dpp = Math.round(baseGross / 1.11);
      ppn = baseGross - dpp;
      gross = dppOrGross;
    } else {
      dpp = baseGross;
      ppn = 0;
      gross = dppOrGross;
    }
  } else {
    // Standard: Input is DPP (Subtotal point tagihan pokok)
    dpp = Math.round(dppOrGross);
    ppn = includePpn ? Math.round((dpp * ppnRate) / 100) : 0;
    gross = dpp + ppn + adj;
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
    adjustment: adj,
    grossAmount: gross,
    taxType,
    rate: pphRate,
    deduction,
    netPaymentHo,
  };
}

export function getRecordAdjustment(record: BillingRecord): number {
  if (record.invoices && record.invoices.length > 0) {
    return record.invoices.reduce((s, inv) => {
      return s + (Number(inv.adjustment) || 0);
    }, 0);
  }
  return Number(record.adjustment) || 0;
}

export function getRecordNetPaymentHo(record: BillingRecord): number {
  if (record.invoices && record.invoices.length > 0) {
    return record.invoices.reduce((s, inv) => {
      const calc = calculateInvoiceTax(inv);
      return s + (calc.netPaymentHo || 0);
    }, 0);
  }
  if (typeof record.netPaymentHo === 'number' && record.netPaymentHo >= 0) {
    return record.netPaymentHo;
  }
  const taxType = record.taxType || 'JASA';
  const includePpn = record.includePpn !== undefined ? record.includePpn : true;
  const adj = Number(record.adjustment) || 0;
  const dpp = record.dppAmount || (includePpn ? Math.round((record.nominal - adj) / 1.11) : (record.nominal - adj));
  return calculateTaxAndNet(dpp, taxType, includePpn, false, adj).netPaymentHo;
}

export function getRecordDeduction(record: BillingRecord): number {
  if (record.invoices && record.invoices.length > 0) {
    return record.invoices.reduce((s, inv) => {
      const calc = calculateInvoiceTax(inv);
      return s + (calc.deductionNominal || 0);
    }, 0);
  }
  if (typeof record.deductionNominal === 'number' && record.deductionNominal >= 0) {
    return record.deductionNominal;
  }
  const taxType = record.taxType || 'JASA';
  const includePpn = record.includePpn !== undefined ? record.includePpn : true;
  const dpp = record.dppAmount || (includePpn ? Math.round(record.nominal / 1.11) : record.nominal);
  return calculateTaxAndNet(dpp, taxType, includePpn, false).deduction;
}

export function getRecordPpn(record: BillingRecord): number {
  if (record.invoices && record.invoices.length > 0) {
    return record.invoices.reduce((s, inv) => {
      const calc = calculateInvoiceTax(inv);
      return s + (calc.ppnNominal || 0);
    }, 0);
  }
  if (typeof record.ppnNominal === 'number' && record.ppnNominal >= 0) {
    return record.ppnNominal;
  }
  const includePpn = record.includePpn !== undefined ? record.includePpn : true;
  if (!includePpn) return 0;
  const dpp = record.dppAmount || Math.round(record.nominal / 1.11);
  return Math.round((dpp * 11) / 100);
}

export function getRecordDpp(record: BillingRecord): number {
  if (record.invoices && record.invoices.length > 0) {
    return record.invoices.reduce((s, inv) => {
      const calc = calculateInvoiceTax(inv);
      return s + (calc.dppAmount || 0);
    }, 0);
  }
  if (typeof record.dppAmount === 'number' && record.dppAmount > 0) {
    return record.dppAmount;
  }
  const includePpn = record.includePpn !== undefined ? record.includePpn : true;
  return includePpn ? Math.round(record.nominal / 1.11) : record.nominal;
}

