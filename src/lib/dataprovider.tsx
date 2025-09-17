
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import type { User, SantaData } from "@/domain/ssot";
import { realSantaData } from "@/domain/real-data";
import { auth } from "./firebase-config";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

export type DataMode = "test" | "real";

interface DataContextProps {
  mode: DataMode;
  setMode: React.Dispatch<React.SetStateAction<DataMode>>;
  data: SantaData | null;
  setData: React.Dispatch<React.SetStateAction<SantaData | null>>;
  forceSave: (dataToSave?: SantaData) => Promise<void>;
  currentUser: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!auth.currentUser) return {};
  const token = await auth.currentUser.getIdToken(true);
  return { Authorization: `Bearer ${token}` };
}

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<DataMode>("real");
  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        console.log("✅ Usuario autenticado:", firebaseUser.email);
        
        // Cargar datos de la API solo si hay un usuario
        try {
          const headers = await getAuthHeaders();
          const response = await fetch("/api/brain-persist", { headers });

          if (!response.ok) {
            const errorBody = await response.text();
            console.warn(`API fetch failed (${response.status}): ${errorBody}. Falling back to local data.`);
            setData(JSON.parse(JSON.stringify(realSantaData)));
          } else {
            const apiData = await response.json();
            setData(apiData);
          }
        } catch (error) {
          console.error("Could not fetch initial data, falling back to local data:", error);
          setData(JSON.parse(JSON.stringify(realSantaData)));
        }

        // Asignar el rol real desde los datos cargados
        const users = data?.users || realSantaData.users;
        const appUser = users.find(u => u.email === firebaseUser.email);

        setCurrentUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || appUser?.name || "Usuario",
          email: firebaseUser.email || undefined,
          role: appUser?.role || "comercial",
          active: true,
        });

      } else {
        console.log("⚠️ No hay usuario autenticado, cargando datos locales.");
        setCurrentUser(null);
        setData(JSON.parse(JSON.stringify(realSantaData)));
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, [data?.users]); // Dependencia para re-evaluar rol si los usuarios cambian

  const login = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const forceSave = useCallback(
    async (dataToSave?: SantaData) => {
      const payload = dataToSave || data;
      if (!payload) {
        console.warn("Save requested, but no data is available.");
        return;
      }
      if (!auth.currentUser) {
        throw new Error("No hay un usuario autenticado para guardar los datos.");
      }

      try {
        const headers = await getAuthHeaders();
        const response = await fetch("/api/brain-persist", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(errorBody.error || "Failed to save data to server.");
        }
        console.log("Data successfully persisted via API.");
      } catch (error) {
        console.error("Error in forceSave:", error);
        throw error;
      }
    },
    [data]
  );

  const value = useMemo(
    () => ({
      mode,
      setMode,
      data,
      setData,
      forceSave,
      currentUser,
      login,
      logout,
      isLoading,
    }),
    [mode, data, setData, forceSave, currentUser, login, logout, isLoading]
  );

  return (
    <DataContext.Provider value={value}>{children}</DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
