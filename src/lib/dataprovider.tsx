
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { User, SantaData } from '@/domain/ssot';
import { mockSantaData } from '@/domain/mock-data';
import { auth } from './firebase-config';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";

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
    if (!user) return {};
    const token = await user.getIdToken();
    return { 'Authorization': `Bearer ${token}` };
}

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<DataMode>('real');
  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data from API or fall back to mock
  useEffect(() => {
    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch('/api/brain-persist', { headers });

            if (!response.ok) {
                const errorBody = await response.text();
                console.warn(`API fetch failed (${response.status}): ${errorBody}. Falling back to mock data.`);
                setData(JSON.parse(JSON.stringify(mockSantaData)));
            } else {
                 try {
                    const apiData = await response.json();
                    setData(apiData);
                } catch (e) {
                    console.error("Failed to parse JSON from API, falling back to mock data.", e);
                    setData(JSON.parse(JSON.stringify(mockSantaData)));
                }
            }
        } catch (error) {
            console.error('Could not fetch initial data, falling back to mock data:', error);
            setData(JSON.parse(JSON.stringify(mockSantaData)));
        }
    };

    loadInitialData();
  }, []);

  // Listen to auth state changes
  useEffect(() => {
      if (!data) return; // Wait until data is loaded before processing auth state

      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
            // Find the app user that corresponds to the Firebase user
            const appUser = data.users.find(u => u.email?.toLowerCase() === firebaseUser.email?.toLowerCase());
            if (appUser) {
                setCurrentUser(appUser);
            } else {
                console.warn("Firebase user is authenticated, but not found in the app's user list.");
                setCurrentUser(null); // Or handle as an unprovisioned user
            }
        } else {
            setCurrentUser(null);
        }
        setIsLoading(false);
      });

      return () => unsubscribe();
  }, [data]); // Rerun when data is loaded

  const login = useCallback(async (email: string, pass: string): Promise<boolean> => {
      await signInWithEmailAndPassword(auth, email, pass);
      return true;
  }, []);

  const logout = useCallback(async () => {
      await signOut(auth);
      // The onAuthStateChanged listener will handle setting currentUser to null
  }, []);

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
            const errorBody = await response.json();
            throw new Error(errorBody.error || 'Failed to save data to server.');
        }
        console.log("Data successfully persisted via API.");
    } catch (error) {
        console.error("Error in forceSave:", error);
        throw error;
    }

  }, [data]);

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
