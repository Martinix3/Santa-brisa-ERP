'use server';

import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
  });
}

const db = getFirestore();

export type SystemConfigData = {
  alerts: {
    daysWithoutContact: number;
    daysWithoutOrder: number;
    daysWithoutVisit: number;
    daysSinPedidoCritical: number;
    daysInStageNoAction: number;
  };
  inventory: {
    lowStockThreshold: number;
    nearExpiryDays: number;
    safetyStockMultiplier: number;
    targetDaysOfCover: number;
  };
  production: {
    kpiDaysBack: number;
    criticalRawThreshold: number;
    overdueDaysThreshold: number;
    warningDaysThreshold: number;
  };
  ui: {
    swipeGestureThreshold: number;
  };
  finance: {
    vatSettlementDay: number;
    payoutFeePctOnline: number;
    fuzzySearchThreshold: number;
    overduePaymentDays: number;
  };
};

const DEFAULT_CONFIG: SystemConfigData = {
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
  finance: {
    vatSettlementDay: 20,
    payoutFeePctOnline: 3.5,
    fuzzySearchThreshold: 0.7,
    overduePaymentDays: 30,
  },
};

/**
 * Get system configuration from Firestore
 * Creates default config if it doesn't exist
 */
export async function getSystemConfig(): Promise<SystemConfigData> {
  try {
    const docRef = db.collection('systemConfig').doc('default');
    const doc = await docRef.get();

    if (!doc.exists) {
      // Create default config
      await docRef.set({
        ...DEFAULT_CONFIG,
        version: '1.0',
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
      });
      return DEFAULT_CONFIG;
    }

    const data = doc.data();
    return {
      alerts: data?.alerts || DEFAULT_CONFIG.alerts,
      inventory: data?.inventory || DEFAULT_CONFIG.inventory,
      production: data?.production || DEFAULT_CONFIG.production,
      ui: data?.ui || DEFAULT_CONFIG.ui,
      finance: data?.finance || DEFAULT_CONFIG.finance,
    };
  } catch (error) {
    console.error('Error getting system config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Update system configuration in Firestore
 */
export async function updateSystemConfig(config: SystemConfigData): Promise<void> {
  try {
    const docRef = db.collection('systemConfig').doc('default');
    await docRef.set({
      ...config,
      version: '1.0',
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin', // TODO: Get from current user
    }, { merge: true });
  } catch (error) {
    console.error('Error updating system config:', error);
    throw new Error('Failed to update system configuration');
  }
}

/**
 * Get a specific config value
 */
export async function getConfigValue(section: keyof SystemConfigData, key: string): Promise<number> {
  const config = await getSystemConfig();
  return (config[section] as any)[key] ?? 0;
}
