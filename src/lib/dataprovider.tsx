
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { SantaData, User, UserRole } from "@/domain/ssot";
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, getIdToken } from "firebase/auth";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { MemoryAdapter } from "@/domain/ssot.helpers";

// --------- Tipos ----------
type LoadReport = {
  ok: Array<keyof SantaData>;
  errors: Array<{ name: keyof SantaData; error: string }>;
  totalDocs: number;
};

type ServerErrorState = {
    show: boolean;
    onRetry: () => void;
}

type DataContextType = {
  data: SantaData | null;
  setData: React.Dispatch<React.SetStateAction<SantaData | null>>;
  currentUser: User | null;
  authReady: boolean;
  saveCollection: (name: keyof SantaData, rows: any[]) => Promise<void>;
  saveAllCollections: (collections: Partial<SantaData>) => Promise<void>;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<User | null>;
  signupWithEmail: (email: string, pass: string) => Promise<User | null>;
  logout: () => Promise<void>;
  setCurrentUserById: (userId: string) => void;
  isPersistenceEnabled: boolean; // Keep for UI controls
  togglePersistence: () => void; // Keep for UI controls
};

const DataContext = createContext<DataContextType | undefined>(undefined);

const emailToName = (email: string) =>
  email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

// --------- Provider ----------
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<import("firebase/auth").User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);
  const [isPersistenceEnabled, setIsPersistenceEnabled] = useState(false);
  const router = useRouter();

  // Load local data on initial mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const r = await fetch("/data/db.json", { cache: "no-store" });
        if (!r.ok) throw new Error("db.json not found");
        const localData = await r.json() as SantaData;
        setData(localData);
      } catch (e) {
        console.error("Failed to load local data:", e);
        // Handle case where local data fails to load.
      }
    }
    loadInitialData();
  }, []);

  // Handle auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
        setFirebaseUser(fbUser);
        setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Sync currentUser with firebaseUser and local data
  useEffect(() => {
    if (!data || !authReady) return;

    let userToSet: User | null = null;
    if (firebaseUser && data.users) {
      const foundUser = data.users.find(u => u.email === firebaseUser.email);
      if (foundUser) {
        userToSet = { ...foundUser, role: (foundUser.role?.toLowerCase() || 'comercial') as UserRole };
      }
    }
    setCurrentUser(userToSet);

  }, [data, firebaseUser, authReady]);

  const togglePersistence = useCallback(() => {
    setIsPersistenceEnabled(prev => !prev);
  }, []);
  
  const setCurrentUserById = useCallback((userId: string) => {
    if (data?.users) {
        const user = data.users.find(u => u.id === userId);
        if (user) {
            setCurrentUser({ ...user, role: (user.role?.toLowerCase() || 'comercial') as UserRole });
        }
    }
  }, [data?.users]);

  const saveAllCollections = useCallback(async (collectionsToSave: Partial<SantaData>) => {
        // This is a mock save. In a real app, this would hit an API.
        if (isPersistenceEnabled) {
            console.log("Saving to backend:", collectionsToSave);
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));
        } else {
             console.log("Persistence is disabled. Not saving.");
        }
    }, [isPersistenceEnabled]
  );
  
  const saveCollection = useCallback(
    async (name: keyof SantaData, rows: any[]) => {
        setData(prevData => prevData ? { ...prevData, [name]: rows } : null);
        if (isPersistenceEnabled) {
             await saveAllCollections({ [name]: rows });
        }
    }, [isPersistenceEnabled, saveAllCollections]
  );

  const login = useCallback(async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch(e) {
      console.error("Google sign in failed", e);
      throw e;
    }
  }, []);

  const loginWithEmail = useCallback(
    async (email: string, pass: string): Promise<User | null> => {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const fbUser = userCredential.user;
      if (!fbUser || !data?.users) return null;
      
      const appUser = data.users.find((u) => u.email === fbUser.email);
      if (appUser) {
          const normalizedUser = { ...appUser, role: (appUser.role?.toLowerCase() || 'comercial') as UserRole };
          setCurrentUser(normalizedUser);
          return normalizedUser;
      }
      return null;
    },
    [data?.users]
  );

  const signupWithEmail = useCallback(
    async (email: string, pass: string): Promise<User | null> => {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
       const fbUser = userCredential.user;
      if (!fbUser || !data?.users) return null;
      const newUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || emailToName(email),
        email: email,
        role: "comercial",
        active: true,
      };
      setData(d => d ? ({ ...d, users: [...d.users, newUser] }) : null);
      setCurrentUser(newUser);
      return newUser;
    },
    [data?.users]
  );

  const logout = useCallback(async () => {
    await signOut(auth);
    setCurrentUser(null);
    router.push("/login");
  }, [router]);

  const value = useMemo<DataContextType>(
    () => ({
      data,
      setData,
      currentUser,
      authReady,
      saveCollection,
      saveAllCollections,
      login,
      loginWithEmail,
      signupWithEmail,
      logout,
      togglePersistence,
      isPersistenceEnabled,
      setCurrentUserById,
    }),
    [data, currentUser, authReady, saveCollection, saveAllCollections, login, loginWithEmail, signupWithEmail, logout, togglePersistence, isPersistenceEnabled, setCurrentUserById]
  );

  return (
    <DataContext.Provider value={value}>
        {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
