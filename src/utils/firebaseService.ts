import { 
  collection, 
  doc, 
  getDoc,
  getDocs,
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BillingRecord } from '../types';
import { INITIAL_BILLING_RECORDS } from '../data/initialData';

const COLLECTION_NAME = 'billingRecords';
const INIT_DOC_REF = doc(db, '_system', 'init');

/**
 * Recursively cleans an object for Firestore by removing any keys with `undefined` values
 * and cleaning nested arrays / objects. Firestore throws runtime errors if `undefined` is passed.
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    if (data instanceof Date) {
      return data;
    }
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

/**
 * Subscribes to real-time updates of billing records from Firestore.
 * Seeds initial data ONLY on the first system initialization.
 * Respects empty state if user intentionally deletes all records.
 */
export function subscribeToBillingRecords(
  onData: (records: BillingRecord[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, COLLECTION_NAME);

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        try {
          // Check if system has already been initialized before
          const initSnap = await getDoc(INIT_DOC_REF);
          if (!initSnap.exists()) {
            // First time boot -> seed initial demo data
            const batch = writeBatch(db);
            batch.set(INIT_DOC_REF, { initialized: true, initializedAt: new Date().toISOString() });
            INITIAL_BILLING_RECORDS.forEach((rec) => {
              const docRef = doc(db, COLLECTION_NAME, rec.id);
              batch.set(docRef, cleanForFirestore(rec));
            });
            await batch.commit();
            return;
          } else {
            // System was initialized previously and user intentionally deleted all records
            onData([]);
            return;
          }
        } catch (err) {
          console.error('Error checking system initialization state:', err);
          onData([]);
          return;
        }
      }

      const records: BillingRecord[] = [];
      snapshot.forEach((docSnap) => {
        records.push(docSnap.data() as BillingRecord);
      });

      // Sort records by createdAt descending or id
      records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(records);
    },
    (err) => {
      console.error('Firestore snapshot listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save / Create a new Billing Record in Firestore
 */
export async function saveBillingRecord(record: BillingRecord): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, record.id);
  const cleanedData = cleanForFirestore(record);
  await setDoc(docRef, cleanedData, { merge: true });
}

/**
 * Delete a Billing Record from Firestore
 */
export async function removeBillingRecord(recordId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, recordId);
  await deleteDoc(docRef);
}

/**
 * Add a batch of Billing Records to Firestore
 */
export async function saveBatchBillingRecords(records: BillingRecord[]): Promise<void> {
  const batch = writeBatch(db);
  records.forEach((rec) => {
    const docRef = doc(db, COLLECTION_NAME, rec.id);
    batch.set(docRef, cleanForFirestore(rec), { merge: true });
  });
  await batch.commit();
}

/**
 * Reset Firestore collection back to factory initial records
 */
export async function resetFirestoreToInitial(initialRecords: BillingRecord[]): Promise<void> {
  const colRef = collection(db, COLLECTION_NAME);
  const snapshot = await getDocs(colRef);
  
  const batch = writeBatch(db);
  
  // Delete existing docs
  snapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  // Seed initial records
  initialRecords.forEach((rec) => {
    const docRef = doc(db, COLLECTION_NAME, rec.id);
    batch.set(docRef, cleanForFirestore(rec));
  });

  // Ensure init marker is set
  batch.set(INIT_DOC_REF, { initialized: true, resetAt: new Date().toISOString() });

  await batch.commit();
}

