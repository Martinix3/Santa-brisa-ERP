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
import { realSantaData as mockData } from "@/domain/mock-data";
import { auth } from "./firebaseClient";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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
  signupWithEmail: (email: string, password: string) => Promise<FirebaseUser | null>;
  loginWithEmail: (email: string, password: string) => Promise<FirebaseUser | null>;
  isLoading: boolean;
  isPersistenceEnabled: boolean;
  togglePersistence: () => void;
  showNotification: (message: string, type?: 'success' | 'error') => void;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<DataMode>("real");
  const [data, setData] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersistenceEnabled, setIsPersistenceEnabled] = useState(false); // Default to off
  const [notification, setNotification] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ id: Date.now(), message, type });
  }, []);

  const togglePersistence = useCallback(() => {
    setIsPersistenceEnabled(prev => {
        const newState = !prev;
        showNotification(`La persistencia está ${newState ? 'ACTIVADA' : 'DESACTIVADA'}.`, 'success');
        return newState;
    });
  }, [showNotification]);

  const setCurrentUserById = useCallback((userId: string) => {
    if (data?.users) {
      const userToSet = data.users.find(u => u.id === userId);
      if (userToSet) {
        setCurrentUser(userToSet);
        showNotification(`Cambiado al usuario: ${userToSet.name}`, 'success');
      } else {
        showNotification(`Usuario con ID ${userId} no encontrado.`, 'error');
      }
    }
  }, [data?.users, showNotification]);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoading(true);
      setFirebaseUser(user);
      if (user) {
        // User signed in. Load mock data.
        setData(mockData);
        // Find matching app user or create one
        const appUser = mockData.users.find(u => u.email === user.email);
        if (appUser) {
          setCurrentUser(appUser);
        } else {
          // If user is not in mock data, use a default or create one dynamically
           const newUser: User = {
              id: user.uid,
              name: user.displayName || user.email || 'Nuevo Usuario',
              email: user.email!,
              role: 'comercial', 
              active: true,
          };
          setCurrentUser(newUser);
        }
      } else {
        // User is signed out
        setData(null);
        setCurrentUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during sign-in:", error);
      showNotification('Error al iniciar sesión con Google.', 'error');
    }
  }, [showNotification]);

  const signupWithEmail = useCallback(async (email: string, password: string): Promise<FirebaseUser | null> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      console.error("Error during sign-up:", error);
      showNotification(error.message, 'error');
      return null;
    }
  }, [showNotification]);

  const loginWithEmail = useCallback(async (email: string, password: string): Promise<FirebaseUser | null> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      console.error("Error during email sign-in:", error);
      showNotification(error.message, 'error');
      return null;
    }
  }, [showNotification]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign-out:", error);
      showNotification('Error al cerrar sesión.', 'error');
    }
  }, [showNotification]);

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
      signupWithEmail,
      loginWithEmail,
      isLoading,
      isPersistenceEnabled,
      togglePersistence,
      showNotification,
    }),
    [mode, data, setData, currentUser, setCurrentUserById, login, logout, signupWithEmail, loginWithEmail, isLoading, isPersistenceEnabled, togglePersistence, showNotification]
  );

  return (
    <DataContext.Provider value={value}>
      {children}
      {notification && (
        <NotificationToast
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onDismiss={() => setNotification(null)}
        />
      )}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

// Notification Toast Component
function NotificationToast({ message, type, onDismiss }: { message: string, type: 'success' | 'error', onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className={`fixed top-5 right-5 z-[100] px-4 py-3 rounded-lg shadow-lg text-white ${bgColor}`}>
      {message}
    </div>
  );
}
