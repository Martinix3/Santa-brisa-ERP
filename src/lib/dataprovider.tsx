
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
  currentUser: User | null;
  login: () => Promise<void>;
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

            let finalData: SantaData;
            const localDataCopy = JSON.parse(JSON.stringify(realSantaData));

            if (!response.ok) {
                const errorBody = await response.text();
                console.warn(`API fetch failed (${response.status}): ${errorBody}. Falling back to local data.`);
                finalData = localDataCopy;
            } else {
                const apiData = await response.json();
                
                // Deep merge: Prioritize API data but keep local data for collections not in API response.
                const merged = { ...localDataCopy };

                for (const key in apiData) {
                    if (Object.prototype.hasOwnProperty.call(apiData, key) && Array.isArray(apiData[key])) {
                         if (apiData[key].length > 0) {
                            (merged as any)[key] = apiData[key];
                        }
                    }
                }
                finalData = merged;
                console.log("✅ Datos cargados desde la API y fusionados con datos locales.");
            }
            setData(finalData);

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


  const login = useCallback(async () => {
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


  const value = useMemo(
    () => ({
      mode,
      setMode,
      data,
      setData,
      currentUser,
      login,
      logout,
      isLoading,
    }),
    [mode, data, setData, currentUser, login, logout, isLoading]
  );

  return (
    <DataContext.Provider value={value as any}>{children}</DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
