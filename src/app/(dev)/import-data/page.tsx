'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { firestoreDb } from '@/lib/firebaseClient';
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';

export default function ImportDataPage() {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const cleanupFirestore = async () => {
    if (!firestoreDb) {
      addLog('❌ Error: Firestore no inicializado');
      return;
    }
    
    setLoading(true);
    addLog('🗑️ Iniciando limpieza de Firestore...');
    
    const collections = ['accounts', 'parties', 'ordersSellOut', 'interactions', 'posTactics'];
    
    for (const collName of collections) {
      try {
        const snapshot = await getDocs(collection(firestoreDb, collName));
        if (snapshot.empty) {
          addLog(`  ℹ️ ${collName}: vacía`);
          continue;
        }
        
        addLog(`  📋 ${collName}: borrando ${snapshot.size} docs...`);
        
        const batch = writeBatch(firestoreDb);
        snapshot.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        
        addLog(`  ✅ ${collName}: ${snapshot.size} docs borrados`);
      } catch (error) {
        addLog(`  ❌ Error en ${collName}: ${error}`);
      }
    }
    
    addLog('✅ Limpieza completada!');
    setLoading(false);
  };

  const importData = async () => {
    if (!firestoreDb) {
      addLog('❌ Error: Firestore no inicializado');
      return;
    }
    
    setLoading(true);
    addLog('🚀 Iniciando importación...');
    
    try {
      // Importar users
      const usersResp = await fetch('/users-buena.csv');
      const usersText = await usersResp.text();
      const usersParsed = Papa.parse(usersText, { header: true });
      const users = usersParsed.data as any[];
      
      addLog(`👥 Importando ${users.length} users...`);
      let batch = writeBatch(firestoreDb);
      let count = 0;
      
      for (const row of users) {
        if (!row.id) continue;
        const userRef = doc(firestoreDb, 'users', row.id);
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
      addLog(`✅ ${count} users importados`);

      // Importar parties
      const partiesResp = await fetch('/party-buena.csv');
      const partiesText = await partiesResp.text();
      const partiesParsed = Papa.parse(partiesText, { header: true });
      const parties = partiesParsed.data as any[];
      
      addLog(`🏢 Importando ${parties.length} parties...`);
      batch = writeBatch(firestoreDb);
      count = 0;
      
      for (const row of parties) {
        if (!row.id) continue;
        const partyRef = doc(firestoreDb, 'parties', row.id);
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
      addLog(`✅ ${count} parties importadas`);

      // Importar accounts
      const accountsResp = await fetch('/accouts-buena.csv');
      const accountsText = await accountsResp.text();
      const accountsParsed = Papa.parse(accountsText, { header: true });
      const accounts = accountsParsed.data as any[];
      
      addLog(`📋 Importando ${accounts.length} accounts...`);
      batch = writeBatch(firestoreDb);
      count = 0;
      
      for (const row of accounts) {
        if (!row.id) continue;
        const accountRef = doc(firestoreDb, 'accounts', row.id);
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
      addLog(`✅ ${count} accounts importadas`);

      // Importar orders
      const ordersResp = await fetch('/orders-buena.csv');
      const ordersText = await ordersResp.text();
      const ordersParsed = Papa.parse(ordersText, { header: true });
      const orders = ordersParsed.data as any[];
      
      addLog(`🛒 Importando ${orders.length} orders...`);
      batch = writeBatch(firestoreDb);
      count = 0;
      
      for (const row of orders) {
        let orderId = row.ID;
        if (!orderId || orderId === 'nan' || orderId.includes('nan')) {
          orderId = `ORD-${row.accoutid}-${Date.now()}-${count}`;
        }
        
        const cajas = parseFloat(row.CAJAS) || 0;
        const total = parseFloat(row.TOTAL) || 0;
        const unitPrice = cajas > 0 ? total / cajas : total;
        
        const orderRef = doc(firestoreDb, 'ordersSellOut', orderId);
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
          batch = writeBatch(firestoreDb);
          addLog(`  ⏳ ${count} orders procesados...`);
        }
      }
      
      if (count % 400 !== 0) {
        await batch.commit();
      }
      addLog(`✅ ${count} orders importados`);
      
      addLog('🎉 IMPORTACIÓN COMPLETADA!');
      addLog('📍 Ve a /accounts para ver los resultados');
      
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
    
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Importación de Datos</h1>
      
      <div className="grid gap-4 mb-8">
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Paso 1: Limpiar Firestore</h2>
          <p className="text-sm text-gray-600 mb-4">
            Borra todos los datos de prueba (accounts, parties, orders, etc.)
          </p>
          <button 
            onClick={cleanupFirestore} 
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : '🗑️ Limpiar Firestore'}
          </button>
        </div>

        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Paso 2: Importar CSVs</h2>
          <p className="text-sm text-gray-600 mb-4">
            Importa users, parties, accounts y orders desde los CSVs
          </p>
          <button 
            onClick={importData} 
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : '🚀 Importar Datos'}
          </button>
        </div>
      </div>

      <div className="p-6 bg-gray-50 border rounded-lg">
        <h3 className="font-semibold mb-2">Log:</h3>
        <div className="font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
          {log.length === 0 && (
            <p className="text-gray-500">Esperando acción...</p>
          )}
          {log.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
