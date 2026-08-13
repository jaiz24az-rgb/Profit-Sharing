/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BillingRecord, 
  FilterState, 
  StageKey, 
  Airline, 
  Vendor 
} from './types';
import { 
  getStoredRecords, 
  saveRecords, 
  updateRecordStage, 
  resetToInitialRecords 
} from './utils/storage';
import { exportToExcel } from './utils/export';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { MatrixGridTable } from './components/MatrixGridTable';
import { KanbanView } from './components/KanbanView';
import { AnalyticsView } from './components/AnalyticsView';
import { RecordModal } from './components/RecordModal';
import { NewRecordModal } from './components/NewRecordModal';
import { HOReportModal } from './components/HOReportModal';
import { AIAssistantModal } from './components/AIAssistantModal';
import { IRFDocumentModal } from './components/IRFDocumentModal';

export default function App() {
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [viewMode, setViewMode] = useState<'matrix' | 'kanban' | 'analytics'>('matrix');

  // Modals state
  const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isHOReportModalOpen, setIsHOReportModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // IRF Modal state
  const [irfRecord, setIrfRecord] = useState<BillingRecord | null>(null);
  const [isIRFModalOpen, setIsIRFModalOpen] = useState(false);

  const handleOpenIRFModal = (rec: BillingRecord) => {
    setIrfRecord(rec);
    setIsIRFModalOpen(true);
  };

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    airline: 'ALL',
    vendor: 'ALL',
    status: 'ALL',
    period: 'ALL',
    completionStatus: 'ALL',
  });

  // Load records on mount
  useEffect(() => {
    const loaded = getStoredRecords();
    setRecords(loaded);
  }, []);

  // Handler for stage toggle directly from matrix or kanban
  const handleToggleStage = (
    recordId: string, 
    stageKey: StageKey, 
    completed: boolean, 
    emailDate?: string
  ) => {
    const updated = updateRecordStage(recordId, stageKey, completed, emailDate);
    setRecords(updated);
    
    // Update selected record state if modal is active
    if (selectedRecord && selectedRecord.id === recordId) {
      const current = updated.find(r => r.id === recordId);
      if (current) setSelectedRecord(current);
    }
  };

  // Save single record edit
  const handleSaveRecord = (updatedRecord: BillingRecord) => {
    const nextRecords = records.map(r => r.id === updatedRecord.id ? updatedRecord : r);
    setRecords(nextRecords);
    saveRecords(nextRecords);
  };

  // Add single record
  const handleAddRecord = (newRec: BillingRecord) => {
    const nextRecords = [newRec, ...records];
    setRecords(nextRecords);
    saveRecords(nextRecords);
  };

  // Add batch records
  const handleAddBatchRecords = (newBatch: BillingRecord[]) => {
    const nextRecords = [...newBatch, ...records];
    setRecords(nextRecords);
    saveRecords(nextRecords);
  };

  // Delete record
  const handleDeleteRecord = (recordId: string) => {
    const nextRecords = records.filter(r => r.id !== recordId);
    setRecords(nextRecords);
    saveRecords(nextRecords);
  };

  // Mark selected records as reported HO
  const handleMarkReportedHO = (recordIds: string[]) => {
    const today = new Date().toISOString().slice(0, 10);
    const nextRecords = records.map(r => {
      if (recordIds.includes(r.id)) {
        const updatedStages = {
          ...r.stages,
          laporan_ho: {
            completed: true,
            emailDate: r.stages.laporan_ho?.emailDate || today,
            completedAt: new Date().toISOString(),
          }
        };
        return {
          ...r,
          stages: updatedStages,
          overallStatus: 'Completed HO' as const,
          updatedAt: today,
        };
      }
      return r;
    });

    setRecords(nextRecords);
    saveRecords(nextRecords);
  };

  // Reset to initial demo data
  const handleResetData = () => {
    if (confirm('Kembalikan data ke contoh awal pabrik? Perubahan Anda akan di-reset.')) {
      const reset = resetToInitialRecords();
      setRecords(reset);
    }
  };

  // Filtered records calculation
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      // Search
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchInvoice = rec.noInvoice?.toLowerCase().includes(query);
        const matchIrf = rec.noIrf?.toLowerCase().includes(query);
        const matchPeriod = rec.periode.toLowerCase().includes(query);
        const matchVendor = rec.vendor.toLowerCase().includes(query);
        if (!matchInvoice && !matchIrf && !matchPeriod && !matchVendor) {
          return false;
        }
      }

      // Airline
      if (filters.airline !== 'ALL' && rec.airline !== filters.airline) {
        return false;
      }

      // Vendor
      if (filters.vendor !== 'ALL' && rec.vendor !== filters.vendor) {
        return false;
      }

      // Completion status
      if (filters.completionStatus === 'PENDING' && rec.stages.laporan_ho?.completed) {
        return false;
      }
      if (filters.completionStatus === 'COMPLETED' && !rec.stages.laporan_ho?.completed) {
        return false;
      }

      return true;
    });
  }, [records, filters]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white pb-12">
      
      {/* Top Navigation & Toolbar Header */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        filters={filters}
        setFilters={setFilters}
        onOpenNewModal={() => setIsNewModalOpen(true)}
        onOpenHOReportModal={() => setIsHOReportModalOpen(true)}
        onOpenAIModal={() => setIsAIModalOpen(true)}
        onExportExcel={() => exportToExcel(filteredRecords)}
        onResetData={handleResetData}
        totalRecordsCount={filteredRecords.length}
      />

      {/* Main Content Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Metric Cards */}
        <StatsCards records={filteredRecords} />

        {/* View Switcher Output */}
        {viewMode === 'matrix' && (
          <MatrixGridTable
            records={filteredRecords}
            onToggleStage={handleToggleStage}
            onSelectRecord={(rec) => {
              setSelectedRecord(rec);
              setIsRecordModalOpen(true);
            }}
            onOpenIRFModal={handleOpenIRFModal}
          />
        )}

        {viewMode === 'kanban' && (
          <KanbanView
            records={filteredRecords}
            onToggleStage={handleToggleStage}
            onSelectRecord={(rec) => {
              setSelectedRecord(rec);
              setIsRecordModalOpen(true);
            }}
            onOpenIRFModal={handleOpenIRFModal}
          />
        )}

        {viewMode === 'analytics' && (
          <AnalyticsView records={filteredRecords} />
        )}

      </main>

      {/* Modals */}
      <RecordModal
        record={selectedRecord}
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setSelectedRecord(null);
        }}
        onSave={handleSaveRecord}
        onDelete={handleDeleteRecord}
        onOpenIRFModal={handleOpenIRFModal}
      />

      {irfRecord && (
        <IRFDocumentModal
          record={irfRecord}
          isOpen={isIRFModalOpen}
          onClose={() => {
            setIsIRFModalOpen(false);
            setIrfRecord(null);
          }}
          onSave={(updatedRecord) => {
            handleSaveRecord(updatedRecord);
            setIrfRecord(updatedRecord);
          }}
        />
      )}

      <NewRecordModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onAddRecord={handleAddRecord}
        onAddBatchRecords={handleAddBatchRecords}
      />

      <HOReportModal
        isOpen={isHOReportModalOpen}
        onClose={() => setIsHOReportModalOpen(false)}
        records={records}
        onMarkReportedHO={handleMarkReportedHO}
      />

      <AIAssistantModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        records={filteredRecords}
      />

    </div>
  );
}
