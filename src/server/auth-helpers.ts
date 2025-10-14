"use server";

import { cookies } from "next/headers";
import { adminAuth } from "@/server/firebase";

/**
 * Obtiene el usuario actual desde el token de Firebase Auth
 * Útil para server components que necesitan verificar autenticación
 */
export async function getCurrentUser(): Promise<{ uid: string; email?: string; role?: string } | null> {
  try {
    const cookieStore = await cookies();
    
    // Intenta obtener el token desde cookies (ajusta el nombre según tu implementación)
    const sessionCookie = cookieStore.get("session")?.value;
    
    if (!sessionCookie) {
      return null;
    }

    // Verifica el token con Firebase Admin
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role as string | undefined,
    };
  } catch (error) {
    console.error("[getCurrentUser] Error:", error);
    return null;
  }
}

/**
 * Verifica si el usuario actual es admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin" || user?.role === "owner";
}

/**
 * Obtiene el UID del usuario actual, o lanza error si no está autenticado
 */
export async function requireAuth(): Promise<string> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("No autenticado");
  }
  
  return user.uid;
}

/**
 * Alternativa simple: solo obtiene el usuario desde el token de autorización en headers
 * Útil si prefieres pasar el token en cada request
 */
export async function getUserFromAuthHeader(): Promise<{ uid: string; email?: string } | null> {
  try {
    const { headers } = await import("next/headers");
    const headersList = await headers();
    const authorization = headersList.get("authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return null;
    }

    const token = authorization.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    console.error("[getUserFromAuthHeader] Error:", error);
    return null;
  }
}
