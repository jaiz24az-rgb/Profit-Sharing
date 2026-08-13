import React, { useState } from 'react';
import { BillingRecord, StageKey, STAGES, Airline, Vendor } from '../types';
import { formatRupiah } from '../utils/export';
import { 
  Check, 
  Calendar, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  Plane, 
  Building2, 
  Info,
  ChevronRight,
  Sparkles,
  FileText
} from 'lucide-react';

interface MatrixGridTableProps {
  records: BillingRecord[];
  onToggleStage: (recordId: string, stageKey: StageKey, completed: boolean, emailDate?: string) => void;
  onSelectRecord: (record: BillingRecord) => void;
  onOpenIRFModal?: (record: BillingRecord) => void;
}

export const MatrixGridTable: React.FC<MatrixGridTableProps> = ({
  records,
  onToggleStage,
  onSelectRecord,
  onOpenIRFModal,
}) => {
  const [editingDate, setEditingDate] = useState<{ recordId: string; stageKey: StageKey } | null>(null);

  if (records.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center my-6">
        <Info className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-200">Tidak ada data penagihan ditemukan</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Coba sesuaikan kata kunci pencarian atau filter maskapai/vendor, atau klik tombol "Tambah Tagihan" di atas.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden mb-8">
      {/* Table Header Controls / Info Bar */}
      <div className="p-4 bg-slate-800/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-slate-200">Matriks Checklist Penagihan Interaktif</span>
          <span className="text-slate-400">({records.length} Baris Data Tagihan)</span>
        </div>
        <div className="flex items-center space-x-4 text-slate-400 text-xs">
          <span className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500 inline-block"></span>
            <span>Selesai (Checked)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700 inline-block"></span>
            <span>Pending (Unchecked)</span>
          </span>
        </div>
      </div>

      {/* Main Matrix Table */}
      <div className="overflow-x-auto relative">
        <table className="w-full text-left border-collapse text-xs">
          
          {/* Header Row Grouping */}
          <thead>
            {/* Header Level 1 */}
            <tr className="bg-slate-800/90 text-slate-300 font-semibold border-b border-slate-700/80 uppercase tracking-wider text-[11px]">
              <th colSpan={3} className="px-3 py-3 border-r border-slate-700/80 sticky left-0 z-20 bg-slate-800 min-w-[280px]">
                <div className="flex items-center space-x-1.5 text-blue-400">
                  <Plane className="w-4 h-4" />
                  <span>Informasi Instansi & Maskapai</span>
                </div>
              </th>
              
              {STAGES.map((stage) => (
                <th 
                  key={stage.key} 
                  colSpan={2} 
                  className="px-2 py-2.5 text-center border-r border-slate-700/80 bg-slate-800/60 min-w-[170px]"
                >
                  <div className="flex items-center justify-center space-x-1 text-slate-200">
                    <span className="w-4 h-4 rounded-full bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center font-bold">
                      {stage.order}
                    </span>
                    <span className="truncate">{stage.shortLabel}</span>
                  </div>
                </th>
              ))}

              <th className="px-3 py-3 text-center min-w-[120px] bg-slate-800">
                Aksi & Detail
              </th>
            </tr>

            {/* Header Level 2 - Exact subcolumns from spreadsheet: tanggal email | Check list */}
            <tr className="bg-slate-950 text-slate-400 font-medium text-[10px] border-b border-slate-800">
              <th className="px-3 py-2 border-r border-slate-800 sticky left-0 z-20 bg-slate-950 min-w-[110px]">
                Maskapai
              </th>
              <th className="px-3 py-2 border-r border-slate-800 min-w-[120px]">
                Instansi (Vendor)
              </th>
              <th className="px-3 py-2 border-r border-slate-800 min-w-[100px]">
                Data Periode
              </th>

              {STAGES.map((stage) => (
                <React.Fragment key={`sub-${stage.key}`}>
                  <th className="px-2 py-1.5 text-center border-r border-slate-800/60 bg-slate-900/40 min-w-[90px]">
                    Tanggal Email
                  </th>
                  <th className="px-2 py-1.5 text-center border-r border-slate-800 min-w-[80px]">
                    Check List
                  </th>
                </React.Fragment>
              ))}

              <th className="px-2 py-1.5 text-center">
                Detail
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/60">
            {records.map((rec) => {
              const completedCount = STAGES.filter(s => rec.stages[s.key]?.completed).length;
              const isFullyComplete = completedCount === 8;

              return (
                <tr 
                  key={rec.id} 
                  className="hover:bg-slate-800/40 transition duration-150 group"
                >
                  {/* Sticky Column: Maskapai */}
                  <td className="px-3 py-3 border-r border-slate-800 sticky left-0 z-10 bg-slate-900 group-hover:bg-slate-800/90 font-medium text-slate-200">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold w-fit ${
                        rec.airline === 'PT Sriwijaya Air' 
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        {rec.airline.replace('PT ', '')}
                      </span>
                      {rec.noIrf ? (
                        <button
                          onClick={() => onOpenIRFModal?.(rec)}
                          title="Klik untuk buka / cetak Form IRF Resmi"
                          className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline font-mono flex items-center gap-1 w-fit bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-800/50"
                        >
                          <FileText className="w-3 h-3 text-blue-400" />
                          <span>{rec.noIrf}</span>
                        </button>
                      ) : (
                        rec.noInvoice && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {rec.noInvoice}
                          </span>
                        )
                      )}
                    </div>
                  </td>

                  {/* Instansi (Vendor) */}
                  <td className="px-3 py-3 border-r border-slate-800 font-semibold text-slate-200">
                    <div className="flex flex-col">
                      <span className="text-slate-100">{rec.vendor.replace('PT ', '')}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {formatRupiah(rec.nominal)}
                      </span>
                    </div>
                  </td>

                  {/* Data Periode */}
                  <td className="px-3 py-3 border-r border-slate-800 text-slate-300 whitespace-nowrap">
                    <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700/80 text-[11px] font-mono text-slate-200">
                      {rec.periode}
                    </span>
                  </td>

                  {/* 8 Stages Sub-columns (tanggal email | Check list) */}
                  {STAGES.map((stage) => {
                    const stageData = rec.stages[stage.key] || { completed: false, emailDate: '' };
                    const isEditing = editingDate?.recordId === rec.id && editingDate?.stageKey === stage.key;

                    return (
                      <React.Fragment key={`cell-${rec.id}-${stage.key}`}>
                        {/* Tanggal Email Cell */}
                        <td className="px-2 py-2 text-center border-r border-slate-800/60 bg-slate-900/30">
                          {isEditing ? (
                            <input
                              type="date"
                              autoFocus
                              value={stageData.emailDate || new Date().toISOString().slice(0, 10)}
                              onChange={(e) => {
                                onToggleStage(rec.id, stage.key, stageData.completed, e.target.value);
                                setEditingDate(null);
                              }}
                              onBlur={() => setEditingDate(null)}
                              className="w-full px-1 py-0.5 bg-slate-950 border border-blue-500 rounded text-[10px] text-white focus:outline-none"
                            />
                          ) : (
                            <button
                              onClick={() => setEditingDate({ recordId: rec.id, stageKey: stage.key })}
                              title="Klik untuk ubah tanggal email"
                              className={`text-[11px] px-1.5 py-0.5 rounded transition cursor-pointer hover:bg-slate-700/50 ${
                                stageData.emailDate 
                                  ? 'font-mono text-slate-300 hover:text-white' 
                                  : 'text-slate-500 italic'
                              }`}
                            >
                              {stageData.emailDate || '- set tgl -'}
                            </button>
                          )}
                        </td>

                        {/* Check List Cell */}
                        <td className="px-2 py-2 text-center border-r border-slate-800">
                          <button
                            onClick={() => onToggleStage(rec.id, stage.key, !stageData.completed)}
                            className={`inline-flex items-center justify-center p-1.5 rounded-lg border transition-all cursor-pointer ${
                              stageData.completed
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-slate-800/80 text-slate-500 border-slate-700 hover:bg-slate-700/60 hover:text-slate-300'
                            }`}
                            title={stageData.completed ? `Tahap ${stage.shortLabel} Selesai (${stageData.emailDate || ''})` : `Klik untuk selesaikan ${stage.shortLabel}`}
                          >
                            {stageData.completed ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <span className="w-4 h-4 rounded border border-slate-600 block"></span>
                            )}
                          </button>
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {/* Detail & Action Button */}
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => onSelectRecord(rec)}
                      className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-blue-600/30 hover:text-blue-300 text-slate-300 border border-slate-700 transition flex items-center justify-center space-x-1 mx-auto cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer Summary */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Tips: Klik kotak checklist untuk update status langsung, atau klik tanggal untuk mengubah tanggal email.</span>
        </div>
        <div className="text-slate-300 font-mono">
          Total Nominal Filtered: <span className="font-bold text-emerald-400">{formatRupiah(records.reduce((sum, r) => sum + r.nominal, 0))}</span>
        </div>
      </div>
    </div>
  );
};
