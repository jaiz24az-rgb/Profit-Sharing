import React, { useState, useRef } from 'react';
import { X, Printer, Copy, Save, Plus, Trash2, Check, RefreshCw, FileText, FileSpreadsheet, Download, Upload } from 'lucide-react';
import { BillingRecord, IRFData, IRFItem } from '../types';
import { buildDefaultIRFData, generateOfficialIRFNumber } from '../utils/irfHelper';
import { parseExcelForIRF, downloadIRFTemplateExcel } from '../utils/excelHelper';

interface IRFDocumentModalProps {
  record: BillingRecord;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedRecord: BillingRecord) => void;
}

export const IRFDocumentModal: React.FC<IRFDocumentModalProps> = ({
  record,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  // Initialize IRF Data from record's irfDetail or default build
  const initialData: IRFData = record.irfDetail || buildDefaultIRFData(record);
  const [formData, setFormData] = useState<IRFData>(initialData);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [excelNotice, setExcelNotice] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setExcelNotice(null);

    try {
      const parsed = await parseExcelForIRF(file);
      
      if (!parsed.items || parsed.items.length === 0) {
        throw new Error('Tidak ada baris data item yang ditemukan dalam file Excel.');
      }

      const renumberedItems = parsed.items.map((item, idx) => ({
        ...item,
        no: idx + 1,
      }));

      const newTotal = renumberedItems.reduce((sum, item) => sum + item.amount, 0);

      setFormData((prev) => ({
        ...prev,
        items: renumberedItems,
        totalAmount: newTotal,
        ...(parsed.headerInfo?.companyName ? { companyName: parsed.headerInfo.companyName } : {}),
        ...(parsed.headerInfo?.noIrf ? { noIrf: parsed.headerInfo.noIrf } : {}),
      }));

      setExcelNotice(`Berhasil mengimpor ${renumberedItems.length} baris tagihan dari file Excel!`);
      setTimeout(() => setExcelNotice(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Gagal mengimpor file Excel.');
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  // Auto calculate total
  const calculatedTotal = formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);

  const handleItemChange = (index: number, field: keyof IRFItem, value: any) => {
    const updatedItems = [...formData.items];
    const item = { ...updatedItems[index], [field]: value };

    if (field === 'qty' || field === 'rate') {
      const q = field === 'qty' ? Number(value) : item.qty;
      const r = field === 'rate' ? Number(value) : item.rate;
      item.amount = q * r;
    }

    updatedItems[index] = item;
    const newTotal = updatedItems.reduce((sum, i) => sum + (i.amount || 0), 0);
    
    setFormData({
      ...formData,
      items: updatedItems,
      totalAmount: newTotal,
    });
  };

  const handleAddItem = () => {
    const nextNo = formData.items.length + 1;
    const newItem: IRFItem = {
      no: nextNo,
      description: `Tagihan Incoming Periode Tambahan`,
      qty: 1000,
      rate: 250,
      amount: 250000,
    };
    const updatedItems = [...formData.items, newItem];
    const newTotal = updatedItems.reduce((sum, i) => sum + (i.amount || 0), 0);
    setFormData({ ...formData, items: updatedItems, totalAmount: newTotal });
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = formData.items
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, no: i + 1 }));
    const newTotal = updatedItems.reduce((sum, i) => sum + (i.amount || 0), 0);
    setFormData({ ...formData, items: updatedItems, totalAmount: newTotal });
  };

  const handleRegenerateIRFNo = () => {
    const officialNo = generateOfficialIRFNumber(record.airline, 2, 'SUB', new Date());
    setFormData((prev) => ({ ...prev, noIrf: officialNo }));
  };

  const handleSaveToRecord = () => {
    const updatedRecord: BillingRecord = {
      ...record,
      noIrf: formData.noIrf,
      nominal: formData.totalAmount,
      irfDetail: formData,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    onSave(updatedRecord);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const text = `
INVOICING REQUEST FORM (IRF)
----------------------------------------
No. IRF    : ${formData.noIrf}
Tanggal    : ${formData.date}
Maskapai   : ${formData.specialInstruction}
Pelanggan  : ${formData.companyName}
U.p.       : ${formData.contactPerson} (${formData.phone} / ${formData.mobile})
Email      : ${formData.email}
Reference  : ${formData.reference}
Pajak      : ${formData.taxStatus}

DETAIL TAGIHAN:
${formData.items.map((it) => `${it.no}. ${it.description} | Qty: ${it.qty.toLocaleString('id-ID')} @ Rp ${it.rate.toLocaleString('id-ID')} = Rp ${it.amount.toLocaleString('id-ID')}`).join('\n')}

TOTAL PAYMENT: Rp ${formData.totalAmount.toLocaleString('id-ID')}
----------------------------------------
Requestor: ${formData.requestor} (${formData.department})
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:static print:bg-white">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full">
        
        {/* Modal Header Controls (Hidden during print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Formulir Resmi IRF (Invoicing Request Form)</h3>
              <p className="text-xs text-slate-300">
                Dokumen standar penomoran dan pengajuan IRF ke Head Office (HO)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Printable Paper Container */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-900 text-sm print:p-0 print:overflow-visible">
          
          {/* Printable Document Paper */}
          <div id="irf-print-area" className="border border-slate-800 p-6 rounded-sm space-y-4 bg-white shadow-sm print:shadow-none print:border-black">
            
            {/* Top Form Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3">
              <div>
                <h1 className="text-xl font-extrabold uppercase tracking-tight text-slate-900">
                  INVOICING REQUEST FORM
                </h1>
                <p className="text-xs text-slate-600 font-medium">Divisi Cargo & Keuangan Cabang</p>
              </div>
              <div className="text-right flex items-center gap-4 text-xs font-bold">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="isRevision"
                    checked={!formData.isRevision}
                    onChange={() => setFormData({ ...formData, isRevision: false })}
                    className="accent-blue-600"
                  />
                  <span>New</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="isRevision"
                    checked={formData.isRevision}
                    onChange={() => setFormData({ ...formData, isRevision: true })}
                    className="accent-blue-600"
                  />
                  <span>Revision*</span>
                </label>
              </div>
            </div>

            {/* Requestor Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 bg-slate-50 p-3 rounded border border-slate-200 text-xs print:bg-transparent print:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <span className="font-semibold text-slate-700">Requestor:</span>
                <input
                  type="text"
                  value={formData.requestor}
                  onChange={(e) => setFormData({ ...formData, requestor: e.target.value })}
                  className="font-medium text-right bg-transparent focus:bg-white border-b border-transparent focus:border-blue-500 px-1 py-0.5 rounded outline-none"
                />
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <span className="font-semibold text-slate-700">No. IRF Resmi:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={formData.noIrf}
                    onChange={(e) => setFormData({ ...formData, noIrf: e.target.value })}
                    className="font-mono font-bold text-blue-900 text-right bg-transparent focus:bg-white border-b border-transparent focus:border-blue-500 px-1 py-0.5 rounded outline-none w-52"
                  />
                  <button
                    onClick={handleRegenerateIRFNo}
                    title="Generate Format Resmi (002/SJ-CRG/SUB/VII/2026)"
                    className="p-1 text-slate-500 hover:text-blue-600 print:hidden"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold text-slate-700">Department:</span>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="font-medium text-right bg-transparent focus:bg-white border-b border-transparent focus:border-blue-500 px-1 py-0.5 rounded outline-none"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold text-slate-700">Date:</span>
                <input
                  type="text"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="font-medium text-right bg-transparent focus:bg-white border-b border-transparent focus:border-blue-500 px-1 py-0.5 rounded outline-none"
                />
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="border border-slate-800 rounded p-4 space-y-2 text-xs">
              <h2 className="font-bold text-slate-900 border-b border-slate-300 pb-1 uppercase tracking-wider text-[11px]">
                Detail Pelanggan / Vendor
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <label className="md:col-span-3 font-semibold text-slate-700">Company Name:</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="md:col-span-9 font-bold text-slate-900 border border-slate-300 focus:border-blue-500 rounded px-2 py-1 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                <label className="md:col-span-3 font-semibold text-slate-700 pt-1">Company Address:</label>
                <textarea
                  rows={2}
                  value={formData.companyAddress}
                  onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                  className="md:col-span-9 border border-slate-300 focus:border-blue-500 rounded px-2 py-1 outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <label className="md:col-span-3 font-semibold text-slate-700">Contact Person:</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="md:col-span-9 font-semibold border border-slate-300 focus:border-blue-500 rounded px-2 py-1 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <label className="md:col-span-3 font-semibold text-slate-700">Phone / Mobile:</label>
                <div className="md:col-span-9 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="border border-slate-300 focus:border-blue-500 rounded px-2 py-1 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Mobile"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="border border-slate-300 focus:border-blue-500 rounded px-2 py-1 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <label className="md:col-span-3 font-semibold text-slate-700">E-mail:</label>
                <input
                  type="text"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="md:col-span-9 border border-slate-300 focus:border-blue-500 rounded px-2 py-1 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <label className="md:col-span-3 font-semibold text-slate-700">Tax Status:</label>
                <div className="md:col-span-9 flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="taxStatus"
                      checked={formData.taxStatus === 'Included'}
                      onChange={() => setFormData({ ...formData, taxStatus: 'Included' })}
                      className="accent-blue-600"
                    />
                    <span>Included</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="taxStatus"
                      checked={formData.taxStatus === 'Excluded'}
                      onChange={() => setFormData({ ...formData, taxStatus: 'Excluded' })}
                      className="accent-blue-600"
                    />
                    <span>Excluded</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <label className="md:col-span-3 font-semibold text-slate-700">Reference:</label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="md:col-span-9 border border-slate-300 focus:border-blue-500 rounded px-2 py-1 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <label className="md:col-span-3 font-semibold text-slate-700">Special Instruction:</label>
                <input
                  type="text"
                  value={formData.specialInstruction}
                  onChange={(e) => setFormData({ ...formData, specialInstruction: e.target.value })}
                  className="md:col-span-9 font-bold text-blue-900 border border-slate-300 focus:border-blue-500 rounded px-2 py-1 outline-none"
                />
              </div>
            </div>

            {/* Table of Items */}
            <div className="space-y-2">
              {/* Excel Import Bar */}
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-wrap items-center justify-between gap-2 print:hidden">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <div>
                    <p className="text-xs font-bold text-emerald-950">Sumber Data dari Excel</p>
                    <p className="text-[11px] text-emerald-700">Impor data rincian tagihan dari file .xlsx, .xls, atau .csv</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx, .xls, .csv"
                    onChange={handleExcelFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => downloadIRFTemplateExcel()}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-100/50 text-emerald-800 border border-emerald-300 rounded text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                    title="Unduh contoh template file Excel yang disesuaikan untuk IRF"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Unduh Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isImporting ? 'Memproses...' : 'Upload File Excel'}</span>
                  </button>
                </div>
              </div>

              {excelNotice && (
                <div className="p-2 bg-emerald-600 text-white rounded text-xs font-medium flex items-center justify-between animate-fade-in print:hidden">
                  <span>{excelNotice}</span>
                  <button onClick={() => setExcelNotice(null)} className="hover:opacity-80">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <h2 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                  Detail Of Invoice
                </h2>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded text-xs font-medium flex items-center gap-1 print:hidden"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Baris
                </button>
              </div>

              <div className="border border-slate-800 overflow-x-auto rounded-sm">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-800 text-slate-900 font-bold uppercase text-[11px] print:bg-slate-200">
                      <th className="p-2 border-r border-slate-800 text-center w-12">No.</th>
                      <th className="p-2 border-r border-slate-800">Description</th>
                      <th className="p-2 border-r border-slate-800 text-right w-28">Koli / Qty</th>
                      <th className="p-2 border-r border-slate-800 text-right w-28">Tarif (IDR)</th>
                      <th className="p-2 border-r border-slate-800 text-right w-36">Amount (IDR)</th>
                      <th className="p-2 text-center w-10 print:hidden"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => (
                      <tr key={index} className="border-b border-slate-300 hover:bg-slate-50 print:border-slate-800">
                        <td className="p-2 border-r border-slate-800 text-center font-semibold">
                          {item.no}
                        </td>
                        <td className="p-2 border-r border-slate-800">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="w-full bg-transparent focus:bg-white border-b border-transparent focus:border-blue-500 px-1 py-0.5 outline-none font-medium"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-800 text-right">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                            className="w-full bg-transparent focus:bg-white border-b border-transparent focus:border-blue-500 px-1 py-0.5 text-right outline-none font-mono"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-800 text-right">
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                            className="w-full bg-transparent focus:bg-white border-b border-transparent focus:border-blue-500 px-1 py-0.5 text-right outline-none font-mono"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-800 text-right font-mono font-bold">
                          {item.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="p-2 text-center print:hidden">
                          {formData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-800 print:bg-slate-200">
                      <td colSpan={4} className="p-2.5 border-r border-slate-800 text-right uppercase tracking-wider">
                        TOTAL PAYMENT:
                      </td>
                      <td className="p-2.5 border-r border-slate-800 text-right font-mono text-sm text-blue-900 font-extrabold">
                        Rp {calculatedTotal.toLocaleString('id-ID')}
                      </td>
                      <td className="print:hidden"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Signature Block */}
            <div className="pt-6 grid grid-cols-3 gap-4 text-center text-xs print:pt-10">
              <div className="space-y-12">
                <p className="font-semibold text-slate-700">Dibuat Oleh,</p>
                <div>
                  <p className="font-bold underline">{formData.requestor}</p>
                  <p className="text-[11px] text-slate-500">Finance & GA Branch</p>
                </div>
              </div>
              <div className="space-y-12">
                <p className="font-semibold text-slate-700">Diperiksa Oleh,</p>
                <div>
                  <p className="font-bold underline">(.......................................)</p>
                  <p className="text-[11px] text-slate-500">Manager Finance / BM</p>
                </div>
              </div>
              <div className="space-y-12">
                <p className="font-semibold text-slate-700">Disetujui HO,</p>
                <div>
                  <p className="font-bold underline">(.......................................)</p>
                  <p className="text-[11px] text-slate-500">Finance Head Office</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Action Bar (Hidden during print) */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              {copied ? 'Tersalin!' : 'Salin Teks IRF'}
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Cetak / Print IRF
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handleSaveToRecord}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
            >
              {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saveSuccess ? 'Tersimpan ke Record!' : 'Simpan Perubahan IRF'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
