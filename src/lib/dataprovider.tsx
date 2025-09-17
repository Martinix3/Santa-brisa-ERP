
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { User, SantaData } from '@/domain/ssot';
import { realSantaData } from '@/domain/real-data'; // Importar los datos reales
import { auth } from './firebase-config';
import { onAuthStateChanged, getIdToken, signOut, signInWithEmailAndPassword } from 'firebase/auth';

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

async function getAuthHeaders(): Promise<Record<string, string>> {
    const user = auth.currentUser;
    if (user) {
        const token = await getIdToken(user);
        return { Authorization: `Bearer ${token}` };
    }
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
        try {
            const headers = await getAuthHeaders();
            const response = await fetch('/api/brain-persist', { headers });

            let firestoreData: SantaData | null = null;
            if (response.ok) {
                 try {
                    firestoreData = await response.json();
                 } catch (e) {
                    console.warn("Response from /api/brain-persist was not valid JSON. This might happen on the first run. Proceeding with seed data.");
                    firestoreData = null;
                 }
                 const isFirestoreEmpty = !firestoreData || Object.keys(firestoreData).length === 0 || Object.values(firestoreData).every(val => Array.isArray(val) && val.length === 0);

                 if (isFirestoreEmpty) {
                    console.log("Firestore is empty, initializing with real seed data.");
                    const initialData = JSON.parse(JSON.stringify(realSantaData));
                    setData(initialData);
                 } else {
                    setData(firestoreData);
                 }
            } else {
                 console.warn("Could not fetch initial data, might be because user is not logged in yet. This is expected.");
                 setData(JSON.parse(JSON.stringify(realSantaData)));
            }

        } catch (e) {
            console.error("Failed to load initial data. Using fallback.", e);
            setData(JSON.parse(JSON.stringify(realSantaData)));
        }
    };
    loadInitialData();
  }, []);


  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!data) {
          // Si los datos de la app no se han cargado, no podemos saber si el usuario de firebase es válido
          // onAuthStateChanged se volverá a disparar cuando data cambie.
          return;
        }

        setIsLoading(true);
        if (firebaseUser) {
            const localUser = data.users.find(u => u.email === firebaseUser.email);
            if (localUser) {
                setCurrentUser(localUser);
                localStorage.setItem('sb-current-user', JSON.stringify(localUser));
                 if (data.accounts.length > 0 && !data.accounts.some(a => a.id.startsWith('acc_'))) {
                    console.log("Saving initial seed data to Firestore for the first time.");
                    await forceSave(data);
                 }
            } else {
                console.warn("Firebase user is authenticated, but not found in the app's user list.");
                await signOut(auth); 
                setCurrentUser(null);
            }
        } else {
            setCurrentUser(null);
            localStorage.removeItem('sb-current-user');
        }
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [data]);


  const forceSave = useCallback(async (dataToSave?: SantaData) => {
    const payload = dataToSave || data;
    if (!payload) {
      console.warn("Save requested, but no data is available.");
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/brain-persist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'API save failed');
      }
      console.log("Data successfully saved to Firestore.");
    } catch (error) {
      console.error("Error saving data to Firestore:", error);
      throw error;
    }
  }, [data]);

  const login = async (email: string, pass: string): Promise<boolean> => {
      try {
        await signInWithEmailAndPassword(auth, email, pass);
        // onAuthStateChanged se encargará del resto
        return true;
      } catch (error) {
        console.error("Login failed:", error);
        return false;
      }
  };

  const logout = useCallback(() => {
    signOut(auth);
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
