
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { SantaData, User, UserRole } from '@/domain/ssot';
import { auth, db } from './firebaseClient';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, getIdToken } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface DataContextType {
  data: SantaData | null;
  setData: React.Dispatch<React.SetStateAction<SantaData | null>>;
  currentUser: User | null;
  setCurrentUserById: (userId: string) => void;
  isLoading: boolean;
  isPersistenceEnabled: boolean;
  togglePersistence: () => void;
  saveCollection: (collectionName: keyof SantaData, data: any[]) => Promise<void>;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<User | null>;
  signupWithEmail: (email: string, pass: string) => Promise<User | null>;
  logout: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const emailToName = (email: string) => email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersistenceEnabled, setIsPersistenceEnabled] = useState(true);
  const router = useRouter();

  const findOrCreateUser = useCallback(async (firebaseUser: import('firebase/auth').User, currentData: SantaData): Promise<{ user: User, needsUpdate: boolean }> => {
    let userInDb = currentData.users.find(u => u.email === firebaseUser.email);
    let needsUpdate = false;

    if (!userInDb) {
      console.log(`User with email ${firebaseUser.email} not found in DB. Creating...`);
      userInDb = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || emailToName(firebaseUser.email!),
        email: firebaseUser.email!,
        role: 'comercial',
        active: true,
      };
      needsUpdate = true;
    }
    
    return { user: userInDb, needsUpdate };
  }, []);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      let initialData: SantaData | null = null;

      try {
        if (isPersistenceEnabled && db) {
            console.log("Attempting to load data from Firestore...");
            const collections = ['users', 'accounts', 'products', 'interactions', 'ordersSellOut', 'distributors', 'materials', 'billOfMaterials', 'lots', 'inventory', 'stockMoves', 'productionOrders', 'qaChecks', 'mktEvents', 'onlineCampaigns', 'creators', 'influencerCollabs', 'shipments', 'suppliers', 'goodsReceipts', 'traceEvents'];
            const allData: Partial<SantaData> = {};
            
            for (const collectionName of collections) {
                const querySnapshot = await getDocs(collection(db, collectionName));
                (allData as any)[collectionName] = querySnapshot.docs.map(doc => doc.data());
            }
            
            if (Object.values(allData).every(arr => arr.length === 0)) {
                throw new Error("Firestore is empty, falling back to local JSON.");
            }
            
            initialData = allData as SantaData;
            console.log("Data loaded from Firestore.");
        } else {
            console.log("Loading data from local db.json");
            const response = await fetch('/data/db.json');
            initialData = await response.json();
        }
      } catch (error: any) {
          console.warn("Failed to load initial data source, trying fallback:", error.message);
          try {
            const response = await fetch('/data/db.json');
            initialData = await response.json();
          } catch (fallbackError) {
             console.error("Failed to load fallback data:", fallbackError);
          }
      }
      
      if (initialData) {
        setData(initialData);
      }
    }
    loadData();
  }, [isPersistenceEnabled]);

  useEffect(() => {
    if (!data) return; 

    if (!isPersistenceEnabled) {
        const adminUser = data.users.find(u => u.role === 'admin' || u.role === 'owner');
        setCurrentUser(adminUser || data.users[0] || null);
        setIsLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const { user, needsUpdate } = await findOrCreateUser(firebaseUser, data);
        setCurrentUser(user);
        
        if (needsUpdate) {
            const updatedUsers = [...data.users, user];
            setData(d => d ? { ...d, users: updatedUsers } : null);
            await saveCollection('users', updatedUsers);
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [data, findOrCreateUser, isPersistenceEnabled]);
  
  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle the rest
    } catch (error) {
      console.error("Error during Google sign-in:", error);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
      if (!isPersistenceEnabled) {
          const user = data?.users.find(u => u.email === email);
          if (user) {
              setCurrentUser(user);
              return user;
          }
          return null;
      }
      try {
        await signInWithEmailAndPassword(auth, email, pass);
        return data?.users.find(u => u.email === email) || null;
      } catch (error) {
        console.error("Error signing in with email:", error);
        return null;
      }
  };

  const signupWithEmail = async (email: string, pass: string) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        if (data) {
            const newUser: User = {
                id: userCredential.user.uid,
                name: emailToName(email),
                email: email,
                role: 'comercial',
                active: true,
            };
            const updatedUsers = [...data.users, newUser];
            setData({ ...data, users: updatedUsers });
            await saveCollection('users', updatedUsers);
            return newUser;
        }
        return null;
    } catch (error: any) {
        console.error("Error signing up:", error);
        return null;
    }
};

  const logout = async () => {
    if (!isPersistenceEnabled) {
        setCurrentUser(null);
        return;
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const setCurrentUserById = (userId: string) => {
    if (data) {
      const userToSet = data.users.find(u => u.id === userId);
      if (userToSet) {
        setCurrentUser(userToSet);
      }
    }
  };

  const togglePersistence = () => {
    setIsPersistenceEnabled(prev => !prev);
  };
  
  const saveCollection = useCallback(async (collectionName: keyof SantaData, dataToSave: any[]) => {
    if (!isPersistenceEnabled) {
        console.log(`[Offline Mode] Not saving collection: ${collectionName}`);
        return;
    }
    
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated.");
        const token = await getIdToken(user);
        
        await fetch('/api/brain-persist', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                data: { [collectionName]: dataToSave }, 
                strategy: 'overwrite' 
            }),
        });
        console.log(`Successfully persisted ${collectionName}`);
    } catch (error) {
        console.error(`Error saving collection ${collectionName}:`, error);
        throw error;
    }
  }, [isPersistenceEnabled]);

  const value = {
    data,
    setData,
    currentUser,
    setCurrentUserById,
    isLoading,
    isPersistenceEnabled,
    togglePersistence,
    saveCollection,
    login,
    loginWithEmail,
    signupWithEmail,
    logout
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
