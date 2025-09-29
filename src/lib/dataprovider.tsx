

"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { SantaData, User, UserRole, QcPlanBySku, ParameterBySku, StockMove, Item, ProductionOrder, Lot, LotGenealogyEdge, OnHandView } from '@/domain/ssot';
import type { User as FirebaseUser } from "firebase/auth";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { SANTA_DATA_COLLECTIONS } from "@/domain/ssot";
import { upsertMany } from './dataprovider/actions';
import { firebaseApp, firebaseAuth, firestoreDb } from "@/lib/firebaseClient";


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
  const [loadingData, setLoadingData] = useState(true);
  const router = useRouter();
  
  const loadInitialData = useCallback(async () => {
    if (!authReady || !firebaseUser) {
        console.log('[DataProvider] Blocked loadInitialData: authReady=%s user=%s', authReady, !!firebaseUser);
        return;
    }
    
    setLoadingData(true);
    console.log(`[DataProvider] useEffect: Loading initial data. Persistence is ${isPersistenceEnabled ? 'ON' : 'OFF'}.`);

    const loadAllCollections = async (): Promise<[SantaData, LoadReport]> => {
        const data: Partial<SantaData> = {};
        const report: LoadReport = { ok: [], errors: [], totalDocs: 0 };
        
        const collectionsToLoad = SANTA_DATA_COLLECTIONS;

        for (const name of collectionsToLoad) {
            try {
                if (!SANTA_DATA_COLLECTIONS.map(String).includes(String(name))) continue;
                const querySnapshot = await getDocs(collection(firestoreDb!, name as string));
                const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                (data as any)[name] = docs;
                report.ok.push(name as keyof SantaData);
                report.totalDocs += docs.length;
            } catch (e: any) {
                console.error(`[DataProvider] Error loading collection ${name}:`, e);
                report.errors.push({ name: name as keyof SantaData, error: e.message });
                (data as any)[name] = [];
            }
        }
        console.log('[DataProvider] Firestore data loaded. Report:', report);
        return [data as SantaData, report];
    }

    if (isPersistenceEnabled) {
        try {
            const [firestoreData, report] = await loadAllCollections();
            setData(firestoreData);
        } catch (e) {
            console.error("[DataProvider] Failed to load Firestore data, setting data to null:", e);
            setData(null);
        }
    } else {
        const mockData = {
          items: [
            { id: 'item_rm_vino_blanco', sku: 'RM-VINO-BL', name: 'Vino Blanco Base', category: 'raw', uom: 'L' },
            { id: 'item_rm_alcohol', sku: 'RM-ALCOHOL', name: 'Alcohol Vinico', category: 'raw', uom: 'L' },
            { id: 'item_rm_aromas', sku: 'RM-AROMAS', name: 'Aromas Naturales', category: 'raw', uom: 'L' },
            { id: 'item_rm_azucar', sku: 'RM-AZUCAR', name: 'Azúcar', category: 'raw', uom: 'kg' },
            { id: 'item_fg_turm_blanco', sku: 'FG-TURM-BL', name: 'Turmeon Blanco', category: 'fg', uom: 'uds' },
            { id: 'item_fg_turm_velvet', sku: 'FG-TURM-VL', name: 'Turmeon Blue Velvet', category: 'fg', uom: 'uds' },
            { id: 'item_fg_turm_white', sku: 'FG-TURM-WH', name: 'Turmeon White', category: 'fg', uom: 'uds' },
            { id: 'item_fg_turm_classic', sku: 'FG-TURM-CL', name: 'Turmeon Clásico', category: 'fg', uom: 'uds' },
          ] as Item[],
          productionOrders: [
            { id: 'PO-250822-0001', orderNumber: 'PO-250822-0001', bomId: 'bom_turmeon_blanco', outputItemId: 'item_fg_turm_blanco', targetQuantity: 1000, status: 'DONE', createdAt: '2025-08-22T08:00:00Z', batchCode: 'TB-2509-01' },
            { id: 'PO-250829-0001', orderNumber: 'PO-250829-0001', bomId: 'bom_turmeon_velvet', outputItemId: 'item_fg_turm_velvet', targetQuantity: 1000, status: 'DONE', createdAt: '2025-08-29T08:00:00Z', batchCode: 'TV-2509-02' },
          ] as ProductionOrder[],
          qcParameters: [
            { id: 'param_sb750_grado', sku: 'SB-750', code: 'grado_alcoholico', name: 'Grado Alcohólico', unit: '% vol', range: { min: 39.8, max: 40.2 } },
            { id: 'param_sb750_ph', sku: 'SB-750', code: 'ph', name: 'pH', unit: 'pH' },
            { id: 'param_sb750_acidez', sku: 'SB-750', code: 'acidez_total', name: 'Acidez Total', unit: 'g/L ac. tartárico' },
          ] as ParameterBySku[],
          qcPlans: [
            { id: 'plan_sb750_std', sku: 'SB-750', name: 'Plan Estándar Santa Brisa', specs: [
              { id: 'spec1', parameterId: 'param_sb750_grado', point: 'ENVASADO' },
              { id: 'spec2', parameterId: 'param_sb750_ph', point: 'ENVASADO' },
            ] }
          ] as QcPlanBySku[],
          stockMoves: [
              { id: 'SM-OPEN-01', itemId: 'item_rm_vino_blanco', lotNumber: 'OPEN-2408-01', toLocationId: 'RM/MAIN', qty: 20000, uom: 'L', reason: 'receipt', occurredAt: '2025-08-15T00:00:00Z', note: 'Asiento apertura vino blanco', createdBy: 'Nacho', ref: { goodsReceiptId: 'GR-OPEN-01'} },
              { id: 'SM-OPEN-02', itemId: 'item_rm_alcohol', lotNumber: 'OPEN-ALC-01', toLocationId: 'RM/MAIN', qty: 500, uom: 'L', reason: 'receipt', occurredAt: '2025-08-15T00:00:00Z', note: 'Asiento apertura alcohol', createdBy: 'Nacho', ref: { goodsReceiptId: 'GR-OPEN-01'} },
              { id: 'SM-OPEN-03', itemId: 'item_rm_aromas', lotNumber: 'OPEN-ARO-01', toLocationId: 'RM/MAIN', qty: 100, uom: 'L', reason: 'receipt', occurredAt: '2025-08-15T00:00:00Z', note: 'Asiento apertura aromas', createdBy: 'Nacho', ref: { goodsReceiptId: 'GR-OPEN-01'} },
              { id: 'SM-OPEN-04', itemId: 'item_rm_azucar', lotNumber: 'OPEN-AZU-01', toLocationId: 'RM/MAIN', qty: 2000, uom: 'kg', reason: 'receipt', occurredAt: '2025-08-15T00:00:00Z', note: 'Asiento apertura azucar', createdBy: 'Nacho', ref: { goodsReceiptId: 'GR-OPEN-01'} },
              
              // Producción Turmeon Blanco
              { id: 'SM-TB-2509-01-CONS-VINO', itemId: 'item_rm_vino_blanco', lotNumber: 'OPEN-2408-01', fromLocationId: 'RM/MAIN', qty: -950, uom: 'L', reason: 'production_out', occurredAt: '2025-08-22T09:00:00Z', note: 'Consumo vino Turmeon Blanco', createdBy: 'Nacho', ref: { prodOrderId: 'PO-250822-0001' } },
              { id: 'SM-TB-2509-01-CONS-ALC', itemId: 'item_rm_alcohol', lotNumber: 'OPEN-ALC-01', fromLocationId: 'RM/MAIN', qty: -5, uom: 'L', reason: 'production_out', occurredAt: '2025-08-22T09:00:00Z', note: 'Consumo alcohol Turmeon Blanco', createdBy: 'Nacho', ref: { prodOrderId: 'PO-250822-0001' } },
              { id: 'SM-TB-2509-01-CONS-ARO', itemId: 'item_rm_aromas', lotNumber: 'OPEN-ARO-01', fromLocationId: 'RM/MAIN', qty: -2, uom: 'L', reason: 'production_out', occurredAt: '2025-08-22T09:00:00Z', note: 'Consumo aromas Turmeon Blanco', createdBy: 'Nacho', ref: { prodOrderId: 'PO-250822-0001' } },
              { id: 'SM-TB-2509-01-CONS-AZU', itemId: 'item_rm_azucar', lotNumber: 'OPEN-AZU-01', fromLocationId: 'RM/MAIN', qty: -43, uom: 'kg', reason: 'production_out', occurredAt: '2025-08-22T09:00:00Z', note: 'Consumo azúcar Turmeon Blanco', createdBy: 'Nacho', ref: { prodOrderId: 'PO-250822-0001' } },
              { id: 'SM-TB-2509-01-PROD', itemId: 'item_fg_turm_blanco', lotNumber: 'TB-2509-01', toLocationId: 'FG/MAIN', qty: 1000, uom: 'uds', reason: 'production_in', occurredAt: '2025-08-22T14:00:00Z', note: 'Batch Turmeon Blanco', createdBy: 'Nacho', ref: { prodOrderId: 'PO-250822-0001' } },

              // Venta Turmeon Blanco
              { id: 'SM-TB-2509-01-SHIP', itemId: 'item_fg_turm_blanco', lotNumber: 'TB-2509-01', fromLocationId: 'FG/MAIN', qty: -200, uom: 'uds', reason: 'ship', occurredAt: '2025-08-26T00:00:00Z', note: 'Salida pedido ORD-01', createdBy: 'Nacho', ref: { shipmentId: 'SH-250826-001' } },
          ] as unknown as StockMove[],
          lots: [
              { id: 'lote_sb750_1', lotNumber: 'lote_sb750_1', itemId: 'SB-750', qcStatus: 'PENDING', qcPlanId: 'plan_sb750_std', createdAt: new Date().toISOString() },
              { id: 'OPEN-2408-01', lotNumber: 'OPEN-2408-01', itemId: 'item_rm_vino_blanco', qcStatus: 'PASSED', createdAt: '2025-08-15T00:00:00Z'},
              { id: 'OPEN-ALC-01', lotNumber: 'OPEN-ALC-01', itemId: 'item_rm_alcohol', qcStatus: 'PASSED', createdAt: '2025-08-15T00:00:00Z'},
              { id: 'OPEN-ARO-01', lotNumber: 'OPEN-ARO-01', itemId: 'item_rm_aromas', qcStatus: 'PASSED', createdAt: '2025-08-15T00:00:00Z'},
              { id: 'OPEN-AZU-01', lotNumber: 'OPEN-AZU-01', itemId: 'item_rm_azucar', qcStatus: 'PASSED', createdAt: '2025-08-15T00:00:00Z'},
              { id: 'TB-2509-01', lotNumber: 'TB-2509-01', itemId: 'item_fg_turm_blanco', qcStatus: 'PASSED', createdAt: '2025-08-22T14:00:00Z', producedByOrderId: 'PO-250822-0001'},
          ] as Lot[],
          lotGenealogy: [
            { id: 'gene_tb_1', parentLotNumber: 'OPEN-2408-01', childLotNumber: 'TB-2509-01', qty: 950, uom: 'L', createdAt: '2025-08-22T09:00:00Z' },
            { id: 'gene_tb_2', parentLotNumber: 'OPEN-ALC-01', childLotNumber: 'TB-2509-01', qty: 5, uom: 'L', createdAt: '2025-08-22T09:00:00Z' },
            { id: 'gene_tb_3', parentLotNumber: 'OPEN-ARO-01', childLotNumber: 'TB-2509-01', qty: 2, uom: 'L', createdAt: '2025-08-22T09:00:00Z' },
            { id: 'gene_tb_4', parentLotNumber: 'OPEN-AZU-01', childLotNumber: 'TB-2509-01', qty: 43, uom: 'kg', createdAt: '2025-08-22T09:00:00Z' },
          ] as LotGenealogyEdge[],
          onHand: [
            { id: 'onhand_vino', itemId: 'item_rm_vino_blanco', lotNumber: 'OPEN-2408-01', locationId: 'RM/MAIN', qty: 19050, uom: 'L', qcStatus: 'PASSED' },
            { id: 'onhand_alc', itemId: 'item_rm_alcohol', lotNumber: 'OPEN-ALC-01', locationId: 'RM/MAIN', qty: 495, uom: 'L', qcStatus: 'PASSED' },
            { id: 'onhand_aro', itemId: 'item_rm_aromas', lotNumber: 'OPEN-ARO-01', locationId: 'RM/MAIN', qty: 98, uom: 'L', qcStatus: 'PASSED' },
            { id: 'onhand_azu', itemId: 'item_rm_azucar', lotNumber: 'OPEN-AZU-01', locationId: 'RM/MAIN', qty: 1957, uom: 'kg', qcStatus: 'PASSED' },
            { id: 'onhand_tb', itemId: 'item_fg_turm_blanco', lotNumber: 'TB-2509-01', locationId: 'FG/MAIN', qty: 800, uom: 'uds', qcStatus: 'PASSED' },
          ] as OnHandView[],
        };

        const emptyData: Partial<SantaData> = {};
        for (const name of Array.from(SANTA_DATA_COLLECTIONS)) {
            (emptyData as any)[name] = (mockData as any)[name] ?? [];
        }
        setData(emptyData as SantaData);
    }
    setLoadingData(false);
  }, [authReady, firebaseUser, isPersistenceEnabled]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, user => {
        setFirebaseUser(user);
        setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authReady) {
      loadInitialData().catch(console.error);
    }
  }, [authReady, isPersistenceEnabled, loadInitialData]);

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
          const userName = userToSet.name === 'MJ' ? 'Martin' : userToSet.name;
          console.log(`[DataProvider] Found matching app user: ${userName}. Setting as currentUser.`);
          userToSet = { ...userToSet, name: userName, role: (userToSet.role?.toLowerCase() || 'comercial') as UserRole };
      } else {
          console.warn(`[DataProvider] Firebase user ${firebaseUser.email} not found in local data.users array.`);
      }
    } else {
        console.log('[DataProvider] No Firebase user or data.users not ready.');
    }
    
    setCurrentUser(userToSet);

  }, [data, firebaseUser, authReady, loadingData]);

  const togglePersistence = useCallback(() => {
    setIsPersistenceEnabled(prev => {
        console.log(`[DataProvider] Toggling persistence from ${prev} to ${!prev}`);
        setData(null); // Force data reload
        return !prev;
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
      console.log("Saving to backend:", Object.keys(collectionsToSave));
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
        console.log("Save successful.");
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

  const loginWithEmail = useCallback(
    async (email: string, pass: string): Promise<User | null> => {
      if (!firebaseAuth) return null;
      console.log('[DataProvider] loginWithEmail called for:', email);
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, pass);
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
      loadInitialData,
    }),
    [data, currentUser, authReady, saveCollection, saveAllCollections, login, loginWithEmail, signupWithEmail, logout, togglePersistence, isPersistenceEnabled, setCurrentUserById, loadInitialData]
  );

  const isBlocking =
    !authReady || (firebaseUser && isPersistenceEnabled && (loadingData || !data));

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
