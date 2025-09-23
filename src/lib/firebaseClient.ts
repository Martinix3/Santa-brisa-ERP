import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseWebConfig } from "@/config/firebaseWebApp";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseWebConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
