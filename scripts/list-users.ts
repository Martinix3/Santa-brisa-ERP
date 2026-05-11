#!/usr/bin/env ts-node
/**
 * Script para listar todos los usuarios registrados en el CRM
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
  });
}

const db = getFirestore();

async function listUsers() {
  try {
    console.log('📋 Listando usuarios registrados en el CRM...\n');
    
    const usersSnap = await db.collection('users').get();
    
    if (usersSnap.empty) {
      console.log('❌ No hay usuarios registrados');
      return;
    }

    console.log(`✅ Total de usuarios: ${usersSnap.size}\n`);
    console.log('─'.repeat(80));
    
    usersSnap.docs.forEach((doc, index: number) => {
      const user = doc.data();
      console.log(`\n${index + 1}. ID: ${doc.id}`);
      console.log(`   Nombre: ${user.name || '—'}`);
      console.log(`   Email: ${user.email || '—'}`);
      console.log(`   Rol: ${user.role || '—'}`);
      console.log(`   Activo: ${user.active ? 'Sí' : 'No'}`);
      console.log(`   Creado: ${user.createdAt || '—'}`);
    });
    
    console.log('\n' + '─'.repeat(80));
    console.log('\n✅ Listado completado');
    
  } catch (error) {
    console.error('❌ Error al listar usuarios:', error);
    process.exit(1);
  }
}

listUsers().then(() => process.exit(0));
