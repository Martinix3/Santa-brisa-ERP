/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


"use client";
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { SantaData, TeamMember } from '@/domain/ssot';
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import { SANTA_DATA_COLLECTIONS } from '@/domain/ssot';
import { upsertMany } from './dataprovider/actions';
import { getFirebaseSync } from "@/lib/firebaseClient"; // Use the sync version
import { normalizeStageToSSOT } from '@/lib/stage-utils';
// import { MOCK_DATA } from "./mock-data"; // TODO: Fix or remove mock data

type LoadReport = { ok: Array<keyof SantaData>; errors: Array<{ name: keyof SantaData; error: string }>; totalDocs: number; };

type DataContextType = {
  data: SantaData | null;
  setData: React.Dispatch<React.SetStateAction<SantaData | null>>;
  currentUser: TeamMember | null;
  authReady: boolean;
  firebaseUser: FirebaseUser | null;
  loadingData: boolean;
  saveCollection: (name: keyof SantaData, rows: any[]) => Promise<void>;
  saveAllCollections: (collections: Partial<SantaData>) => Promise<void>;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string) => Promise<TeamMember | null>;
  logout: () => Promise<void>;
  setCurrentUserById: (userId: string) => void;
  isPersistenceEnabled: boolean;
  togglePersistence: () => void;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

const emailToName = (email: string) =>
  email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

// ============================================================================
// ADAPTER: Normaliza Contact → Account (compatibilidad con páginas legacy)
// ============================================================================

// Stage normalization unified via SSOT helper (used across app)

function normalizePlacement(x?: string): 'DIRECT' | 'PLACEMENT' {
  if (x === 'COLOCACION') return 'PLACEMENT';
  if (x === 'PLACEMENT') return 'PLACEMENT';
  return 'DIRECT'; // Default
}

function normalizeContactToAccount(contact: any): any {
  return {
    id: contact.id,
    partyId: contact.id, // Mismo ID por compatibilidad
    name: contact.displayName || contact.legalName || contact.tradeName || '(Sin nombre)',
    segment: contact.customer?.segment || 'OTRO',
    stage: normalizeStageToSSOT(contact.stage || contact.customer?.stage || contact.status),
    ownerId: contact.customer?.ownerId || contact.salesRepId || '',
    flow: normalizePlacement(contact.customer?.placement || contact.placement),
    distributorPartyId: contact.customer?.distributorId,
    source: contact.source,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    // Campos legacy para compatibilidad
    accountType: contact.customer?.segment,
    accountStage: normalizeStageToSSOT(contact.stage || contact.customer?.stage || contact.status),
    commercialFlow: normalizePlacement(contact.customer?.placement || contact.placement),
  };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
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
      // TODO: Load mock data if needed
      setData({} as SantaData);
      if (mountedRef.current) setLoadingData(false);
      return;
    }
    
    try {
      const { firestoreDb } = getFirebaseSync();
      if (!firestoreDb) throw new Error("Firestore DB not initialized for data loading.");

      console.log('[DataProvider] 🔄 Starting data load for', SANTA_DATA_COLLECTIONS.length, 'collections...');
      const startTime = Date.now();
      
      const partial: Partial<SantaData> = {};
      const loadErrors: Array<{ name: string; error: string }> = [];
      
      const promises = (SANTA_DATA_COLLECTIONS || []).map(async (name) => {
        try {
          const collectionName = name as string;
          const snap = await getDocs(collection(firestoreDb, collectionName));
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          (partial as any)[name] = docs;
          
          // Log individual collection load
          if (docs.length > 0) {
            console.log(`[DataProvider] ✅ ${name}: ${docs.length} docs`);
          } else {
            console.warn(`[DataProvider] ⚠️  ${name}: EMPTY (0 docs)`);
          }
        } catch (e) {
          const errorCode = (e as any)?.code;
          const errorMsg = e instanceof Error ? e.message : String(e);
          
          // Handle permission-denied for non-existent collections gracefully
          if (errorCode === 'permission-denied') {
            // Treat as empty collection (likely doesn't exist in Firestore yet)
            (partial as any)[name] = [];
            console.warn(`[DataProvider] ⚠️  ${name}: EMPTY (collection may not exist in Firestore)`);
          } else {
            // For other errors, log as failure but still initialize as empty array
            (partial as any)[name] = [];
            loadErrors.push({ name: name as string, error: errorMsg });
            console.error(`[DataProvider] ❌ ${name}: FAILED (${errorCode}) -`, errorMsg);
          }
        }
      });
      
      await Promise.all(promises);

      // COMPREHENSIVE DEBUG SUMMARY
      const loadTime = Date.now() - startTime;
      const totalCollections = SANTA_DATA_COLLECTIONS.length;
      const successfulLoads = totalCollections - loadErrors.length;
      const totalDocs = Object.values(partial).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
      
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('[DataProvider] 📊 LOAD SUMMARY');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`✅ Successful: ${successfulLoads}/${totalCollections} collections`);
      console.log(`❌ Failed: ${loadErrors.length} collections`);
      console.log(`📄 Total documents: ${totalDocs}`);
      console.log(`⏱️  Load time: ${loadTime}ms`);
      
      // Critical collections check (for Production/Quality dashboards)
      const criticalCollections = ['productionOrders', 'lots', 'billOfMaterials', 'qcTests', 'contacts', 'users'];
      const criticalStatus = criticalCollections.map(name => ({
        name,
        count: (partial as any)[name]?.length || 0,
        status: (partial as any)[name]?.length > 0 ? '✅' : '❌'
      }));
      
      console.log('\n🎯 CRITICAL COLLECTIONS STATUS:');
      criticalStatus.forEach(({ name, count, status }) => {
        console.log(`${status} ${name}: ${count} docs`);
      });
      
      // Deprecated collections warning
      const deprecatedCollections = ['parties', 'accounts', 'partyRoles'];
      const deprecatedFound = deprecatedCollections.filter(name => (partial as any)[name]?.length > 0);
      if (deprecatedFound.length > 0) {
        console.warn('\n⚠️  DEPRECATED COLLECTIONS IN USE:');
        deprecatedFound.forEach(name => {
          console.warn(`  - ${name}: ${(partial as any)[name]?.length} docs (should migrate to contacts)`);
        });
      }
      
      if (loadErrors.length > 0) {
        console.error('\n❌ LOAD ERRORS:');
        loadErrors.forEach(({ name, error }) => {
          console.error(`  - ${name}: ${error}`);
        });
      }
      
      console.log('═══════════════════════════════════════════════════════\n');

      if (mountedRef.current) setData(partial as SantaData);
    } catch (error) {
        console.error("[DataProvider] ❌ CRITICAL ERROR during data load:", error);
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
      const appUser = data.users.find((u: TeamMember) => u.email === firebaseUser.email);
      setCurrentUser(appUser ?? null);
    }
  }, [firebaseUser, data?.users]);

  useEffect(() => {
    // Redirecciones post-autenticación
    if (!authReady) return; // No hacer nada hasta que la autenticación esté lista.
    const isAuthPage = pathname === '/login';

    if (firebaseUser && currentUser && isAuthPage) {
      // Usuario logueado y en página de login -> redirigir a la app.
      router.replace("/dashboard");
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
        .map(([name, items]) => upsertMany(name as keyof SantaData, items as any[]));
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

  const signupWithEmail = useCallback(async (email: string, pass: string): Promise<TeamMember | null> => {
    const { firebaseAuth } = getFirebaseSync();
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, pass);
    const fbUser = cred.user;
    if (!fbUser) return null;

    const newUser: TeamMember = {
      id: fbUser.uid,
      name: fbUser.displayName || emailToName(email),
      displayName: fbUser.displayName || emailToName(email),
      email,
      role: "comercial",
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
