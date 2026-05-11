/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { MethodsLibraryClient } from "./MethodsLibraryClient";
import { getActiveMethods } from "@/server/actions/analysis-library.actions";
import { adminDb as db } from "@/server/firebase";

export const dynamic = 'force-dynamic';

// Helper to serialize Firestore data (convert Timestamps to ISO strings)
function serializeFirestoreData(data: any) {
  if (!data) return data;

  const serialized = { ...data };

  // Convert Firestore Timestamps to ISO strings
  if (serialized.createdAt?._seconds) {
    serialized.createdAt = new Date(serialized.createdAt._seconds * 1000).toISOString();
  }
  if (serialized.updatedAt?._seconds) {
    serialized.updatedAt = new Date(serialized.updatedAt._seconds * 1000).toISOString();
  }

  return serialized;
}

export default async function Page() {
  // Get active methods
  const methodsResult = await getActiveMethods();
  const rawMethods = methodsResult.success ? methodsResult.data : [];

  // Get all active parameters
  const paramsSnap = await db.collection('analysisParameters')
    .where('status', '==', 'ACTIVE')
    .get();
  const rawParameters = paramsSnap.docs.map(d => d.data() as any);

  // Serialize Firestore data to remove Timestamp objects
  const methods = rawMethods.map(serializeFirestoreData);
  const parameters = rawParameters.map(serializeFirestoreData);

  return <MethodsLibraryClient methods={methods} parameters={parameters} />;
}
