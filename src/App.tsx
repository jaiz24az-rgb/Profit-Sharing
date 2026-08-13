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
  createUpdatedRecordStage, 
  resetToInitialRecords 
} from './utils/storage';
import { 
  subscribeToBillingRecords, 
  saveBillingRecord, 
  removeBillingRecord, 
  saveBatchBillingRecords,
  resetFirestoreToInitial
} from './utils/firebaseService';
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

  // Subscribe to Firebase Firestore real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToBillingRecords(
      (firestoreRecords) => {
        setRecords(firestoreRecords);
        saveRecords(firestoreRecords); // cache in localStorage
      },
      (err) => {
        console.warn('Firebase connection fallback to localStorage:', err);
        setRecords(getStoredRecords());
      }
    );
    return () => unsubscribe();
  }, []);

  // Handler for stage toggle directly from matrix or kanban
  const handleToggleStage = (
    recordId: string, 
    stageKey: StageKey, 
    completed: boolean, 
    emailDate?: string
  ) => {
    const { updatedRecords, updatedRecord } = createUpdatedRecordStage(
      records, 
      recordId, 
      stageKey, 
      completed, 
      emailDate
    );
    setRecords(updatedRecords);

    if (updatedRecord) {
      saveBillingRecord(updatedRecord).catch(err => console.error('Failed to sync stage toggle to Firebase:', err));
    }
    
    // Update selected record state if modal is active
    if (selectedRecord && selectedRecord.id === recordId) {
      const current = updatedRecords.find(r => r.id === recordId);
      if (current) setSelectedRecord(current);
    }
  };

  // Save single record edit
  const handleSaveRecord = (updatedRecord: BillingRecord) => {
    const nextRecords = records.map(r => r.id === updatedRecord.id ? updatedRecord : r);
    setRecords(nextRecords);
    saveRecords(nextRecords);
    saveBillingRecord(updatedRecord).catch(err => console.error('Failed to save record to Firebase:', err));
  };

  // Add single record
  const handleAddRecord = (newRec: BillingRecord) => {
    const nextRecords = [newRec, ...records];
    setRecords(nextRecords);
    saveRecords(nextRecords);
    saveBillingRecord(newRec).catch(err => console.error('Failed to add record to Firebase:', err));
  };

  // Add batch records
  const handleAddBatchRecords = (newBatch: BillingRecord[]) => {
    const nextRecords = [...newBatch, ...records];
    setRecords(nextRecords);
    saveRecords(nextRecords);
    saveBatchBillingRecords(newBatch).catch(err => console.error('Failed to add batch records to Firebase:', err));
  };

  // Delete record
  const handleDeleteRecord = (recordId: string) => {
    const nextRecords = records.filter(r => r.id !== recordId);
    setRecords(nextRecords);
    saveRecords(nextRecords);
    removeBillingRecord(recordId).catch(err => console.error('Failed to delete record from Firebase:', err));
  };

  // Mark selected records as reported HO
  const handleMarkReportedHO = (recordIds: string[]) => {
    const today = new Date().toISOString().slice(0, 10);
    const updatedBatch: BillingRecord[] = [];
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
        const updatedRec = {
          ...r,
          stages: updatedStages,
          overallStatus: 'Completed HO' as const,
          updatedAt: today,
        };
        updatedBatch.push(updatedRec);
        return updatedRec;
      }
      return r;
    });

    setRecords(nextRecords);
    saveRecords(nextRecords);
    if (updatedBatch.length > 0) {
      saveBatchBillingRecords(updatedBatch).catch(err => console.error('Failed to update HO report batch to Firebase:', err));
    }
  };

  // Reset to initial demo data
  const handleResetData = () => {
    if (confirm('Kembalikan data ke contoh awal pabrik? Perubahan Anda akan di-reset.')) {
      const reset = resetToInitialRecords();
      setRecords(reset);
      resetFirestoreToInitial(reset).catch(err => console.error('Failed to reset records in Firebase:', err));
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
      <main className="max-w-[1650px] mx-auto px-3 sm:px-5 lg:px-6 pt-5">
        
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
