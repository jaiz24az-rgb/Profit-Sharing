import React from 'react';
import { 
  FileSpreadsheet, 
  PlusCircle, 
  Send, 
  Bot, 
  RotateCcw, 
  Search, 
  Kanban, 
  Table, 
  BarChart3,
  Layers,
  Building2,
  Plane,
  Receipt,
  Boxes,
  Plus
} from 'lucide-react';
import { FilterState, Airline, Vendor, BillingCategory, DEFAULT_OPERATIONAL_VENDORS, DEFAULT_CARGO_VENDORS } from '../types';

interface HeaderProps {
  viewMode: 'matrix' | 'kanban' | 'analytics';
  setViewMode: (mode: 'matrix' | 'kanban' | 'analytics') => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onOpenNewModal: () => void;
  onOpenHOReportModal: () => void;
  onOpenAIModal: () => void;
  onExportExcel: () => void;
  onResetData: () => void;
  totalRecordsCount: number;
  allCargoVendors?: string[];
  allOperationalVendors?: string[];
  onOpenAddVendorModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  filters,
  setFilters,
  onOpenNewModal,
  onOpenHOReportModal,
  onOpenAIModal,
  onExportExcel,
  onResetData,
  totalRecordsCount,
  allCargoVendors = DEFAULT_CARGO_VENDORS,
  allOperationalVendors = DEFAULT_OPERATIONAL_VENDORS,
  onOpenAddVendorModal,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      {/* Top Banner & Title */}
      <div className="max-w-[1650px] mx-auto px-3 sm:px-5 lg:px-6 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* App Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Plane className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Management Penagihan & Checklist
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Sriwijaya Air & NAM Air
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-sm" title="Data tersimpan otomatis & sinkron real-time di Firebase Cloud Firestore">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Firebase Real-time Sync</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitoring Penagihan Cargo & Vendor Operasional (Angkasa Pura, Hotel, Catering, Dll)
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenNewModal}
              id="btn-add-new-record"
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tambah Tagihan</span>
            </button>

            {onOpenAddVendorModal && (
              <button
                onClick={onOpenAddVendorModal}
                id="btn-add-vendor"
                className="px-2.5 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/80 text-xs font-semibold flex items-center space-x-1 transition shadow-sm cursor-pointer"
                title="Tambah Vendor / Instansi Baru (+)"
              >
                <Plus className="w-4 h-4 text-indigo-400 stroke-[3]" />
                <span>+ Vendor</span>
              </button>
            )}

            <button
              onClick={onOpenHOReportModal}
              id="btn-ho-report"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Laporan HO</span>
            </button>

            <button
              onClick={onOpenAIModal}
              id="btn-ai-assistant"
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
            >
              <Bot className="w-4 h-4" />
              <span>AI Audit & Report</span>
            </button>

            <button
              onClick={onExportExcel}
              id="btn-export-excel"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={onResetData}
              id="btn-reset-demo"
              title="Reset ke data awal"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Switcher Row */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-3 overflow-x-auto pb-1">
          <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs shrink-0">
            <span className="text-slate-400 font-semibold px-2 text-[11px] uppercase tracking-wider hidden sm:inline-block">Kategori Tagihan:</span>
            
            {/* Cargo Button */}
            <button
              onClick={() => setFilters(prev => ({ ...prev, category: 'CARGO', vendor: 'ALL' }))}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-2 transition cursor-pointer ${
                filters.category === 'CARGO'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Management Penagihan Cargo</span>
            </button>

            {/* Operational Vendor Button */}
            <button
              onClick={() => setFilters(prev => ({ ...prev, category: 'OPERASIONAL', vendor: 'ALL' }))}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-2 transition cursor-pointer ${
                filters.category === 'OPERASIONAL'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <Building2 className="w-4 h-4 text-amber-300" />
              <span>Tagihan Vendor Operasional (Angkasa Pura, Hotel, Catering)</span>
            </button>

            {/* All Category Button */}
            <button
              onClick={() => setFilters(prev => ({ ...prev, category: 'ALL', vendor: 'ALL' }))}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-2 transition cursor-pointer ${
                filters.category === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Semua Tagihan ({totalRecordsCount})</span>
            </button>
          </div>
        </div>

        {/* Filter Bar & View Toggle */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* View Mode Tabs */}
          <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs font-medium">
            <button
              onClick={() => setViewMode('matrix')}
              id="view-tab-matrix"
              className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition cursor-pointer ${
                viewMode === 'matrix' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Matriks Matrix (Excel)</span>
            </button>

            <button
              onClick={() => setViewMode('kanban')}
              id="view-tab-kanban"
              className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition cursor-pointer ${
                viewMode === 'kanban' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Pipeline Tahapan</span>
            </button>

            <button
              onClick={() => setViewMode('analytics')}
              id="view-tab-analytics"
              className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition cursor-pointer ${
                viewMode === 'analytics' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Statistik & Realisasi</span>
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search */}
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Vendor, Invoice, IOM..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            {/* Airline Selector */}
            <select
              value={filters.airline}
              onChange={(e) => setFilters(prev => ({ ...prev, airline: e.target.value as Airline | 'ALL' }))}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 text-xs cursor-pointer"
            >
              <option value="ALL">✈️ Semua Maskapai</option>
              <option value="PT Sriwijaya Air">PT Sriwijaya Air</option>
              <option value="PT NAM Air">PT NAM Air</option>
            </select>

            {/* Vendor Selector */}
            <select
              value={filters.vendor}
              onChange={(e) => setFilters(prev => ({ ...prev, vendor: e.target.value as Vendor | 'ALL' }))}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 text-xs cursor-pointer"
            >
              <option value="ALL">🏢 Semua Vendor / Instansi</option>
              {filters.category !== 'OPERASIONAL' && (
                allCargoVendors.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))
              )}
              {filters.category !== 'CARGO' && (
                allOperationalVendors.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))
              )}
            </select>

            {/* Completion Status */}
            <select
              value={filters.completionStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, completionStatus: e.target.value as any }))}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 text-xs cursor-pointer"
            >
              <option value="ALL">📋 Semua Progress</option>
              <option value="PENDING">⏳ Masih Dalam Proses / Split</option>
              <option value="COMPLETED">✅ Selesai Lunas HO</option>
            </select>
          </div>

        </div>
      </div>
    </header>
  );
};

