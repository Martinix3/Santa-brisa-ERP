
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { SantaData, User, UserRole } from '@/domain/ssot';
import { auth } from './firebaseClient';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';

interface DataContextType {
  data: SantaData | null;
  setData: React.Dispatch<React.SetStateAction<SantaData | null>>;
  currentUser: User | null;
  setCurrentUserById: (userId: string) => void;
  isLoading: boolean;
  isPersistenceEnabled: boolean;
  togglePersistence: () => void;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<User | null>;
  signupWithEmail: (email: string, pass: string) => Promise<User | null>;
  logout: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersistenceEnabled, setIsPersistenceEnabled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/data/db.json');
        const initialData = await response.json();
        setData(initialData);
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && data) {
        let user = data.users.find(u => u.email === firebaseUser.email);
        if (!user) {
          user = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Nuevo Usuario',
            email: firebaseUser.email!,
            role: 'comercial' as UserRole,
            active: true
          };
          setData(d => d ? { ...d, users: [...d.users, user!] } : null);
        }
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [data]);

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
      try {
          await signInWithEmailAndPassword(auth, email, pass);
          // onAuthStateChanged will set the user
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
          const newUser: User = {
            id: userCredential.user.uid,
            name: email.split('@')[0],
            email: email,
            role: 'comercial',
            active: true,
          };
          if(data) {
            setData({ ...data, users: [...data.users, newUser]});
          }
          return newUser;
      } catch (error) {
          console.error("Error signing up:", error);
          alert("Error al registrar la cuenta.");
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
  }

  const value = {
    data,
    setData,
    currentUser,
    setCurrentUserById,
    isLoading,
    isPersistenceEnabled,
    togglePersistence,
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
