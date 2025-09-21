// src/features/influencers/ssot-bridge.ts
import { collection, getDocs, doc, writeBatch, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import type { Creator, InfluencerCollab } from '@/domain';


// En un proyecto real, estas funciones harían llamadas a Firestore.
// Para el prototipo, usamos datos en memoria o mocks.

async function listCollection<T>(name: string): Promise<T[]> {
  try {
    const querySnapshot = await getDocs(collection(db, name));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (e) {
    console.error(`Error listing ${name}:`, e);
    return [];
  }
}

export async function listCreators(): Promise<Creator[]> {
  return listCollection<Creator>('creators');
}

export async function listCollabs(): Promise<InfluencerCollab[]> {
  const collabs = await listCollection<InfluencerCollab>('influencerCollabs');
  // Firestore no guarda `undefined`, así que normalizamos aquí si es necesario
  return collabs.map(c => ({
      ...c,
      deliverables: c.deliverables || [],
      costs: c.costs || {},
      tracking: c.tracking || {},
      dates: c.dates || {},
  }));
}

export async function saveCollab(collab: Partial<InfluencerCollab>): Promise<InfluencerCollab> {
    const collabsRef = collection(db, "influencerCollabs");
    const batch = writeBatch(db);

    let docRef;
    let finalData: InfluencerCollab;

    if (collab.id) {
        docRef = doc(collabsRef, collab.id);
        finalData = { ...(await listCollabs()).find(c=>c.id === collab.id)!, ...collab, updatedAt: Timestamp.now().toMillis().toString() } as InfluencerCollab;
    } else {
        docRef = doc(collabsRef);
        finalData = {
            ...collab,
            id: docRef.id,
            status: 'PROSPECT',
            createdAt: Timestamp.now().toMillis().toString(),
            updatedAt: Timestamp.now().toMillis().toString(),
        } as InfluencerCollab;
    }
    
    // Firestore no puede guardar `undefined`. Limpiamos el objeto.
    const cleanData = JSON.parse(JSON.stringify(finalData, (key, value) => 
        (value === undefined ? null : value)
    ));

    batch.set(docRef, cleanData, { merge: true });
    await batch.commit();

    return finalData;
}
