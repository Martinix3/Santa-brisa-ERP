

"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { SantaData, User, UserRole } from '@/domain';
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, getIdToken } from "firebase/auth";
import { collection, getDocs, writeBatch, doc, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { SANTA_DATA_COLLECTIONS } from "@/domain";
import { INITIAL_MOCK_DATA } from "@/lib/mock-data";

// --------- Tipos ----------
type LoadReport = {
  ok: Array<keyof SantaData>;
  errors: Array<{ name: keyof SantaData; error: string }>;
  totalDocs: number;
};

type ServerErrorState = {
    show: boolean;
    onRetry: () => void;
}

type DataContextType = {
  data: SantaData | null;
  setData: React.Dispatch<React.SetStateAction<SantaData | null>>;
  currentUser: User | null;
  authReady: boolean;
  saveCollection: (name: keyof SantaData, rows: any[]) => Promise<void>;
  saveAllCollections: (collections: Partial<SantaData>) => Promise<void>;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<User | null>;
  signupWithEmail: (email: string, pass: string) => Promise<User | null>;
  logout: () => Promise<void>;
  setCurrentUserById: (userId: string) => void;
  isPersistenceEnabled: boolean;
  togglePersistence: () => void;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

const emailToName = (email: string) =>
  email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

// --------- Provider ----------
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<import("firebase/auth").User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isPersistenceEnabled, setIsPersistenceEnabled] = useState(false);
  const [loadingData, setLoadingData] = useState(true); // Nuevo estado de carga
  const router = useRouter();

  // Load Firestore data on initial mount or when persistence changes
  useEffect(() => {
    async function loadInitialData() {
        setLoadingData(true);
        console.log(`[DataProvider] useEffect: Loading data. Persistence is ${isPersistenceEnabled ? 'ON' : 'OFF'}.`);

        const loadAllCollections = async (): Promise<[SantaData, LoadReport]> => {
            const data: Partial<SantaData> = {};
            const report: LoadReport = { ok: [], errors: [], totalDocs: 0 };
            
            for (const name of SANTA_DATA_COLLECTIONS) {
                try {
                    const querySnapshot = await getDocs(collection(db, name));
                    const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    (data as any)[name] = docs;
                    report.ok.push(name);
                    report.totalDocs += docs.length;
                } catch (e: any) {
                    console.error(`[DataProvider] Error loading collection ${name}:`, e);
                    report.errors.push({ name, error: e.message });
                    (data as any)[name] = [];
                }
            }
            console.log('[DataProvider] Firestore data loaded. Report:', report);
            return [data as SantaData, report];
        }

        if (isPersistenceEnabled) {
            try {
                const [firestoreData, report] = await loadAllCollections();
                if (report.totalDocs > 0) {
                    setData(firestoreData);
                } else {
                    console.warn("[DataProvider] Firestore is empty or failed to load, using mock data.");
                    setData(INITIAL_MOCK_DATA);
                }
            } catch (e) {
                console.error("[DataProvider] Failed to load Firestore data, using mock data:", e);
                setData(INITIAL_MOCK_DATA);
            }
        } else {
            setData(INITIAL_MOCK_DATA);
        }
        setLoadingData(false);
    }
    
    loadInitialData();
  }, [isPersistenceEnabled]);

  // Handle auth state changes
  useEffect(() => {
    console.log('[DataProvider] Setting up Firebase auth listener.');
    const unsub = onAuthStateChanged(auth, (fbUser) => {
        console.log('[DataProvider] Auth state changed. Firebase user:', fbUser ? fbUser.email : 'null');
        setFirebaseUser(fbUser);
        setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Sync currentUser with firebaseUser and local data
  useEffect(() => {
    if (loadingData || !authReady) {
        console.log(`[DataProvider] Skipping user sync: loadingData=${loadingData}, authReady=${authReady}`);
        return;
    }
    console.log('[DataProvider] useEffect to sync user triggered.');

    let userToSet: User | null = null;
    
    if (firebaseUser && data?.users) {
      console.log(`[DataProvider] Auth ready. Trying to find app user for Firebase user: ${firebaseUser.email}`);
      userToSet = data.users.find(u => u.email === firebaseUser.email) || null;
      if(userToSet) {
          console.log(`[DataProvider] App user found: ${userToSet.name}. Setting as currentUser.`);
          userToSet = { ...userToSet, role: (userToSet.role?.toLowerCase() || 'comercial') as UserRole };
      } else {
          console.warn(`[DataProvider] Firebase user ${firebaseUser.email} not found in local data.users array.`);
      }
    } else {
        console.log('[DataProvider] No Firebase user or data.users not ready.');
    }
    
    setCurrentUser(userToSet);

  }, [data, firebaseUser, authReady, loadingData]);

  const togglePersistence = useCallback(() => {
    setIsPersistenceEnabled(prev => !prev);
  }, []);
  
  const setCurrentUserById = useCallback((userId: string) => {
    if (data?.users) {
        const user = data.users.find(u => u.id === userId);
        if (user) {
            setCurrentUser({ ...user, role: (user.role?.toLowerCase() || 'comercial') as UserRole });
        }
    }
  }, [data?.users]);

  const saveAllCollections = useCallback(async (collectionsToSave: Partial<SantaData>) => {
    setData(prevData => {
        if (!prevData) return null;
        const updatedData = { ...prevData };
        for (const key in collectionsToSave) {
            const collectionName = key as keyof SantaData;
            const newItems = collectionsToSave[collectionName] as any[] | undefined;
            if (newItems && newItems.length > 0) {
                const existingItems = (updatedData[collectionName] as any[]) || [];
                const itemMap = new Map(existingItems.map(item => [item.id, item]));

                newItems.forEach((newItem: any) => {
                    itemMap.set(newItem.id, newItem); // Add or update
                });

                (updatedData as any)[collectionName] = Array.from(itemMap.values());
            }
        }
        return updatedData;
    });

    if (isPersistenceEnabled) {
      console.log("Saving to backend:", collectionsToSave);
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        console.error("No auth token found, cannot save.");
        throw new Error("No auth token found, cannot save.");
      }
      try {
        const apiUrl = new URL('/api/brain-persist', window.location.origin);
        const res = await fetch(apiUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ newEntities: collectionsToSave }),
        });

        if (!res.ok) {
          const errorBody = await res.text();
          try {
            const errorData = JSON.parse(errorBody);
            throw new Error(errorData.error || `HTTP error ${res.status}`);
          } catch {
             throw new Error(`HTTP error ${res.status}: ${errorBody}`);
          }
        }

        console.log("Save successful:", await res.json());

      } catch (e: any) {
        console.error("Error saving to backend:", e);
        throw e;
      }
    } else {
      console.log("Persistence is disabled. Local state updated, but not saving to backend.");
    }
  }, [isPersistenceEnabled, setData]);
  
  const saveCollection = useCallback(
    async (name: keyof SantaData, rows: any[]) => {
      // Siempre actualiza el estado local
      setData(prevData => {
        if (!prevData) return null;
        const itemMap = new Map((prevData[name] as any[] || []).map(item => [item.id, item]));
        rows.forEach(row => itemMap.set(row.id, row));
        return { ...prevData, [name]: Array.from(itemMap.values()) };
      });
      
      // Si la persistencia está activa, guarda en el backend
      if (isPersistenceEnabled) {
        await saveAllCollections({ [name]: rows });
      }
    }, [isPersistenceEnabled, saveAllCollections, setData]
  );

  const login = useCallback(async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch(e) {
      console.error("Google sign in failed", e);
      throw e;
    }
  }, []);

  const loginWithEmail = useCallback(
    async (email: string, pass: string): Promise<User | null> => {
      console.log('[DataProvider] loginWithEmail called for:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const fbUser = userCredential.user;
      console.log('[DataProvider] Firebase login successful for:', fbUser.email);

      if (!fbUser || !data?.users) {
        console.error('[DataProvider] Firebase user or local data not available after login.');
        return null;
      }
      
      const appUser = data.users.find((u) => u.email === fbUser.email);
      if (appUser) {
          console.log(`[DataProvider] Found matching app user: ${appUser.name}. Updating currentUser state.`);
          const normalizedUser = { ...appUser, role: (appUser.role?.toLowerCase() || 'comercial') as UserRole };
          setCurrentUser({ ...normalizedUser });
          return normalizedUser;
      }
       console.warn(`[DataProvider] No matching app user found in local data for email: ${fbUser.email}`);
      return null;
    },
    [data?.users]
  );

  const signupWithEmail = useCallback(
    async (email: string, pass: string): Promise<User | null> => {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
       const fbUser = userCredential.user;
      if (!fbUser || !data?.users) return null;
      const newUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || emailToName(email),
        email: email,
        role: "comercial",
        active: true,
      };
      setData(d => d ? ({ ...d, users: [...d.users, newUser] }) : null);
      setCurrentUser(newUser);
      return newUser;
    },
    [data?.users, setData]
  );

  const logout = useCallback(async () => {
    await signOut(auth);
    setCurrentUser(null);
    router.push("/login");
  }, [router]);

  const value = useMemo<DataContextType>(
    () => ({
      data,
      setData,
      currentUser,
      authReady,
      saveCollection,
      saveAllCollections,
      login,
      loginWithEmail,
      signupWithEmail,
      logout,
      togglePersistence,
      isPersistenceEnabled,
      setCurrentUserById,
    }),
    [data, currentUser, authReady, saveCollection, saveAllCollections, login, loginWithEmail, signupWithEmail, logout, togglePersistence, isPersistenceEnabled, setCurrentUserById]
  );

  if (!authReady || loadingData) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                <p className="text-sb-neutral-700">Cargando datos de Santa Brisa...</p>
            </div>
        </div>
    );
  }

  return (
    <DataContext.Provider value={value}>
        {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
