"use server";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { adminDb as db } from "@/server/firebase";
import { DEFAULT_BUSINESS_RULES, type SystemConfig } from "@/domain/ssot";

const SYSTEM_CONFIG_ID = "default";

/**
 * Obtiene la configuración del sistema desde Firestore
 * Si no existe, devuelve los valores por defecto
 */
export async function getSystemConfig(): Promise<SystemConfig["businessRules"]> {
  try {
    const docRef = db.collection("systemConfig").doc(SYSTEM_CONFIG_ID);
    const doc = await docRef.get();

    if (!doc.exists) {
      // Devolver valores por defecto si no existe configuración
      return DEFAULT_BUSINESS_RULES;
    }

    const config = doc.data() as SystemConfig;
    return config.businessRules || DEFAULT_BUSINESS_RULES;
  } catch (error) {
    console.error("[getSystemConfig] Error:", error);
    return DEFAULT_BUSINESS_RULES;
  }
}

/**
 * Actualiza la configuración del sistema
 */
export async function updateSystemConfig(
  businessRules: Partial<SystemConfig["businessRules"]>,
  updatedBy: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const docRef = db.collection("systemConfig").doc(SYSTEM_CONFIG_ID);
    const now = new Date().toISOString();

    await docRef.set(
      {
        id: SYSTEM_CONFIG_ID,
        version: "1.0.0",
        updatedAt: now,
        updatedBy,
        businessRules,
      },
      { merge: true }
    );

    return { ok: true };
  } catch (error: any) {
    console.error("[updateSystemConfig] Error:", error);
    return { ok: false, error: error.message || "Error actualizando configuración" };
  }
}

/**
 * Resetea la configuración a valores por defecto
 */
export async function resetSystemConfig(
  updatedBy: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await updateSystemConfig(DEFAULT_BUSINESS_RULES, updatedBy);
    return { ok: true };
  } catch (error: any) {
    console.error("[resetSystemConfig] Error:", error);
    return { ok: false, error: error.message || "Error reseteando configuración" };
  }
}
