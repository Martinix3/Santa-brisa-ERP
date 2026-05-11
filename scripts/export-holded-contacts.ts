#!/usr/bin/env ts-node
/**
 * Export integrations/holded/contacts_mirror to JSON
 * 
 * Usage: npx ts-node scripts/export-holded-contacts.ts
 */

import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar Firebase Admin
const projectId =
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  'santa-brisa-erp'; // Fallback al project ID conocido

const app = getApps()[0] ?? initializeApp({
  credential: applicationDefault(),
  projectId,
});

const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

async function exportHoldedContacts() {
  console.log(`\n🚀 Exportando contacts_mirror de Holded`);
  console.log(`🔑 Project ID: ${projectId}\n`);
  
  try {
    // Acceder a la subcollection correctamente
    const snapshot = await db
      .doc('integrations/holded')
      .collection('contacts_mirror')
      .get();
    
    const contacts: any[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      // Convertir Timestamps a strings para JSON
      const serialized = JSON.parse(JSON.stringify(data));
      contacts.push({
        id: doc.id,
        ...serialized
      });
    });
    
    console.log(`✅ Encontrados ${contacts.length} contactos`);
    
    // Crear directorio de exports si no existe
    const exportDir = path.join(__dirname, '..', 'firestore-exports');
    fs.mkdirSync(exportDir, { recursive: true });
    
    // Guardar con timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `holded_contacts_mirror_${timestamp}.json`;
    const filepath = path.join(exportDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(contacts, null, 2), 'utf8');
    
    const stats = fs.statSync(filepath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    
    console.log(`\n💾 Archivo guardado:`);
    console.log(`   📂 ${filepath}`);
    console.log(`   📊 ${contacts.length} contactos`);
    console.log(`   💿 ${sizeMB} MB\n`);
    
    // Mostrar muestra de los primeros 3 contactos
    if (contacts.length > 0) {
      console.log(`📋 Muestra de datos (primeros 3):`);
      contacts.slice(0, 3).forEach((contact, idx: number) => {
        console.log(`\n   ${idx + 1}. ${contact.name || contact.id}`);
        if (contact.email) console.log(`      📧 ${contact.email}`);
        if (contact.phone) console.log(`      📞 ${contact.phone}`);
        if (contact.vat) console.log(`      🆔 ${contact.vat}`);
      });
    }
    
    console.log(`\n✅ Exportación completada!`);
    process.exit(0);
    
  } catch (error: any) {
    console.error(`\n❌ Error durante la exportación:`);
    console.error(error.message);
    process.exit(1);
  }
}

exportHoldedContacts();
