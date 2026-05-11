#!/usr/bin/env ts-node
/**
 * Script de importación de datos desde Excel/CSV
 * 
 * Uso:
 * ts-node scripts/import-data.ts --file path/to/file.xlsx --type accounts
 * ts-node scripts/import-data.ts --file path/to/file.csv --type orders
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Inicializar Firebase Admin
if (!getApps().length) {
  const serviceAccount = require('../serviceAccountKey.json');
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

// Tipos de importación soportados
type ImportType = 'accounts' | 'orders' | 'interactions' | 'users';

interface ImportOptions {
  file: string;
  type: ImportType;
  dryRun?: boolean;
}

// Mapeo de columnas Excel → Campos Firestore
const COLUMN_MAPPINGS = {
  accounts: {
    'Nombre': 'name',
    'CIF': 'taxId',
    'Segmento': 'segment',
    'Stage': 'stage',
    'Ciudad': 'city',
    'Dirección': 'address',
    'Email': 'email',
    'Teléfono': 'phone',
    'Comercial': 'owner',
    'Distribuidor': 'distributor',
    'Notas': 'notes',
  },
  orders: {
    'ID': 'id',
    'Cliente': 'accountName',
    'Fecha': 'date',
    'Total': 'totalAmount',
    'Estado': 'status',
    'Flow': 'flow',
    'Canal': 'channel',
  },
  interactions: {
    'Cliente': 'accountName',
    'Tipo': 'kind',
    'Fecha': 'date',
    'Nota': 'note',
    'Comercial': 'userId',
  },
};

function parseExcelFile(filePath: string): any[] {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  } else if (ext === '.csv') {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const workbook = XLSX.read(fileContent, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  } else {
    throw new Error(`Formato no soportado: ${ext}`);
  }
}

function mapRow(row: any, type: ImportType, mappings: Record<string, string>): any {
  const mapped: any = {};
  
  for (const [excelCol, firestoreField] of Object.entries(mappings)) {
    if (row[excelCol] !== undefined) {
      mapped[firestoreField] = row[excelCol];
    }
  }
  
  return mapped;
}

async function importAccounts(rows: any[], dryRun: boolean = false) {
  console.log(`📋 Importando ${rows.length} cuentas...`);
  
  const mappings = COLUMN_MAPPINGS.accounts;
  const batch = db.batch();
  let count = 0;
  
  for (const row of rows) {
    const mapped = mapRow(row, 'accounts', mappings);
    
    // Generar ID único
    const accountId = mapped.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Crear documento Account
    const partyId = `party-${accountId}`;
    const accountData: any = {
      id: accountId,
      name: mapped.name || '',
      segment: mapped.segment || 'HORECA',
      stage: mapped.stage || 'POTENCIAL',
      flow: 'DIRECT',
      notes: mapped.notes || '',
      ownerId: mapped.owner || '',
      distributorPartyId: mapped.distributor || null,
      partyId: partyId,
      createdAt: Timestamp.now().toDate().toISOString(),
      updatedAt: Timestamp.now().toDate().toISOString(),
    };
    
    // Crear documento Party asociado
    const partyData = {
      id: partyId,
      legalName: mapped.name,
      tradeName: mapped.name,
      taxId: mapped.taxId || '',
      billingAddress: {
        street: mapped.address || '',
        city: mapped.city || '',
        country: 'ES',
      },
      emails: mapped.email ? [{
        value: mapped.email,
        isPrimary: true,
        source: 'IMPORT',
        verified: false,
        updatedAt: new Date().toISOString(),
      }] : [],
      phones: mapped.phone ? [{
        value: mapped.phone,
        isPrimary: true,
        source: 'IMPORT',
        verified: false,
        updatedAt: new Date().toISOString(),
      }] : [],
      tags: [],
      createdAt: Timestamp.now().toDate().toISOString(),
      updatedAt: Timestamp.now().toDate().toISOString(),
    };
    
    accountData['partyId'] = partyId;
    
    if (!dryRun) {
      const accountRef = db.collection('accounts').doc(accountId);
      const partyRef = db.collection('parties').doc(partyId);
      batch.set(accountRef, accountData);
      batch.set(partyRef, partyData);
    }
    
    count++;
    
    if (count % 10 === 0) {
      console.log(`  ✓ Procesadas ${count} cuentas...`);
    }
  }
  
  if (!dryRun) {
    await batch.commit();
    console.log(`✅ ${count} cuentas importadas exitosamente`);
  } else {
    console.log(`🔍 DRY RUN: ${count} cuentas serían importadas`);
  }
}

async function importOrders(rows: any[], dryRun: boolean = false) {
  console.log(`📋 Importando ${rows.length} pedidos...`);
  
  const mappings = COLUMN_MAPPINGS.orders;
  const batch = db.batch();
  let count = 0;
  
  for (const row of rows) {
    const mapped = mapRow(row, 'orders', mappings);
    
    const orderId = mapped.id || `ORD-${Date.now()}-${count}`;
    
    const orderData = {
      id: orderId,
      accountId: mapped.accountName?.toLowerCase().replace(/[^a-z0-9]/g, '-') || '',
      totalAmount: parseFloat(mapped.totalAmount) || 0,
      status: mapped.status || 'open',
      flow: mapped.flow || 'DIRECT',
      source: mapped.channel === 'ONLINE' ? 'SHOPIFY' : 'CRM',
      lines: [],
      createdAt: mapped.date || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    if (!dryRun) {
      const orderRef = db.collection('ordersSellOut').doc(orderId);
      batch.set(orderRef, orderData);
    }
    
    count++;
    
    if (count % 10 === 0) {
      console.log(`  ✓ Procesados ${count} pedidos...`);
    }
  }
  
  if (!dryRun) {
    await batch.commit();
    console.log(`✅ ${count} pedidos importados exitosamente`);
  } else {
    console.log(`🔍 DRY RUN: ${count} pedidos serían importados`);
  }
}

async function importInteractions(rows: any[], dryRun: boolean = false) {
  console.log(`📋 Importando ${rows.length} interacciones...`);
  
  const mappings = COLUMN_MAPPINGS.interactions;
  const batch = db.batch();
  let count = 0;
  
  for (const row of rows) {
    const mapped = mapRow(row, 'interactions', mappings);
    
    const interactionId = `INT-${Date.now()}-${count}`;
    
    const interactionData = {
      id: interactionId,
      accountId: mapped.accountName?.toLowerCase().replace(/[^a-z0-9]/g, '-') || '',
      kind: mapped.kind || 'OTRO',
      note: mapped.note || '',
      userId: mapped.userId || '',
      createdAt: mapped.date || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    if (!dryRun) {
      const interactionRef = db.collection('interactions').doc(interactionId);
      batch.set(interactionRef, interactionData);
    }
    
    count++;
    
    if (count % 10 === 0) {
      console.log(`  ✓ Procesadas ${count} interacciones...`);
    }
  }
  
  if (!dryRun) {
    await batch.commit();
    console.log(`✅ ${count} interacciones importadas exitosamente`);
  } else {
    console.log(`🔍 DRY RUN: ${count} interacciones serían importadas`);
  }
}

async function runImport(options: ImportOptions) {
  try {
    console.log(`\n🚀 Iniciando importación...`);
    console.log(`📁 Archivo: ${options.file}`);
    console.log(`📦 Tipo: ${options.type}`);
    console.log(`🔍 Dry Run: ${options.dryRun ? 'SÍ' : 'NO'}\n`);
    
    // Leer archivo
    const rows = parseExcelFile(options.file);
    console.log(`📊 ${rows.length} filas encontradas\n`);
    
    // Mostrar primeras 3 filas como preview
    console.log('📋 Vista previa (primeras 3 filas):');
    rows.slice(0, 3).forEach((row, i: number) => {
      console.log(`  ${i + 1}.`, JSON.stringify(row, null, 2));
    });
    console.log('');
    
    // Importar según tipo
    switch (options.type) {
      case 'accounts':
        await importAccounts(rows, options.dryRun);
        break;
      case 'orders':
        await importOrders(rows, options.dryRun);
        break;
      case 'interactions':
        await importInteractions(rows, options.dryRun);
        break;
      default:
        throw new Error(`Tipo no soportado: ${options.type}`);
    }
    
    console.log('\n✅ Importación completada!\n');
    
  } catch (error) {
    console.error('\n❌ Error durante la importación:', error);
    process.exit(1);
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options: ImportOptions = {
  file: '',
  type: 'accounts',
  dryRun: false,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--file':
    case '-f':
      options.file = args[++i];
      break;
    case '--type':
    case '-t':
      options.type = args[++i] as ImportType;
      break;
    case '--dry-run':
    case '-d':
      options.dryRun = true;
      break;
    case '--help':
    case '-h':
      console.log(`
Importador de Datos Santa Brisa ERP

Uso:
  ts-node scripts/import-data.ts --file <path> --type <tipo> [--dry-run]

Opciones:
  --file, -f      Ruta al archivo Excel/CSV
  --type, -t      Tipo de datos: accounts | orders | interactions
  --dry-run, -d   Simular importación sin guardar en BD
  --help, -h      Mostrar esta ayuda

Ejemplos:
  ts-node scripts/import-data.ts --file data.xlsx --type accounts --dry-run
  ts-node scripts/import-data.ts -f pedidos.csv -t orders
      `);
      process.exit(0);
  }
}

// Validar opciones
if (!options.file) {
  console.error('❌ Error: Debes especificar un archivo con --file\n');
  console.log('Usa --help para ver las opciones disponibles');
  process.exit(1);
}

if (!fs.existsSync(options.file)) {
  console.error(`❌ Error: El archivo no existe: ${options.file}`);
  process.exit(1);
}

// Ejecutar importación
runImport(options);
