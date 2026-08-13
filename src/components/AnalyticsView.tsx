import React from 'react';
import { BillingRecord, STAGES } from '../types';
import { formatRupiah } from '../utils/export';
import { PieChart, BarChart3, TrendingUp, ShieldCheck, Building2, Plane } from 'lucide-react';

interface AnalyticsViewProps {
  records: BillingRecord[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ records }) => {
  const airlines = ['PT Sriwijaya Air', 'PT NAM Air'] as const;
  const vendors = ['PT 21 Express', 'PT Gatrans Mulia Indonesia', 'PT Mitra Kargo Nusantara'] as const;

  const totalNominal = records.reduce((sum, r) => sum + r.nominal, 0);

  return (
    <div className="space-y-6 mb-8 text-xs text-slate-200">
      
      {/* Top Summary Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2 mb-1">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Analisis & Realisasi Penagihan Per Maskapai & Instansi</span>
        </h3>
        <p className="text-xs text-slate-400">
          Ringkasan distribusi total nilai penagihan dan tingkat penyelesaian 8 tahap checklist.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Breakdown by Maskapai */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Plane className="w-5 h-5 text-blue-400" />
            <h4 className="font-bold text-white text-sm">Penagihan Berdasarkan Maskapai</h4>
          </div>

          <div className="space-y-4">
            {airlines.map((air) => {
              const airRecs = records.filter(r => r.airline === air);
              const airNominal = airRecs.reduce((sum, r) => sum + r.nominal, 0);
              const airPaid = airRecs.filter(r => r.stages.pembayaran?.completed).reduce((sum, r) => sum + r.nominal, 0);
              const percentOfTotal = totalNominal > 0 ? Math.round((airNominal / totalNominal) * 100) : 0;
              const paidPercent = airNominal > 0 ? Math.round((airPaid / airNominal) * 100) : 0;

              return (
                <div key={air} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{air}</span>
                    <span className="font-mono text-emerald-400 font-bold">{formatRupiah(airNominal)}</span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{airRecs.length} Berkas | Realisasi Bayar: {formatRupiah(airPaid)}</span>
                    <span className="font-semibold text-blue-300">{paidPercent}% Terbayar</span>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all"
                      style={{ width: `${paidPercent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakdown by Instansi / Vendor */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <h4 className="font-bold text-white text-sm">Penagihan Berdasarkan Vendor / Instansi</h4>
          </div>

          <div className="space-y-4">
            {vendors.map((v) => {
              const vRecs = records.filter(r => r.vendor === v);
              const vNominal = vRecs.reduce((sum, r) => sum + r.nominal, 0);
              const vPaid = vRecs.filter(r => r.stages.pembayaran?.completed).reduce((sum, r) => sum + r.nominal, 0);
              const paidPercent = vNominal > 0 ? Math.round((vPaid / vNominal) * 100) : 0;

              return (
                <div key={v} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{v}</span>
                    <span className="font-mono text-emerald-400 font-bold">{formatRupiah(vNominal)}</span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{vRecs.length} Berkas | Terbayar: {formatRupiah(vPaid)}</span>
                    <span className="font-semibold text-emerald-300">{paidPercent}% Terbayar</span>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${paidPercent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Completion Status Across 8 Stages */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h4 className="font-bold text-white text-sm mb-4">Statistik Kelengkapan Per Tahap Penagihan</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {STAGES.map((s) => {
            const completedCount = records.filter(r => r.stages[s.key]?.completed).length;
            const percent = records.length > 0 ? Math.round((completedCount / records.length) * 100) : 0;

            return (
              <div key={s.key} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-medium block truncate">{s.shortLabel}</span>
                <span className="text-base font-bold text-white my-1 block">{completedCount}/{records.length}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block ${
                  percent === 100 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-300'
                }`}>
                  {percent}% Done
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
