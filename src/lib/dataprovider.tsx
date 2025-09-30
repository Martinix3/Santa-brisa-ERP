
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { SantaData, User, UserRole } from '@/domain/ssot';
import type { User as FirebaseUser } from "firebase/auth";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { SANTA_DATA_COLLECTIONS } from '@/domain/ssot';
import { upsertMany } from './dataprovider/actions';
import { firebaseApp, firebaseAuth, firestoreDb } from "@/lib/firebaseClient";
import { MOCK_DATA } from "./mock-data";


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
  loadInitialData: () => Promise<void>;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

const emailToName = (email: string) =>
  email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

// --------- Provider ----------
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isPersistenceEnabled, setIsPersistenceEnabled] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const router = useRouter();

  const loadInitialData = useCallback(async () => {
    setLoadingData(true);
    console.log(`[DataProvider] loadInitialData triggered. Persistence: ${isPersistenceEnabled}`);
    if (!isPersistenceEnabled) {
      console.log("[DataProvider] Using MOCK_DATA. Persistence is OFF.");
      setData(MOCK_DATA as unknown as SantaData);
      setLoadingData(false);
      return;
    }

    if (!firebaseUser) {
        console.log('[DataProvider] Blocked loadInitialData: No Firebase user.');
        setLoadingData(false);
        return;
    }

    console.log(`[DataProvider] useEffect: Loading initial data from Firestore. Persistence is ON.`);

    const loadAllCollections = async (): Promise<[SantaData, LoadReport]> => {
        const data: Partial<SantaData> = {};
        const report: LoadReport = { ok: [], errors: [], totalDocs: 0 };
        
        const collectionsToLoad = SANTA_DATA_COLLECTIONS;

        for (const name of collectionsToLoad) {
            try {
                const collectionName = name as string;
                const querySnapshot = await getDocs(collection(firestoreDb!, collectionName));
                (data as any)[name] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                report.ok.push(name as keyof SantaData);
                report.totalDocs += querySnapshot.size;
            } catch (e: any) {
                console.error(`[DataProvider] Error loading collection ${name}:`, e);
                report.errors.push({ name: name as keyof SantaData, error: e.message });
                (data as any)[name] = [];
            }
        }
        console.log('[DataProvider] Firestore data loaded. Report:', report);
        return [data as SantaData, report];
    }

    try {
        const [firestoreData, report] = await loadAllCollections();
        setData(firestoreData);
    } catch (e) {
        console.error("[DataProvider] Failed to load Firestore data, setting data to null:", e);
        setData(null);
    } finally {
        setLoadingData(false);
    }
  }, [firebaseUser, isPersistenceEnabled]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, user => {
        console.log('[DataProvider] onAuthStateChanged:', user?.email || 'No user');
        setFirebaseUser(user);
        if (!user) {
            setData(null);
            setCurrentUser(null);
        }
        setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);
  
  // Data loading effect, dependent on auth status
  useEffect(() => {
    if (authReady && firebaseUser && !data) {
        loadInitialData().catch(console.error);
    }
  }, [authReady, firebaseUser, data, loadInitialData]);

  // Set currentUser based on loaded data and Firebase user
  useEffect(() => {
    console.log('[DataProvider] Attempting to set currentUser. AuthReady:', authReady, 'FirebaseUser:', !!firebaseUser, 'Data:', !!data);
    if (!authReady || !firebaseUser || !data?.users) {
      console.log('[DataProvider] Conditions not met to find app user.');
      return;
    }
    
    const appUser = data.users.find(u => u.email === firebaseUser.email) || null;
    console.log(`[DataProvider] Found app user for ${firebaseUser.email}:`, appUser?.name || 'NOT FOUND');
    setCurrentUser(appUser);
    
    // Si tenemos usuario y estamos en la página de login, redirigimos.
    if(appUser && window.location.pathname === '/login') {
        console.log('[DataProvider] User found, redirecting to /dashboard-personal');
        router.push('/dashboard-personal');
    }

  }, [data, firebaseUser, authReady, router]);

  const togglePersistence = useCallback(() => {
    setIsPersistenceEnabled(prev => {
        const nextState = !prev;
        console.log(`[DataProvider] Toggling persistence to ${nextState}`);
        setData(null); // Clear data on toggle
        setCurrentUser(null);
        return nextState;
    });
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
      let hasChanges = false;

      for (const key in collectionsToSave) {
        const collectionName = key as keyof SantaData;
        const newItems = (collectionsToSave[collectionName] as any[]) || [];

        if (newItems.length > 0) {
          const existingItems = (updatedData[collectionName] as any[]) || [];
          const itemMap = new Map(existingItems.map(item => [item.id, item]));

          newItems.forEach((newItem: any) => {
            itemMap.set(newItem.id, newItem);
          });

          (updatedData as any)[collectionName] = Array.from(itemMap.values());
          hasChanges = true;
        }
      }
      return hasChanges ? updatedData : prevData;
    });

    if (isPersistenceEnabled) {
      const promises = [];
      for (const key in collectionsToSave) {
        const collectionName = key as keyof SantaData;
        const items = collectionsToSave[collectionName];
        if (Array.isArray(items) && items.length > 0) {
          promises.push(upsertMany(collectionName, items));
        }
      }

      try {
        await Promise.all(promises);
      } catch (e: any) {
        throw e;
      }
    }
  }, [isPersistenceEnabled, setData]);
  
  const saveCollection = useCallback(
    async (name: keyof SantaData, rows: any[]) => {
      await saveAllCollections({ [name]: rows });
    }, [saveAllCollections]
  );

  const login = useCallback(async () => {
    if (!firebaseAuth) return;
    try {
      await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
    } catch(e) {
      console.error("Google sign in failed", e);
      throw e;
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, pass: string): Promise<User | null> => {
    console.log(`[DataProvider] loginWithEmail called for ${email}`);
    if (!firebaseAuth) return null;
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, pass);
      const fbUser = userCredential.user;
      console.log(`[DataProvider] Firebase login successful for ${fbUser.email}`);

      // No hacemos nada más aquí, el useEffect se encargará de todo.
      return null;

    } catch (error) {
      console.error(`[DataProvider] Firebase login failed for ${email}:`, error);
      throw error;
    }
  }, []);


  const signupWithEmail = useCallback(
    async (email: string, pass: string): Promise<User | null> => {
      if (!firebaseAuth) return null;
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, pass);
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
    if (!firebaseAuth) return;
    await signOut(firebaseAuth);
    // onAuthStateChanged se encargará de limpiar el estado.
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
      loadInitialData,
    }),
    [data, currentUser, authReady, saveCollection, saveAllCollections, login, loginWithEmail, signupWithEmail, logout, togglePersistence, isPersistenceEnabled, setCurrentUserById, loadInitialData]
  );

  const isBlocking =
    !authReady || (isPersistenceEnabled && !data && !!firebaseUser);

  if (isBlocking) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sb-neutral-700">
            {firebaseUser ? "Cargando datos de Santa Brisa..." : "Inicializando..."}
          </p>
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
