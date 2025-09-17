
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
  forceSave: (dataToSave?: SantaData) => Promise<void>;
  currentUser: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!auth.currentUser) return {};

  const token = await auth.currentUser.getIdToken(true);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<DataMode>("real");
  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const findAndSetUser = useCallback((firebaseUser: FirebaseUser, usersList: User[]) => {
      let user = usersList.find(u => u.email === firebaseUser.email);
      if (!user && firebaseUser.email === 'mj@santabrisa.co') {
          user = usersList.find(u => u.id === 'u_martin');
      }
      if (!user) {
          user = usersList.find(u => u.email === 'admin@santabrisa.com') || null;
      }
      if (user) {
          setCurrentUser(user);
      } else {
        // Fallback for any other logged-in user
        setCurrentUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Usuario',
            email: firebaseUser.email || undefined,
            role: 'comercial',
            active: true
        });
      }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && data?.users) {
        console.log("✅ Usuario autenticado:", firebaseUser.email);
        findAndSetUser(firebaseUser, data.users);
      } else if (!firebaseUser) {
        console.log("⚠️ No hay usuario autenticado");
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, [data?.users, findAndSetUser]);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const headers = await getAuthHeaders();
        const response = await fetch("/api/brain-persist", { headers });

        if (!response.ok) {
          const errorBody = await response.text();
          console.warn(
            `API fetch failed (${response.status}): ${errorBody}. Falling back to mock data.`
          );
          setData(JSON.parse(JSON.stringify(realSantaData)));
        } else {
          try {
            const apiData = await response.json();
            if (Object.keys(apiData).length === 0 || !apiData.users || apiData.users.length === 0) {
                 console.warn("API returned empty data, falling back to mock data.");
                 setData(JSON.parse(JSON.stringify(realSantaData)));
            } else {
                setData(apiData);
            }
          } catch (e) {
            console.error(
              "Failed to parse JSON from API, falling back to mock data.",
              e
            );
            setData(JSON.parse(JSON.stringify(realSantaData)));
          }
        }
      } catch (error) {
        console.error(
          "Could not fetch initial data, falling back to mock data:",
          error
        );
        setData(JSON.parse(JSON.stringify(realSantaData)));
      } finally {
        setIsLoading(false);
      }
    };

    if (auth.currentUser) {
        loadInitialData();
    } else {
        setData(JSON.parse(JSON.stringify(realSantaData)));
        setIsLoading(false);
    }
  }, []);

  const login = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const forceSave = useCallback(
    async (dataToSave?: SantaData) => {
      const payload = dataToSave || data;
      if (!payload) {
        console.warn("Save requested, but no data is available.");
        return;
      }
      if (!auth.currentUser) {
        alert("Debes iniciar sesión para guardar los datos.");
        throw new Error("User not authenticated");
      }

      try {
        const headers = await getAuthHeaders();
        const response = await fetch("/api/brain-persist", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(errorBody.error || "Failed to save data to server.");
        }
        console.log("Data successfully persisted via API.");
      } catch (error) {
        console.error("Error in forceSave:", error);
        throw error;
      }
    },
    [data]
  );

  const value = useMemo(
    () => ({
      mode,
      setMode,
      data,
      setData,
      forceSave,
      currentUser,
      login,
      logout,
      isLoading,
    }),
    [mode, data, setData, forceSave, currentUser, login, logout, isLoading]
  );

  return (
    <DataContext.Provider value={value}>{children}</DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
