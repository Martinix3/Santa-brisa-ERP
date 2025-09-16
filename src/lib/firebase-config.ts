
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "santa-brisa-erp",
  "appId": "1:526543168723:web:af0088ec4aa1cfd1c9e026",
  "storageBucket": "santa-brisa-erp.appspot.com",
  "apiKey": "AIzaSyAhk1AS8UBdfYqE3GYtR4YiQJw3BY2MWTw",
  "authDomain": "santa-brisa-erp.firebaseapp.com",
  "messagingSenderId": "526543168723"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
