
"use client";
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { SantaData, User } from '@/domain/ssot';
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import { SANTA_DATA_COLLECTIONS } from '@/domain/ssot';
import { upsertMany } from './dataprovider/actions';
import { firebaseAuth, firestoreDb } from "@/lib/firebaseClient";
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
  loadInitialData: () => Promise<void>;
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
  const [loadingData, setLoadingData] = useState(true); // Empieza cargando

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const loadInitialData = useCallback(async () => {
    if (!firebaseUser) {
      setData(null);
      setLoadingData(false);
      return;
    }

    if (!isPersistenceEnabled) {
      setLoadingData(true);
      setData(MOCK_DATA as unknown as SantaData);
      if (mountedRef.current) setLoadingData(false);
      return;
    }
    
    setLoadingData(true);
    try {
      if (!firestoreDb) throw new Error("Firestore DB not initialized");
      const partial: Partial<SantaData> = {};
      let total = 0;

      for (const name of SANTA_DATA_COLLECTIONS) {
        try {
          const snap = await getDocs(collection(firestoreDb, String(name)));
          (partial as any)[name] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          total += snap.size;
        } catch (e) {
          (partial as any)[name] = [];
          console.error(`[DataProvider] Error loading ${name}`, e);
        }
      }
      if (mountedRef.current) setData(partial as SantaData);
    } finally {
      if (mountedRef.current) setLoadingData(false);
    }
  }, [firebaseUser, isPersistenceEnabled]);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (fbUser) => {
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
      loadInitialData();
  }, [firebaseUser, isPersistenceEnabled, loadInitialData]);

  useEffect(() => {
    if (authReady && firebaseUser && data?.users) {
      const appUser = data.users.find(u => u.email === firebaseUser.email);
      setCurrentUser(appUser ?? null);
    }
  }, [authReady, firebaseUser, data?.users]);

  useEffect(() => {
    if (!authReady) return;
    const isAuthPage = pathname.startsWith("/login");

    if (firebaseUser && currentUser && isAuthPage) {
      router.replace("/dashboard-personal");
    } else if (!firebaseUser && !isAuthPage && pathname !== "/") {
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
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    await signInWithPopup(firebaseAuth, provider);
  }, []);

  const loginWithEmail = useCallback(async (email: string, pass: string) => {
    await signInWithEmailAndPassword(firebaseAuth, email, pass);
  }, []);

  const signupWithEmail = useCallback(async (email: string, pass: string): Promise<User | null> => {
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
    await signOut(firebaseAuth);
  }, []);

  const togglePersistence = useCallback(() => {
    setIsPersistenceEnabled(p => !p);
    loadInitialData();
  }, [loadInitialData]);

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
    loadInitialData,
  }), [data, currentUser, authReady, firebaseUser, loadingData, saveCollection, saveAllCollections, login, loginWithEmail, signupWithEmail, logout, togglePersistence, isPersistenceEnabled, setCurrentUserById, loadInitialData]);

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
