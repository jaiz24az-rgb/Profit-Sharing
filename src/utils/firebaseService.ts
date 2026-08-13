import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BillingRecord } from '../types';
import { INITIAL_BILLING_RECORDS } from '../data/initialData';

const COLLECTION_NAME = 'billingRecords';

/**
 * Subscribes to real-time updates of billing records from Firestore.
 * Automatically seeds initial data if the collection is empty.
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
        // Seed initial records into Firestore if collection is brand new/empty
        try {
          const batch = writeBatch(db);
          INITIAL_BILLING_RECORDS.forEach((rec) => {
            const docRef = doc(db, COLLECTION_NAME, rec.id);
            batch.set(docRef, rec);
          });
          await batch.commit();
        } catch (err) {
          console.error('Failed to seed initial Firestore records:', err);
        }
        return;
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
  await setDoc(docRef, record, { merge: true });
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
    batch.set(docRef, rec, { merge: true });
  });
  await batch.commit();
}
