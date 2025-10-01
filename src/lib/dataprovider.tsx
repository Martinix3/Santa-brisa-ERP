
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { SantaData, User, UserRole } from '@/domain/ssot';
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
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

type DataContextType = {
  data: SantaData | null;
  setData: React.Dispatch<React.SetStateAction<SantaData | null>>;
  currentUser: User | null;
  authReady: boolean;
  firebaseUser: FirebaseUser | null; // Exponer para diagnóstico
  saveCollection: (name: keyof SantaData, rows: any[]) => Promise<void>;
  saveAllCollections: (collections: Partial<SantaData>) => Promise<void>;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
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
  const router = useRouter();
  const pathname = usePathname();
  
  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isPersistenceEnabled, setIsPersistenceEnabled] = useState(true);
  const [loadingData, setLoadingData] = useState(true);

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
        if(!firestoreDb) throw new Error("Firestore DB not initialized");
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
        const [firestoreData] = await loadAllCollections();
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
    console.log("[DataProvider] Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
        const hadUser = !!firebaseUser;
        console.log(`[DataProvider] onAuthStateChanged fired. User: ${fbUser?.uid ?? 'null'}. Previously had user: ${hadUser}`);
        
        setFirebaseUser(fbUser);
        setAuthReady(true);
        
        if (fbUser && !hadUser) {
            console.log("[DataProvider] Auth change -> New user detected. Triggering data load.");
            await loadInitialData();
        } else if (!fbUser) {
            console.log("[DataProvider] Auth change -> No user. Clearing all user and data states.");
            setCurrentUser(null);
            setData(null); // Limpia los datos de la app al cerrar sesión
        }
    });
    return () => {
        console.log("[DataProvider] Cleaning up onAuthStateChanged listener.");
        unsubscribe();
    };
  }, [loadInitialData]); // Eliminado firebaseUser para evitar bucles, la lógica está dentro del listener

  // Sync currentUser with app data
  useEffect(() => {
    console.log("[DataProvider] Syncing currentUser. AuthReady:", authReady, "Has FB User:", !!firebaseUser, "Has Data:", !!data?.users);
    if (!authReady || !firebaseUser || !data?.users) {
        if (authReady && !firebaseUser) setCurrentUser(null); // Limpia si se desloguea
        return;
    }
    
    const appUser = data.users.find(u => u.email === firebaseUser.email);
    
    if (appUser) {
        if (!currentUser || currentUser.id !== appUser.id) {
          console.log(`[DataProvider] Found app user for ${firebaseUser.email}: ${appUser.name}`);
          setCurrentUser(appUser);
        }
    } else {
        console.warn(`[DataProvider] App user for ${firebaseUser.email} not found. A signup might be in progress or data is stale.`);
        setCurrentUser(null);
    }
  }, [authReady, firebaseUser, data?.users, currentUser]);

  // Centralized redirection logic
  useEffect(() => {
    if (!authReady) return; // Espera a que la autenticación esté lista

    const isAuthPage = pathname.startsWith("/login");

    if (firebaseUser && currentUser) { // Usuario completamente autenticado y con perfil
        if (isAuthPage) {
            console.log("[DataProvider] User found, redirecting to /dashboard-personal");
            router.replace("/dashboard-personal");
        }
    } else if (!firebaseUser) { // No hay usuario de Firebase
        if (!isAuthPage && pathname !== "/") {
            console.log("[DataProvider] No user, redirecting to /login");
            router.replace("/login");
        }
    }
  }, [authReady, firebaseUser, currentUser, pathname, router]);

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
          newItems.forEach((newItem: any) => itemMap.set(newItem.id, newItem));
          (updatedData as any)[collectionName] = Array.from(itemMap.values());
          hasChanges = true;
        }
      }
      return hasChanges ? updatedData : prevData;
    });

    if (isPersistenceEnabled) {
      const promises = Object.entries(collectionsToSave)
        .filter(([, items]) => Array.isArray(items) && items.length > 0)
        .map(([name, items]) => upsertMany(name as keyof SantaData, items!));
      await Promise.all(promises);
    }
  }, [isPersistenceEnabled, setData]);

  const saveCollection = useCallback(
    async (name: keyof SantaData, rows: any[]) => saveAllCollections({ [name]: rows }),
    [saveAllCollections]
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

  const loginWithEmail = useCallback(async (email: string, pass: string): Promise<void> => {
    if (!firebaseAuth) throw new Error("Firebase Auth not initialized.");
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, pass);
    } catch (error) {
      console.error(`[DataProvider] Firebase login failed for ${email}:`, error);
      throw error;
    }
  }, []);

  const signupWithEmail = useCallback(async (email: string, pass: string): Promise<User | null> => {
    if (!firebaseAuth) return null;
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, pass);
    const fbUser = userCredential.user;
    if (!fbUser) return null;

    const newUser: User = {
      id: fbUser.uid,
      name: fbUser.displayName || emailToName(email),
      email,
      role: "comercial",
      active: true,
    };
    await saveCollection("users", [newUser]);
    setData(d => {
      const users = d?.users ?? [];
      const map = new Map(users.map(u => [u.id, u]));
      map.set(newUser.id, newUser);
      return d ? { ...d, users: Array.from(map.values()) } : ({ users: [newUser] } as any);
    });
    setCurrentUser(newUser);
    return newUser;
  }, [saveCollection, setData]);

  const logout = useCallback(async () => {
    if (!firebaseAuth) return;
    await signOut(firebaseAuth);
    // onAuthStateChanged se encargará de limpiar el estado y la redirección
  }, []);

  const togglePersistence = useCallback(() => { /* ... */ }, []);
  const setCurrentUserById = useCallback((userId: string) => { /* ... */ }, []);

  const value = useMemo<DataContextType>(
    () => ({
      data, setData, currentUser, authReady, firebaseUser,
      saveCollection, saveAllCollections,
      login, loginWithEmail, signupWithEmail, logout,
      togglePersistence, isPersistenceEnabled, setCurrentUserById,
      loadInitialData,
    }),
    [data, currentUser, authReady, firebaseUser, saveCollection, saveAllCollections, login, loginWithEmail, signupWithEmail, logout, togglePersistence, isPersistenceEnabled, setCurrentUserById, loadInitialData]
  );
  
  const isBlocking = !authReady || (isPersistenceEnabled && loadingData && !!firebaseUser);

  return (
    <DataContext.Provider value={value}>
        {isBlocking && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4">
                    <p className="text-sb-neutral-700">Cargando datos de Santa Brisa...</p>
                </div>
            </div>
        )}
        {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
