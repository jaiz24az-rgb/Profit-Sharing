import React, { useState, useRef } from 'react';
import { BillingRecord, Airline, Vendor, STAGES, BillingCategory, DEFAULT_OPERATIONAL_VENDORS, DEFAULT_CARGO_VENDORS, PeriodItem, TaxType, BillingPointItem, VendorInvoiceItem } from '../types';
import { X, PlusCircle, Layers, RefreshCw, FileSpreadsheet, Upload, Check, Building2, Boxes, Plus, Receipt, Trash2, Calendar, DollarSign, ListPlus, Calculator, Percent } from 'lucide-react';
import { generateOfficialIRFNumber, buildDefaultIRFData } from '../utils/irfHelper';
import { parseExcelForIRF } from '../utils/excelHelper';
import { formatRupiah } from '../utils/export';
import { calculateTaxAndNet, getTaxRate, calculateInvoiceTax, calculateRecordFromInvoices, getTaxLabel } from '../utils/taxHelper';

interface NewRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRecord: (newRecord: BillingRecord) => void;
  onAddBatchRecords: (records: BillingRecord[]) => void;
  cargoVendorOptions?: string[];
  operationalVendorOptions?: string[];
  onOpenAddVendorModal?: () => void;
}

export const NewRecordModal: React.FC<NewRecordModalProps> = ({
  isOpen,
  onClose,
  onAddRecord,
  onAddBatchRecords,
  cargoVendorOptions = DEFAULT_CARGO_VENDORS,
  operationalVendorOptions = DEFAULT_OPERATIONAL_VENDORS,
  onOpenAddVendorModal,
}) => {
  const [category, setCategory] = useState<BillingCategory>('CARGO');
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  
  // Form State
  const [airline, setAirline] = useState<Airline>('PT Sriwijaya Air');
  const [vendor, setVendor] = useState<Vendor>('PT 21 Express');
  const [customVendor, setCustomVendor] = useState('');
  const [periode, setPeriode] = useState('01 - 15 Feb 2026');
  const [nominal, setNominal] = useState(100000000);
  const [noInvoice, setNoInvoice] = useState('');
  const [noIrf, setNoIrf] = useState('');
  const [noIom, setNoIom] = useState('');
  const [noApgnr, setNoApgnr] = useState('');

  // Multi-Invoice State in 1 Billing Period
  const [useMultiInvoice, setUseMultiInvoice] = useState(false);
  const [invoices, setInvoices] = useState<VendorInvoiceItem[]>([
    { id: '1', invoiceNumber: '', invoiceDate: new Date().toISOString().slice(0, 10), amount: 0, description: 'Invoice Vendor #1', taxType: 'JASA', includePpn: true, adjustment: 0, adjustmentReason: '' },
    { id: '2', invoiceNumber: '', invoiceDate: new Date().toISOString().slice(0, 10), amount: 0, description: 'Invoice Vendor #2', taxType: 'JASA', includePpn: true, adjustment: 0, adjustmentReason: '' },
  ]);

  // Adjustment (+-) State for Single-Invoice Mode
  const [adjustment, setAdjustment] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');

  const handleAddInvoice = () => {
    const nextId = String(Date.now());
    setInvoices(prev => [
      ...prev,
      { 
        id: nextId, 
        invoiceNumber: '', 
        invoiceDate: new Date().toISOString().slice(0, 10), 
        amount: 0, 
        description: `Invoice Vendor #${prev.length + 1}`,
        taxType: 'JASA',
        includePpn: true,
        adjustment: 0,
        adjustmentReason: '',
      }
    ]);
  };

  const handleRemoveInvoice = (id: string) => {
    if (invoices.length <= 1) {
      alert('Minimal harus ada 1 baris invoice.');
      return;
    }
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  };

  const handleUpdateInvoice = (id: string, field: keyof VendorInvoiceItem, value: any) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        return { ...inv, [field]: value };
      }
      return inv;
    }));
  };

  const handleApplyTaxToAllInvoices = (newTaxType: TaxType, newIncludePpn?: boolean) => {
    setInvoices(prev => prev.map(inv => ({
      ...inv,
      taxType: newTaxType,
      includePpn: newIncludePpn !== undefined ? newIncludePpn : (inv.includePpn !== undefined ? inv.includePpn : true)
    })));
  };

  const handleAddPointToInvoice = (invoiceId: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        const currentPts = inv.billingPoints || [];
        const newPt: BillingPointItem = {
          id: String(Date.now()),
          description: `Point Tagihan ${currentPts.length + 1}`,
          amount: 0,
        };
        const nextPts = [...currentPts, newPt];
        const nextAmount = nextPts.reduce((s, p) => s + (p.amount || 0), 0);
        return {
          ...inv,
          billingPoints: nextPts,
          amount: nextAmount,
        };
      }
      return inv;
    }));
  };

  const handleUpdatePointInInvoice = (invoiceId: string, pointId: string, field: keyof BillingPointItem, value: any) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        const currentPts = inv.billingPoints || [];
        const nextPts = currentPts.map(p => p.id === pointId ? { ...p, [field]: value } : p);
        const nextAmount = nextPts.reduce((s, p) => s + (p.amount || 0), 0);
        return {
          ...inv,
          billingPoints: nextPts,
          amount: nextAmount,
        };
      }
      return inv;
    }));
  };

  const handleRemovePointFromInvoice = (invoiceId: string, pointId: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        const currentPts = inv.billingPoints || [];
        const nextPts = currentPts.filter(p => p.id !== pointId);
        const nextAmount = nextPts.length > 0 ? nextPts.reduce((s, p) => s + (p.amount || 0), 0) : (inv.amount || 0);
        return {
          ...inv,
          billingPoints: nextPts.length > 0 ? nextPts : undefined,
          amount: nextAmount,
        };
      }
      return inv;
    }));
  };

  const calculatedInvoicesSummary = calculateRecordFromInvoices(invoices);
  const calculatedInvoicesTotal = calculatedInvoicesSummary.totalDpp;

  // Tax & PPN State
  const [taxType, setTaxType] = useState<TaxType>('JASA');
  const [includePpn, setIncludePpn] = useState(true); // PPN 11%

  // Billing Points Breakdown (Subtotal Point-point DPP)
  const [useBillingPoints, setUseBillingPoints] = useState(false);
  const [billingPoints, setBillingPoints] = useState<BillingPointItem[]>([
    { id: '1', description: 'Point Tagihan / Biaya Pokok 1', amount: 67594162 },
  ]);

  const handleAddBillingPoint = () => {
    const nextId = String(Date.now());
    setBillingPoints(prev => [
      ...prev,
      { id: nextId, description: `Point Tagihan ${prev.length + 1}`, amount: 0 }
    ]);
  };

  const handleRemoveBillingPoint = (id: string) => {
    if (billingPoints.length <= 1) {
      alert('Minimal harus ada 1 point tagihan.');
      return;
    }
    setBillingPoints(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdateBillingPoint = (id: string, field: keyof BillingPointItem, value: any) => {
    setBillingPoints(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const calculatedPointsDpp = billingPoints.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  // Multi Periode & Nominal Breakdown State
  const [useMultiPeriode, setUseMultiPeriode] = useState(false);
  const [periodItems, setPeriodItems] = useState<PeriodItem[]>([
    { id: '1', periode: '01 - 15 Feb 2026', nominal: 50000000, keterangan: 'Periode I' },
    { id: '2', periode: '16 - 28 Feb 2026', nominal: 50000000, keterangan: 'Periode II' },
  ]);

  const handleAddPeriodItem = () => {
    const nextId = String(Date.now());
    setPeriodItems(prev => [
      ...prev,
      { id: nextId, periode: '', nominal: 0, keterangan: `Periode ${prev.length + 1}` }
    ]);
  };

  const handleRemovePeriodItem = (id: string) => {
    if (periodItems.length <= 1) {
      alert('Satu tagihan minimal memiliki 1 periode.');
      return;
    }
    setPeriodItems(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdatePeriodItem = (id: string, field: keyof PeriodItem, value: any) => {
    setPeriodItems(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const calculatedTotalNominal = periodItems.reduce((acc, p) => acc + (Number(p.nominal) || 0), 0);
  const derivedCombinedPeriode = periodItems.map(p => p.periode.trim()).filter(Boolean).join(', ');

  // Excel Upload State
  const [importedExcelData, setImportedExcelData] = useState<any | null>(null);
  const [excelFileName, setExcelFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseExcelForIRF(file);
      if (!parsed.items || parsed.items.length === 0) {
        throw new Error('Tidak ada data rincian yang ditemukan di file Excel.');
      }

      setImportedExcelData(parsed);
      setExcelFileName(file.name);

      // Auto fill form values from Excel if detected
      if (parsed.detectedRecord?.airline) setAirline(parsed.detectedRecord.airline);
      if (parsed.detectedRecord?.vendor) setVendor(parsed.detectedRecord.vendor);
      if (parsed.detectedRecord?.periode) setPeriode(parsed.detectedRecord.periode);
      if (parsed.detectedRecord?.nominal) setNominal(parsed.detectedRecord.nominal);
      if (parsed.headerInfo?.noIrf) setNoIrf(parsed.headerInfo.noIrf);
      
      setMode('single'); // Switch to single record mode for detailed excel
    } catch (err: any) {
      alert(err.message || 'Gagal membaca file Excel.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleAutoGenerateIRF = () => {
    const generated = generateOfficialIRFNumber(airline, Math.floor(1 + Math.random() * 99), 'SUB', new Date());
    setNoIrf(generated);
  };

  const handleAutoGenerateIOM = () => {
    const prefix = airline === 'PT Sriwijaya Air' ? 'SJ' : 'IN';
    const monthRoman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][new Date().getMonth()];
    const seq = Math.floor(100 + Math.random() * 899);
    setNoIom(`IOM/${prefix}-SUB/${new Date().getFullYear()}/${monthRoman}/${seq}`);
  };

  const createEmptyCargoStages = (irfNo?: string) => {
    return {
      penerimaan_data: { completed: true, emailDate: new Date().toISOString().slice(0, 10), notes: 'Data periode diterima' },
      irf: { completed: !!irfNo, emailDate: irfNo ? new Date().toISOString().slice(0, 10) : '', notes: irfNo ? `IRF No. ${irfNo} terbit` : '' },
      irf_ho: { completed: false, emailDate: '' },
      invoice: { completed: false, emailDate: '' },
      faktur: { completed: false, emailDate: '' },
      email_vendor: { completed: false, emailDate: '' },
      pembayaran: { completed: false, emailDate: '' },
      laporan_ho: { completed: false, emailDate: '' },
    };
  };

  const createEmptyOperationalStages = (iomNo?: string, apgnrNo?: string) => {
    return {
      iom: { completed: true, emailDate: new Date().toISOString().slice(0, 10), notes: iomNo ? `IOM No. ${iomNo}` : 'IOM diajukan' },
      email_ho: { completed: false, emailDate: '' },
      apgnr: { completed: !!apgnrNo, emailDate: apgnrNo ? new Date().toISOString().slice(0, 10) : '', notes: apgnrNo ? `No. APGNR: ${apgnrNo}` : '' },
      pembayaran_split: { completed: false, emailDate: '', notes: 'Pembayaran split HO' },
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedVendor = vendor === 'LAINNYA' ? customVendor : vendor;
    if (!selectedVendor) {
      alert('Masukkan nama vendor / instansi yang valid.');
      return;
    }

    const finalPeriode = useMultiPeriode ? (derivedCombinedPeriode || periode) : periode;
    
    // Determine DPP (Dasar Pengenaan Pajak / Pokok dari point-point atau subtotal)
    let finalDpp = 0;
    let finalPpn = 0;
    let finalNominal = 0;
    let finalDeduction = 0;
    let finalNetPaymentHo = 0;
    let finalTaxType = taxType;
    let finalPpnRate = includePpn ? 11 : 0;
    let finalTaxRate = getTaxRate(taxType);
    let validInvoicesWithTax: VendorInvoiceItem[] | undefined = undefined;

    let finalAdjustment = 0;
    let finalAdjustmentReason = adjustmentReason || undefined;

    if (useMultiInvoice && invoices && invoices.length > 0) {
      const validInvoices = invoices.filter(inv => inv.invoiceNumber.trim() || (inv.amount || 0) > 0 || (inv.billingPoints && inv.billingPoints.length > 0));
      const targetInvoices = validInvoices.length > 0 ? validInvoices : invoices;
      const invAgg = calculateRecordFromInvoices(targetInvoices);
      
      finalDpp = invAgg.totalDpp;
      finalPpn = invAgg.totalPpn;
      finalAdjustment = invAgg.totalAdjustment;
      finalNominal = invAgg.totalGross;
      finalDeduction = invAgg.totalDeduction;
      finalNetPaymentHo = invAgg.totalNetPaymentHo;
      finalTaxType = targetInvoices[0]?.taxType || taxType;
      finalTaxRate = getTaxRate(finalTaxType);
      finalPpnRate = targetInvoices.some(i => i.includePpn !== false) ? 11 : 0;
      validInvoicesWithTax = invAgg.invoices;
    } else {
      if (useBillingPoints) {
        finalDpp = calculatedPointsDpp;
      } else if (useMultiPeriode) {
        finalDpp = calculatedTotalNominal;
      } else {
        finalDpp = Number(nominal) || 0;
      }
      finalAdjustment = Number(adjustment) || 0;
      const taxCalc = calculateTaxAndNet(finalDpp, taxType, includePpn, false, finalAdjustment);
      finalDpp = taxCalc.dppAmount;
      finalPpn = taxCalc.ppnNominal;
      finalNominal = taxCalc.grossAmount;
      finalDeduction = taxCalc.deduction;
      finalNetPaymentHo = taxCalc.netPaymentHo;
      finalTaxType = taxType;
      finalPpnRate = taxCalc.ppnRate;
      finalTaxRate = taxCalc.rate;
    }

    if (category === 'OPERASIONAL') {
      const id = `REC-OP-2026-${Math.floor(100 + Math.random() * 900)}`;
      const finalIom = noIom || `IOM/${airline === 'PT Sriwijaya Air' ? 'SJ' : 'IN'}-SUB/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`;

      const newRec: BillingRecord = {
        id,
        category: 'OPERASIONAL',
        airline,
        vendor: selectedVendor,
        periode: finalPeriode,
        dppAmount: finalDpp,
        includePpn: finalPpnRate > 0,
        ppnRate: finalPpnRate,
        ppnNominal: finalPpn,
        adjustment: finalAdjustment,
        adjustmentReason: finalAdjustmentReason,
        nominal: finalNominal,
        taxType: finalTaxType,
        taxRate: finalTaxRate,
        deductionNominal: finalDeduction,
        netPaymentHo: finalNetPaymentHo,
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
        overallStatus: 'In Progress',
        stages: createEmptyOperationalStages(finalIom, noApgnr || undefined),
        operationalDetail: {
          noIom: finalIom,
          iomDate: new Date().toISOString().slice(0, 10),
          iomCompleted: true,
          apgnrCompleted: !!noApgnr,
          installments: []
        }
      };

      if (useMultiPeriode && periodItems && periodItems.length > 0) {
        newRec.periodItems = periodItems;
      }
      if (useBillingPoints && billingPoints && billingPoints.length > 0) {
        newRec.billingPoints = billingPoints;
      }
      if (useMultiInvoice && validInvoicesWithTax && validInvoicesWithTax.length > 0) {
        newRec.invoices = validInvoicesWithTax;
        newRec.noInvoice = validInvoicesWithTax.map(i => i.invoiceNumber).filter(Boolean).join(', ');
      } else if (noInvoice && noInvoice.trim()) {
        newRec.noInvoice = noInvoice.trim();
      }
      if (finalIom) {
        newRec.noIom = finalIom;
      }
      if (noApgnr && noApgnr.trim()) {
        newRec.noApgnr = noApgnr.trim();
        if (newRec.operationalDetail) {
          newRec.operationalDetail.noApgnr = noApgnr.trim();
          newRec.operationalDetail.apgnrDate = new Date().toISOString().slice(0, 10);
        }
      }

      onAddRecord(newRec);
    } else if (mode === 'single') {
      const id = `REC-2026-${Math.floor(100 + Math.random() * 900)}`;
      const finalIrfNo = noIrf || generateOfficialIRFNumber(airline, Math.floor(1 + Math.random() * 50), 'SUB', new Date());
      
      const newRec: BillingRecord = {
        id,
        category: 'CARGO',
        airline,
        vendor: selectedVendor,
        periode: finalPeriode,
        dppAmount: finalDpp,
        includePpn: finalPpnRate > 0,
        ppnRate: finalPpnRate,
        ppnNominal: finalPpn,
        adjustment: finalAdjustment,
        adjustmentReason: finalAdjustmentReason,
        nominal: finalNominal,
        taxType: finalTaxType,
        taxRate: finalTaxRate,
        deductionNominal: finalDeduction,
        netPaymentHo: finalNetPaymentHo,
        noIrf: finalIrfNo,
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
        overallStatus: 'In Progress',
        stages: createEmptyCargoStages(finalIrfNo),
      };

      if (useMultiPeriode && periodItems && periodItems.length > 0) {
        newRec.periodItems = periodItems;
      }
      if (useBillingPoints && billingPoints && billingPoints.length > 0) {
        newRec.billingPoints = billingPoints;
      }
      if (useMultiInvoice && validInvoicesWithTax && validInvoicesWithTax.length > 0) {
        newRec.invoices = validInvoicesWithTax;
        newRec.noInvoice = validInvoicesWithTax.map(i => i.invoiceNumber).filter(Boolean).join(', ');
      } else if (noInvoice && noInvoice.trim()) {
        newRec.noInvoice = noInvoice.trim();
      }

      const baseIrf = buildDefaultIRFData({
        airline: newRec.airline,
        vendor: newRec.vendor,
        nominal: newRec.nominal,
        noIrf: newRec.noIrf,
        periode: newRec.periode,
      });

      if (importedExcelData?.items && importedExcelData.items.length > 0) {
        baseIrf.items = importedExcelData.items;
        const excelDpp = importedExcelData.items.reduce((s: number, i: any) => s + (i.amount || 0), 0);
        const excelTaxCalc = calculateTaxAndNet(excelDpp, taxType, includePpn, false);
        baseIrf.totalAmount = excelTaxCalc.grossAmount;
        newRec.dppAmount = excelTaxCalc.dppAmount;
        newRec.ppnNominal = excelTaxCalc.ppnNominal;
        newRec.nominal = excelTaxCalc.grossAmount;
        newRec.deductionNominal = excelTaxCalc.deduction;
        newRec.netPaymentHo = excelTaxCalc.netPaymentHo;
      }

      newRec.irfDetail = baseIrf;

      onAddRecord(newRec);
    } else {
      // Batch mode: generate records for all 3 Cargo vendors
      const cargoVendors: Vendor[] = [
        'PT 21 Express',
        'PT Gatrans Mulia Indonesia',
        'PT Mitra Kargo Nusantara',
      ];

      const batch: BillingRecord[] = cargoVendors.map((v, i) => {
        const seq = Math.floor(1 + Math.random() * 50);
        const batchIrfNo = generateOfficialIRFNumber(airline, seq, 'SUB', new Date());
        const recDpp = Number(nominal) || 50000000;
        const batchTaxCalc = calculateTaxAndNet(recDpp, taxType, includePpn, false);

        const rec: BillingRecord = {
          id: `REC-2026-${Math.floor(100 + Math.random() * 900)}-${i}`,
          category: 'CARGO',
          airline,
          vendor: v,
          periode: periode,
          dppAmount: batchTaxCalc.dppAmount,
          includePpn: batchTaxCalc.includePpn,
          ppnRate: batchTaxCalc.ppnRate,
          ppnNominal: batchTaxCalc.ppnNominal,
          nominal: batchTaxCalc.grossAmount,
          taxType,
          taxRate: batchTaxCalc.rate,
          deductionNominal: batchTaxCalc.deduction,
          netPaymentHo: batchTaxCalc.netPaymentHo,
          noIrf: batchIrfNo,
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
          overallStatus: 'In Progress',
          stages: createEmptyCargoStages(batchIrfNo),
        };

        if (noInvoice && noInvoice.trim()) {
          rec.noInvoice = `${noInvoice.trim()}/${i + 1}`;
        }

        rec.irfDetail = buildDefaultIRFData({
          airline: rec.airline,
          vendor: rec.vendor,
          nominal: rec.nominal,
          noIrf: rec.noIrf,
          periode: rec.periode,
        });

        return rec;
      });

      onAddBatchRecords(batch);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PlusCircle className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">Buat Tagihan Baru</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Switcher Tabs in Modal */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCategory('CARGO');
              setVendor('PT 21 Express');
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer ${
              category === 'CARGO' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Penagihan Cargo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCategory('OPERASIONAL');
              setMode('single');
              setVendor('PT Angkasa Pura Indonesia');
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer ${
              category === 'OPERASIONAL' 
                ? 'bg-amber-600 text-white shadow-sm' 
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-300" />
            <span>Vendor Operasional</span>
          </button>
        </div>

        {/* Mode Selector for Cargo */}
        {category === 'CARGO' && (
          <div className="px-4 py-2 bg-slate-900 border-b border-slate-800/80 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('batch')}
              className={`flex-1 py-1.5 px-3 rounded-md text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition ${
                mode === 'batch' 
                  ? 'bg-blue-900/60 text-blue-300 border border-blue-700' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Batch (3 Instansi Cargo Sekaligus)</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 py-1.5 px-3 rounded-md text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition ${
                mode === 'single' 
                  ? 'bg-blue-900/60 text-blue-300 border border-blue-700' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Satu Vendor Cargo</span>
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-200">
          
          {/* Excel Quick Import Banner (for Cargo) */}
          {category === 'CARGO' && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="font-semibold text-emerald-200 text-xs">Impor Langsung dari Excel</p>
                  <p className="text-[11px] text-emerald-400/80">
                    {excelFileName ? `Terpilih: ${excelFileName}` : 'Unggah file .xlsx / .xls untuk isi otomatis'}
                  </p>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
              >
                {excelFileName ? <Check className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{excelFileName ? 'Ganti Excel' : 'Upload Excel'}</span>
              </button>
            </div>
          )}
          
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Maskapai Penagih</label>
            <select
              value={airline}
              onChange={(e) => setAirline(e.target.value as Airline)}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-blue-500 font-medium"
            >
              <option value="PT Sriwijaya Air">PT Sriwijaya Air</option>
              <option value="PT NAM Air">PT NAM Air</option>
            </select>
          </div>

          {/* Vendor selection */}
          {category === 'CARGO' && mode === 'single' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 font-semibold text-xs">Instansi / Vendor Cargo</label>
                {onOpenAddVendorModal && (
                  <button
                    type="button"
                    onClick={onOpenAddVendorModal}
                    className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Tambah Vendor Baru dengan Tanda +"
                  >
                    <Plus className="w-3 h-3 text-blue-400 stroke-[3]" />
                    <span>+ Vendor</span>
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <select
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value as Vendor)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-blue-500 font-medium text-xs"
                >
                  {cargoVendorOptions.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                  <option value="LAINNYA">+ Vendor Baru (Ketik Manual)</option>
                </select>
              </div>
              {vendor === 'LAINNYA' && (
                <input
                  type="text"
                  placeholder="Masukkan nama vendor cargo..."
                  value={customVendor}
                  onChange={(e) => setCustomVendor(e.target.value)}
                  className="w-full mt-2 p-2.5 bg-slate-950 border border-blue-500/80 rounded-lg text-white focus:outline-none text-xs"
                  required
                />
              )}
            </div>
          )}

          {category === 'OPERASIONAL' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-amber-300 font-semibold text-xs">
                  Pilih Vendor Operasional (Non-Cargo)
                </label>
                {onOpenAddVendorModal && (
                  <button
                    type="button"
                    onClick={onOpenAddVendorModal}
                    className="px-2 py-0.5 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Tambah Vendor Operasional Baru dengan Tanda +"
                  >
                    <Plus className="w-3 h-3 text-amber-400 stroke-[3]" />
                    <span>+ Vendor</span>
                  </button>
                )}
              </div>
              <select
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-amber-500 font-medium text-xs"
              >
                {operationalVendorOptions.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
                <option value="LAINNYA">+ Nama Vendor Lainnya (Ketik Manual)</option>
              </select>

              {vendor === 'LAINNYA' && (
                <input
                  type="text"
                  placeholder="Masukkan nama vendor (e.g. PT Gapura Angkasa, Hotel Mercure, dll)"
                  value={customVendor}
                  onChange={(e) => setCustomVendor(e.target.value)}
                  className="w-full mt-2 p-2.5 bg-slate-950 border border-amber-500/80 rounded-lg text-white focus:outline-none text-xs"
                  required
                />
              )}
            </div>
          )}

          {/* No. Invoice Vendor Field (Untuk PT Sriwijaya Air & PT NAM Air) - Single or Multi-Invoice */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
              <label className="block text-slate-200 font-bold text-xs flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-blue-400" />
                <span>No. Invoice Vendor (untuk Tagihan {airline})</span>
              </label>
              
              <div className="flex items-center gap-1">
                {!useMultiInvoice ? (
                  <button
                    type="button"
                    onClick={() => {
                      setUseMultiInvoice(true);
                      if (noInvoice && invoices[0]) {
                        setInvoices(prev => [{ ...prev[0], invoiceNumber: noInvoice, amount: nominal || 0 }, ...(prev.slice(1))]);
                      }
                    }}
                    className="px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-blue-400" />
                    <span>+ Multi-Invoice</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setUseMultiInvoice(false)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-medium transition cursor-pointer"
                  >
                    Kembali ke Single Invoice
                  </button>
                )}
              </div>
            </div>

            {!useMultiInvoice ? (
              <div className="space-y-1">
                <input
                  type="text"
                  value={noInvoice}
                  onChange={(e) => setNoInvoice(e.target.value)}
                  placeholder="e.g. INV/VDR/2026/08/104 atau INV/SUB/099"
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400">
                  Nomor Invoice resmi yang diterbitkan Vendor untuk ditagihkan ke {airline}. Jika dalam 1 periode terdapat lebih dari 1 nomor invoice, klik <strong>+ Multi-Invoice</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-blue-300 bg-blue-950/40 p-2 rounded-lg border border-blue-800/40">
                  <span>📄 <strong>Daftar Lembar Invoice & Rincian Point per Invoice</strong> ({invoices.length} Lembar):</span>
                  <button
                    type="button"
                    onClick={handleAddInvoice}
                    className="px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-500 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Tambah Invoice</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {invoices.map((inv, idx) => {
                    const invCalc = calculateInvoiceTax(inv);
                    const currentTaxType = inv.taxType || 'JASA';
                    const currentIncludePpn = inv.includePpn !== false;

                    return (
                      <div key={inv.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-slate-300 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-blue-900 text-blue-200 flex items-center justify-center text-[10px] font-mono">
                              {idx + 1}
                            </span>
                            <span className="text-white text-xs">Invoice #{idx + 1}</span>
                            {inv.invoiceNumber && (
                              <span className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-mono text-[10px]">
                                {inv.invoiceNumber}
                              </span>
                            )}
                          </span>
                          {invoices.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveInvoice(inv.id)}
                              className="text-rose-400 hover:text-rose-300 text-[10px] flex items-center gap-0.5 cursor-pointer px-1.5 py-0.5 rounded bg-rose-950/30 border border-rose-900/40"
                            >
                              <Trash2 className="w-3 h-3" /> Hapus Invoice
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div>
                            <label className="block text-[9px] text-slate-400 mb-0.5 font-medium">No. Invoice</label>
                            <input
                              type="text"
                              placeholder="INV/VDR/2026/08/101"
                              value={inv.invoiceNumber}
                              onChange={(e) => handleUpdateInvoice(inv.id, 'invoiceNumber', e.target.value)}
                              className="w-full p-1.5 bg-slate-950 border border-slate-700 rounded text-white font-mono text-[11px] focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] text-slate-400 mb-0.5 font-medium">Tanggal Invoice</label>
                            <input
                              type="date"
                              value={inv.invoiceDate || ''}
                              onChange={(e) => handleUpdateInvoice(inv.id, 'invoiceDate', e.target.value)}
                              className="w-full p-1.5 bg-slate-950 border border-slate-700 rounded text-white font-mono text-[11px] focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] text-slate-400 mb-0.5 font-medium">
                              Subtotal DPP Invoice (Rp)
                            </label>
                            <input
                              type="number"
                              placeholder="0"
                              value={inv.amount || ''}
                              onChange={(e) => handleUpdateInvoice(inv.id, 'amount', Number(e.target.value))}
                              className="w-full p-1.5 bg-slate-950 border border-slate-700 rounded text-emerald-400 font-mono text-[11px] font-bold focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            placeholder="Uraian / Deskripsi Invoice (opsional, e.g. Jasa Ground Handling Flight JT-902)"
                            value={inv.description || ''}
                            onChange={(e) => handleUpdateInvoice(inv.id, 'description', e.target.value)}
                            className="w-full p-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 text-[11px] focus:border-blue-500"
                          />
                        </div>

                        {/* Pengaturan Pajak & PPh Spesifik untuk Invoice Ini */}
                        <div className="p-2 bg-slate-950/70 rounded-lg border border-slate-800 space-y-1.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <span className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">
                              <span>⚙️ Potongan Pajak & PPN Invoice Ini:</span>
                            </span>

                            <div className="flex flex-wrap items-center gap-1.5">
                              <label className="flex items-center gap-1 cursor-pointer bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-[10px]">
                                <input
                                  type="checkbox"
                                  checked={currentIncludePpn}
                                  onChange={(e) => handleUpdateInvoice(inv.id, 'includePpn', e.target.checked)}
                                  className="rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                                />
                                <span className="text-emerald-300 font-semibold">PPN 11%</span>
                              </label>

                              <button
                                type="button"
                                onClick={() => handleUpdateInvoice(inv.id, 'taxType', 'JASA')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                  currentTaxType === 'JASA'
                                    ? 'bg-blue-900 text-blue-100 border border-blue-400'
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                                }`}
                              >
                                Jasa (-2%)
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUpdateInvoice(inv.id, 'taxType', 'BUKAN_JASA')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                  currentTaxType === 'BUKAN_JASA'
                                    ? 'bg-amber-900 text-amber-100 border border-amber-400'
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                                }`}
                              >
                                Bukan Jasa (-10%)
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUpdateInvoice(inv.id, 'taxType', 'BEBAS_POTONGAN')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                  currentTaxType === 'BEBAS_POTONGAN'
                                    ? 'bg-slate-700 text-slate-100 border border-slate-400'
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                                }`}
                              >
                                0% (Bebas)
                              </button>
                            </div>
                          </div>

                          {/* Penyesuaian / Selisih Pembulatan (+-) untuk invoice ini */}
                          <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                                <Calculator className="w-3 h-3 text-amber-400" />
                                <span>Penyesuaian / Pembulatan (+- Rp):</span>
                              </label>
                              <span className="text-[9px] text-slate-400">
                                Selaraskan hasil tagihan agar pas dengan cetakan invoice fisik
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Direct number input with +/- */}
                              <div className="flex items-center gap-1 flex-1 min-w-[150px]">
                                <input
                                  type="number"
                                  step="1"
                                  placeholder="0 (e.g. +50 atau -25)"
                                  value={inv.adjustment !== undefined && inv.adjustment !== 0 ? inv.adjustment : ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                    handleUpdateInvoice(inv.id, 'adjustment', val);
                                  }}
                                  className={`w-full p-1 bg-slate-950 border rounded text-xs font-mono font-bold focus:outline-none ${
                                    (inv.adjustment || 0) > 0
                                      ? 'text-emerald-400 border-emerald-500/60'
                                      : (inv.adjustment || 0) < 0
                                      ? 'text-rose-400 border-rose-500/60'
                                      : 'text-slate-300 border-slate-700'
                                  }`}
                                />
                                {(inv.adjustment || 0) !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateInvoice(inv.id, 'adjustment', 0)}
                                    className="px-1.5 py-1 text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer whitespace-nowrap"
                                    title="Reset ke 0"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>

                              {/* Quick shortcut adjustment buttons */}
                              <div className="flex items-center gap-1">
                                {[-100, -10, -1, 1, 10, 100].map((step) => (
                                  <button
                                    key={step}
                                    type="button"
                                    onClick={() => {
                                      const current = Number(inv.adjustment) || 0;
                                      handleUpdateInvoice(inv.id, 'adjustment', current + step);
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold cursor-pointer transition ${
                                      step > 0
                                        ? 'bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/60'
                                        : 'bg-rose-950/80 text-rose-300 hover:bg-rose-900 border border-rose-800/60'
                                    }`}
                                    title={`Tambah/Kurang ${step > 0 ? `+${step}` : step} Rp`}
                                  >
                                    {step > 0 ? `+${step}` : step}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Optional reason / note */}
                            <input
                              type="text"
                              placeholder="Keterangan penyesuaian (e.g. Pembulatan invoice vendor / Selisih PPN)"
                              value={inv.adjustmentReason || ''}
                              onChange={(e) => handleUpdateInvoice(inv.id, 'adjustmentReason', e.target.value)}
                              className="w-full p-1 bg-slate-950 border border-slate-800 rounded text-[10px] text-slate-300 placeholder-slate-600 focus:border-amber-500"
                            />
                          </div>

                          {/* Mini Breakdown Badge per Invoice */}
                          <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-slate-800/80 text-[10px] font-mono">
                            <span className="text-slate-400">
                              DPP: <strong className="text-slate-200">{formatRupiah(invCalc.dppAmount)}</strong>
                            </span>
                            <span className="text-emerald-400">
                              PPN: {invCalc.includePpn ? `+${formatRupiah(invCalc.ppnNominal)}` : 'Rp 0'}
                            </span>
                            {(invCalc.adjustment || 0) !== 0 && (
                              <span className={(invCalc.adjustment || 0) > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                Adj: {(invCalc.adjustment || 0) > 0 ? `+${formatRupiah(invCalc.adjustment)}` : `-${formatRupiah(Math.abs(invCalc.adjustment))}`}
                              </span>
                            )}
                            <span className="text-amber-300">
                              Tagihan: {formatRupiah(invCalc.grossAmount)}
                            </span>
                            <span className="text-rose-400">
                              PPh ({invCalc.rate}%): -{formatRupiah(invCalc.deduction)}
                            </span>
                            <span className="text-emerald-300 font-bold bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-800/60">
                              Netto HO: {formatRupiah(invCalc.netPaymentHo)}
                            </span>
                          </div>
                        </div>

                        {/* Rincian Point Tagihan didalam Invoice Ini */}
                        <div className="pt-1.5 border-t border-slate-800/80 space-y-1.5 bg-slate-950/60 p-2 rounded-lg">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <span>📌 Rincian Point Tagihan ({inv.billingPoints?.length || 0} Point)</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddPointToInvoice(inv.id)}
                              className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800 text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>+ Tambah Point</span>
                            </button>
                          </div>

                          {inv.billingPoints && inv.billingPoints.length > 0 && (
                            <div className="space-y-1">
                              {inv.billingPoints.map((pt, pIdx) => (
                                <div key={pt.id} className="flex items-center gap-1.5 text-xs">
                                  <span className="w-4 h-4 rounded bg-slate-800 text-slate-400 font-mono text-[9px] flex items-center justify-center shrink-0">
                                    {pIdx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    placeholder="Deskripsi Point (e.g. Ground Handling, Ramp, Service)"
                                    value={pt.description}
                                    onChange={(e) => handleUpdatePointInInvoice(inv.id, pt.id, 'description', e.target.value)}
                                    className="flex-1 p-1 bg-slate-900 border border-slate-700 rounded text-white text-[10px] focus:border-emerald-500"
                                  />
                                  <input
                                    type="number"
                                    placeholder="DPP (Rp)"
                                    value={pt.amount || ''}
                                    onChange={(e) => handleUpdatePointInInvoice(inv.id, pt.id, 'amount', Number(e.target.value))}
                                    className="w-28 sm:w-36 p-1 bg-slate-900 border border-slate-700 rounded text-emerald-400 font-mono text-[10px] font-bold focus:border-emerald-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePointFromInvoice(inv.id, pt.id)}
                                    className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                                    title="Hapus Point Ini"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-1 border-t border-slate-800 text-[10px] gap-2">
                  <span className="text-slate-400">
                    Total DPP ({invoices.length} Invoice): <strong className="font-mono text-emerald-400">{formatRupiah(calculatedInvoicesTotal)}</strong>
                    {' • '}
                    Total Netto HO: <strong className="font-mono text-emerald-300">{formatRupiah(calculatedInvoicesSummary.totalNetPaymentHo)}</strong>
                  </span>
                  {calculatedInvoicesTotal > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setNominal(calculatedInvoicesTotal);
                        setUseBillingPoints(true);
                      }}
                      className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800 text-[10px] font-semibold self-start sm:self-auto cursor-pointer"
                    >
                      ⚡ Sinkronkan Total ke DPP Tagihan
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Data Periode & Nominal Tagihan Section */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800/80 gap-2">
              <label className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Rincian Periode & Point Tagihan Pokok (DPP)</span>
              </label>

              {/* Mode Toggle */}
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setUseBillingPoints(false);
                    setUseMultiPeriode(false);
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                    !useBillingPoints && !useMultiPeriode
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Nominal Langsung
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseBillingPoints(true);
                    setUseMultiPeriode(false);
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition cursor-pointer ${
                    useBillingPoints
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Plus className="w-3 h-3 text-emerald-300" />
                  <span>Rincian Point (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseMultiPeriode(true);
                    setUseBillingPoints(false);
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition cursor-pointer ${
                    useMultiPeriode
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ListPlus className="w-3 h-3 text-amber-300" />
                  <span>Multi-Periode (+)</span>
                </button>
              </div>
            </div>

            {/* View 1: Standard Direct DPP Input */}
            {!useBillingPoints && !useMultiPeriode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px] font-medium">Data Periode Tagihan</label>
                  <input
                    type="text"
                    value={periode}
                    onChange={(e) => setPeriode(e.target.value)}
                    placeholder="Contoh: 01 - 15 Feb 2026"
                    required
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-300 text-[11px] font-medium">
                      Subtotal / Nilai Pokok DPP (Rp)
                    </label>
                    <span className="text-[10px] text-emerald-400 font-mono">Dikenakan PPN 11%</span>
                  </div>
                  <input
                    type="number"
                    value={nominal}
                    onChange={(e) => setNominal(Number(e.target.value))}
                    required
                    placeholder="e.g. 67594162"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 font-mono text-xs"
                  />
                </div>
              </div>
            )}

            {/* View 2: Multi-Point Breakdown */}
            {useBillingPoints && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-400 text-[11px] font-medium">Data Periode Tagihan</label>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {useMultiInvoice 
                      ? `${invoices.length} Lembar Invoice` 
                      : `Total ${billingPoints.length} Point Tagihan`}
                  </span>
                </div>
                <input
                  type="text"
                  value={periode}
                  onChange={(e) => setPeriode(e.target.value)}
                  placeholder="Contoh: 01 - 15 Feb 2026"
                  required
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 font-mono text-xs"
                />

                {useMultiInvoice ? (
                  /* Multi-Invoice Points Breakdown Grouped per Invoice */
                  <div className="space-y-3">
                    <p className="text-[11px] text-blue-300/90 bg-blue-950/30 p-2 rounded-lg border border-blue-800/40">
                      ⚡ <strong>Rincian Point Tagihan Dikelompokkan per Masing-Masing Invoice ({invoices.length} Invoice):</strong> Masukkan item / point pekerjaan dalam setiap lembar invoice vendor.
                    </p>

                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {invoices.map((inv, invIdx) => (
                        <div key={inv.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-xs">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-blue-900 text-blue-200 flex items-center justify-center text-[10px] font-mono">
                                {invIdx + 1}
                              </span>
                              <span>Invoice #{invIdx + 1}</span>
                              <span className="text-slate-400 font-mono text-[11px]">
                                {inv.invoiceNumber ? `(${inv.invoiceNumber})` : '(No. Invoice Belum Diisi)'}
                              </span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400">
                                Subtotal DPP: <strong className="font-mono text-emerald-400">{formatRupiah(inv.amount || 0)}</strong>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddPointToInvoice(inv.id)}
                                className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ Point</span>
                              </button>
                            </div>
                          </div>

                          {/* Points inside this invoice */}
                          {inv.billingPoints && inv.billingPoints.length > 0 ? (
                            <div className="space-y-1.5">
                              {inv.billingPoints.map((pt, ptIdx) => (
                                <div key={pt.id} className="flex items-center gap-2 p-1.5 bg-slate-950 rounded-lg border border-slate-800/80">
                                  <span className="w-4 h-4 rounded bg-slate-800 text-slate-300 font-mono text-[9px] flex items-center justify-center shrink-0">
                                    {ptIdx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    placeholder="Deskripsi Point Tagihan (e.g. Handling, Ramp, Service)"
                                    value={pt.description}
                                    onChange={(e) => handleUpdatePointInInvoice(inv.id, pt.id, 'description', e.target.value)}
                                    className="flex-1 p-1.5 bg-slate-900 border border-slate-700 rounded text-white text-xs focus:border-emerald-500"
                                  />
                                  <input
                                    type="number"
                                    placeholder="DPP (Rp)"
                                    value={pt.amount || ''}
                                    onChange={(e) => handleUpdatePointInInvoice(inv.id, pt.id, 'amount', Number(e.target.value))}
                                    className="w-32 sm:w-40 p-1.5 bg-slate-900 border border-slate-700 rounded text-emerald-400 font-mono text-xs font-bold focus:border-emerald-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePointFromInvoice(inv.id, pt.id)}
                                    className="p-1.5 text-rose-400 hover:text-rose-300 cursor-pointer"
                                    title="Hapus Point"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-2 bg-slate-950/60 rounded-lg border border-dashed border-slate-800 text-center flex items-center justify-between text-xs">
                              <span className="text-slate-400 text-[11px]">Belum ada rincian point pada invoice ini.</span>
                              <button
                                type="button"
                                onClick={() => handleAddPointToInvoice(inv.id)}
                                className="text-emerald-400 hover:text-emerald-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> Tambah Point Rincian
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={handleAddInvoice}
                        className="px-3 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Tambah Lembar Invoice Baru</span>
                      </button>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Total Pokok DPP Seluruh Invoice:</span>
                        <span className="text-sm font-extrabold font-mono text-emerald-400">
                          {formatRupiah(calculatedInvoicesTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Single Invoice Multi-Point Breakdown */
                  <div className="space-y-2.5">
                    <p className="text-[11px] text-emerald-300/90 bg-emerald-950/30 p-2 rounded-lg border border-emerald-800/40">
                      ⚡ <strong>Rincian Point Tagihan:</strong> Masukkan item / point-point tagihan pokok (DPP). Sistem akan menjumlahkannya dan menambahkan PPN 11% secara otomatis.
                    </p>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {billingPoints.map((item, idx) => (
                        <div key={item.id} className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 font-bold text-[10px] text-slate-300 flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Deskripsi Point (e.g. Ground Handling / Cargo Storage / Service)"
                              value={item.description}
                              onChange={(e) => handleUpdateBillingPoint(item.id, 'description', e.target.value)}
                              className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:border-emerald-500"
                              required
                            />
                          </div>
                          <div className="w-full sm:w-44">
                            <input
                              type="number"
                              placeholder="Nominal Pokok (Rp)"
                              value={item.amount || ''}
                              onChange={(e) => handleUpdateBillingPoint(item.id, 'amount', Number(e.target.value))}
                              className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-emerald-500"
                              required
                            />
                          </div>
                          {billingPoints.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBillingPoint(item.id)}
                              className="p-2 rounded bg-rose-950/40 text-rose-400 hover:bg-rose-900 hover:text-white border border-rose-800/40 text-xs transition cursor-pointer self-end sm:self-auto"
                              title="Hapus point ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAddBillingPoint}
                          className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>+ Tambah Point Tagihan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseMultiInvoice(true)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>📄 Beralih ke Multi-Invoice</span>
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Subtotal Pokok DPP:</span>
                        <span className="text-sm font-extrabold font-mono text-emerald-400">
                          {formatRupiah(calculatedPointsDpp)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View 3: Multi-Periode */}
            {useMultiPeriode && (
              <div className="space-y-2.5">
                <p className="text-[11px] text-amber-300/90 bg-amber-950/30 p-2 rounded-lg border border-amber-800/40">
                  ⚡ <strong>Satu Tagihan Multi-Periode:</strong> Masukkan beberapa sub-periode dan nominal pokok masing-masing. Total nominal tagihan akan dihitung otomatis.
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {periodItems.map((item, idx) => (
                    <div key={item.id} className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          # Rincian Periode ke-{idx + 1}
                        </span>
                        {periodItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePeriodItem(item.id)}
                            className="p-1 rounded bg-red-950/50 text-red-400 hover:bg-red-900 hover:text-white border border-red-800/40 text-[10px] flex items-center gap-1 transition cursor-pointer"
                            title="Hapus sub-periode ini"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5 font-medium">Data Periode</label>
                          <input
                            type="text"
                            placeholder="e.g. 01 - 15 Feb 2026"
                            value={item.periode}
                            onChange={(e) => handleUpdatePeriodItem(item.id, 'periode', e.target.value)}
                            className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5 font-medium">Nominal Pokok DPP (Rp)</label>
                          <input
                            type="number"
                            placeholder="50000000"
                            value={item.nominal || ''}
                            onChange={(e) => handleUpdatePeriodItem(item.id, 'nominal', Number(e.target.value))}
                            className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5 font-medium">Keterangan (Opsional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Paruh Pertama Feb"
                            value={item.keterangan || ''}
                            onChange={(e) => handleUpdatePeriodItem(item.id, 'keterangan', e.target.value)}
                            className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleAddPeriodItem}
                    className="px-3 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>+ Tambah Sub-Periode Tagihan</span>
                  </button>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Subtotal Pokok DPP ({periodItems.length} Periode):</span>
                    <span className="text-sm font-extrabold font-mono text-emerald-400">
                      {formatRupiah(calculatedTotalNominal)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PPN 11% & Jenis Potongan PPh HO Section */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
            {useMultiInvoice ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800/80 gap-2">
                  <div>
                    <label className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-emerald-400" />
                      <span>Rekapitulasi Pajak & Potongan PPh ({invoices.length} Lembar Invoice)</span>
                    </label>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Setiap invoice memiliki potongan PPh & PPN tersendiri sesuai tagihannya.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-slate-400 font-medium mr-1">Set Semua:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyTaxToAllInvoices('JASA', true)}
                      className="px-2 py-1 rounded bg-blue-950 text-blue-300 hover:bg-blue-900 border border-blue-800 text-[10px] font-bold cursor-pointer transition"
                      title="Ubah semua invoice jadi Jasa (-2%) & PPN 11%"
                    >
                      Semua Jasa (-2%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTaxToAllInvoices('BUKAN_JASA', true)}
                      className="px-2 py-1 rounded bg-amber-950 text-amber-300 hover:bg-amber-900 border border-amber-800 text-[10px] font-bold cursor-pointer transition"
                      title="Ubah semua invoice jadi Bukan Jasa (-10%) & PPN 11%"
                    >
                      Semua Non-Jasa (-10%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTaxToAllInvoices('BEBAS_POTONGAN', false)}
                      className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600 text-[10px] font-bold cursor-pointer transition"
                      title="Ubah semua invoice jadi Tanpa Potongan (0%)"
                    >
                      Semua 0%
                    </button>
                  </div>
                </div>

                {/* Multi-Invoice Live Calculation Display Box */}
                {(() => {
                  const summary = calculateRecordFromInvoices(invoices);
                  return (
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">1. Total Pokok DPP Seluruh Invoice:</span>
                        <span className="font-bold font-mono text-white">{formatRupiah(summary.totalDpp)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400 flex items-center gap-1">
                          <span>2. Total PPN (11%):</span>
                          <span className="text-[10px] text-emerald-400 font-mono">
                            (Akumulasi dari {invoices.filter(i => i.includePpn !== false).length} invoice ber-PPN)
                          </span>
                        </span>
                        <span className="font-bold font-mono text-emerald-400">+ {formatRupiah(summary.totalPpn)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400 flex items-center gap-1">
                          <span>3. Total Penyesuaian (+-):</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            (Selisih pembulatan invoice)
                          </span>
                        </span>
                        <span className={`font-bold font-mono ${summary.totalAdjustment > 0 ? 'text-emerald-400' : summary.totalAdjustment < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                          {summary.totalAdjustment > 0 ? `+ ${formatRupiah(summary.totalAdjustment)}` : summary.totalAdjustment < 0 ? `- ${formatRupiah(Math.abs(summary.totalAdjustment))}` : 'Rp 0'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/80 bg-slate-950/40 p-1.5 rounded-lg">
                        <div>
                          <span className="text-slate-300 font-semibold block">4. Total Nilai Tagihan (Invoice / Faktur Bruto):</span>
                          <span className="text-[9px] text-slate-400 font-mono">DPP + PPN 11% {summary.totalAdjustment !== 0 ? (summary.totalAdjustment > 0 ? `+ ${formatRupiah(summary.totalAdjustment)}` : `- ${formatRupiah(Math.abs(summary.totalAdjustment))}`) : ''}</span>
                        </div>
                        <span className="font-bold font-mono text-amber-300">{formatRupiah(summary.totalGross)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400 flex items-center gap-1">
                          <span>5. Total Potongan PPh (Akumulasi per Invoice):</span>
                          <span className="text-[10px] text-rose-400/80 font-mono">
                            (Sesuai tarif masing-masing invoice)
                          </span>
                        </span>
                        <span className="font-bold font-mono text-rose-400">- {formatRupiah(summary.totalDeduction)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 bg-emerald-950/30 p-2 rounded-xl border border-emerald-800/40">
                        <div>
                          <span className="text-emerald-300 font-bold block text-xs">6. Total Patokan Pembayaran dari HO (Netto):</span>
                          <span className="text-[10px] text-slate-400">Total akumulasi netto yang akan ditransfer HO</span>
                        </div>
                        <span className="font-extrabold font-mono text-base text-emerald-400">
                          {formatRupiah(summary.totalNetPaymentHo)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <label className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-emerald-400" />
                    <span>Pengenaan PPN 11% & Potongan Pajak PPh (Patokan HO)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
                      <input
                        type="checkbox"
                        checked={includePpn}
                        onChange={(e) => setIncludePpn(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-emerald-300 font-semibold text-[11px]">PPN 11%</span>
                    </label>
                  </div>
                </div>

                {/* Tax Type Options */}
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                    Pilih Tarif Potongan PPh (Dikenakan dari Dasar Pengenaan Pajak / DPP):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTaxType('JASA')}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        taxType === 'JASA'
                          ? 'bg-blue-950/60 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-blue-300">Jasa</span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                          -2% (PPh 23)
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Tagihan jasa operasional & kargo dipotong 2%
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTaxType('BUKAN_JASA')}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        taxType === 'BUKAN_JASA'
                          ? 'bg-amber-950/60 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/50'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-300">Bukan Jasa</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          -10% (Sewa/Non-Jasa)
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Sewa alat/gedung/non-jasa dipotong 10%
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTaxType('BEBAS_POTONGAN')}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        taxType === 'BEBAS_POTONGAN'
                          ? 'bg-slate-800 border-slate-500 text-white shadow-sm ring-1 ring-slate-400/50'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-300">Tanpa Potongan</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 border border-slate-600 text-[10px] font-bold">
                          0%
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Pembayaran utuh 100% tanpa potongan PPh
                      </p>
                    </button>
                  </div>
                </div>

                {/* Penyesuaian / Pembulatan (+-) Tagihan */}
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-amber-400" />
                      <span>Penyesuaian / Selisih Pembulatan Tagihan (+- Rp):</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Selaraskan hasil tagihan agar sesuai dengan invoice fisik vendor
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Direct input */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-[170px]">
                      <input
                        type="number"
                        step="1"
                        placeholder="0 (e.g. +50 atau -25)"
                        value={adjustment !== 0 ? adjustment : ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value);
                          setAdjustment(val);
                        }}
                        className={`w-full p-1.5 bg-slate-950 border rounded-lg text-xs font-mono font-bold focus:outline-none ${
                          adjustment > 0
                            ? 'text-emerald-400 border-emerald-500/60'
                            : adjustment < 0
                            ? 'text-rose-400 border-rose-500/60'
                            : 'text-slate-200 border-slate-700'
                        }`}
                      />
                      {adjustment !== 0 && (
                        <button
                          type="button"
                          onClick={() => setAdjustment(0)}
                          className="px-2 py-1.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer whitespace-nowrap"
                          title="Reset penyesuaian ke 0"
                        >
                          Reset 0
                        </button>
                      )}
                    </div>

                    {/* Quick shortcut adjustment buttons */}
                    <div className="flex items-center gap-1">
                      {[-100, -10, -1, 1, 10, 100].map((step) => (
                        <button
                          key={step}
                          type="button"
                          onClick={() => setAdjustment(prev => prev + step)}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition ${
                            step > 0
                              ? 'bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/60'
                              : 'bg-rose-950/80 text-rose-300 hover:bg-rose-900 border border-rose-800/60'
                          }`}
                          title={`Tambah/Kurang ${step > 0 ? `+${step}` : step} Rp`}
                        >
                          {step > 0 ? `+${step}` : step}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional reason / note */}
                  <input
                    type="text"
                    placeholder="Keterangan penyesuaian (e.g. Pembulatan vendor / Selisih PPN)"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="w-full p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 placeholder-slate-600 focus:border-amber-500"
                  />
                </div>

                {/* Live Calculation Display Box */}
                {(() => {
                  let currentDpp = 0;
                  if (useBillingPoints) currentDpp = calculatedPointsDpp;
                  else if (useMultiPeriode) currentDpp = calculatedTotalNominal;
                  else currentDpp = Number(nominal) || 0;

                  const calc = calculateTaxAndNet(currentDpp, taxType, includePpn, false, adjustment);
                  return (
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">1. Dasar Pengenaan Pajak / DPP (Pokok Point):</span>
                        <span className="font-bold font-mono text-white">{formatRupiah(calc.dppAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400 flex items-center gap-1">
                          <span>2. PPN ({calc.ppnRate}%):</span>
                          <span className="text-[10px] text-emerald-400 font-mono">
                            {calc.includePpn ? '(Dikenakan ke Tagihan)' : '(Non-PPN)'}
                          </span>
                        </span>
                        <span className="font-bold font-mono text-emerald-400">+ {formatRupiah(calc.ppnNominal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400 flex items-center gap-1">
                          <span>3. Penyesuaian (+-):</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            (Selisih pembulatan invoice)
                          </span>
                        </span>
                        <span className={`font-bold font-mono ${adjustment > 0 ? 'text-emerald-400' : adjustment < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                          {adjustment > 0 ? `+ ${formatRupiah(adjustment)}` : adjustment < 0 ? `- ${formatRupiah(Math.abs(adjustment))}` : 'Rp 0'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/80 bg-slate-950/40 p-1.5 rounded-lg">
                        <div>
                          <span className="text-slate-300 font-semibold block">4. Total Nilai Tagihan (Invoice / Faktur Bruto):</span>
                          <span className="text-[9px] text-slate-400 font-mono">DPP + PPN 11% {adjustment !== 0 ? (adjustment > 0 ? `+ ${formatRupiah(adjustment)}` : `- ${formatRupiah(Math.abs(adjustment))}`) : ''}</span>
                        </div>
                        <span className="font-bold font-mono text-amber-300">{formatRupiah(calc.grossAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400 flex items-center gap-1">
                          <span>5. Potongan PPh ({calc.rate}% dari DPP):</span>
                          <span className="text-[10px] text-rose-400/80 font-mono">
                            ({taxType === 'JASA' ? 'PPh 23 Jasa 2%' : taxType === 'BUKAN_JASA' ? 'PPh 10%' : '0%'})
                          </span>
                        </span>
                        <span className="font-bold font-mono text-rose-400">- {formatRupiah(calc.deduction)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 bg-emerald-950/30 p-2 rounded-xl border border-emerald-800/40">
                        <div>
                          <span className="text-emerald-300 font-bold block text-xs">6. Total Patokan Pembayaran dari HO (Netto):</span>
                          <span className="text-[10px] text-slate-400">Total Tagihan setelah PPN 11% & potongan PPh yang ditransfer HO</span>
                        </div>
                        <span className="font-extrabold font-mono text-base text-emerald-400">
                          {formatRupiah(calc.netPaymentHo)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          {/* Operational Specific Inputs (IOM & APGNR) */}
          {category === 'OPERASIONAL' ? (
            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-amber-300 font-semibold">No. IOM (Memo HO)</label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateIOM}
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Auto
                  </button>
                </div>
                <input
                  type="text"
                  value={noIom}
                  onChange={(e) => setNoIom(e.target.value)}
                  placeholder="IOM/SJ-SUB/2026/08/..."
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">No. APGNR HO (Opsional)</label>
                <input
                  type="text"
                  value={noApgnr}
                  onChange={(e) => setNoApgnr(e.target.value)}
                  placeholder="APGNR/HO/2026/08/..."
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-400 font-medium">No. IRF (Format Resmi Internal)</label>
                <button
                  type="button"
                  onClick={handleAutoGenerateIRF}
                  className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Auto Format
                </button>
              </div>
              <input
                type="text"
                value={noIrf}
                onChange={(e) => setNoIrf(e.target.value)}
                placeholder="002/SJ-CRG/SUB/VII/2026"
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs"
              />
            </div>
          )}

          {/* Submit */}
          <div className="pt-4 border-t border-slate-800 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-lg text-white font-medium shadow-md flex items-center space-x-1.5 cursor-pointer ${
                category === 'OPERASIONAL' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{category === 'CARGO' && mode === 'batch' ? 'Generate 3 Tagihan' : 'Simpan Tagihan'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

