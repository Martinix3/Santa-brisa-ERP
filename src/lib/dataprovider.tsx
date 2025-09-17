
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { User, SantaData } from '@/domain/ssot';

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

let MockSantaData: SantaData | null = null; // Cache for mock data

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
            // Always try to load from Firestore first in 'real' mode
            const response = await fetch('/api/brain-persist');
            if (!response.ok) {
                throw new Error('Failed to fetch data from Firestore');
            }
            const firestoreData = await response.json();
            setData(firestoreData);
        } catch (err) {
            console.error(`Failed to load data from Firestore, falling back to mock data:`, err);
            if (MockSantaData) {
                setData(MockSantaData);
            } else {
                import('@/domain/mock-data').then(loadedModule => {
                    MockSantaData = loadedModule.mockSantaData;
                    setData(MockSantaData);
                });
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    loadData();
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
