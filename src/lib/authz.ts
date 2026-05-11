/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/lib/authz.ts
export type UserRole = "comercial" | "admin" | "ops" | "owner";
export const ROLES = { COMERCIAL:"comercial", ADMIN:"admin" } as const;
export const SANTA_BRISA_DISTRIB_ID = "party_santa_brisa";

export const isSales = (r?:string) => r===ROLES.COMERCIAL;
export const isAdmin = (r?:string) => r===ROLES.ADMIN;

export const canPlaceOrder = (r?:string) => isSales(r) || isAdmin(r);
