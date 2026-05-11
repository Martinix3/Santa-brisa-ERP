#!/usr/bin/env npx tsx
// scripts/test-holded-orders.ts
// Script de prueba para ver cómo llegan los datos de Holded SIN GUARDAR NADA

import { readFileSync } from 'fs';
import { join } from 'path';

// Leer .env.local manualmente
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const envFile = readFileSync(envPath, 'utf-8');
    const lines = envFile.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  } catch (e) {
    console.error('Error loading .env.local:', e);
  }
}

loadEnv();

async function fetchHoldedOrders() {
  const apiKey = process.env.HOLDED_API_KEY;
  
  if (!apiKey) {
    throw new Error('HOLDED_API_KEY no encontrada en .env.local');
  }

  const response = await fetch('https://api.holded.com/api/invoicing/v1/documents/salesorder', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Holded API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function main() {
  console.log('🔍 TEST: Obteniendo pedidos desde Holded...\n');
  console.log('⚠️  MODO SOLO LECTURA - No se guardará nada en Firestore\n');
  console.log('═'.repeat(80));

  try {
    // Obtener pedidos
    console.log('\n📦 Llamando a Holded API: GET /documents/salesorder...');
    const orders = await fetchHoldedOrders();
    
    if (!orders || orders.length === 0) {
      console.log('\n❌ No se encontraron pedidos en Holded');
      return;
    }

    console.log(`\n✅ Se encontraron ${orders.length} pedidos en total`);
    console.log(`\n📋 Mostrando los primeros 5 pedidos:\n`);
    console.log('═'.repeat(80));

    // Mostrar primeros 5 pedidos
    const firstFive = orders.slice(0, 5);
    
    firstFive.forEach((order: any, index: number) => {
      console.log(`\n🔹 PEDIDO #${index + 1}`);
      console.log('─'.repeat(80));
      console.log(JSON.stringify(order, null, 2));
      console.log('─'.repeat(80));
    });

    // Resumen de campos importantes
    console.log('\n\n📊 RESUMEN DE CAMPOS DETECTADOS:\n');
    console.log('═'.repeat(80));
    
    const firstOrder = orders[0] as any;
    const fields = Object.keys(firstOrder);
    
    console.log(`\n✅ Campos disponibles (${fields.length} total):\n`);
    fields.forEach((field: string) => {
      const value = (firstOrder as any)[field];
      const type = Array.isArray(value) ? 'array' : typeof value;
      const preview = Array.isArray(value) 
        ? `[${value.length} items]`
        : type === 'object' && value !== null
          ? '{...}'
          : String(value).substring(0, 50);
      
      console.log(`  • ${field.padEnd(20)} → ${type.padEnd(10)} → ${preview}`);
    });

    // Análisis de líneas de pedido
    if (firstOrder.lines && Array.isArray(firstOrder.lines) && firstOrder.lines.length > 0) {
      console.log('\n\n📦 ESTRUCTURA DE LÍNEAS DE PEDIDO:\n');
      console.log('═'.repeat(80));
      const firstLine = firstOrder.lines[0];
      console.log(JSON.stringify(firstLine, null, 2));
    }

    // Estadísticas
    console.log('\n\n📈 ESTADÍSTICAS:\n');
    console.log('═'.repeat(80));
    console.log(`Total de pedidos: ${orders.length}`);
    console.log(`Estados encontrados: ${[...new Set(orders.map((o: any) => o.status))].join(', ')}`);
    console.log(`Monedas encontradas: ${[...new Set(orders.map((o: any) => o.currency || 'EUR'))].join(', ')}`);
    
    const totalAmount = orders.reduce((sum: number, o: any) => sum + ((o.total as number) || 0), 0);
    console.log(`Suma total de pedidos: ${totalAmount.toFixed(2)} EUR`);

    console.log('\n\n✅ PRUEBA COMPLETADA - No se guardó nada en Firestore');
    console.log('═'.repeat(80));

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error('\n📍 Stack trace:');
      console.error(error.stack);
    }
  }
}

// Ejecutar
main().catch(console.error);
