
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { User, SantaData } from '@/domain/ssot';
import { realSantaData } from '@/domain/real-data'; // Importar los datos reales
import { mockSantaData } from '@/domain/mock-data';

export type DataMode = 'test' | 'real';

interface DataContextProps {
  mode: DataMode;
  setMode: React.Dispatch<React.SetStateAction<DataMode>>;
  data: SantaData | null;
  setData: React.Dispatch<React.SetStateAction<SantaData | null>>;
  forceSave: (dataToSave?: SantaData) => Promise<void>;
  currentUser: User | null;
  logout: () => void;
  isLoading: boolean;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

async function getAuthHeaders(): Promise<Record<string, string>> {
    // Auth removido, no se necesitan cabeceras especiales.
    return {};
}

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<DataMode>('real'); // Default to 'real'
  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on initial mount
  useEffect(() => {
    const loadInitialData = async () => {
        setIsLoading(true);
        // Dado que hemos quitado la autenticación, cargamos los datos de prueba directamente.
        // En un futuro, esto podría leer de una API pública o de un archivo local.
        const initialData = JSON.parse(JSON.stringify(mockSantaData));
        setData(initialData);

        // Simular que el usuario 'admin' siempre está conectado
        const adminUser = initialData.users.find((u: User) => u.role === 'admin');
        if (adminUser) {
            setCurrentUser(adminUser);
        }

        setIsLoading(false);
    };
    loadInitialData();
  }, []);

  const forceSave = useCallback(async (dataToSave?: SantaData) => {
    const payload = dataToSave || data;
    if (!payload) {
      console.warn("Save requested, but no data is available.");
      return;
    }
    // La persistencia real está desactivada. Esto es solo una simulación.
    console.log("Simulando guardado de datos (auth desactivada):", payload);
    return Promise.resolve();
  }, [data]);


  const logout = useCallback(() => {
    // No hace nada, ya que no hay sesión.
    console.log("Logout llamado, pero la autenticación está desactivada.");
  }, []);

  const value = useMemo(() => ({ 
      mode, 
      setMode, 
      data, 
      setData,
      forceSave,
      currentUser,
      login: async () => true, // Función dummy
      logout,
      isLoading,
  }), [mode, data, setData, forceSave, currentUser, logout, isLoading]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
