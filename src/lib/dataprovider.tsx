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
import { useRouter } from "next/navigation";


export type DataMode = "test" | "real";

interface DataContextProps {
  mode: DataMode;
  setMode: React.Dispatch<React.SetStateAction<DataMode>>;
  data: SantaData | null;
  setData: React.Dispatch<React.SetStateAction<SantaData | null>>;
  forceSave: (dataToSave?: SantaData) => Promise<void>;
  currentUser: User | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<DataMode>("real");
  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // En una app real, aquí se haría un fetch a una API.
        // Por ahora, cargamos los datos de `real-data.ts`.
        // Usamos JSON.parse/stringify para simular una carga de red y evitar mutaciones del objeto original.
        setData(JSON.parse(JSON.stringify(realSantaData)));
      } catch (error) {
        console.error("Could not load initial data:", error);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
      if (!data || !data.users) {
          throw new Error("Los datos de usuario no están cargados.");
      }
      // Simulación de login: buscar por email, ignorar contraseña.
      const user = data.users.find(u => u.email === email);

      if (user) {
          setCurrentUser(user);
          console.log(`Usuario '${user.name}' ha iniciado sesión.`);
      } else {
          throw new Error("Usuario no encontrado.");
      }
  }, [data]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    console.log("Usuario ha cerrado sesión.");
  }, []);

  const forceSave = useCallback(
    async (dataToSave?: SantaData) => {
      const payload = dataToSave || data;
      if (!payload) {
        console.warn("Save requested, but no data is available.");
        return;
      }
      // Simulación de guardado. En una app real, aquí iría la llamada a la API.
      console.log("Simulando guardado de datos:", payload);
      await new Promise(res => setTimeout(res, 500));
      console.log("Datos 'guardados' en memoria.");
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