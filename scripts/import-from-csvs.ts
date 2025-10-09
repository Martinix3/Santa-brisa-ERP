#!/usr/bin/env ts-node
/**
 * Importador para CSVs preparados
 * 
 * Uso:
 * ts-node scripts/import-from-csvs.ts --dry-run
 * ts-node scripts/import-from-csvs.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { readFileSync } from 'fs';

// Inicializar Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'));
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

function parseCSV(filePath: string): any[] {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    return [];
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const workbook = XLSX.read(fileContent, { type: 'string' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

async function importUsers(dryRun: boolean = false) {
  console.log('\n👥 Importando Users...');
  
  const rows = parseCSV('users-buena.csv');
  if (rows.length === 0) return 0;
  
  console.log(`   📊 ${rows.length} usuarios encontrados`);
  
  if (dryRun) {
    console.log('   🔍 DRY RUN: No se guardaría nada');
    return rows.length;
  }
  
  const batch = db.batch();
  let count = 0;
  
  for (const row of rows) {
    const userData: any = {
      id: row.id,
      name: row.name || '',
      email: row.mail || '',
      department: (row.departament || 'VENTAS').toUpperCase(),
      role: (row.role || 'COMERCIAL').toUpperCase(),
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const userRef = db.collection('users').doc(row.id);
    batch.set(userRef, userData, { merge: true });
    count++;
  }
  
  await batch.commit();
  console.log(`   ✅ ${count} usuarios importados`);
  return count;
}

async function importParties(dryRun: boolean = false) {
  console.log('\n🏢 Importando Parties...');
  
  const rows = parseCSV('party-buena.csv');
  if (rows.length === 0) return 0;
  
  console.log(`   📊 ${rows.length} parties encontradas`);
  
  if (dryRun) {
    console.log('   🔍 DRY RUN: No se guardaría nada');
    return rows.length;
  }
  
  const batch = db.batch();
  let count = 0;
  
  for (const row of rows) {
    const partyData: any = {
      id: row.id,
      legalName: row.legalName || row.tradeName || '',
      tradeName: row.tradeName || '',
      taxId: row.taxId || '',
      billingAddress: {
        street: row['billing adres'] || '',
        city: row.zona || '',
        country: 'ES'
      },
      phones: row.phone ? [{
        value: row.phone,
        isPrimary: true,
        source: 'IMPORT',
        verified: false,
        updatedAt: new Date().toISOString()
      }] : [],
      emails: [],
      people: row.peopole ? [{
        name: row.peopole,
        role: 'CONTACT',
        isPrimary: true
      }] : [],
      tags: [],
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const partyRef = db.collection('parties').doc(row.id);
    batch.set(partyRef, partyData);
    count++;
  }
  
  await batch.commit();
  console.log(`   ✅ ${count} parties importadas`);
  return count;
}

async function importAccounts(dryRun: boolean = false) {
  console.log('\n📋 Importando Accounts...');
  
  const rows = parseCSV('accouts-buena.csv');
  if (rows.length === 0) return 0;
  
  console.log(`   📊 ${rows.length} cuentas encontradas`);
  
  if (dryRun) {
    console.log('   🔍 DRY RUN: No se guardaría nada');
    return rows.length;
  }
  
  const batch = db.batch();
  let count = 0;
  
  for (const row of rows) {
    const accountData: any = {
      id: row.id,
      name: row.Nombre || '',
      partyId: row.id, // Mismo ID que party
      segment: (row.Segment || 'HORECA').toUpperCase(),
      stage: (row.Stage || 'ACTIVA').toUpperCase(),
      flow: (row.FLow || 'DIRECT').toUpperCase(),
      ownerId: row.ownerId || '',
      source: row.source || 'IMPORT',
      distributorPartyId: row.distributorPartyId || null,
      notes: '',
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const accountRef = db.collection('accounts').doc(row.id);
    batch.set(accountRef, accountData);
    count++;
  }
  
  await batch.commit();
  console.log(`   ✅ ${count} cuentas importadas`);
  return count;
}

async function importOrders(dryRun: boolean = false) {
  console.log('\n🛒 Importando Orders...');
  
  const rows = parseCSV('orders-buena.csv');
  if (rows.length === 0) return 0;
  
  console.log(`   📊 ${rows.length} pedidos encontrados`);
  
  if (dryRun) {
    console.log('   🔍 DRY RUN: No se guardaría nada');
    return rows.length;
  }
  
  const batch = db.batch();
  let count = 0;
  
  for (const row of rows) {
    // Generar ID único si no existe o es inválido
    let orderId = row.ID;
    if (!orderId || orderId === 'nan' || orderId.includes('nan')) {
      orderId = `ORD-${row.accoutid}-${Date.now()}-${count}`;
    }
    
    const cajas = parseFloat(row.CAJAS) || 0;
    const total = parseFloat(row.TOTAL) || 0;
    const unitPrice = cajas > 0 ? total / cajas : total;
    
    const orderData: any = {
      id: orderId,
      accountId: row.accoutid || '',
      createdAt: row.FECHA || new Date().toISOString(),
      totalAmount: total,
      status: (row.ESTADO || 'open').toLowerCase(),
      flow: (row.FLOW || 'DIRECT').toUpperCase(),
      source: row.CANAL === 'ONLINE' ? 'SHOPIFY' : 'CRM',
      lines: cajas > 0 ? [{
        itemId: 'margarita-mix',
        qty: cajas,
        uom: 'CAJA',
        unitPrice: unitPrice,
        subtotal: total
      }] : [],
      updatedAt: new Date().toISOString()
    };
    
    const orderRef = db.collection('ordersSellOut').doc(orderId);
    batch.set(orderRef, orderData);
    count++;
    
    // Commit cada 400 para evitar límite de batch
    if (count % 400 === 0) {
      await batch.commit();
      console.log(`   ⏳ ${count} pedidos procesados...`);
    }
  }
  
  if (count % 400 !== 0) {
    await batch.commit();
  }
  
  console.log(`   ✅ ${count} pedidos importados`);
  return count;
}

async function runImport(dryRun: boolean = false) {
  console.log('\n🚀 IMPORTACIÓN DESDE CSVs\n');
  console.log(`Modo: ${dryRun ? '🔍 DRY RUN (simulación)' : '💾 IMPORTACIÓN REAL'}\n`);
  
  try {
    const usersCount = await importUsers(dryRun);
    const partiesCount = await importParties(dryRun);
    const accountsCount = await importAccounts(dryRun);
    const ordersCount = await importOrders(dryRun);
    
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 RESUMEN TOTAL:');
    console.log(`   Users:    ${usersCount}`);
    console.log(`   Parties:  ${partiesCount}`);
    console.log(`   Accounts: ${accountsCount}`);
    console.log(`   Orders:   ${ordersCount}`);
    console.log(`   ─────────────────`);
    console.log(`   TOTAL:    ${usersCount + partiesCount + accountsCount + ordersCount} documentos\n`);
    
    if (dryRun) {
      console.log('💡 Para importar de verdad, ejecuta:');
      console.log('   ts-node scripts/import-from-csvs.ts\n');
    } else {
      console.log('✅ Importación completada!\n');
      console.log('🔍 Verifica en la app:');
      console.log('   - /accounts → Ver cuentas');
      console.log('   - /orders → Ver pedidos');
      console.log('   - /dashboard-ventas → Ver métricas\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error durante la importación:', error);
    process.exit(1);
  }
}

// Parse argumentos
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Importador desde CSVs preparados

Uso:
  ts-node scripts/import-from-csvs.ts           Importar de verdad
  ts-node scripts/import-from-csvs.ts --dry-run Simular (no guarda)
  ts-node scripts/import-from-csvs.ts --help    Mostrar ayuda

Archivos requeridos (en raíz del proyecto):
  - users-buena.csv
  - party-buena.csv
  - accouts-buena.csv
  - orders-buena.csv

Orden de importación:
  1. Users (comerciales)
  2. Parties (info contacto)
  3. Accounts (cuentas/clientes)
  4. Orders (pedidos)
  `);
  process.exit(0);
}

// Ejecutar
runImport(dryRun);
