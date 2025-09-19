
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { SantaData, User } from "@/domain/ssot";
import { SANTA_DATA_COLLECTIONS } from "@/domain/ssot";
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, getIdToken } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
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
  loginGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<User | null>;
  signupWithEmail: (email: string, pass: string) => Promise<User | null>;
  logout: () => Promise<void>;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

// Si quieres permitir fallback local, activa esto:
const ALLOW_LOCAL_FALLBACK = false;

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

// Crea usuario local si no existe
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
  const [isLoading, setIsLoading] = useState(true);
  const [isOnlineMode, setIsOnlineMode] = useState(true);
  const [requireAuth, setRequireAuth] = useState(true);
  const [lastLoadReport, setLastLoadReport] = useState<LoadReport | null>(null);
  const router = useRouter();

  // ---- Auth binding ----
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        setCurrentUser(null);
        if (requireAuth && isOnlineMode) {
          // En modo “entorno real”, no sigas sin login
          setIsLoading(false);
        }
      } else {
        // Nota: el usuario de negocio lo garantizamos tras cargar datos (en reload)
        setCurrentUser((prev) => prev || { id: fbUser.uid, name: fbUser.displayName || emailToName(fbUser.email || "user"), email: fbUser.email || "", role: "comercial", active: true });
      }
    });
    return () => unsub();
  }, [requireAuth, isOnlineMode]);

  // ---- Carga inicial ----
  const reload = useCallback(async () => {
    setIsLoading(true);
    setLastLoadReport(null);

    if (isOnlineMode) {
      if (requireAuth && !auth.currentUser) {
        // No hacemos lecturas si exigimos auth y no hay token
        setIsLoading(false);
        return;
      }
      const { partial, report } = await loadAllCollections();

      // Fallback opcional si TODO está vacío o hay demasiados errores
      if (ALLOW_LOCAL_FALLBACK && report.ok.length === 0) {
        const local = await fetchLocalJson();
        if (local) {
          setData(local);
          setLastLoadReport({ ok: ["(local)"] as any, errors: [], totalDocs: Object.values(local).reduce((acc, v: any) => acc + (Array.isArray(v) ? v.length : 0), 0) });
          setIsLoading(false);
          return;
        }
      }

      const next = partial as SantaData;
      // Si hay user en auth, garantizamos su presencia en data.users
      if (auth.currentUser && next?.users) {
        const ensured = ensureLocalUser(auth.currentUser, next);
        setData(ensured.updated);
        // Ajustar currentUser final
        setCurrentUser(ensured.ensuredUser);
      } else {
        setData(next);
      }
      setLastLoadReport(report);
      setIsLoading(false);
      return;
    }

    // Offline duro
    const local = await fetchLocalJson();
    setData(local);
    setLastLoadReport(local ? { ok: ["(local)"] as any, errors: [], totalDocs: Object.values(local).reduce((acc, v: any) => acc + (Array.isArray(v) ? v.length : 0), 0) } : { ok: [], errors: [{ name: "local" as any, error: "no db.json" }], totalDocs: 0 });
    setIsLoading(false);
  }, [isOnlineMode, requireAuth]);

  useEffect(() => {
    reload();
  }, [reload]);

  // ---- Persistencia (vía backend) ----
  const saveCollection = useCallback(
    async (name: keyof SantaData, rows: any[]) => {
      if (!isOnlineMode) {
        // Offline: solo cache local
        setData((prev) => (prev ? ({ ...prev, [name]: rows } as SantaData) : prev));
        return;
      }
      if (requireAuth && !auth.currentUser) throw new Error("No autenticado");

      const token = await getIdToken(auth.currentUser!);
      const res = await fetch("/api/brain-persist", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data: { [name]: rows }, strategy: "overwrite" }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Persist failed ${res.status}: ${text}`);
      }
      // Reflejar en memoria
      setData((prev) => (prev ? ({ ...prev, [name]: rows } as SantaData) : prev));
    },
    [isOnlineMode, requireAuth]
  );

  // ---- Acciones auth ----
  const loginGoogle = useCallback(async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
    await reload();
  }, [reload]);

  const loginWithEmail = useCallback(
    async (email: string, pass: string) => {
      await signInWithEmailAndPassword(auth, email, pass);
      // intenta mapear con data.users tras reload
      await reload();
      return data?.users.find((u) => u.email === email) || null;
    },
    [reload, data?.users]
  );

  const signupWithEmail = useCallback(
    async (email: string, pass: string) => {
      await createUserWithEmailAndPassword(auth, email, pass);
      await reload(); // ensureLocalUser lo añadirá a users
      return data?.users.find((u) => u.email === email) || null;
    },
    [reload, data?.users]
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
      loginGoogle,
      loginWithEmail,
      signupWithEmail,
      logout,
    }),
    [data, currentUser, isLoading, isOnlineMode, lastLoadReport, requireAuth, reload, saveCollection, loginGoogle, loginWithEmail, signupWithEmail, logout]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
