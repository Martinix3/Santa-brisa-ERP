// src/hooks/useSystemConfig.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseSync } from '@/lib/firebaseClient';
import type { SystemConfig, Department, OrderStatus, ShipmentStatus, PartyRoleType, ItemCategory, AccountType } from '@/domain/ssot.v7';

/**
 * Hook para acceder a la configuración global del sistema.
 * La configuración se almacena en Firestore en la colección 'systemConfig'.
 * Si no existe, devuelve valores por defecto basados en los valores hardcodeados actuales.
 */
export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { firestoreDb } = getFirebaseSync();
      const docRef = doc(firestoreDb, 'systemConfig', 'default');
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        setConfig(snap.data() as SystemConfig);
      } else {
        // Si no existe, usar valores por defecto
        const defaultConfig = getDefaultConfig();
        setConfig(defaultConfig);
      }
    } catch (err) {
      console.error('Error loading system config:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      // Fallback a valores por defecto en caso de error
      setConfig(getDefaultConfig());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const updateConfig = useCallback(async (updates: Partial<SystemConfig>) => {
    try {
      if (!config) return;
      
      const updatedConfig: SystemConfig = {
        ...config,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      const { firestoreDb } = getFirebaseSync();
      const docRef = doc(firestoreDb, 'systemConfig', 'default');
      await setDoc(docRef, updatedConfig);
      
      setConfig(updatedConfig);
      return { success: true };
    } catch (err) {
      console.error('Error updating system config:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
  }, [config]);

  return { 
    config, 
    loading, 
    error, 
    reload: loadConfig,
    updateConfig 
  };
}

/**
 * Valores por defecto basados en los valores hardcodeados actuales.
 * Estos se usan cuando no existe el documento en Firestore.
 */
function getDefaultConfig(): SystemConfig {
  return {
    id: 'default',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
    
    theme: {
      brand: {
        sun: '#fff5a9',
        sunStrong: '#fecb46',
        agua: '#99d9d9',
        cobre: '#c56a3c',
        naranja: '#ed6a36',
        verdeMar: '#5a9496',
        neutral50: '#FAFAFA',
        neutral900: '#111111',
      },
      state: {
        success: '#22c55e',
        warning: '#fecb46',
        danger: '#ef4444',
        info: '#3b82f6',
      },
      accent: {
        pink: '#f472b6',
        hotpink: '#ec4899',
        indigo: '#6366f1',
        purple: '#8b5cf6',
        gray: '#9ca3af',
      },
      departments: {
        VENTAS: { color: '#ea945e', textColor: '#ffffff' },
        MARKETING: { color: '#9dd4d6', textColor: '#2F5D5D' },
        PRODUCCION: { color: '#638c8d', textColor: '#ffffff' },
        CALIDAD: { color: '#829fce', textColor: '#ffffff' },
        ALMACEN: { color: '#996947', textColor: '#ffffff' },
        FINANZAS: { color: '#fecb46', textColor: '#412c00' },
        PERSONAL: { color: 'hsl(var(--sb-accent-personal))', textColor: 'hsl(var(--sb-neutral-900))' },
        OPS: { color: '#6366f1', textColor: '#ffffff' },
      } as Record<Department, { color: string; textColor: string }>,
    },
    
    metadata: {
      departments: {
        VENTAS: { label: 'Ventas' },
        MARKETING: { label: 'Marketing' },
        PRODUCCION: { label: 'Producción' },
        CALIDAD: { label: 'Calidad' },
        ALMACEN: { label: 'Almacén' },
        FINANZAS: { label: 'Finanzas' },
        PERSONAL: { label: 'Personal' },
        OPS: { label: 'Operaciones' },
      } as Record<Department, { label: string }>,
      
      orderStatuses: {
        open: { label: 'Abierto' },
        confirmed: { label: 'Confirmado' },
        shipped: { label: 'Enviado' },
        invoiced: { label: 'Facturado' },
        paid: { label: 'Pagado' },
        cancelled: { label: 'Cancelado' },
        lost: { label: 'Perdido' },
      } as Record<OrderStatus, { label: string }>,
      
      shipmentStatuses: {
        pending: { label: 'Pendiente' },
        picking: { label: 'Picking' },
        ready_to_ship: { label: 'Validado' },
        shipped: { label: 'Enviado' },
        delivered: { label: 'Entregado' },
        cancelled: { label: 'Cancelado' },
        exception: { label: 'Incidencia' },
      } as Record<ShipmentStatus, { label: string }>,
      
      partyRoles: {
        CUSTOMER: { label: 'Cliente' },
        SUPPLIER: { label: 'Proveedor' },
        DISTRIBUTOR: { label: 'Distribuidor' },
        IMPORTER: { label: 'Importador' },
        INFLUENCER: { label: 'Influencer' },
        CREATOR: { label: 'Creator' },
        EMPLOYEE: { label: 'Empleado' },
        BRAND_AMBASSADOR: { label: 'Brand Ambassador' },
        OTHER: { label: 'Otro' },
      } as Record<PartyRoleType, { label: string }>,
      
      lotQc: {
        release: { label: 'LIBERADO', bg: '#22c55e', text: '#ffffff' },
        hold: { label: 'RETENIDO', bg: '#fecb46', text: '#111111' },
        reject: { label: 'RECHAZADO', bg: '#ef4444', text: '#ffffff' },
      },
      
      itemCategories: {
        fg: { label: 'Producto Terminado' },
        raw: { label: 'Materia Prima' },
        pack: { label: 'Packaging' },
        label: { label: 'Etiqueta' },
        intermediate: { label: 'Producto Intermedio' },
        consumable: { label: 'Consumible' },
        merch: { label: 'Merchandising' },
      } as Record<ItemCategory, { label: string }>,
      
      accountTypes: {
        HORECA: { label: 'Horeca' },
        RETAIL: { label: 'Retail' },
        DISTRIBUIDOR: { label: 'Distribuidor' },
        PRIVADA: { label: 'Venta Privada' },
        ONLINE: { label: 'Online' },
        OTRO: { label: 'Otro' },
      } as Record<AccountType, { label: string }>,
    },
    
    businessRules: {
      alerts: {
        daysWithoutContact: 30,
        daysWithoutOrder: 45,
        daysWithoutVisit: 30,
        daysSinPedidoCritical: 60,
        daysInStageNoAction: 30,
      },
      
      inventory: {
        lowStockThreshold: 50,
        nearExpiryDays: 30,
        safetyStockMultiplier: 1.5,
        targetDaysOfCover: 30,
      },
      
      production: {
        kpiDaysBack: 30,
        criticalRawThreshold: 10,
        overdueDaysThreshold: 3,
        warningDaysThreshold: 1,
      },
      
      ui: {
        swipeGestureThreshold: 60,
      },
      
      kpiDefaults: {
        unitsSold: 1000,
        revenue: 10000,
        visits: 20,
      },
      
      timeRanges: {
        weekDays: 7,
        monthDays: 30,
        yearDays: 365,
      },
      
      finance: {
        vatSettlementDay: 20,
        payoutFeePctOnline: 3.5,
        fuzzySearchThreshold: 0.7,
        overduePaymentDays: 30,
      },
    },
  };
}

/**
 * Helper para obtener un color de departamento con fallback.
 */
export function useDeptColor(dept: Department | undefined): { color: string; textColor: string } {
  const { config } = useSystemConfig();
  
  if (!dept || !config) {
    return { color: '#9ca3af', textColor: '#ffffff' };
  }
  
  return config.theme.departments[dept] || { color: '#9ca3af', textColor: '#ffffff' };
}

/**
 * Helper para obtener un label de departamento con fallback.
 */
export function useDeptLabel(dept: Department | undefined): string {
  const { config } = useSystemConfig();
  
  if (!dept || !config) {
    return dept || 'General';
  }
  
  return config.metadata.departments[dept]?.label || dept;
}
