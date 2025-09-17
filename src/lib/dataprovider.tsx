
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { User, SantaData } from '@/domain/ssot';
import { mockSantaData } from '@/domain/mock-data';

export type DataMode = 'test' | 'real';

interface DataContextProps {
  mode: DataMode;
  setMode: React.Dispatch<React.SetStateAction<DataMode>>;
  data: SantaData | null;
  setData: React.Dispatch<React.SetStateAction<SantaData | null>>;
  forceSave: (dataToSave?: SantaData) => Promise<void>;
  currentUser: User | null;
  login: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

async function getAuthHeaders(): Promise<Record<string, string>> {
    // Auth is disabled, no headers needed.
    return {};
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
            // Since auth is disabled, we'll fetch data without auth headers.
            // This might fail if the API requires auth, but it will fallback to mocks.
            const response = await fetch('/api/brain-persist');

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
  
   // Mock user login
  useEffect(() => {
      if (!data) return; // Wait until app data is loaded

      const adminUser = data.users.find(u => u.email === 'admin@santabrisa.com');
      if (adminUser) {
          setCurrentUser(adminUser);
      } else {
          // Fallback to the first user if admin is not found
          setCurrentUser(data.users[0] || null);
      }
      setIsLoading(false);

  }, [data]);

  const login = useCallback(async () => {
      console.warn("Login functionality is disabled.");
  }, []);

  const logout = useCallback(async () => {
      console.warn("Logout functionality is disabled.");
  }, []);

  const forceSave = useCallback(async (dataToSave?: SantaData) => {
    const payload = dataToSave || data;
    if (!payload) {
      console.warn("Save requested, but no data is available.");
      return;
    }
    
    try {
        const headers = await getAuthHeaders(); // Will be empty
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
