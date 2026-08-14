import React, { useState, useRef } from 'react';
import { BillingRecord, Airline, Vendor, STAGES, BillingCategory, DEFAULT_OPERATIONAL_VENDORS, DEFAULT_CARGO_VENDORS, PeriodItem } from '../types';
import { X, PlusCircle, Layers, RefreshCw, FileSpreadsheet, Upload, Check, Building2, Boxes, Plus, Receipt, Trash2, Calendar, DollarSign, ListPlus } from 'lucide-react';
import { generateOfficialIRFNumber, buildDefaultIRFData } from '../utils/irfHelper';
import { parseExcelForIRF } from '../utils/excelHelper';
import { formatRupiah } from '../utils/export';

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
    const finalNominal = useMultiPeriode ? calculatedTotalNominal : (Number(nominal) || 0);
    const finalPeriodItems = useMultiPeriode ? periodItems : undefined;

    if (category === 'OPERASIONAL') {
      const id = `REC-OP-2026-${Math.floor(100 + Math.random() * 900)}`;
      const finalIom = noIom || `IOM/${airline === 'PT Sriwijaya Air' ? 'SJ' : 'IN'}-SUB/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`;

      const newRec: BillingRecord = {
        id,
        category: 'OPERASIONAL',
        airline,
        vendor: selectedVendor,
        periode: finalPeriode,
        nominal: finalNominal,
        periodItems: finalPeriodItems,
        noInvoice: noInvoice || undefined,
        noIom: finalIom,
        noApgnr: noApgnr || undefined,
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
        overallStatus: 'In Progress',
        stages: createEmptyOperationalStages(finalIom, noApgnr),
        operationalDetail: {
          noIom: finalIom,
          iomDate: new Date().toISOString().slice(0, 10),
          iomCompleted: true,
          noApgnr: noApgnr || undefined,
          apgnrDate: noApgnr ? new Date().toISOString().slice(0, 10) : undefined,
          apgnrCompleted: !!noApgnr,
          installments: []
        }
      };

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
        nominal: finalNominal,
        periodItems: finalPeriodItems,
        noInvoice: noInvoice || undefined,
        noIrf: finalIrfNo,
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
        overallStatus: 'In Progress',
        stages: createEmptyCargoStages(finalIrfNo),
      };

      const baseIrf = buildDefaultIRFData({
        airline: newRec.airline,
        vendor: newRec.vendor,
        nominal: newRec.nominal,
        noIrf: newRec.noIrf,
        periode: newRec.periode,
      });

      if (importedExcelData?.items && importedExcelData.items.length > 0) {
        baseIrf.items = importedExcelData.items;
        baseIrf.totalAmount = importedExcelData.items.reduce((s: number, i: any) => s + (i.amount || 0), 0);
        newRec.nominal = baseIrf.totalAmount;
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

        const rec: BillingRecord = {
          id: `REC-2026-${Math.floor(100 + Math.random() * 900)}-${i}`,
          category: 'CARGO',
          airline,
          vendor: v,
          periode,
          nominal: Number(nominal) || 50000000,
          noInvoice: noInvoice ? `${noInvoice}/${i + 1}` : undefined,
          noIrf: batchIrfNo,
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
          overallStatus: 'In Progress',
          stages: createEmptyCargoStages(batchIrfNo),
        };

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

          {/* No. Invoice Vendor Field (Untuk PT Sriwijaya Air & PT NAM Air) */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-slate-200 font-bold text-xs flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-blue-400" />
                <span>No. Invoice Vendor (untuk Tagihan {airline})</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Opsional / Dari Vendor</span>
            </div>
            <input
              type="text"
              value={noInvoice}
              onChange={(e) => setNoInvoice(e.target.value)}
              placeholder="e.g. INV/VDR/2026/08/104 atau INV/SUB/099"
              className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400">
              Nomor Invoice resmi yang diterbitkan Vendor untuk ditagihkan ke {airline}.
            </p>
          </div>

          {/* Data Periode & Nominal Tagihan Section */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <label className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Rincian Periode & Nominal Tagihan</span>
              </label>

              {/* Mode Toggle */}
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setUseMultiPeriode(false)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                    !useMultiPeriode
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Single Periode
                </button>
                <button
                  type="button"
                  onClick={() => setUseMultiPeriode(true)}
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

            {!useMultiPeriode ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px] font-medium">Data Periode Tagihan</label>
                  <input
                    type="text"
                    value={periode}
                    onChange={(e) => setPeriode(e.target.value)}
                    placeholder="Contoh: 01 - 15 Feb 2026"
                    required={!useMultiPeriode}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 text-[11px] font-medium">
                    {category === 'OPERASIONAL' ? 'Total Nominal Tagihan (Rp)' : 'Nominal Tagihan (Rp)'}
                  </label>
                  <input
                    type="number"
                    value={nominal}
                    onChange={(e) => setNominal(Number(e.target.value))}
                    required={!useMultiPeriode}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 font-mono text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[11px] text-amber-300/90 bg-amber-950/30 p-2 rounded-lg border border-amber-800/40">
                  ⚡ <strong>Satu Tagihan Multi-Periode:</strong> Masukkan beberapa sub-periode dan nominal masing-masing. Total nominal tagihan akan dihitung otomatis.
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
                          <label className="block text-[10px] text-slate-400 mb-0.5 font-medium">Nominal (Rp)</label>
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
                    <span className="text-[10px] text-slate-400 block font-medium">Total Tagihan ({periodItems.length} Periode):</span>
                    <span className="text-sm font-extrabold font-mono text-emerald-400">
                      {formatRupiah(calculatedTotalNominal)}
                    </span>
                  </div>
                </div>
              </div>
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

