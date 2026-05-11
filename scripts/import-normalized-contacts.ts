#!/usr/bin/env tsx
/**
 * Import normalized contacts to Firestore contacts collection
 * 
 * Usage: npx tsx scripts/import-normalized-contacts.ts <path-to-json>
 */

import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const projectId = 'santa-brisa-erp';

const app = getApps()[0] ?? initializeApp({
  credential: applicationDefault(),
  projectId,
});

const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

async function importContacts(jsonPath: string) {
  console.log(`\n🚀 Importando contactos a Firestore`);
  console.log(`🔑 Project ID: ${projectId}`);
  console.log(`📂 Archivo: ${jsonPath}\n`);
  
  try {
    // Leer archivo JSON
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    if (!Array.isArray(data)) {
      throw new Error('El archivo debe contener un array de contactos');
    }
    
    console.log(`📊 Total contactos a importar: ${data.length}\n`);
    
    // Importar en batches de 500 (límite de Firestore)
    const batchSize = 500;
    let imported = 0;
    let errors = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = db.batch();
      const chunk = data.slice(i, i + batchSize);
      
      for (const contact of chunk) {
        try {
          const docRef = db.collection('contacts').doc(contact.id);
          
          // Preparar datos para Firestore
          const firestoreData = {
            ...contact,
            // Asegurar que arrays vacíos se manejen correctamente
            roles: contact.roles || [],
            emails: contact.emails || [],
            phones: contact.phones || [],
            addresses: contact.addresses || [],
            tags: contact.tags || [],
            childrenIds: contact.childrenIds || [],
            representativeOfIds: contact.representativeOfIds || [],
          };
          
          batch.set(docRef, firestoreData, { merge: true });
          imported++;
        } catch (err: any) {
          console.error(`❌ Error con contacto ${contact.id}: ${err.message}`);
          errors++;
        }
      }
      
      // Commit batch
      await batch.commit();
      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} importado (${chunk.length} contactos)`);
    }
    
    console.log(`\n✅ Importación completada!`);
    console.log(`   📊 Importados: ${imported}`);
    console.log(`   ❌ Errores: ${errors}`);
    
    // Estadísticas
    const stats = {
      byRole: {} as Record<string, number>,
      bySegment: {} as Record<string, number>,
      byStage: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
    };
    
    data.forEach((c: any) => {
      // Roles
      c.roles?.forEach((r: string) => {
        stats.byRole[r] = (stats.byRole[r] || 0) + 1;
      });
      
      // Segment
      const seg = c.customer?.segment || 'N/A';
      stats.bySegment[seg] = (stats.bySegment[seg] || 0) + 1;
      
      // Stage
      const stage = c.stage || 'N/A';
      stats.byStage[stage] = (stats.byStage[stage] || 0) + 1;
      
      // Source
      const src = c.source || 'N/A';
      stats.bySource[src] = (stats.bySource[src] || 0) + 1;
    });
    
    console.log(`\n📊 Estadísticas:`);
    console.log(`\nPor Rol:`);
    Object.entries(stats.byRole).forEach(([k, v]) => console.log(`   ${k}: ${v}`));
    
    console.log(`\nPor Segmento:`);
    Object.entries(stats.bySegment).forEach(([k, v]) => console.log(`   ${k}: ${v}`));
    
    console.log(`\nPor Stage:`);
    Object.entries(stats.byStage).forEach(([k, v]) => console.log(`   ${k}: ${v}`));
    
    console.log(`\nPor Fuente:`);
    Object.entries(stats.bySource).forEach(([k, v]) => console.log(`   ${k}: ${v}`));
    
    process.exit(0);
    
  } catch (error: any) {
    console.error(`\n❌ Error durante la importación:`);
    console.error(error.message);
    process.exit(1);
  }
}

// CLI
const jsonPath = process.argv[2];

if (!jsonPath) {
  console.error('❌ Uso: npx tsx scripts/import-normalized-contacts.ts <path-to-json>');
  console.error('   Ejemplo: npx tsx scripts/import-normalized-contacts.ts ~/Downloads/contacts_normalized_ALL.json');
  process.exit(1);
}

if (!fs.existsSync(jsonPath)) {
  console.error(`❌ Archivo no encontrado: ${jsonPath}`);
  process.exit(1);
}

importContacts(jsonPath);
