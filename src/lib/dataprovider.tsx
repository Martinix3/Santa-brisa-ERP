
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { User, SantaData } from '@/domain/ssot';

export type DataMode = 'test' | 'real';

let RealSantaData: SantaData | null = null;
let MockSantaData: SantaData | null = null;

interface DataContextProps {
  mode: DataMode;
  setMode: React.Dispatch<React.SetStateAction<DataMode>>;
  data: SantaData | null;
  setData: (data: SantaData) => void;
  currentUser: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<DataMode>('test');
  const [data, setDataState] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // For initial user/mode load
  const [isDataLoading, setIsDataLoading] = useState(true); // For async data fetching

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

  useEffect(() => {
    localStorage.setItem('sb-data-mode', mode);
    setIsDataLoading(true);

    const loadData = async () => {
        try {
            if (mode === 'test') {
                if (MockSantaData) {
                    setDataState(MockSantaData);
                } else {
                    const module = await import('@/domain/mock-data');
                    MockSantaData = module.mockSantaData;
                    setDataState(MockSantaData);
                }
            } else { // mode === 'real'
                if (RealSantaData) {
                    setDataState(RealSantaData);
                } else {
                    const module = await import('@/domain/real-data');
                    RealSantaData = module.realSantaData;
                    setDataState(RealSantaData);
                }
            }
        } catch (err) {
            console.error(`Failed to load data for mode "${mode}":`, err);
            // Fallback to mock data if real fails
            if (!MockSantaData) {
                 const module = await import('@/domain/mock-data');
                 MockSantaData = module.mockSantaData;
            }
            setDataState(MockSantaData);
        } finally {
            setIsDataLoading(false);
        }
    };
    
    loadData();

  }, [mode]);
  
  useEffect(() => {
    if (mode === 'real' && data) {
       localStorage.setItem('sb-real-data', JSON.stringify(data));
    }
  }, [data, mode]);

  const setData = useCallback((newData: SantaData) => {
    if (mode === 'real') {
      RealSantaData = newData;
    } else {
      MockSantaData = newData;
    }
    setDataState(newData);
  }, [mode]);

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
      currentUser,
      login,
      logout,
      isLoading: isLoading || isDataLoading
  }), [mode, data, setData, currentUser, login, logout, isLoading, isDataLoading]);

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
