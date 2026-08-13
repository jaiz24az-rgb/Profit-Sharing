import React, { useState } from 'react';
import { BillingRecord } from '../types';
import { generateHOEmailSummary, exportToExcel, formatRupiah } from '../utils/export';
import { X, Send, Copy, Download, CheckCircle2, FileSpreadsheet, Sparkles } from 'lucide-react';

interface HOReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: BillingRecord[];
  onMarkReportedHO: (recordIds: string[]) => void;
}

export const HOReportModal: React.FC<HOReportModalProps> = ({
  isOpen,
  onClose,
  records,
  onMarkReportedHO,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const summaryText = generateHOEmailSummary(records);

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const pendingHORecords = records.filter(r => r.stages.pembayaran?.completed && !r.stages.laporan_ho?.completed);

  const handleMarkAllReported = () => {
    const ids = pendingHORecords.map(r => r.id);
    onMarkReportedHO(ids);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Generator Pelaporan Pembayaran Ke HO</h3>
              <p className="text-xs text-slate-400">Rekapitulasi resmi untuk Head Office Keuangan & Accounting</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-200">
          
          {/* Action Callout if there are pending HO items */}
          {pendingHORecords.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-800/60 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-amber-300 text-xs">
                  Terdapat {pendingHORecords.length} tagihan lunas yang belum ditandai Laporan HO
                </p>
                <p className="text-[11px] text-amber-200/80 mt-0.5">
                  Klik tombol berikut untuk memperbarui status tahap "Laporan HO" secara otomatis.
                </p>
              </div>
              <button
                onClick={handleMarkAllReported}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow transition whitespace-nowrap cursor-pointer"
              >
                Tandai {pendingHORecords.length} Berkas Sudah Report HO
              </button>
            </div>
          )}

          {/* Email Draft Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-white text-xs flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Format Teks Draf Email / WhatsApp Laporan HO</span>
              </label>
              <button
                onClick={handleCopy}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center space-x-1.5 transition border border-slate-700 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-blue-400" />
                <span>{copied ? '✅ Tersalin!' : 'Salin Teks'}</span>
              </button>
            </div>

            <textarea
              readOnly
              rows={12}
              value={summaryText}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 leading-relaxed focus:outline-none select-all"
            />
          </div>

          {/* Download Options */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold text-white">Unduh File Rekap Excel Resmi</h4>
              <p className="text-slate-400 text-[11px] mt-0.5">
                File Excel terstruktur sesuai format matriks checklist penagihan HO.
              </p>
            </div>
            <button
              onClick={() => exportToExcel(records, `Rekap_Checklist_Penagihan_HO_${new Date().toISOString().slice(0, 10)}.xlsx`)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-2 shadow transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel (.xlsx)</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
