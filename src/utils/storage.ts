import { BillingRecord, StageKey } from '../types';
import { INITIAL_BILLING_RECORDS } from '../data/initialData';

const STORAGE_KEY = 'checklist_penagihan_cargo_records_v1';

export function getStoredRecords(): BillingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveRecords(INITIAL_BILLING_RECORDS);
      return INITIAL_BILLING_RECORDS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    saveRecords(INITIAL_BILLING_RECORDS);
    return INITIAL_BILLING_RECORDS;
  } catch (err) {
    console.error('Failed to load records from storage', err);
    return INITIAL_BILLING_RECORDS;
  }
}

export function saveRecords(records: BillingRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save records to storage', err);
  }
}

export function resetToInitialRecords(): BillingRecord[] {
  saveRecords(INITIAL_BILLING_RECORDS);
  return INITIAL_BILLING_RECORDS;
}

export function updateRecordStage(
  recordId: string,
  stageKey: StageKey,
  completed: boolean,
  emailDate?: string,
  notes?: string
): BillingRecord[] {
  const records = getStoredRecords();
  const updated = records.map((rec) => {
    if (rec.id === recordId) {
      const currentStage = rec.stages[stageKey] || { completed: false, emailDate: '' };
      const newStage = {
        ...currentStage,
        completed,
        emailDate: emailDate !== undefined ? emailDate : (completed && !currentStage.emailDate ? new Date().toISOString().slice(0, 10) : currentStage.emailDate),
        notes: notes !== undefined ? notes : currentStage.notes,
        completedAt: completed ? new Date().toISOString() : undefined,
      };

      const newStages = {
        ...rec.stages,
        [stageKey]: newStage,
      };

      // Recalculate overall status
      let overallStatus = rec.overallStatus;
      if (newStages.laporan_ho.completed) {
        overallStatus = 'Completed HO';
      } else if (newStages.pembayaran.completed) {
        overallStatus = 'Paid';
      } else {
        overallStatus = 'In Progress';
      }

      return {
        ...rec,
        stages: newStages,
        overallStatus,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
    }
    return rec;
  });

  saveRecords(updated);
  return updated;
}
