
"use client";
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { SantaData, User } from '@/domain/ssot.v7';
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import { SANTA_DATA_COLLECTIONS } from '@/domain/ssot.v7';
import { upsertMany } from './dataprovider/actions';
import { getFirebaseSync } from "@/lib/firebaseClient"; // Use the sync version
import { MOCK_DATA } from "./mock-data";

type LoadReport = { ok: Array<keyof SantaData>; errors: Array<{ name: keyof SantaData; error: string }>; totalDocs: number; };

type DataContextType = {
  data: SantaData | null;
  setData: React.Dispatch<React.SetStateAction<SantaData | null>>;
  currentUser: User | null;
  authReady: boolean;
  firebaseUser: FirebaseUser | null;
  loadingData: boolean;
  saveCollection: (name: keyof SantaData, rows: any[]) => Promise<void>;
  saveAllCollections: (collections: Partial<SantaData>) => Promise<void>;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string) => Promise<User | null>;
  logout: () => Promise<void>;
  setCurrentUserById: (userId: string) => void;
  isPersistenceEnabled: boolean;
  togglePersistence: () => void;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

const emailToName = (email: string) =>
  email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());


export function DataProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isPersistenceEnabled, setIsPersistenceEnabled] = useState(true);
  const [loadingData, setLoadingData] = useState(true);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const loadInitialData = useCallback(async () => {
    // Si no hay usuario de Firebase, no hay nada que cargar.
    if (!firebaseUser) {
      setData(null);
      if (mountedRef.current) setLoadingData(false);
      return;
    }

    setLoadingData(true);
    if (!isPersistenceEnabled) {
      setData(MOCK_DATA as SantaData);
      if (mountedRef.current) setLoadingData(false);
      return;
    }
    
    try {
      const { firestoreDb } = getFirebaseSync();
      if (!firestoreDb) throw new Error("Firestore DB not initialized for data loading.");

      const partial: Partial<SantaData> = {};
      const promises = SANTA_DATA_COLLECTIONS.map(async (name) => {
        try {
          const collectionName = name as string;
          const snap = await getDocs(collection(firestoreDb, collectionName));
          (partial as any)[name] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
          (partial as any)[name] = [];
          console.error(`[DataProvider] Error loading collection ${name}:`, e);
        }
      });
      await Promise.all(promises);

      if (mountedRef.current) setData(partial as SantaData);
    } catch (error) {
        console.error("Error loading initial data:", error);
    } finally {
      if (mountedRef.current) setLoadingData(false);
    }
  }, [firebaseUser, isPersistenceEnabled]);

  useEffect(() => {
    const { firebaseAuth } = getFirebaseSync();
    if (!firebaseAuth) {
      console.error("Firebase Auth not available.");
      setAuthReady(true);
      return;
    }
    const unsub = onAuthStateChanged(firebaseAuth, (fbUser) => {
        if (!mountedRef.current) return;
        setFirebaseUser(fbUser ?? null);
        setAuthReady(true);
        if (!fbUser) {
          setData(null);
          setCurrentUser(null);
          setLoadingData(false);
        }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (firebaseUser) {
      loadInitialData();
    } else {
      // Si no hay usuario, nos aseguramos de que no haya datos cargados.
      setData(null);
      setLoadingData(false);
    }
  }, [firebaseUser, isPersistenceEnabled, loadInitialData]);

  useEffect(() => {
    if (firebaseUser && data?.users) {
      const appUser = data.users.find(u => u.email === firebaseUser.email);
      setCurrentUser(appUser ?? null);
    }
  }, [firebaseUser, data?.users]);

  useEffect(() => {
    // Redirecciones post-autenticación
    if (!authReady) return; // No hacer nada hasta que la autenticación esté lista.
    const isAuthPage = pathname === '/login';

    if (firebaseUser && currentUser && isAuthPage) {
      // Usuario logueado y en página de login -> redirigir a la app.
      router.replace("/dashboard-personal");
    } else if (!firebaseUser && !isAuthPage && pathname !== "/") {
      // Usuario no logueado y en una página protegida -> redirigir a login.
      router.replace("/login");
    }
  }, [authReady, firebaseUser, currentUser, pathname, router]);

  const saveAllCollections = useCallback(async (collectionsToSave: Partial<SantaData>) => {
    setData(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      let changed = false;
      for (const [key, items] of Object.entries(collectionsToSave)) {
        const arr = (items as any[]) ?? [];
        if (!arr.length) continue;
        const existing = (updated as any)[key] as any[] ?? [];
        const map = new Map(existing.map(it => [it.id, it]));
        arr.forEach(it => map.set(it.id, it));
        (updated as any)[key] = Array.from(map.values());
        changed = true;
      }
      return changed ? updated : prev;
    });

    if (isPersistenceEnabled) {
      const promises = Object.entries(collectionsToSave)
        .filter(([, items]) => Array.isArray(items) && (items as any[]).length > 0)
        .map(([name, items]) => upsertMany(name as keyof SantaData, items!));
      await Promise.all(promises);
    }
  }, [isPersistenceEnabled]);

  const saveCollection = useCallback(async (name: keyof SantaData, rows: any[]) => {
    await saveAllCollections({ [name]: rows });
  }, [saveAllCollections]);

  const login = useCallback(async () => {
    const { firebaseAuth } = getFirebaseSync();
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    await signInWithPopup(firebaseAuth, provider);
  }, []);

  const loginWithEmail = useCallback(async (email: string, pass: string) => {
    const { firebaseAuth } = getFirebaseSync();
    await signInWithEmailAndPassword(firebaseAuth, email, pass);
  }, []);

  const signupWithEmail = useCallback(async (email: string, pass: string): Promise<User | null> => {
    const { firebaseAuth } = getFirebaseSync();
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, pass);
    const fbUser = cred.user;
    if (!fbUser) return null;

    const newUser: User = {
      id: fbUser.uid,
      name: fbUser.displayName || emailToName(email),
      email,
      role: "comercial",
      active: true,
    };
    await saveCollection("users", [newUser]);
    setCurrentUser(newUser);
    return newUser;
  }, [saveCollection]);

  const logout = useCallback(async () => {
    const { firebaseAuth } = getFirebaseSync();
    await signOut(firebaseAuth);
  }, []);

  const togglePersistence = useCallback(() => {
    setIsPersistenceEnabled(p => !p);
  }, []);

  const setCurrentUserById = useCallback((userId: string) => {
    const u = data?.users?.find(u => u.id === userId) ?? null;
    setCurrentUser(u);
  }, [data?.users]);

  const value = useMemo<DataContextType>(() => ({
    data, setData, currentUser, authReady, firebaseUser,
    loadingData,
    saveCollection, saveAllCollections,
    login, loginWithEmail, signupWithEmail, logout,
    togglePersistence, isPersistenceEnabled, setCurrentUserById,
  }), [data, currentUser, authReady, firebaseUser, loadingData, saveCollection, saveAllCollections, login, loginWithEmail, signupWithEmail, logout, togglePersistence, isPersistenceEnabled, setCurrentUserById]);

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
