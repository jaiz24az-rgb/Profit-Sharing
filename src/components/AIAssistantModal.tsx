import React, { useState } from 'react';
import { BillingRecord } from '../types';
import { X, Bot, Sparkles, Send, AlertTriangle, FileText, Loader2, Copy } from 'lucide-react';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: BillingRecord[];
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  records,
}) => {
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const runAIAnalysis = async (promptType: 'HO_REPORT' | 'AUDIT_RISK' | 'CUSTOM') => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records,
          promptType,
          customInstruction: customPrompt,
        }),
      });

      const data = await response.json();
      if (data.analysis) {
        setAnalysisResult(data.analysis);
      } else if (data.error) {
        setAnalysisResult(`⚠️ Error: ${data.error}`);
      }
    } catch (err: any) {
      console.error(err);
      setAnalysisResult(`⚠️ Gagal terhubung ke layanan AI: ${err.message || 'Server error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(analysisResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">AI Assistant Audit & Report Penagihan</h3>
              <p className="text-xs text-slate-400">Analisis Otomatis & Draf Memo Head Office dengan Gemini AI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-200">
          
          {/* Quick AI Trigger Preset Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => runAIAnalysis('HO_REPORT')}
              disabled={loading}
              className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/50 hover:bg-purple-900/50 text-left transition flex items-start space-x-3 cursor-pointer group"
            >
              <FileText className="w-5 h-5 text-purple-400 shrink-0 mt-0.5 group-hover:scale-110 transition" />
              <div>
                <h4 className="font-bold text-purple-200">Generate Laporan HO Eksekutif</h4>
                <p className="text-[11px] text-purple-300/70 mt-0.5">
                  Buatkan ringkasan naratif resmi untuk diserahkan ke Direksi & Keuangan HO.
                </p>
              </div>
            </button>

            <button
              onClick={() => runAIAnalysis('AUDIT_RISK')}
              disabled={loading}
              className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 hover:bg-amber-900/50 text-left transition flex items-start space-x-3 cursor-pointer group"
            >
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 group-hover:scale-110 transition" />
              <div>
                <h4 className="font-bold text-amber-200">Audit Keterlambatan & Bottleneck</h4>
                <p className="text-[11px] text-amber-300/70 mt-0.5">
                  Deteksi tagihan yang mandek di IRF, Invoice, atau e-Faktur beserta rekomendasinya.
                </p>
              </div>
            </button>
          </div>

          {/* Custom Instruction Prompt Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Atau ketik pertanyaan/instruksi khusus (cth: 'Cari tagihan 21 Express yang belum dibayar')..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runAIAnalysis('CUSTOM')}
              className="flex-1 p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={() => runAIAnalysis('CUSTOM')}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center space-x-1.5 transition cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Analisis</span>
            </button>
          </div>

          {/* AI Result Area */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-300 text-xs flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Hasil Analisis Gemini AI</span>
              </span>
              {analysisResult && (
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
              )}
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 min-h-[200px] text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 text-purple-400 space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-xs text-slate-400">Gemini AI sedang menganalisis data penagihan...</p>
                </div>
              ) : analysisResult ? (
                analysisResult
              ) : (
                <span className="text-slate-500 italic">
                  Klik salah satu tombol di atas atau masukkan instruksi khusus untuk memulai analisis AI.
                </span>
              )}
            </div>
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
