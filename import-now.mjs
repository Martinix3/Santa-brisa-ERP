import { initializeApp } from 'firebase/app';
import { getFirestore, collection, writeBatch, doc, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';
import Papa from 'papaparse';

// Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAbPqt51bslHSvs0LROCWt7WSQBrMNqKN0",
  authDomain: "santa-brisa-erp.firebaseapp.com",
  projectId: "santa-brisa-erp",
  storageBucket: "santa-brisa-erp.appspot.com",
  messagingSenderId: "526543168723",
  appId: "1:526543168723:web:af0088ec4aa1cfd1c9e026"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('🚀 Iniciando importación...\n');

// 1. Limpiar
console.log('🗑️ Limpiando Firestore...');
const collections = ['accounts', 'parties', 'ordersSellOut', 'interactions', 'posTactics'];

for (const collName of collections) {
  const snapshot = await getDocs(collection(db, collName));
  if (!snapshot.empty) {
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    console.log(`   ✅ ${collName}: ${snapshot.size} docs borrados`);
  }
}

// 2. Importar users
console.log('\n👥 Importando users...');
const usersText = readFileSync('users-buena.csv', 'utf-8');
const users = Papa.parse(usersText, { header: true }).data;
let batch = writeBatch(db);
let count = 0;

for (const row of users) {
  if (!row.id) continue;
  const userRef = doc(db, 'users', row.id);
  batch.set(userRef, {
    id: row.id,
    name: row.name || '',
    email: row.mail || '',
    department: (row.departament || 'VENTAS').toUpperCase(),
    role: (row.role || 'COMERCIAL').toUpperCase(),
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, { merge: true });
  count++;
}
await batch.commit();
console.log(`   ✅ ${count} users importados`);

// 3. Importar parties
console.log('\n🏢 Importando parties...');
const partiesText = readFileSync('party-buena.csv', 'utf-8');
const parties = Papa.parse(partiesText, { header: true }).data;
batch = writeBatch(db);
count = 0;

for (const row of parties) {
  if (!row.id) continue;
  const partyRef = doc(db, 'parties', row.id);
  batch.set(partyRef, {
    id: row.id,
    legalName: row.legalName || row.tradeName || '',
    tradeName: row.tradeName || '',
    taxId: row.taxId || '',
    billingAddress: {
      street: row['billing adres'] || '',
      city: row.zona || '',
      country: 'ES'
    },
    phones: row.phone ? [{ value: row.phone, isPrimary: true }] : [],
    emails: [],
    people: row.peopole ? [{ name: row.peopole, role: 'CONTACT', isPrimary: true }] : [],
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  count++;
}
await batch.commit();
console.log(`   ✅ ${count} parties importadas`);

// 4. Importar accounts
console.log('\n📋 Importando accounts...');
const accountsText = readFileSync('accouts-buena.csv', 'utf-8');
const accounts = Papa.parse(accountsText, { header: true }).data;
batch = writeBatch(db);
count = 0;

for (const row of accounts) {
  if (!row.id) continue;
  const accountRef = doc(db, 'accounts', row.id);
  batch.set(accountRef, {
    id: row.id,
    name: row.Nombre || '',
    partyId: row.id,
    segment: (row.Segment || 'HORECA').toUpperCase(),
    stage: (row.Stage || 'ACTIVA').toUpperCase(),
    flow: (row.FLow || 'DIRECT').toUpperCase(),
    ownerId: row.ownerId || '',
    source: row.source || 'IMPORT',
    distributorPartyId: row.distributorPartyId || null,
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  count++;
}
await batch.commit();
console.log(`   ✅ ${count} accounts importadas`);

// 5. Importar orders
console.log('\n🛒 Importando orders...');
const ordersText = readFileSync('orders-buena.csv', 'utf-8');
const orders = Papa.parse(ordersText, { header: true }).data;
batch = writeBatch(db);
count = 0;

for (const row of orders) {
  let orderId = row.ID;
  if (!orderId || orderId === 'nan' || orderId.includes('nan')) {
    orderId = `ORD-${row.accoutid}-${Date.now()}-${count}`;
  }
  
  const cajas = parseFloat(row.CAJAS) || 0;
  const total = parseFloat(row.TOTAL) || 0;
  const unitPrice = cajas > 0 ? total / cajas : total;
  
  const orderRef = doc(db, 'ordersSellOut', orderId);
  batch.set(orderRef, {
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
  });
  count++;
  
  if (count % 400 === 0) {
    await batch.commit();
    batch = writeBatch(db);
    console.log(`   ⏳ ${count} orders procesados...`);
  }
}

if (count % 400 !== 0) {
  await batch.commit();
}
console.log(`   ✅ ${count} orders importados`);

console.log('\n🎉 ¡IMPORTACIÓN COMPLETADA!\n');
console.log('Ve a /accounts y /orders para ver los resultados\n');
process.exit(0);
