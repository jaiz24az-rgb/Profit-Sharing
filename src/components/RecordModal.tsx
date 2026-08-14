import React, { useState, useEffect } from 'react';
import { BillingRecord, STAGES, StageKey, Airline, Vendor, DEFAULT_OPERATIONAL_VENDORS, DEFAULT_CARGO_VENDORS, PeriodItem } from '../types';
import { formatRupiah } from '../utils/export';
import { X, Calendar, CheckCircle2, Save, Trash2, FileText, Building2, Plane, RefreshCw, ExternalLink, Plus, Receipt, ListPlus } from 'lucide-react';
import { generateOfficialIRFNumber } from '../utils/irfHelper';

interface RecordModalProps {
  record: BillingRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedRecord: BillingRecord) => void;
  onDelete: (recordId: string) => void;
  onOpenIRFModal?: (record: BillingRecord) => void;
  vendorOptions?: string[];
  onOpenAddVendorModal?: () => void;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  record,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onOpenIRFModal,
  vendorOptions,
  onOpenAddVendorModal,
}) => {
  const [formData, setFormData] = useState<BillingRecord | null>(record);

  useEffect(() => {
    setFormData(record);
  }, [record]);

  if (!isOpen || !formData) return null;

  const handleAutoGenerateIRF = () => {
    if (!formData) return;
    const officialNo = generateOfficialIRFNumber(formData.airline, 2, 'SUB', new Date());
    setFormData({ ...formData, noIrf: officialNo });
  };

  const handleStageChange = (stageKey: StageKey, field: 'completed' | 'emailDate' | 'notes', value: any) => {
    setFormData(prev => {
      if (!prev) return null;
      const currentStage = prev.stages[stageKey] || { completed: false, emailDate: '' };
      const updatedStage = {
        ...currentStage,
        [field]: value,
        emailDate: field === 'completed' && value && !currentStage.emailDate 
          ? new Date().toISOString().slice(0, 10) 
          : (field === 'emailDate' ? value : currentStage.emailDate)
      };

      const newStages = { ...prev.stages, [stageKey]: updatedStage };

      let overallStatus = prev.overallStatus;
      if (newStages.laporan_ho.completed) overallStatus = 'Completed HO';
      else if (newStages.pembayaran.completed) overallStatus = 'Paid';
      else overallStatus = 'In Progress';

      return {
        ...prev,
        stages: newStages,
        overallStatus,
        updatedAt: new Date().toISOString().slice(0, 10)
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onSave(formData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Detail & Checklist Tahapan Tagihan</h3>
              <p className="text-xs text-slate-400">ID Berkas: {formData.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-200">
          
          {/* Main Attributes Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-slate-400 mb-1">Maskapai Penagih</label>
              <select
                value={formData.airline}
                onChange={(e) => setFormData(prev => prev ? ({ ...prev, airline: e.target.value as Airline }) : null)}
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium focus:border-blue-500"
              >
                <option value="PT Sriwijaya Air">PT Sriwijaya Air</option>
                <option value="PT NAM Air">PT NAM Air</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-400">Instansi / Vendor (Penerima Tagihan)</label>
                {onOpenAddVendorModal && (
                  <button
                    type="button"
                    onClick={onOpenAddVendorModal}
                    className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Tambah Vendor Baru dengan Tanda +"
                  >
                    <Plus className="w-3 h-3 text-blue-400 stroke-[3]" />
                    <span>+ Vendor</span>
                  </button>
                )}
              </div>
              <select
                value={formData.vendor}
                onChange={(e) => setFormData(prev => prev ? ({ ...prev, vendor: e.target.value as Vendor }) : null)}
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium focus:border-blue-500"
              >
                {(vendorOptions || (formData.category === 'OPERASIONAL' ? DEFAULT_OPERATIONAL_VENDORS : DEFAULT_CARGO_VENDORS)).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
                {!vendorOptions?.includes(formData.vendor) && (
                  <option value={formData.vendor}>{formData.vendor}</option>
                )}
              </select>
            </div>

            {/* Data Periode & Nominal Section */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <label className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Rincian Periode & Nominal</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => {
                      if (!prev) return null;
                      if (prev.periodItems && prev.periodItems.length > 0) {
                        // Switch off multi-periode
                        return { ...prev, periodItems: undefined };
                      } else {
                        // Switch on multi-periode
                        const initial: PeriodItem[] = [
                          { id: '1', periode: prev.periode || '01 - 15 Feb 2026', nominal: prev.nominal || 0, keterangan: 'Periode I' },
                          { id: '2', periode: '16 - 28 Feb 2026', nominal: 0, keterangan: 'Periode II' },
                        ];
                        return {
                          ...prev,
                          periodItems: initial,
                        };
                      }
                    });
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border transition cursor-pointer ${
                    formData.periodItems && formData.periodItems.length > 0
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800/80'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  <ListPlus className="w-3 h-3 text-amber-400" />
                  <span>{formData.periodItems && formData.periodItems.length > 0 ? 'Mode Multi-Periode Aktif' : '+ Aktifkan Multi-Periode'}</span>
                </button>
              </div>

              {(!formData.periodItems || formData.periodItems.length === 0) ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Data Periode</label>
                    <input
                      type="text"
                      placeholder="Contoh: 01 - 15 Jan 2026"
                      value={formData.periode}
                      onChange={(e) => setFormData(prev => prev ? ({ ...prev, periode: e.target.value }) : null)}
                      className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Nominal Tagihan (Rp)</label>
                    <input
                      type="number"
                      value={formData.nominal}
                      onChange={(e) => setFormData(prev => prev ? ({ ...prev, nominal: Number(e.target.value) }) : null)}
                      className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {formData.periodItems.map((item, idx) => (
                      <div key={item.id} className="p-2 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-slate-400"># Sub-Periode {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => {
                                if (!prev || !prev.periodItems) return prev;
                                const nextItems = prev.periodItems.filter(p => p.id !== item.id);
                                const nextTotal = nextItems.reduce((s, p) => s + (p.nominal || 0), 0);
                                const nextCombined = nextItems.map(p => p.periode).filter(Boolean).join(', ');
                                return {
                                  ...prev,
                                  periodItems: nextItems.length > 0 ? nextItems : undefined,
                                  nominal: nextItems.length > 0 ? nextTotal : prev.nominal,
                                  periode: nextItems.length > 0 ? nextCombined : prev.periode,
                                };
                              });
                            }}
                            className="text-red-400 hover:text-red-300 text-[9px] flex items-center gap-0.5"
                          >
                            <Trash2 className="w-2.5 h-2.5" /> Hapus
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-xs">
                          <input
                            type="text"
                            placeholder="Periode (01 - 15 Feb)"
                            value={item.periode}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData(prev => {
                                if (!prev || !prev.periodItems) return prev;
                                const nextItems = prev.periodItems.map(p => p.id === item.id ? { ...p, periode: val } : p);
                                const nextCombined = nextItems.map(p => p.periode).filter(Boolean).join(', ');
                                return { ...prev, periodItems: nextItems, periode: nextCombined };
                              });
                            }}
                            className="p-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono text-[11px]"
                          />

                          <input
                            type="number"
                            placeholder="Nominal (Rp)"
                            value={item.nominal || ''}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setFormData(prev => {
                                if (!prev || !prev.periodItems) return prev;
                                const nextItems = prev.periodItems.map(p => p.id === item.id ? { ...p, nominal: val } : p);
                                const nextTotal = nextItems.reduce((s, p) => s + (p.nominal || 0), 0);
                                return { ...prev, periodItems: nextItems, nominal: nextTotal };
                              });
                            }}
                            className="p-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono text-[11px]"
                          />

                          <input
                            type="text"
                            placeholder="Ket (Opsional)"
                            value={item.keterangan || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData(prev => {
                                if (!prev || !prev.periodItems) return prev;
                                const nextItems = prev.periodItems.map(p => p.id === item.id ? { ...p, keterangan: val } : p);
                                return { ...prev, periodItems: nextItems };
                              });
                            }}
                            className="p-1.5 bg-slate-900 border border-slate-700 rounded text-white text-[11px]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => {
                          if (!prev) return prev;
                          const current = prev.periodItems || [];
                          const newItem: PeriodItem = {
                            id: String(Date.now()),
                            periode: '',
                            nominal: 0,
                            keterangan: `Periode ${current.length + 1}`
                          };
                          return {
                            ...prev,
                            periodItems: [...current, newItem]
                          };
                        });
                      }}
                      className="px-2 py-1 bg-blue-950 text-blue-300 hover:bg-blue-900 rounded border border-blue-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Sub-Periode</span>
                    </button>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">Total: {formatRupiah(formData.nominal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-blue-400" />
                <span>No. Invoice Vendor ({formData.airline})</span>
              </label>
              <input
                type="text"
                value={formData.noInvoice || ''}
                onChange={(e) => setFormData(prev => prev ? ({ ...prev, noInvoice: e.target.value }) : null)}
                placeholder="INV/VDR/2026/08/xxx"
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-400">No. IRF (Format Resmi)</label>
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
                value={formData.noIrf || ''}
                onChange={(e) => setFormData(prev => prev ? ({ ...prev, noIrf: e.target.value }) : null)}
                placeholder="002/SJ-CRG/SUB/VII/2026"
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-blue-500"
              />
            </div>
          </div>

          {/* IRF Quick Launcher Banner */}
          <div className="bg-blue-950/50 border border-blue-800/60 p-3 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-bold text-white text-xs flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Dokumen Formulir Invoicing Request Form (IRF)</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cetak atau edit rincian IRF resmi untuk diajukan ke HO
              </p>
            </div>
            {onOpenIRFModal && (
              <button
                type="button"
                onClick={() => onOpenIRFModal(formData)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow"
              >
                <span>Buka Form IRF</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 8 Stages Checklist Checklist Steps */}
          <div>
            <h4 className="font-bold text-white mb-3 text-sm flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Daftar 8 Tahapan Checklist Penagihan</span>
            </h4>

            <div className="space-y-3">
              {STAGES.map((stage) => {
                const st = formData.stages[stage.key] || { completed: false, emailDate: '' };
                return (
                  <div 
                    key={stage.key}
                    className={`p-3 rounded-xl border transition ${
                      st.completed 
                        ? 'bg-slate-950 border-emerald-500/30' 
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      {/* Checkbox & Stage Name */}
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={(e) => handleStageChange(stage.key, 'completed', e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
                        />
                        <div>
                          <span className="font-semibold text-white text-xs">
                            {stage.order}. {stage.label}
                          </span>
                          <p className="text-[10px] text-slate-400">{stage.description}</p>
                        </div>
                      </label>

                      {/* Date Picker for Stage Email Date */}
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-slate-400">Tgl Email/Proses:</span>
                        <input
                          type="date"
                          value={st.emailDate || ''}
                          onChange={(e) => handleStageChange(stage.key, 'emailDate', e.target.value)}
                          className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Stage Note */}
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Catatan khusus tahap ini (opsional)..."
                        value={st.notes || ''}
                        onChange={(e) => handleStageChange(stage.key, 'notes', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900/60 border border-slate-800 rounded text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (confirm('Apakah Anda yakin ingin menghapus data tagihan ini?')) {
                  onDelete(formData.id);
                  onClose();
                }
              }}
              className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Berkas</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center space-x-1.5 transition shadow-lg cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
