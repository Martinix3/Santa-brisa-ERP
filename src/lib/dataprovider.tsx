
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { SantaData, User, UserRole } from "@/domain/ssot";
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

type ServerErrorState = {
    show: boolean;
    onRetry: () => void;
}

type DataContextType = {
  data: SantaData | null;
  setData: React.Dispatch<React.SetStateAction<SantaData | null>>;
  currentUser: User | null;
  authReady: boolean;
  isOnlineMode: boolean;
  lastLoadReport: LoadReport | null;
  requireAuth: boolean;
  setRequireAuth: (v: boolean) => void;
  reload: () => Promise<void>;
  saveCollection: (name: keyof SantaData, rows: any[]) => Promise<void>;
  saveAllCollections: (collections: Partial<SantaData>) => Promise<void>;
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
  if (found) {
      const normalizedUser = { ...found, role: (found.role?.toLowerCase() || 'comercial') as UserRole };
      const updatedUsers = currentData.users.map(u => u.id === found.id ? normalizedUser : u);
      return { updated: { ...currentData, users: updatedUsers }, ensuredUser: normalizedUser };
  }
  
  const newUser: User = {
    id: user.uid,
    name: user.displayName || emailToName(user.email || "user"),
    email: user.email || "",
    role: "comercial",
    active: true,
  };
  return { updated: { ...currentData, users: [...currentData.users, newUser] }, ensuredUser: newUser };
}


async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  try {
    const token = await getIdToken(user, true); // Force refresh
    return { 'Authorization': `Bearer ${token}` };
  } catch (error: any) {
    console.error("Error getting auth token:", error);
    // If token refresh fails (e.g. user revoked), we should handle it
    if (error.code === 'auth/user-token-expired' || error.code === 'auth/invalid-user-token') {
       // Optionally, sign out the user here
    }
    return {};
  }
}

const ServerErrorOverlay = ({ serverError, setServerError }: { serverError: ServerErrorState, setServerError: React.Dispatch<React.SetStateAction<ServerErrorState>> }) => {
    if (!serverError.show) return null;

    const handleRetry = () => {
        setServerError({ show: false, onRetry: () => {} }); // Hide first
        serverError.onRetry(); // Then call the retry logic
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-lg shadow-xl text-center max-w-md">
                <h3 className="text-lg font-bold text-red-600">Error de Conexión con el Servidor</h3>
                <p className="mt-2 text-sm text-zinc-600">
                    No se pudo alcanzar el servidor (posiblemente un timeout del proxy de desarrollo). 
                    Por favor, asegúrate de que la aplicación también está accesible en{' '}
                    <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">http://localhost:3000</a> y vuelve a intentarlo.
                </p>
                <div className="mt-4 flex justify-center gap-4">
                     <button onClick={() => setServerError({ show: false, onRetry: () => {} })} className="px-4 py-2 text-sm font-medium bg-zinc-200 rounded-md">
                        Cerrar
                    </button>
                    <button onClick={handleRetry} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md">
                        Reintentar
                    </button>
                </div>
            </div>
        </div>
    );
};


// --------- Provider ----------
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<import("firebase/auth").User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);
  const [isOnlineMode, setIsOnlineMode] = useState(true);
  const [requireAuth, setRequireAuth] = useState(true);
  const [lastLoadReport, setLastLoadReport] = useState<LoadReport | null>(null);
  const [serverError, setServerError] = useState<ServerErrorState>({ show: false, onRetry: () => {} });
  const router = useRouter();

  const isPersistenceEnabled = isOnlineMode;
  
  const loadOfflineData = useCallback(async () => {
    const local = await fetchLocalJson();
    setData(local);
    setLastLoadReport(local ? { ok: ["(local)"] as any, errors: [], totalDocs: Object.values(local).flat().length } : { ok: [], errors: [{ name: "local" as any, error: "no db.json" }], totalDocs: 0 });
    setAuthReady(true); // Data is loaded, auth state is considered "ready" for offline mode.
  }, []);

  const loadOnlineData = useCallback(async () => {
    if (requireAuth && !auth.currentUser) {
      setAuthReady(true);
      setCurrentUser(null);
      setData(null);
      return;
    }
    const { partial, report } = await loadAllCollections();

    if (ALLOW_LOCAL_FALLBACK && report.ok.length === 0) {
        await loadOfflineData();
        return;
    }

    const next = partial as SantaData;
    setData(next);
    setLastLoadReport(report);
  }, [requireAuth, loadOfflineData]);

  const reload = useCallback(async () => {
    if (isOnlineMode) {
      await loadOnlineData();
    } else {
      await loadOfflineData();
    }
  }, [isOnlineMode, loadOnlineData, loadOfflineData]);
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
        setFirebaseUser(fbUser);
        
        if (!authReady) {
            await reload();
            setAuthReady(true);
        }
    });
    return () => unsub();
  }, [reload, authReady]);
  
  useEffect(() => {
    if (!data || !authReady) return;
    
    let userToSet: User | null | undefined = null;
    if (firebaseUser) {
        const foundUser = data.users.find(u => u.email === firebaseUser.email);
        if (foundUser) {
            userToSet = { ...foundUser, role: (foundUser.role?.toLowerCase() || 'comercial') as UserRole };
        }
    }

    if (firebaseUser && !userToSet) {
      const { ensuredUser, updated } = ensureLocalUser(firebaseUser, data);
      setData(updated);
      setCurrentUser(ensuredUser);
    } else {
      setCurrentUser(userToSet || null);
    }

  }, [data, firebaseUser, authReady]);


  const togglePersistence = useCallback(() => {
    setIsOnlineMode(prev => !prev);
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
        if (!isOnlineMode) {
            console.log(`[Offline Mode] Not saving collections: ${Object.keys(collectionsToSave).join(', ')}`);
            return;
        }
        if (requireAuth && !auth.currentUser) throw new Error("No autenticado");

        const saveData = async () => {
            try {
                const headers = await getAuthHeaders();
                const res = await fetch("/api/brain-persist", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...headers },
                    body: JSON.stringify({ newEntities: collectionsToSave }),
                });
                if (!res.ok) {
                    const text = await res.text().catch(() => `Error ${res.status}`);
                    throw new Error(`Persist failed ${res.status}: ${text}`);
                }
            } catch (e: any) {
                console.error("Error in saveAllCollections:", e);
                const msg = e.message || '';
                if (msg.includes('504') || msg.includes('Error reaching server') || msg.includes('Unexpected content-type')) {
                    setServerError({ show: true, onRetry: saveData });
                } else {
                    throw e; // Re-throw other errors
                }
            }
        }

        await saveData();
    },
    [isOnlineMode, requireAuth]
  );
  
  const saveCollection = useCallback(
    async (name: keyof SantaData, rows: any[]) => {
        await saveAllCollections({ [name]: rows });
    },
    [saveAllCollections]
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
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const fbUser = userCredential.user;
      if (!fbUser || !data?.users) return null;
      
      const appUser = data.users.find((u) => u.email === fbUser.email);
      if (appUser) {
          const normalizedUser = { ...appUser, role: (appUser.role?.toLowerCase() || 'comercial') as UserRole };
          setCurrentUser(normalizedUser);
          return normalizedUser;
      }
      return null;
    },
    [data?.users]
  );

  const signupWithEmail = useCallback(
    async (email: string, pass: string): Promise<User | null> => {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
       const fbUser = userCredential.user;
      if (!fbUser || !data?.users) return null;

      // After signup, ensureLocalUser will create and set the user
      // No need to manually find it here, the useEffect hook will handle it.
      const appUser = data.users.find((u) => u.email === email);
      return appUser || null;
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
      authReady,
      isOnlineMode,
      lastLoadReport,
      requireAuth,
      setRequireAuth,
      reload,
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
    [data, currentUser, authReady, isOnlineMode, lastLoadReport, requireAuth, reload, saveCollection, saveAllCollections, login, loginWithEmail, signupWithEmail, logout, togglePersistence, isPersistenceEnabled, setCurrentUserById]
  );

  return (
    <DataContext.Provider value={value}>
        {children}
        <ServerErrorOverlay serverError={serverError} setServerError={setServerError} />
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
