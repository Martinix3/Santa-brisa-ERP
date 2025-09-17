
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";

// Your web app's Firebase configuration
// Esta configuración es pública y segura.
const firebaseConfig = {
  apiKey: "AIzaSyB05_nEgoaTf6ANOaRYILECtUfO4pBK9hQ",
  authDomain: "santa-brisa-erp.firebaseapp.com",
  projectId: "santa-brisa-erp",
  storageBucket: "santa-brisa-erp.appspot.com",
  messagingSenderId: "526543168723",
  appId: "1:526543168723:web:4f66130129aa0794c9e026"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Set persistence to 'local' to keep the user signed in across browser sessions.
// Esto es importante para que la redirección funcione correctamente.
setPersistence(auth, browserLocalPersistence);


export { app, auth };
