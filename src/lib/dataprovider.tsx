
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
import { auth } from "./firebase-config";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";

export type DataMode = "test" | "real";

interface DataContextProps {
  mode: DataMode;
  setMode: React.Dispatch<React.SetStateAction<DataMode>>;
  data: SantaData | null;
  setData: React.Dispatch<React.SetStateAction<SantaData | null>>;
  currentUser: User | null;
  setCurrentUserById: (userId: string) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isPersistenceEnabled: boolean;
  togglePersistence: () => void;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};

  const token = await user.getIdToken(true);
  return { 'Authorization': `Bearer ${token}` };
}

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<DataMode>("real");
  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersistenceEnabled, setIsPersistenceEnabled] = useState(true);

  const togglePersistence = useCallback(() => {
    setIsPersistenceEnabled(prev => {
        alert(`La persistencia de datos ha sido ${!prev ? 'ACTIVADA' : 'DESACTIVADA'}.`);
        return !prev;
    });
  }, []);

  const setCurrentUserById = useCallback((userId: string) => {
    if (data?.users) {
        const userToSet = data.users.find(u => u.id === userId);
        if (userToSet) {
            setCurrentUser(userToSet);
            console.log(`Switched to user: ${userToSet.name}`);
        } else {
            console.warn(`User with ID ${userId} not found.`);
        }
    }
  }, [data?.users]);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoading(true);
      setFirebaseUser(user);
      if (!user) {
        // User is signed out
        setData(null);
        setCurrentUser(null);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch data when a user signs in
  useEffect(() => {
    const loadDataForUser = async () => {
      if (firebaseUser) {
        try {
          const headers = await getAuthHeaders();
          const response = await fetch("/api/brain-persist", { headers });

          let finalData: SantaData;
          if (!response.ok) {
            console.warn(`API fetch failed (${response.status}). Falling back to local data structure for new user.`);
            // For a new user, start with the base structure but empty collections
            finalData = { ...realSantaData, accounts: [], ordersSellOut: [], interactions: [] };
          } else {
            const apiData = await response.json();
            // Merge with local structure to ensure all collections are present
            finalData = { ...realSantaData, ...apiData };
            console.log("✅ Datos cargados desde la API para el usuario.");
          }
          setData(finalData);

          // Find the corresponding app user
          const appUser = finalData.users.find(u => u.email === firebaseUser.email);
          setCurrentUser(appUser || null);

        } catch (error) {
          console.error("Could not fetch initial data, falling back to local structure:", error);
          setData({ ...realSantaData, accounts: [], ordersSellOut: [], interactions: [] });
          setCurrentUser(null);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadDataForUser();
  }, [firebaseUser]);

  const login = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during sign-in:", error);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign-out:", error);
    }
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      data,
      setData,
      currentUser,
      setCurrentUserById,
      login,
      logout,
      isLoading,
      isPersistenceEnabled,
      togglePersistence,
    }),
    [mode, data, setData, currentUser, setCurrentUserById, login, logout, isLoading, isPersistenceEnabled, togglePersistence]
  );

  return (
    <DataContext.Provider value={value as any}>{children}</DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
