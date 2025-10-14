#!/usr/bin/env tsx
// Script para añadir Santa Brisa 750ml al inventario

import { adminDb as db } from '../src/server/firebase';

(async () => {
  try {
    const now = new Date().toISOString();
    
    const productId = 'item_santabrisa750';
    
    const product = {
      id: productId,
      name: 'Santa Brisa 750ml',
      sku: 'SB-750',
      category: 'BEBIDAS',
      subcategory: 'ALCOHOLICAS',
      description: 'Santa Brisa Vodka 750ml',
      isActive: true,
      unitsPerCase: 6,  // 6 botellas por caja
      unit: 'botella',
      uom: 'botella',
      volume: 750,
      volumeUnit: 'ml',
      
      // Precios por segmento
      priceBase: 12.50,
      priceList: {
        HORECA: 12.50,
        RETAIL: 15.00,
        DISTRIBUIDOR: 10.00,
        PRIVADA: 15.00,
        ONLINE: 14.00,
        OTRO: 12.50
      },
      
      // Metadatos
      createdAt: now,
      updatedAt: now,
      
      // Stock inicial (opcional)
      stock: {
        available: 0,
        reserved: 0,
        onOrder: 0
      }
    };
    
    console.log('📦 Creando producto Santa Brisa 750ml...');
    
    await db.collection('items').doc(productId).set(product);
    
    console.log('✅ Producto creado exitosamente:');
    console.log('   ID:', productId);
    console.log('   Nombre:', product.name);
    console.log('   SKU:', product.sku);
    console.log('   Precio base:', product.priceBase, '€');
    console.log('   Unidades/caja:', product.unitsPerCase);
    console.log();
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
