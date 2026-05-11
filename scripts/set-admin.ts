#!/usr/bin/env ts-node
/**
 * Script para establecer mj@santabrisa.co como admin
 */

import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializar Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
  });
}

const db = getFirestore();

async function setAdmin() {
  const email = 'mj@santabrisa.co';
  
  try {
    console.log(`🔍 Buscando usuario: ${email}`);
    
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();
    
    if (snapshot.empty) {
      console.log('❌ Usuario no encontrado. Creando...');
      
      const newUser = {
        name: 'Martin Jaime',
        email: email,
        role: 'admin',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await usersRef.add(newUser);
      console.log('✅ Usuario admin creado');
    } else {
      const userDoc = snapshot.docs[0];
      console.log(`📝 Usuario encontrado: ${userDoc.id}`);
      
      await userDoc.ref.update({
        role: 'admin',
        updatedAt: new Date().toISOString(),
      });
      
      console.log('✅ Usuario actualizado a admin');
    }
    
    console.log('\n🎉 Listo! mj@santabrisa.co es ahora admin');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setAdmin().then(() => process.exit(0));
