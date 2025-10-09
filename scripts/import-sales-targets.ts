#!/usr/bin/env ts-node
/**
 * Importador específico para Sales Targets ES - Cuentas.csv
 * FASE 1: Importa cuentas sin distribuidores
 * 
 * Uso:
 * ts-node scripts/import-sales-targets.ts [--dry-run]
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

// Inicializar Firebase Admin
if (!getApps().length) {
  const serviceAccount = require('../serviceAccountKey.json');
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

interface SalesRow {
  accountName: string;
  contactName: string;
  date: string;
  phone: string;
  status: string;
  area: string;
  responsible: string;
  cajas: string;
  materiales: string;
  direccion: string;
}

function parseSalesTargetsCSV(filePath: string): SalesRow[] {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const workbook = XLSX.read(fileContent, { type: 'string' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  const rows: SalesRow[] = [];
  
  // Los datos empiezan en la fila 5 (índice 4)
  for (let i = 4; i < rawData.length; i++) {
    const row = rawData[i];
    
    // Columna B (índice 1) es el nombre de la cuenta
    const accountName = row[1]?.toString().trim();
    
    // Si no hay nombre de cuenta, skip
    if (!accountName || accountName === '') continue;
    
    rows.push({
      accountName: accountName,
      contactName: row[2]?.toString() || '',
      date: row[3]?.toString() || '',
      phone: row[5]?.toString() || '',
      status: row[7]?.toString() || 'ACTIVA',
      area: row[8]?.toString() || '',
      responsible: row[9]?.toString() || '',
      cajas: row[11]?.toString() || '',
      materiales: row[12]?.toString() || '',
      direccion: row[14]?.toString() || '',
    });
  }
  
  return rows;
}

function mapStatus(status: string): string {
  const s = status.toUpperCase();
  if (s.includes('CLOSED') || s.includes('WON')) return 'ACTIVA';
  if (s.includes('LOST')) return 'FALLIDA';
  if (s.includes('FOLLOW') || s.includes('CONTACT')) return 'SEGUIMIENTO';
  return 'POTENCIAL';
}

function mapSegment(accountName: string, area: string): string {
  const name = accountName.toLowerCase();
  
  if (name.includes('supermercado') || name.includes('market')) return 'RETAIL';
  if (name.includes('distribuidor') || name.includes('dist.')) return 'DISTRIBUIDOR';
  
  // Por defecto HORECA
  return 'HORECA';
}

function generateId(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function importSalesTargets(dryRun: boolean = false) {
  const filePath = 'Sales Targets ES - Cuentas.csv';
  
  console.log(`\n🚀 Importando ${filePath}...`);
  console.log(`📦 FASE 1: Sin distribuidores (se asignarán después)\n`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }
  
  const rows = parseSalesTargetsCSV(filePath);
  console.log(`📊 ${rows.length} cuentas encontradas\n`);
  
  // Mostrar preview
  console.log('📋 Vista previa (primeras 5):');
  rows.slice(0, 5).forEach((row, i) => {
    console.log(`  ${i + 1}. ${row.accountName} (${row.area}) - ${row.responsible} - ${row.status}`);
  });
  console.log('');
  
  const batch = db.batch();
  let accountCount = 0;
  let orderCount = 0;
  let interactionCount = 0;
  
  for (const row of rows) {
    const accountId = generateId(row.accountName);
    const partyId = `party-${accountId}`;
    const stage = mapStatus(row.status);
    const segment = mapSegment(row.accountName, row.area);
    
    // Crear Account
    const accountData: any = {
      id: accountId,
      name: row.accountName,
      segment: segment,
      stage: stage,
      flow: 'DIRECT',
      notes: row.materiales ? `Materiales entregados: ${row.materiales}` : '',
      ownerId: row.responsible || '',
      distributorPartyId: null, // FASE 2
      partyId: partyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Crear Party
    const partyData: any = {
      id: partyId,
      legalName: row.accountName,
      tradeName: row.accountName,
      taxId: '',
      billingAddress: {
        street: row.direccion || '',
        city: row.area || '',
        country: 'ES',
      },
      emails: [],
      phones: row.phone ? [{
        value: row.phone,
        isPrimary: true,
        source: 'IMPORT',
        verified: false,
        updatedAt: new Date().toISOString(),
      }] : [],
      people: row.contactName ? [{
        name: row.contactName,
        role: 'CONTACT',
        isPrimary: true,
      }] : [],
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    if (!dryRun) {
      const accountRef = db.collection('accounts').doc(accountId);
      const partyRef = db.collection('parties').doc(partyId);
      batch.set(accountRef, accountData);
      batch.set(partyRef, partyData);
    }
    
    accountCount++;
    
    // Si tiene cajas, crear Order
    if (row.cajas && row.cajas !== '') {
      const cajasMatch = row.cajas.match(/(\d+)/);
      const cajasNum = cajasMatch ? parseInt(cajasMatch[1]) : 2;
      
      const orderId = `ORD-${accountId}-${Date.now()}`;
      const orderDate = row.date || new Date().toISOString();
      
      const orderData: any = {
        id: orderId,
        accountId: accountId,
        totalAmount: cajasNum * 50, // Estimado: 50€ por caja
        status: stage === 'ACTIVA' ? 'confirmed' : 'open',
        flow: 'DIRECT',
        source: 'CRM',
        lines: [{
          itemId: 'margarita-mix',
          qty: cajasNum,
          uom: 'CAJA',
          unitPrice: 50,
          subtotal: cajasNum * 50,
        }],
        createdAt: orderDate,
        updatedAt: new Date().toISOString(),
      };
      
      if (!dryRun) {
        const orderRef = db.collection('ordersSellOut').doc(orderId);
        batch.set(orderRef, orderData);
      }
      
      orderCount++;
    }
    
    // Crear interacción si tiene fecha
    if (row.date && row.date !== '') {
      const interactionId = `INT-${accountId}-${Date.now()}`;
      
      const interactionData: any = {
        id: interactionId,
        accountId: accountId,
        kind: 'VISITA',
        note: row.materiales ? `Materiales entregados: ${row.materiales}` : 'Visita comercial',
        userId: row.responsible || '',
        createdAt: row.date,
        updatedAt: new Date().toISOString(),
      };
      
      if (!dryRun) {
        const interactionRef = db.collection('interactions').doc(interactionId);
        batch.set(interactionRef, interactionData);
      }
      
      interactionCount++;
    }
    
    if (accountCount % 10 === 0) {
      console.log(`  ✓ Procesadas ${accountCount} cuentas...`);
    }
  }
  
  if (!dryRun) {
    await batch.commit();
    console.log(`\n✅ Importación FASE 1 completada!`);
    console.log(`   📋 ${accountCount} cuentas importadas`);
    console.log(`   🛒 ${orderCount} pedidos creados`);
    console.log(`   💬 ${interactionCount} interacciones registradas`);
    console.log(`\n⚠️  Distribuidores: NULL (asignar en FASE 2)\n`);
  } else {
    console.log(`\n🔍 DRY RUN - No se guardó nada en la BD`);
    console.log(`   📋 ${accountCount} cuentas serían importadas`);
    console.log(`   🛒 ${orderCount} pedidos serían creados`);
    console.log(`   💬 ${interactionCount} interacciones serían registradas`);
    console.log(`\n⚠️  Distribuidores: NULL (asignar en FASE 2)\n`);
  }
}

// Parse arguments
const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Importador Sales Targets ES - FASE 1

Uso:
  ts-node scripts/import-sales-targets.ts [--dry-run]

Opciones:
  --dry-run, -d   Simular sin guardar en BD
  --help, -h      Mostrar esta ayuda

Archivo:
  Lee automáticamente: Sales Targets ES - Cuentas.csv

FASE 1: Importa cuentas, pedidos e interacciones (sin distribuidores)
FASE 2: Asignar distribuidores masivamente (script separado)
  `);
  process.exit(0);
}

// Ejecutar
importSalesTargets(dryRun);
