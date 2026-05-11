#!/usr/bin/env npx tsx
// scripts/test-holded-invoices.ts
// Script de prueba para ver cómo llegan las facturas de Holded SIN GUARDAR NADA

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

async function fetchHoldedInvoices() {
  const apiKey = process.env.HOLDED_API_KEY;
  
  if (!apiKey) {
    throw new Error('HOLDED_API_KEY no encontrada en .env.local');
  }

  const response = await fetch('https://api.holded.com/api/invoicing/v1/documents/invoice', {
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
  console.log('🔍 TEST: Obteniendo facturas desde Holded...\n');
  console.log('⚠️  MODO SOLO LECTURA - No se guardará nada en Firestore\n');
  console.log('═'.repeat(80));

  try {
    // Obtener facturas
    console.log('\n📄 Llamando a Holded API: GET /documents/invoice...');
    const invoices = await fetchHoldedInvoices();
    
    if (!invoices || invoices.length === 0) {
      console.log('\n❌ No se encontraron facturas en Holded');
      return;
    }

    console.log(`\n✅ Se encontraron ${invoices.length} facturas en total`);
    console.log(`\n📋 Mostrando las primeras 5 facturas:\n`);
    console.log('═'.repeat(80));

    // Mostrar primeras 5 facturas
    const firstFive = invoices.slice(0, 5);
    
    firstFive.forEach((invoice: any, index: number) => {
      console.log(`\n🔹 FACTURA #${index + 1}`);
      console.log('─'.repeat(80));
      console.log(JSON.stringify(invoice, null, 2));
      console.log('─'.repeat(80));
    });

    // Resumen de campos importantes
    console.log('\n\n📊 RESUMEN DE CAMPOS DETECTADOS:\n');
    console.log('═'.repeat(80));
    
    const firstInvoice = invoices[0];
    const fields = Object.keys(firstInvoice);
    
    console.log(`\n✅ Campos disponibles (${fields.length} total):\n`);
    fields.forEach((field: string) => {
      const value = (firstInvoice as any)[field];
      const type = Array.isArray(value) ? 'array' : typeof value;
      const preview = Array.isArray(value) 
        ? `[${value.length} items]`
        : type === 'object' && value !== null
          ? '{...}'
          : String(value).substring(0, 50);
      
      console.log(`  • ${field.padEnd(20)} → ${type.padEnd(10)} → ${preview}`);
    });

    // Análisis de líneas de factura
    if (firstInvoice.lines && Array.isArray(firstInvoice.lines) && firstInvoice.lines.length > 0) {
      console.log('\n\n📦 ESTRUCTURA DE LÍNEAS DE FACTURA:\n');
      console.log('═'.repeat(80));
      const firstLine = firstInvoice.lines[0];
      console.log(JSON.stringify(firstLine, null, 2));
    }

    // Estadísticas
    console.log('\n\n📈 ESTADÍSTICAS:\n');
    console.log('═'.repeat(80));
    console.log(`Total de facturas: ${invoices.length}`);
    console.log(`Estados encontrados: ${[...new Set(invoices.map((i: any) => i.status))].join(', ')}`);
    console.log(`Monedas encontradas: ${[...new Set(invoices.map((i: any) => i.currency || 'EUR'))].join(', ')}`);
    
    const totalAmount = invoices.reduce((sum: number, i: any) => sum + (i.total || 0), 0);
    console.log(`Suma total de facturas: ${totalAmount.toFixed(2)} EUR`);

    // Estadísticas de pago
    const paid = invoices.filter((i: any) => i.status === 2 || i.paymentStatus === 'paid');
    const pending = invoices.filter((i: any) => i.status === 1 || i.paymentStatus === 'pending');
    console.log(`\nFacturas pagadas: ${paid.length}`);
    console.log(`Facturas pendientes: ${pending.length}`);

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
