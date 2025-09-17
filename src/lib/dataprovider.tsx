

"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { User, SantaData } from '@/domain/ssot';
import { realSantaData } from '@/domain/real-data'; // Importar los datos reales
import { auth } from './firebase-config';
import { onAuthStateChanged, getIdToken } from 'firebase/auth';

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

  // Load user and mode from localStorage on initial mount
  useEffect(() => {
    const savedMode = localStorage.getItem('sb-data-mode') as DataMode;
    if (savedMode) setMode(savedMode);
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
            // User is signed in.
            // We still need to map the firebaseUser to our app's User model.
            // For now, let's use a temporary mapping or find from loaded data.
            const localUser = data?.users.find(u => u.email === firebaseUser.email);
            if (localUser) {
                setCurrentUser(localUser);
                localStorage.setItem('sb-current-user', JSON.stringify(localUser));
            }
        } else {
            // User is signed out.
            setCurrentUser(null);
            localStorage.removeItem('sb-current-user');
        }
        // Moved data loading to a separate effect that depends on currentUser
    });

    return () => unsubscribe();
  }, [data?.users]);


  // Save mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sb-data-mode', mode);
  }, [mode]);

  // Function to force save the current state to the backend
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
      throw error; // Re-throw to be caught by the caller
    }
  }, [data]);

  // Effect to load data once we have a user
  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        if (!currentUser) {
            // If there's no user, we don't attempt to load data that requires auth.
            // The login flow will trigger a re-render and this effect will re-run.
            setIsLoading(false);
            return;
        }

        try {
            const headers = await getAuthHeaders();
            const response = await fetch('/api/brain-persist', { headers });
            
            if (response.status === 401) {
                 console.error("Not authenticated to fetch data.");
                 logout(); // Log out the user if token is invalid
                 throw new Error("Authentication failed");
            }
            if (!response.ok) {
                 const errorBody = await response.json();
                 console.error("Failed to fetch data from Firestore. Status:", response.status, "Body:", errorBody);
                 throw new Error(errorBody.error || 'Failed to fetch data from Firestore');
            }
            const firestoreData = await response.json();
            
            const isFirestoreEmpty = !firestoreData || Object.keys(firestoreData).length === 0 || Object.values(firestoreData).every(val => Array.isArray(val) && val.length === 0);

            if (isFirestoreEmpty) {
                 console.log("Firestore is empty, initializing with real seed data.");
                 const initialData = JSON.parse(JSON.stringify(realSantaData));
                 setData(initialData);
                 await forceSave(initialData);
            } else {
                 setData(firestoreData);
            }

        } catch (err: any) {
            console.error(`Failed to load or initialize data, showing error state:`, err);
            setData(null);
        } finally {
            setIsLoading(false);
        }
    };
    
    loadData();
  }, [currentUser, mode, forceSave]); // Depends on currentUser now


  const login = useCallback(async (email: string, pass: string): Promise<boolean> => {
      setIsLoading(true);
      // In a real app, this would use signInWithEmailAndPassword from firebase/auth
      // For this mock, we just check against the loaded user data.
      if (!data) {
          console.error("Login attempt before data is loaded.");
          setIsLoading(false);
          return false;
      }
      const user = data.users.find(u => u.email === email);
      
      if (user) {
          // This is where you would call Firebase's signInWith...
          // For now, we simulate success and let onAuthStateChanged handle the rest.
          setCurrentUser(user);
          localStorage.setItem('sb-current-user', JSON.stringify(user));
          setIsLoading(false);
          return true;
      }
      setIsLoading(false);
      return false;
  }, [data]);

  const logout = useCallback(() => {
    auth.signOut(); // This will trigger onAuthStateChanged
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
