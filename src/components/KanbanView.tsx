import React from 'react';
import { BillingRecord, STAGES, OPERATIONAL_STAGES, StageKey } from '../types';
import { formatRupiah } from '../utils/export';
import { CheckCircle2, Clock, FileText, ChevronRight, Edit3, Send, DollarSign } from 'lucide-react';

interface KanbanViewProps {
  records: BillingRecord[];
  onToggleStage: (recordId: string, stageKey: StageKey, completed: boolean) => void;
  onSelectRecord: (record: BillingRecord) => void;
  onOpenIRFModal?: (record: BillingRecord) => void;
  onOpenSplitModal?: (record: BillingRecord) => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  records,
  onToggleStage,
  onSelectRecord,
  onOpenIRFModal,
  onOpenSplitModal,
}) => {
  return (
    <div className="space-y-6 mb-8">
      {/* Pipeline Header Notice */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Pipeline Tahapan Penagihan (Kartu Monitoring Progress)</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Setiap kartu mewakili berkas tagihan dari Maskapai ke Vendor. Klik lingkaran atau kotak tahap untuk menyelesaikan checklist.
          </p>
        </div>
      </div>

      {/* Grid of Records as Cards with Stage Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {records.map((rec) => {
          const isOp = rec.category === 'OPERASIONAL';
          const activeStages = isOp ? OPERATIONAL_STAGES : STAGES;
          const totalStagesCount = activeStages.length;

          const completedCount = activeStages.filter((s) => rec.stages[s.key]?.completed).length;
          const progressPercent = Math.round((completedCount / totalStagesCount) * 100);

          return (
            <div
              key={rec.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition flex flex-col justify-between"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        rec.airline === 'PT Sriwijaya Air'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        {rec.airline}
                      </span>
                      {isOp && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          OPERASIONAL
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      {rec.vendor}
                    </h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    rec.overallStatus === 'Completed HO' || rec.overallStatus === 'Lunas Split'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : rec.overallStatus === 'Paid'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {rec.overallStatus}
                  </span>
                </div>

                {/* Meta details */}
                <div className="mt-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-xs space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Periode:</span>
                    <span className="font-mono">{rec.periode}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Nominal:</span>
                    <span className="font-bold text-emerald-400">{formatRupiah(rec.nominal)}</span>
                  </div>
                  {rec.noIom && (
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-500">No. IOM:</span>
                      <span className="font-mono text-[11px] text-amber-300">{rec.noIom}</span>
                    </div>
                  )}
                  {rec.noInvoice && (
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-500">No. Inv Vendor:</span>
                      <span className="font-mono text-[11px] text-blue-300 font-semibold">{rec.noInvoice}</span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Progress Checklist</span>
                    <span className="font-bold text-white">{completedCount}/{totalStagesCount} Tahap ({progressPercent}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        completedCount === totalStagesCount ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stage Steps List */}
                <div className="mt-4 space-y-1.5 border-t border-slate-800/80 pt-3">
                  {activeStages.map((stage) => {
                    const st = rec.stages[stage.key] || { completed: false, emailDate: '' };
                    
                    if (stage.key === 'pembayaran_split') {
                      const installments = rec.operationalDetail?.installments || [];
                      const paid = installments.filter(i => i.status === 'Lunas').reduce((s,i) => s + i.amount, 0);

                      return (
                        <div
                          key={stage.key}
                          onClick={() => onOpenSplitModal?.(rec)}
                          className="p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer border bg-amber-950/20 border-amber-800/50 hover:bg-amber-900/30 text-amber-200 transition"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="w-4 h-4 rounded-full bg-amber-600 text-slate-950 text-[9px] font-bold flex items-center justify-center">
                              {stage.order}
                            </span>
                            <span className="font-semibold text-[11px]">{stage.label}</span>
                          </div>
                          <div className="flex items-center space-x-1 font-mono text-[10px] text-amber-300">
                            <DollarSign className="w-3 h-3 text-emerald-400" />
                            <span>{paid >= rec.nominal ? 'LUNAS' : `${installments.length} Termin`}</span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={stage.key}
                        onClick={() => onToggleStage(rec.id, stage.key, !st.completed)}
                        className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer border transition ${
                          st.completed
                            ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                            : 'bg-slate-950/60 border-slate-800/60 text-slate-400 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                            st.completed ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {stage.order}
                          </span>
                          <span className="font-medium text-[11px]">{stage.shortLabel}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          {st.emailDate && (
                            <span className="text-[10px] font-mono text-slate-400">
                              {st.emailDate}
                            </span>
                          )}
                          <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                            st.completed ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-600'
                          }`}>
                            {st.completed && <span className="text-[9px] font-bold">✓</span>}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card Footer Button */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                {isOp ? (
                  <button
                    onClick={() => onOpenSplitModal?.(rec)}
                    className="py-1.5 px-2.5 rounded-lg bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800/60 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                    title="Kelola Split Pembayaran HO"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Split HO</span>
                  </button>
                ) : (
                  onOpenIRFModal && rec.noIrf && (
                    <button
                      onClick={() => onOpenIRFModal(rec)}
                      className="py-1.5 px-2.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800/60 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                      title="Buka / Cetak Form IRF Resmi"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Form IRF</span>
                    </button>
                  )
                )}
                <button
                  onClick={() => onSelectRecord(rec)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Kelola Detail</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

