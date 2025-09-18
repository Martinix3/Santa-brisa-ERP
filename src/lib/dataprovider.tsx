
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
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

// Hardcoded user ID for dev purposes now that login is removed
const DEV_USER_ID = 'dev-user-fixed-id';

async function getAuthHeaders(): Promise<Record<string, string>> {
  // Auth is disabled, so we don't need real headers.
  // The API will use a fixed user ID.
  return {};
}

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<DataMode>("real");
  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
        setIsLoading(true);
        console.log("⚠️ No hay autenticación, cargando datos locales y de API para dev.");

        try {
            const response = await fetch("/api/brain-persist", { headers: await getAuthHeaders() });

            if (!response.ok) {
                const errorBody = await response.text();
                console.warn(`API fetch failed (${response.status}): ${errorBody}. Falling back to local data.`);
                setData(JSON.parse(JSON.stringify(realSantaData)));
            } else {
                const apiData = await response.json();
                // Merge con datos reales por si la DB está vacía o es la primera vez
                const mergedData = {
                    ...JSON.parse(JSON.stringify(realSantaData)),
                    ...apiData,
                };
                setData(mergedData);
                console.log("✅ Datos cargados desde la API y fusionados con datos locales.");
            }
        } catch (error) {
            console.error("Could not fetch initial data, falling back to local data:", error);
            setData(JSON.parse(JSON.stringify(realSantaData)));
        }

        setIsLoading(false);
    };

    loadInitialData();
  }, []);

  // Efecto para actualizar el usuario actual cuando los datos cambian
  useEffect(() => {
      if (data) {
          // Asigna un usuario por defecto ya que el login está deshabilitado
          const defaultUser = data.users.find(u => u.id === 'u_nico');
          setCurrentUser(defaultUser || data.users[0] || null);
      }
  }, [data]);


  const login = useCallback(async (email: string, pass: string) => {
      console.warn("Login function called, but authentication is disabled.");
      // Simula un login exitoso asignando un usuario por defecto
      if(data) {
          const defaultUser = data.users.find(u => u.id === 'u_nico');
          setCurrentUser(defaultUser || null);
      }
  }, [data]);


  const logout = useCallback(async () => {
    console.warn("Logout function called, but authentication is disabled.");
    setCurrentUser(null);
  }, []);

  const forceSave = useCallback(
    async (dataToSave?: SantaData) => {
      const payload = dataToSave || data;
      if (!payload) {
        console.warn("Save requested, but no data is available.");
        return;
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
