import React from 'react';
import { BillingRecord, STAGES } from '../types';
import { formatRupiah } from '../utils/export';
import { DollarSign, CheckCircle2, Clock, AlertTriangle, FileText, CheckSquare } from 'lucide-react';

interface StatsCardsProps {
  records: BillingRecord[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ records }) => {
  const totalCount = records.length;
  const totalNominal = records.reduce((sum, r) => sum + r.nominal, 0);

  const paidRecords = records.filter(r => r.stages.pembayaran?.completed);
  const totalPaidNominal = paidRecords.reduce((sum, r) => sum + r.nominal, 0);

  const reportedHORecords = records.filter(r => r.stages.laporan_ho?.completed);

  // Calculate percentage
  const paidPercent = totalNominal > 0 ? Math.round((totalPaidNominal / totalNominal) * 100) : 0;

  // Unpaid or pending HO report
  const pendingHO = records.filter(r => r.stages.pembayaran?.completed && !r.stages.laporan_ho?.completed);

  // Bottleneck check: IRF approved but invoice not email vendor
  const pendingVendorEmail = records.filter(r => r.stages.faktur?.completed && !r.stages.email_vendor?.completed);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* Total Tagihan */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">Total Nominal Tagihan</p>
          <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
            {formatRupiah(totalNominal)}
          </h3>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>{totalCount} berkas penagihan aktif</span>
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <DollarSign className="w-5 h-5" />
        </div>
      </div>

      {/* Pembayaran Diterima */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">Realisasi Pembayaran</p>
          <h3 className="text-lg sm:text-xl font-bold text-emerald-400 mt-1">
            {formatRupiah(totalPaidNominal)}
          </h3>
          <div className="flex items-center space-x-2 mt-1">
            <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${paidPercent}%` }}
              ></div>
            </div>
            <span className="text-xs font-semibold text-emerald-400">{paidPercent}% Lunas</span>
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>

      {/* Menunggu Laporan HO */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">Lunas & Perlu Laporan HO</p>
          <h3 className="text-lg sm:text-xl font-bold text-amber-400 mt-1">
            {pendingHO.length} Berkas
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {reportedHORecords.length} dari {totalCount} sudah dilaporkan ke HO
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* Status Alert & Pipeline Bottleneck */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">Perlu Pengiriman Ke Vendor</p>
          <h3 className="text-lg sm:text-xl font-bold text-purple-400 mt-1">
            {pendingVendorEmail.length} Tagihan
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Faktur pajak siap, menunggu email dikirim
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>

    </div>
  );
};
