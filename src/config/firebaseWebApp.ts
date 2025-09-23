// Lee el JSON de config web desde variables de entorno (App Hosting te la inyecta)
const raw = process.env.NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG
  ?? process.env.FIREBASE_WEBAPP_CONFIG
  ?? "{}";

export const firebaseWebConfig = JSON.parse(raw) as {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  appId: string;
  messagingSenderId?: string;
  databaseURL?: string;
};
