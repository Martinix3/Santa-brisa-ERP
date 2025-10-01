
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
  loadingData: boolean;                     // ⬅ NUEVO
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
  const [loadingData, setLoadingData] = useState(false);                // ⬅ estable

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Evita recargas repetidas para el mismo UID
  const lastLoadedUidRef = useRef<string | null>(null);

  const loadInitialData = useCallback(async () => {
    if (!isPersistenceEnabled) {
      setLoadingData(true);
      setData(MOCK_DATA as unknown as SantaData);
      setLoadingData(false);
      return;
    }
    if (!firebaseUser) return;

    // Idempotencia por UID
    if (lastLoadedUidRef.current === firebaseUser.uid && data) return;

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
      if (!mountedRef.current) return;
      setData(partial as SantaData);
      lastLoadedUidRef.current = firebaseUser.uid;
      console.log(`[DataProvider] Firestore loaded (${total} docs) for uid=${firebaseUser.uid}`);
    } finally {
      if (mountedRef.current) setLoadingData(false);
    }
  }, [firebaseUser, isPersistenceEnabled, firestoreDb, data]);

  // Auth listener (una sola suscripción, sin dependencias móviles)
  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      const prevUid = firebaseUser?.uid;
      setFirebaseUser(fbUser ?? null);
      setAuthReady(true);

      if (!fbUser) {
        setCurrentUser(null);
        setData(null);
        lastLoadedUidRef.current = null;
        return;
      }
      // Si el UID cambia, forzamos carga
      if (fbUser.uid !== prevUid) {
        await loadInitialData();
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ⬅ no añadas dependencias para no re-suscribir

  // Sincroniza currentUser una vez hay datos + firebaseUser
  useEffect(() => {
    if (!authReady || !firebaseUser || !data?.users) {
      if (authReady && !firebaseUser) setCurrentUser(null);
      return;
    }
    const appUser = data.users.find(u => u.email === firebaseUser.email);
    setCurrentUser(appUser ?? null);
    if (!appUser) {
      console.warn(`[DataProvider] No app user for ${firebaseUser.email}. Signup o datos desfasados.`);
    }
  }, [authReady, firebaseUser, data?.users]);

  // Redirecciones centralizadas (idempotentes)
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
    // 1. Crea una instancia del proveedor
    const provider = new GoogleAuthProvider();

    // 2. AÑADE LOS PERMISOS (SCOPES) QUE NECESITAS
    // Este es un ejemplo para Google Sheets. Busca el scope correcto para tu "plugin".
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    
    // Opcional: Para forzar que siempre se muestre la pantalla de consentimiento de Google
    // y se genere un nuevo refresh_token, útil para el acceso offline del backend.
    // provider.setCustomParameters({
    //   prompt: 'consent',
    //   access_type: 'offline',
    // });

    // 3. Inicia sesión con el proveedor configurado
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
    // El listener limpiará estado/redirect
  }, []);

  const togglePersistence = useCallback(() => {
    setIsPersistenceEnabled(p => !p);
    // si se apaga → usar MOCK; si se enciende → recargar Firestore
    setTimeout(() => loadInitialData(), 0);
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

  // Overlay global de carga coherente
  const showOverlay = !authReady || (!!firebaseUser && loadingData);

  return (
    <DataContext.Provider value={value}>
      {showOverlay && (
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
