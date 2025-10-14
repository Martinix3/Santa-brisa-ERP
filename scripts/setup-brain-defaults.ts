// scripts/setup-brain-defaults.ts
/**
 * Script para cargar configuración y reglas por defecto de Santa Brain
 */

import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializar Firebase Admin (igual que en src/server/firebase.ts)
const projectId =
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId) {
  console.error('❌ Error: FIREBASE_PROJECT_ID no configurado');
  console.log('Ejecuta: export FIREBASE_PROJECT_ID=tu-project-id');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

const db = getFirestore();

async function setupBrainDefaults() {
  console.log('🧠 Configurando Santa Brain defaults...\n');
  
  // 1. Config
  console.log('📝 Creando configuración...');
  await db.collection('system').doc('config').set({
    schedules: {
      dailyMorningHour: 9,
      dailyEveningHour: 19,
      visitFollowupHours: 3,
    },
    thresholds: {
      noTouchDays30: 30,
      noTouchDays60: 60,
      noOrderDays45: 45,
      noOrderDays90: 90,
    },
    strictCanonWrites: false,
  });
  console.log('✅ Config creada\n');
  
  // 2. Reglas
  console.log('📋 Creando reglas...');
  
  const rules = [
    {
      id: 'acct-no-touch-30',
      enabled: true,
      scope: 'DAILY',
      name: 'Cuentas sin contacto 30d',
      description: 'Detecta cuentas ACTIVA/SEGUIMIENTO/POTENCIAL sin interacción en 30+ días',
      severity: 'WARN',
      dedupeHours: 48,
      condition: {
        kind: 'ACCOUNT',
        stageIn: ['ACTIVA', 'SEGUIMIENTO', 'POTENCIAL'],
        minDaysSinceLastInteraction: 30,
      },
      action: {
        createTask: {
          title: 'Visita de cortesía — {{account.name}}',
          dueInDays: 5,
          priority: 'med',
          assignTo: 'ACCOUNT_OWNER',
          reason: 'NO_TOUCH_30',
          tags: ['rotation', 'followup'],
        },
      },
    },
    {
      id: 'acct-no-order-45',
      enabled: true,
      scope: 'DAILY',
      name: 'Activa sin pedido 45d',
      description: 'Cuentas ACTIVA sin pedido en 45+ días',
      severity: 'WARN',
      dedupeHours: 48,
      condition: {
        kind: 'ACCOUNT',
        stageIn: ['ACTIVA'],
        minDaysSinceLastOrder: 45,
      },
      action: {
        createTask: {
          title: 'Revisión consumo — {{account.name}}',
          dueInDays: 3,
          priority: 'high',
          assignTo: 'ACCOUNT_OWNER',
          reason: 'NO_ORDER_45',
          tags: ['reactivation'],
        },
        sendAlert: {
          channel: 'INAPP',
          message: 'Revisa reposición en {{account.name}}',
        },
      },
    },
    {
      id: 'acct-no-order-90',
      enabled: false,
      scope: 'WEEKLY',
      name: 'Cuentas sin pedido 90d (crítico)',
      description: 'Cuentas en riesgo de pérdida',
      severity: 'CRIT',
      dedupeHours: 168, // 7 días
      condition: {
        kind: 'ACCOUNT',
        stageIn: ['ACTIVA', 'SEGUIMIENTO'],
        minDaysSinceLastOrder: 90,
      },
      action: {
        createTask: {
          title: 'URGENTE: Reactivación {{account.name}}',
          dueInDays: 2,
          priority: 'critical',
          assignTo: 'ACCOUNT_OWNER',
          reason: 'NO_ORDER_90',
          tags: ['critical', 'reactivation'],
        },
      },
    },
  ];
  
  for (const rule of rules) {
    await db.collection('rules').doc(rule.id).set(rule);
    console.log(`  ✅ ${rule.name}`);
  }
  
  console.log('\n🎉 Setup completado!\n');
  console.log('Accede a: /admin/brain');
  process.exit(0);
}

setupBrainDefaults().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
