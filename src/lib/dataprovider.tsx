
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { SantaData, User, UserRole } from '@/domain/ssot';
import { auth, db } from './firebaseClient';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
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

  // Función para encontrar o crear un usuario en nuestro sistema
  const findOrCreateUser = useCallback(async (firebaseUser: import('firebase/auth').User, currentData: SantaData): Promise<{ user: User, needsUpdate: boolean }> => {
    let userInDb = currentData.users.find(u => u.email === firebaseUser.email);
    let needsUpdate = false;

    if (!userInDb) {
      console.log(`User with email ${firebaseUser.email} not found in our DB. Creating...`);
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
      try {
        const response = await fetch('/data/db.json');
        if (!response.ok) {
          throw new Error("Failed to fetch initial data");
        }
        const initialData = await response.json();
        setData(initialData);
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && data) {
        const { user, needsUpdate } = await findOrCreateUser(firebaseUser, data);
        
        setCurrentUser(user);
        
        if (needsUpdate) {
            const updatedUsers = [...data.users, user];
            setData(d => d ? { ...d, users: updatedUsers } : null);
            if (isPersistenceEnabled) {
                await saveCollection('users', updatedUsers);
            }
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
    } catch (error) {
      console.error("Error during Google sign-in:", error);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      return data?.users.find(u => u.email === email) || null;
    } catch (error) {
      console.error("Error signing in with email:", error);
      alert("Error al iniciar sesión. Verifica tus credenciales.");
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
            
            if (isPersistenceEnabled) {
                await saveCollection('users', updatedUsers);
            }
            
            return newUser;
        }
        return null;
    } catch (error: any) {
        console.error("Error signing up:", error);
        if (error.code === 'auth/email-already-in-use') {
            alert('Este email ya está registrado. Por favor, inicia sesión.');
        } else {
            alert("Error al registrar la cuenta.");
        }
        return null;
    }
};

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      router.push('/login');
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
    if (!db) {
      console.error("Firestore DB is not initialized.");
      return;
    }
    
    console.log(`Persisting ${dataToSave.length} items to '${collectionName}' collection...`);

    const batch = writeBatch(db);
    dataToSave.forEach(item => {
      const docRef = doc(db, collectionName as string, item.id);
      batch.set(docRef, item);
    });
    
    try {
      await batch.commit();
      console.log(`Successfully saved ${collectionName}`);
      setData(prevData => prevData ? { ...prevData, [collectionName]: dataToSave } : null);

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
