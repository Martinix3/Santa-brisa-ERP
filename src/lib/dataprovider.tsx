
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { User, SantaData } from '@/domain/ssot';
import { realSantaData } from '@/domain/real-data'; // Importar los datos reales

export type DataMode = 'test' | 'real';

interface DataContextProps {
  mode: DataMode;
  setMode: React.Dispatch<React.SetStateAction<DataMode>>;
  data: SantaData | null;
  setData: React.Dispatch<React.SetStateAction<SantaData | null>>;
  forceSave: (dataToSave?: SantaData) => Promise<void>;
  currentUser: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<DataMode>('real'); // Default to 'real'
  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user and mode from localStorage on initial mount
  useEffect(() => {
    const savedMode = localStorage.getItem('sb-data-mode') as DataMode;
    if (savedMode) setMode(savedMode);
    
    try {
        const savedUser = localStorage.getItem('sb-current-user');
        if (savedUser) {
            setCurrentUser(JSON.parse(savedUser));
        }
    } catch(e) {
        console.error("Could not parse user from localStorage", e);
    }
  }, []);

  // Save mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sb-data-mode', mode);
  }, [mode]);

  // Effect to load data based on the current mode
  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/brain-persist');
            if (!response.ok) {
                const errorBody = await response.text();
                console.error("Failed to fetch data from Firestore. Status:", response.status, "Body:", errorBody);
                throw new Error('Failed to fetch data from Firestore');
            }
            const firestoreData = await response.json();
            
            const isFirestoreEmpty = !firestoreData || Object.keys(firestoreData).length === 0 || Object.values(firestoreData).every(val => Array.isArray(val) && val.length === 0);

            if (isFirestoreEmpty) {
                 console.log("Firestore is empty, initializing with real seed data.");
                 // Usamos una copia profunda para evitar mutaciones no deseadas
                 const initialData = JSON.parse(JSON.stringify(realSantaData));
                 setData(initialData);
                 // Guardar los datos iniciales en Firestore
                 await forceSave(initialData);
            } else {
                 setData(firestoreData);
            }

        } catch (err: any) {
            console.error(`Failed to load or initialize data, showing error state:`, err);
            setData(null); // Establecer a null en caso de error
        } finally {
            setIsLoading(false);
        }
    };
    
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Function to force save the current state to the backend
  const forceSave = useCallback(async (dataToSave?: SantaData) => {
    const payload = dataToSave || data;
    if (!payload) {
      console.warn("Save requested, but no data is available.");
      return;
    }

    try {
      const response = await fetch('/api/brain-persist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'API save failed');
      }
      console.log("Data successfully saved to Firestore.");
    } catch (error) {
      console.error("Error saving data to Firestore:", error);
      throw error; // Re-throw to be caught by the caller
    }
  }, [data]);


  const login = useCallback(async (email: string, pass: string): Promise<boolean> => {
      setIsLoading(true);
      // Wait for data to be loaded before trying to find a user
      const userSource = data?.users || [];
      const user = userSource.find(u => u.email === email);
      
      if (user) {
          setCurrentUser(user);
          localStorage.setItem('sb-current-user', JSON.stringify(user));
          setIsLoading(false);
          return true;
      }
      setIsLoading(false);
      return false;
  }, [data]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('sb-current-user');
  }, []);

  const value = useMemo(() => ({ 
      mode, 
      setMode, 
      data, 
      setData,
      forceSave,
      currentUser,
      login,
      logout,
      isLoading,
  }), [mode, data, setData, forceSave, currentUser, login, logout, isLoading]);

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
