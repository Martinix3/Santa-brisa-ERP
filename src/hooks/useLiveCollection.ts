"use client";
import { useEffect, useState } from "react";
import { getFirestore, onSnapshot, collection, query, QueryConstraint, QuerySnapshot, DocumentData } from "firebase/firestore";
import { firestoreDb } from "@/lib/firebaseClient";

export function useLiveCollection<T = any>(
  path: string,
  build?: (c: ReturnType<typeof collection>) => { q: ReturnType<typeof query> } | QueryConstraint[],
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = firestoreDb;
    const col = collection(db, path);
    const q = Array.isArray(build) ? query(col, ...(build as QueryConstraint[]))
           : build ? (build(col) as any).q
           : query(col);

    const unsub = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      const rows: any[] = [];
      snap.forEach((d: DocumentData) => rows.push({ id: d.id, ...d.data() }));
      setData(rows as T[]);
      setLoading(false);
    }, (error: Error) => {
      console.error(`Error fetching collection ${path}:`, error);
      setLoading(false);
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return { data, loading };
}
