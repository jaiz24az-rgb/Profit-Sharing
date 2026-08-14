import React, { useState } from 'react';
import { BillingRecord, PaymentInstallment } from '../types';
import { formatRupiah } from '../utils/export';
import { getRecordNetPaymentHo, getRecordDeduction, getTaxRate, calculateTaxAndNet } from '../utils/taxHelper';
import { 
  X, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  DollarSign, 
  Calendar, 
  FileText, 
  AlertCircle,
  Building2,
  Check,
  Percent
} from 'lucide-react';

interface SplitPaymentModalProps {
  record: BillingRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveRecord: (updatedRecord: BillingRecord) => void;
  onOpenRecordModal?: (record: BillingRecord) => void;
}

export const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
  record,
  isOpen,
  onClose,
  onSaveRecord,
  onOpenRecordModal,
}) => {
  if (!isOpen || !record) return null;

  const installments = record.operationalDetail?.installments || [];

  // Tax calculations
  const targetPaymentHo = getRecordNetPaymentHo(record);
  const deduction = getRecordDeduction(record);
  const taxRate = getTaxRate(record.taxType || 'JASA');

  // Form state for adding new installment
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTerminName, setNewTerminName] = useState(`Termin ${installments.length + 1}`);
  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [newAmount, setNewAmount] = useState<number>(
    installments.length === 0 ? Math.round(targetPaymentHo / 2) : 0
  );
  const [newStatus, setNewStatus] = useState<'Lunas' | 'Scheduled' | 'Pending'>('Lunas');
  const [newKeterangan, setNewKeterangan] = useState('');
  const [newTransferRef, setNewTransferRef] = useState('');

  // Calculations
  const paidAmount = installments
    .filter(i => i.status === 'Lunas')
    .reduce((sum, i) => sum + i.amount, 0);

  const remainingAmount = Math.max(0, targetPaymentHo - paidAmount);
  const paidPercent = targetPaymentHo > 0 ? Math.min(100, Math.round((paidAmount / targetPaymentHo) * 100)) : 100;

  const handleToggleInstallmentStatus = (installmentId: string) => {
    const updatedInstallments = installments.map(item => {
      if (item.id === installmentId) {
        const nextStatus: 'Lunas' | 'Pending' = item.status === 'Lunas' ? 'Pending' : 'Lunas';
        return { ...item, status: nextStatus };
      }
      return item;
    });

    saveUpdatedInstallments(updatedInstallments);
  };

  const handleDeleteInstallment = (installmentId: string) => {
    if (confirm('Hapus termin pembayaran ini?')) {
      const updatedInstallments = installments.filter(item => item.id !== installmentId);
      saveUpdatedInstallments(updatedInstallments);
    }
  };

  const handleAddInstallment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAmount <= 0) {
      alert('Masukkan nominal pembayaran yang valid');
      return;
    }

    const newItem: PaymentInstallment = {
      id: `TRM-${Date.now()}`,
      terminName: newTerminName || `Termin ${installments.length + 1}`,
      paymentDate: newPaymentDate || new Date().toISOString().slice(0, 10),
      amount: Number(newAmount),
      status: newStatus,
      keterangan: newKeterangan,
      transferRef: newTransferRef,
    };

    const updatedInstallments = [...installments, newItem];
    saveUpdatedInstallments(updatedInstallments);

    // Reset form
    setShowAddForm(false);
    setNewTerminName(`Termin ${updatedInstallments.length + 1}`);
    setNewKeterangan('');
    setNewTransferRef('');
  };

  const saveUpdatedInstallments = (updatedList: PaymentInstallment[]) => {
    const newPaidAmount = updatedList
      .filter(i => i.status === 'Lunas')
      .reduce((sum, i) => sum + i.amount, 0);

    const isFullyPaid = newPaidAmount >= targetPaymentHo;
    const latestPaidDate = updatedList
      .filter(i => i.status === 'Lunas')
      .map(i => i.paymentDate)
      .sort()
      .pop() || '';

    let nextOverallStatus = record.overallStatus;
    if (isFullyPaid) {
      nextOverallStatus = 'Paid';
    } else if (newPaidAmount > 0) {
      nextOverallStatus = 'Terbayar Parsial';
    } else {
      nextOverallStatus = 'In Progress';
    }

    const updatedRecord: BillingRecord = {
      ...record,
      overallStatus: nextOverallStatus,
      updatedAt: new Date().toISOString().slice(0, 10),
      stages: {
        ...record.stages,
        pembayaran_split: {
          completed: isFullyPaid,
          emailDate: latestPaidDate,
          notes: `Terbayar ${formatRupiah(newPaidAmount)} / ${formatRupiah(targetPaymentHo)} (${updatedList.length} Termin)`,
        }
      },
      operationalDetail: {
        ...record.operationalDetail,
        installments: updatedList,
      }
    };

    onSaveRecord(updatedRecord);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl text-slate-100 overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                record.airline === 'PT Sriwijaya Air' 
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              }`}>
                {record.airline}
              </span>
              <span className="text-xs font-semibold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                {record.category === 'CARGO' ? 'Vendor Kargo' : 'Vendor Operasional'}
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                {record.taxType === 'BUKAN_JASA' ? 'Bukan Jasa (-10%)' : record.taxType === 'BEBAS_POTONGAN' ? 'Tanpa Potongan (0%)' : 'Jasa (-2%)'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              {record.vendor}
            </h3>
            <p className="text-xs text-slate-400">
              Manajemen Pembayaran Split / Termin HO - Periode: <span className="text-slate-200 font-mono">{record.periode}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onOpenRecordModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRecordModal(record);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Edit Nomor IOM, Periode, Nominal, atau Checklist Tagihan"
              >
                <FileText className="w-3.5 h-3.5 text-blue-300" />
                <span>Edit Detail / No. IOM</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Summary Financial Box */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Total Tagihan (Bruto)</span>
                <span className="text-sm font-bold text-white font-mono">{formatRupiah(record.nominal)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Potongan Pajak ({taxRate}%)</span>
                <span className="text-sm font-bold text-rose-400 font-mono">- {formatRupiah(deduction)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total Bayar HO (Netto)</span>
                <span className="text-sm font-extrabold text-emerald-400 font-mono">{formatRupiah(targetPaymentHo)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Sisa Target Transfer HO</span>
                <span className={`text-sm font-bold font-mono ${remainingAmount === 0 ? 'text-slate-400' : 'text-amber-400'}`}>
                  {formatRupiah(remainingAmount)}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Status Pelunasan Pembayaran HO</span>
                <span className="font-bold text-emerald-400 font-mono">{paidPercent}% ( Terbayar {formatRupiah(paidAmount)} dari {formatRupiah(targetPaymentHo)} )</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    paidPercent === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${paidPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* List of Installments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Daftar Termin Pembayaran HO ({installments.length})</span>
              </h4>

              {!showAddForm && (
                <button
                  onClick={() => {
                    setNewAmount(remainingAmount > 0 ? remainingAmount : 0);
                    setShowAddForm(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Termin</span>
                </button>
              )}
            </div>

            {/* Add Installment Form */}
            {showAddForm && (
              <form onSubmit={handleAddInstallment} className="mb-4 bg-slate-800/90 p-4 rounded-xl border border-emerald-500/50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <span className="text-xs font-bold text-emerald-400">+ Form Tambah Termin Pembayaran HO</span>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Batal
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Nama Termin</label>
                    <input
                      type="text"
                      value={newTerminName}
                      onChange={(e) => setNewTerminName(e.target.value)}
                      placeholder="e.g. Termin 1 (50%)"
                      required
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Tanggal Bayar</label>
                    <input
                      type="date"
                      value={newPaymentDate}
                      onChange={(e) => setNewPaymentDate(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Nominal Bayar (Rp)</label>
                    <input
                      type="number"
                      value={newAmount}
                      onChange={(e) => setNewAmount(Number(e.target.value))}
                      required
                      min={1}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Status Pembayaran</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="Lunas">✅ Lunas (Cair dari HO)</option>
                      <option value="Scheduled">🗓️ Terjadwal (Scheduled)</option>
                      <option value="Pending">⏳ Pending Approval</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">No. Ref / Bukti Transfer</label>
                    <input
                      type="text"
                      value={newTransferRef}
                      onChange={(e) => setNewTransferRef(e.target.value)}
                      placeholder="e.g. TRX-MANDIRI-9912"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Catatan / Keterangan</label>
                    <input
                      type="text"
                      value={newKeterangan}
                      onChange={(e) => setNewKeterangan(e.target.value)}
                      placeholder="e.g. Transfer via Bank Mandiri HO"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Simpan Termin Ini
                  </button>
                </div>
              </form>
            )}

            {/* Installments Table/List */}
            {installments.length === 0 ? (
              <div className="p-6 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-400 text-xs">
                Belum ada termin pembayaran yang dicatat. Klik "+ Tambah Termin" di atas untuk membagi pembayaran HO.
              </div>
            ) : (
              <div className="space-y-2">
                {installments.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      item.status === 'Lunas' 
                        ? 'bg-emerald-950/20 border-emerald-800/50 text-slate-200' 
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 rounded-full bg-slate-800 font-bold text-[11px] text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{item.terminName}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.status === 'Lunas'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : item.status === 'Scheduled'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span className="font-mono">{item.paymentDate}</span>
                          </span>
                          {item.transferRef && (
                            <span className="text-blue-400 font-mono">
                              Ref: {item.transferRef}
                            </span>
                          )}
                          {item.keterangan && (
                            <span className="text-slate-400 italic">
                              "{item.keterangan}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-9 sm:pl-0 border-t sm:border-0 border-slate-800 pt-2 sm:pt-0">
                      <span className="font-bold text-white font-mono text-sm">
                        {formatRupiah(item.amount)}
                      </span>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleToggleInstallmentStatus(item.id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                            item.status === 'Lunas'
                              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                          }`}
                          title="Klik untuk ubah status Lunas / Pending"
                        >
                          <Check className="w-3 h-3" />
                          <span>{item.status === 'Lunas' ? 'Lunas' : 'Mark Lunas'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteInstallment(item.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                          title="Hapus termin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-800 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <span>Status otomatis tersinkron ke Firebase real-time database</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition cursor-pointer"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  );
};
