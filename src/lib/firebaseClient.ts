
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, initializeFirestore } from "firebase/firestore";
import { firebaseWebConfig } from "@/config/firebaseWebApp";

let app: FirebaseApp;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;

if (!getApps().length) {
    try {
        app = initializeApp(firebaseWebConfig);
        auth = getAuth(app);
        
        const firestore = initializeFirestore(app, {
            experimentalAutoDetectLongPolling: true,
        });
        db = firestore;

        if (process.env.NEXT_PUBLIC_USE_EMULATORS === '1') {
            console.log('[Firebase] Connecting to emulators...');
            connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
            connectFirestoreEmulator(db, '127.0.0.1', 8080);
            console.info('[Firebase] Connected to emulators');
        }

    } catch(e) {
        console.error("Failed to initialize Firebase", e);
    }
} else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
}

export const firebaseApp = app!;
export const firebaseAuth = auth!;
export const firestoreDb = db!;
