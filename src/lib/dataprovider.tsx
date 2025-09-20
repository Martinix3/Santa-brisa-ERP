
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { SantaData, User, UserRole } from "@/domain/ssot";
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, getIdToken } from "firebase/auth";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { SANTA_DATA_COLLECTIONS } from "@/domain/ssot";

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

async function loadAllCollections(): Promise<[SantaData, LoadReport]> {
    console.log('[DataProvider] Loading all collections from Firestore...');
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


// --------- Provider ----------
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<import("firebase/auth").User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isPersistenceEnabled, setIsPersistenceEnabled] = useState(false);
  const router = useRouter();

  // Load Firestore data on initial mount
  useEffect(() => {
    async function loadInitialData() {
      console.log('[DataProvider] useEffect: Loading initial data...');
      if (data) return;
      try {
        const [firestoreData, report] = await loadAllCollections();
        setData(firestoreData);
      } catch (e) {
        console.error("[DataProvider] Failed to load Firestore data:", e);
      }
    }
    loadInitialData();
  }, []);

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
    if (!data || !authReady) {
        console.log('[DataProvider] Skipping user sync: data or auth not ready.');
        return;
    }

    let userToSet: User | null = null;
    
    if (firebaseUser && data.users) {
      console.log(`[DataProvider] Auth ready. Trying to find app user for Firebase user: ${firebaseUser.email}`);
      const foundUser = data.users.find(u => u.email === firebaseUser.email);
      if (foundUser) {
        console.log(`[DataProvider] App user found: ${foundUser.name}. Setting as currentUser.`);
        userToSet = { ...foundUser, role: (foundUser.role?.toLowerCase() || 'comercial') as UserRole };
      } else {
         console.warn(`[DataProvider] Firebase user ${firebaseUser.email} not found in local data.users array.`);
      }
    } else {
        console.log('[DataProvider] No Firebase user. Looking for a default user (owner/admin) for dev mode.');
        userToSet = data.users.find(u => u.role === 'owner') || data.users.find(u => u.role === 'admin') || data.users[0] || null;
        console.log(`[DataProvider] Default user set to:`, userToSet ? userToSet.name : 'null');
    }
    
    setCurrentUser(userToSet);

  }, [data, firebaseUser, authReady]);

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
        if (isPersistenceEnabled) {
            console.log("Saving to backend:", collectionsToSave);
            // This would be a fetch to a serverless function that writes to Firestore
            // For now, it's a mock.
            await new Promise(resolve => setTimeout(resolve, 500));
        } else {
             console.log("Persistence is disabled. Not saving.");
        }
    }, [isPersistenceEnabled]
  );
  
  const saveCollection = useCallback(
    async (name: keyof SantaData, rows: any[]) => {
        // Update local state immediately for responsiveness
        setData(prevData => prevData ? { ...prevData, [name]: rows } : null);
        // Persist to backend if enabled
        if (isPersistenceEnabled) {
             await saveAllCollections({ [name]: rows });
        }
    }, [isPersistenceEnabled, saveAllCollections]
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
          // IMPORTANT: Create a new object reference to trigger re-render in consumers
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
      // This new user won't be persisted unless persistence is enabled and saveCollection is called.
      // In a real app, you'd have a backend "createUser" function.
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
    [data?.users]
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

  if (!data) {
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
