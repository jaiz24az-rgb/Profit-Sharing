import React, { useState } from 'react';
import { X, Building2, PlusCircle, Check, Boxes } from 'lucide-react';
import { BillingCategory, Airline } from '../types';

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVendor: (vendorName: string, category: BillingCategory, airlineTarget?: Airline | 'ALL') => void;
}

export const AddVendorModal: React.FC<AddVendorModalProps> = ({
  isOpen,
  onClose,
  onAddVendor,
}) => {
  const [vendorName, setVendorName] = useState('');
  const [category, setCategory] = useState<BillingCategory>('OPERASIONAL');
  const [airlineTarget, setAirlineTarget] = useState<Airline | 'ALL'>('ALL');
  const [note, setNote] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = vendorName.trim();
    if (!trimmed) {
      alert('Masukkan nama vendor atau instansi yang valid!');
      return;
    }

    onAddVendor(trimmed, category, airlineTarget);
    setSuccessMsg(`Vendor "${trimmed}" berhasil ditambahkan!`);
    
    setTimeout(() => {
      setVendorName('');
      setNote('');
      setSuccessMsg('');
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-900/60 to-slate-800 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-600/30 text-blue-300 border border-blue-500/40">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                Tambah Vendor / Instansi Baru
                <span className="text-blue-400 font-extrabold text-sm">(+)</span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Pencatatan Vendor Tagihan Sriwijaya Air & NAM Air
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-200">
          
          {successMsg ? (
            <div className="p-4 bg-emerald-950/80 border border-emerald-600/80 rounded-xl text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center mx-auto text-emerald-400">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <p className="font-bold text-emerald-300 text-sm">{successMsg}</p>
            </div>
          ) : (
            <>
              {/* Category Selector */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Kategori Tagihan Vendor</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCategory('CARGO')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      category === 'CARGO'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>Vendor Cargo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('OPERASIONAL')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      category === 'OPERASIONAL'
                        ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Vendor Operasional</span>
                  </button>
                </div>
              </div>

              {/* Vendor Name */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Nama Resmi Vendor / Instansi <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Aerofood ACS, Hotel Mercure, PT JAS, dll"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Target Airline */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Tagihan Untuk Maskapai</label>
                <select
                  value={airlineTarget}
                  onChange={(e) => setAirlineTarget(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">✈️ Kedua Maskapai (PT Sriwijaya Air & PT NAM Air)</option>
                  <option value="PT Sriwijaya Air">PT Sriwijaya Air</option>
                  <option value="PT NAM Air">PT NAM Air</option>
                </select>
              </div>

              {/* Note / Deskripsi */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Catatan Singkat (Opsional)</label>
                <input
                  type="text"
                  placeholder="e.g. Layanan Katering Penerbangan, Ground Handling, dll"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center space-x-1.5 transition shadow-lg cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Simpan Vendor</span>
                </button>
              </div>
            </>
          )}

        </form>
      </div>
    </div>
  );
};
