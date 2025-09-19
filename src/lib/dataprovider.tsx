
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { SantaData, User } from "@/domain/ssot";
import { SANTA_DATA_COLLECTIONS } from "@/domain/ssot";
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, getIdToken } from "firebase/auth";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";

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
  isLoading: boolean;
  isOnlineMode: boolean;
  lastLoadReport: LoadReport | null;
  requireAuth: boolean;
  setRequireAuth: (v: boolean) => void;
  reload: () => Promise<void>;
  saveCollection: (name: keyof SantaData, rows: any[]) => Promise<void>;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<User | null>;
  signupWithEmail: (email: string, pass: string) => Promise<User | null>;
  logout: () => Promise<void>;
  togglePersistence: () => void;
  setCurrentUserById: (userId: string) => void;
  isPersistenceEnabled: boolean;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

const ALLOW_LOCAL_FALLBACK = true; 

const emailToName = (email: string) =>
  email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

// --------- Ayudas ----------
async function fetchLocalJson(): Promise<SantaData | null> {
  try {
    const r = await fetch("/data/db.json", { cache: "no-store" });
    if (!r.ok) throw new Error("db.json not found");
    return (await r.json()) as SantaData;
  } catch {
    return null;
  }
}

async function loadAllCollections(): Promise<{ partial: Partial<SantaData>; report: LoadReport }> {
  const partial: Partial<SantaData> = {};
  const report: LoadReport = { ok: [], errors: [], totalDocs: 0 };

  const tasks = SANTA_DATA_COLLECTIONS.map(async (name) => {
    try {
      const snap = await getDocs(collection(db, name as string));
      (partial as any)[name] = snap.docs.map((d) => d.data());
      report.ok.push(name);
      report.totalDocs += snap.size;
    } catch (e: any) {
      report.errors.push({ name, error: e?.code || e?.message || "unknown" });
      (partial as any)[name] = []; // mantener shape
    }
  });

  await Promise.allSettled(tasks);
  return { partial, report };
}

function ensureLocalUser(user: import("firebase/auth").User, currentData: SantaData): { updated: SantaData; ensuredUser: User } {
  const found = currentData.users.find((u) => u.email === user.email);
  if (found) return { updated: currentData, ensuredUser: found };
  const newUser: User = {
    id: user.uid,
    name: user.displayName || emailToName(user.email || "user"),
    email: user.email || "",
    role: "comercial",
    active: true,
  };
  return { updated: { ...currentData, users: [...currentData.users, newUser] }, ensuredUser: newUser };
}

// --------- Provider ----------
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<import("firebase/auth").User | null>(auth.currentUser);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnlineMode, setIsOnlineMode] = useState(true);
  const [requireAuth, setRequireAuth] = useState(true);
  const [lastLoadReport, setLastLoadReport] = useState<LoadReport | null>(null);
  const router = useRouter();

  const isPersistenceEnabled = isOnlineMode;
  
  const loadOfflineData = useCallback(async () => {
    setIsLoading(true);
    const local = await fetchLocalJson();
    setData(local);
    setLastLoadReport(local ? { ok: ["(local)"] as any, errors: [], totalDocs: Object.values(local).flat().length } : { ok: [], errors: [{ name: "local" as any, error: "no db.json" }], totalDocs: 0 });
    if(local?.users?.[0]) {
      const fbUser = auth.currentUser;
      const userToSet = fbUser ? (local.users.find(u => u.email === fbUser.email) || local.users[0]) : local.users[0];
      setCurrentUser(userToSet);
    }
    else setCurrentUser(null);
    setIsLoading(false);
  }, []);

  const loadOnlineData = useCallback(async () => {
    if (requireAuth && !auth.currentUser) {
      setIsLoading(false);
      setCurrentUser(null);
      setData(null);
      return;
    }
    setIsLoading(true);
    const { partial, report } = await loadAllCollections();

    if (ALLOW_LOCAL_FALLBACK && report.ok.length === 0) {
        await loadOfflineData();
        return;
    }

    const next = partial as SantaData;
    setData(next);
    setLastLoadReport(report);
    setIsLoading(false);
  }, [requireAuth, loadOfflineData]);

  const reload = useCallback(async () => {
    if (isOnlineMode) {
      await loadOnlineData();
    } else {
      await loadOfflineData();
    }
  }, [isOnlineMode, loadOnlineData, loadOfflineData]);
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      // Data loading is now triggered by the data-loading useEffect
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    reload();
  }, [isOnlineMode, firebaseUser, reload]);

  useEffect(() => {
    if(!data || isLoading) return;

    if(firebaseUser) {
        const { ensuredUser, updated } = ensureLocalUser(firebaseUser, data);
        if (updated.users.length > data.users.length) {
            setData(updated); // only update if a new user was actually added
        }
        setCurrentUser(ensuredUser);
    } else {
        setCurrentUser(null);
    }
  }, [data, isLoading, firebaseUser]);


  const togglePersistence = useCallback(() => {
    setIsOnlineMode(prev => !prev);
  }, []);
  
  const setCurrentUserById = useCallback((userId: string) => {
    if (data?.users) {
        const user = data.users.find(u => u.id === userId);
        if (user) setCurrentUser(user);
    }
  }, [data?.users]);
  
  const saveCollection = useCallback(
    async (name: keyof SantaData, rows: any[]) => {
      setData((prev) => (prev ? ({ ...prev, [name]: rows } as SantaData) : prev));
      if (!isOnlineMode) {
        console.log(`[Offline Mode] Not saving collection: ${name}`);
        return;
      }
      if (requireAuth && !auth.currentUser) throw new Error("No autenticado");

      try {
        const res = await fetch("/api/brain-persist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newEntities: { [name]: rows } }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => `Error ${res.status}`);
          throw new Error(`Persist failed ${res.status}: ${text}`);
        }
      } catch (e) {
          console.error("Error in saveCollection:", e);
          throw e;
      }
    },
    [isOnlineMode, requireAuth]
  );

  const login = useCallback(async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  }, []);

  const loginWithEmail = useCallback(
    async (email: string, pass: string) => {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const appUser = data?.users.find((u) => u.email === cred.user.email) || null;
      if (appUser) setCurrentUser(appUser);
      return appUser;
    },
    [data?.users]
  );

  const signupWithEmail = useCallback(
    async (email: string, pass: string) => {
      await createUserWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will trigger reload and user sync
      const appUser = data?.users.find((u) => u.email === email) || null;
      return appUser;
    },
    [data?.users]
  );

  const logout = useCallback(async () => {
    await signOut(auth);
    setCurrentUser(null);
    if (requireAuth) router.push("/login");
  }, [requireAuth, router]);

  const value = useMemo<DataContextType>(
    () => ({
      data,
      setData,
      currentUser,
      isLoading,
      isOnlineMode,
      lastLoadReport,
      requireAuth,
      setRequireAuth,
      reload,
      saveCollection,
      login,
      loginWithEmail,
      signupWithEmail,
      logout,
      togglePersistence,
      isPersistenceEnabled,
      setCurrentUserById,
    }),
    [data, currentUser, isLoading, isOnlineMode, lastLoadReport, requireAuth, reload, saveCollection, login, loginWithEmail, signupWithEmail, logout, togglePersistence, isPersistenceEnabled, setCurrentUserById]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
