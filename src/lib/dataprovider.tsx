
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
  const [notification, setNotification] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null);


  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ id: Date.now(), message, type });
  }, []);

  const togglePersistence = useCallback(() => {
    setIsPersistenceEnabled(prev => {
        const newState = !prev;
        showNotification(`La persistencia de datos ha sido ${newState ? 'ACTIVADA' : 'DESACTIVADA'}.`, 'success');
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
            finalData = { ...realSantaData, accounts: [], ordersSellOut: [], interactions: [] };
          } else {
            const apiData = await response.json();
            finalData = { ...realSantaData, ...apiData };
            console.log("✅ Datos cargados desde la API para el usuario.");
          }
          
          let appUser = finalData.users.find(u => u.email === firebaseUser.email);

          // If user doesn't exist in our DB, create them
          if (!appUser) {
              console.log(`Usuario de Firebase '${firebaseUser.email}' no encontrado en la BD. Creando nuevo perfil...`);
              const newUser: User = {
                  id: firebaseUser.uid, // Use Firebase UID as the canonical ID
                  name: firebaseUser.displayName || firebaseUser.email || 'Nuevo Usuario',
                  email: firebaseUser.email!,
                  role: 'comercial', // Default role
                  active: true,
              };

              finalData.users = [...finalData.users, newUser];
              appUser = newUser;

              // Save the new user back to the database
              if (isPersistenceEnabled) {
                  try {
                       await fetch('/api/brain-persist', {
                          method: 'POST',
                          headers,
                          body: JSON.stringify({ 
                            data: { users: [newUser] }, 
                            persistenceEnabled: true,
                            strategy: 'merge'
                          }),
                      });
                      showNotification('Perfil de usuario creado con éxito.', 'success');
                  } catch (e) {
                      showNotification('Error al guardar el nuevo perfil de usuario.', 'error');
                      console.error("Error saving new user:", e);
                  }
              }
          }

          setData(finalData);
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
  }, [firebaseUser, isPersistenceEnabled, showNotification]);

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
