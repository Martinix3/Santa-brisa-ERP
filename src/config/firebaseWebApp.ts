// src/config/firebaseWebApp.ts
type WebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const env = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

export function getFirebaseWebConfig(): WebConfig {
  const missing = Object.entries(env)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (typeof window !== "undefined" && missing.length) {
    throw new Error(
      `Missing Firebase envs: ${missing.join(", ")}. Define them in .env.local`
    );
  }

  return env as WebConfig;
}
