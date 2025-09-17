
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { User, SantaData } from '@/domain/ssot';

export type DataMode = 'test' | 'real';

interface DataContextProps {
  mode: DataMode; // 'test' mode will still use local mock data
  setMode: React.Dispatch<React.SetStateAction<DataMode>>;
  data: SantaData | null;
  setData: React.Dispatch<React.SetStateAction<SantaData | null>>;
  forceSave: () => Promise<void>;
  currentUser: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

let MockSantaData: SantaData | null = null; // Cache for mock data

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<DataMode>('real'); // Default to 'real' to use Firestore
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

    setIsLoading(false);
  }, []);

  // Save mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sb-data-mode', mode);
  }, [mode]);

  // Effect to load data based on the current mode (Firestore for 'real', local mock for 'test')
  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        try {
            if (mode === 'real') {
                // Fetch all data from Firestore via our API route
                const response = await fetch('/api/brain-persist');
                if (!response.ok) {
                    throw new Error('Failed to fetch data from Firestore');
                }
                const firestoreData = await response.json();
                setData(firestoreData);
            } else { // mode === 'test'
                if (MockSantaData) {
                    setData(MockSantaData);
                } else {
                    const module = await import('@/domain/mock-data');
                    MockSantaData = module.mockSantaData;
                    setData(MockSantaData);
                }
            }
        } catch (err) {
            console.error(`Failed to load data for mode "${mode}":`, err);
            // Fallback to mock data if real fails
            if (!MockSantaData) {
                 const module = await import('@/domain/mock-data');
                 MockSantaData = module.mockSantaData;
            }
            setData(MockSantaData);
        } finally {
            setIsLoading(false);
        }
    };
    
    loadData();
  }, [mode]);

  // Function to force save the current state to the backend (Firestore)
  const forceSave = useCallback(async () => {
    if (mode === 'real' && data) {
       try {
         const response = await fetch('/api/brain-persist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
         });
         if (!response.ok) {
             const err = await response.json();
             throw new Error(err.error || 'API save failed');
         }
         console.log("Data successfully saved to Firestore.");
       } catch (error) {
         console.error("Error saving data to Firestore:", error);
         // Optionally, show an error to the user
       }
    } else if (mode === 'test' && data) {
       // In 'test' mode, we just update the in-memory mock data cache
       MockSantaData = data;
       console.log("Mock data updated in memory (not persisted).");
    }
  }, [data, mode]);


  const login = useCallback(async (email: string, pass: string): Promise<boolean> => {
      // Data for the current mode should already be loading/loaded via useEffect
      const userSource = (data?.users) || [];
      const user = userSource.find(u => u.email === email);
      
      if (user) {
          setCurrentUser(user);
          localStorage.setItem('sb-current-user', JSON.stringify(user));
          return true;
      }
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
