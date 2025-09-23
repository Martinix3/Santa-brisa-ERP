
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseWebConfig } from "@/config/firebaseWebApp";

let app;

if (!getApps().length) {
    try {
        app = initializeApp(firebaseWebConfig);
    } catch(e) {
        console.error("Failed to initialize Firebase", e);
        // En caso de error, `app` seguirá indefinido
    }
} else {
    app = getApp();
}

// Exporta los servicios de Firebase solo si la app se inicializó correctamente
export const auth = app ? getAuth(app) : undefined;
export const db = app ? getFirestore(app) : undefined;
