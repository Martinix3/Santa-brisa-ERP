import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import firebaseConfig from '../../firebase.json';

// Usamos la configuración del cliente desde firebase.json
const clientConfig = firebaseConfig.client;

export const clientApp = getApps().length ? getApp() : initializeApp(clientConfig);

export const auth = getAuth(clientApp);

// Persistencia en navegador para mantener la sesión
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting persistence:", error);
});
