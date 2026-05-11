// scripts/test-logistics-integration.ts
// Set environment variables before imports
process.env.FIREBASE_PROJECT_ID = 'santa-brisa-erp';
process.env.GCLOUD_PROJECT = 'santa-brisa-erp';

import { adminDb as db } from '../src/server/firebase';
import { SendcloudClient } from '../src/server/integrations/sendcloud/client';
import { HoldedClient } from '../src/server/integrations/holded/client';
import { generateAlbaranPDF } from '../src/server/pdf/albaran-generator';
import type { Shipment } from '../src/domain/ssot';

async function testSendcloudIntegration() {
  console.log('\n🧪 TEST 1: Sendcloud Integration');
  console.log('================================');
  
  try {
    const sendcloudClient = new SendcloudClient();
    
    // Create test shipment
    const testShipment: Shipment = {
      id: 'test-shipment-123',
      orderId: 'test-order-123',
      status: 'DRAFT',
      fromWarehouseId: 'MAIN',
      toAddress: {
        street: 'Calle Test 123',
        city: 'Madrid',
        postalCode: '28001',
        country: 'ES'
      },
      lines: [
        {
          sku: 'TEST-SKU',
          name: 'Producto Test',
          qty: 5,
          uom: 'UNIT'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    
    console.log('📦 Creating Sendcloud shipment...');
    const parcel = await sendcloudClient.createShipment(testShipment);
    console.log('✅ Sendcloud shipment created:');
    console.log('   - ID:', parcel.id);
    console.log('   - Tracking:', parcel.tracking_number);
    console.log('   - URL:', parcel.tracking_url);
    
    console.log('\n🏷️ Getting label...');
    const label = await sendcloudClient.getLabel(parcel.id);
    console.log('✅ Label obtained:');
    console.log('   - Label URL:', label.label.substring(0, 50) + '...');
    console.log('   - Tracking URL:', label.trackingUrl);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Sendcloud test FAILED:');
    console.error('   Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('   Stack:', error.stack.split('\n').slice(0, 3).join('\n'));
    }
    return { success: false, error };
  }
}

async function testHoldedIntegration() {
  console.log('\n🧪 TEST 2: Holded Integration');
  console.log('================================');
  
  try {
    const holdedClient = new HoldedClient();
    
    // Create test shipment
    const testShipment: Shipment = {
      id: 'test-shipment-456',
      orderId: 'test-order-456',
      status: 'DRAFT',
      fromWarehouseId: 'MAIN',
      toAddress: {
        street: 'Calle Test 456',
        city: 'Barcelona',
        postalCode: '08001',
        country: 'ES'
      },
      lines: [
        {
          sku: 'TEST-SKU-2',
          name: 'Producto Test 2',
          qty: 3,
          uom: 'UNIT'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    
    console.log('📄 Creating Holded invoice...');
    const invoice = await holdedClient.createInvoice(testShipment, 'test-contact-id');
    console.log('✅ Holded invoice created:');
    console.log('   - ID:', invoice.id);
    console.log('   - Number:', invoice.docNumber);
    console.log('   - Status:', invoice.status);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Holded test FAILED:');
    console.error('   Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('   Stack:', error.stack.split('\n').slice(0, 3).join('\n'));
    }
    return { success: false, error };
  }
}

async function testAlbaranGeneration() {
  console.log('\n🧪 TEST 3: Albaran PDF Generation');
  console.log('================================');
  
  try {
    // First, check if we have any shipments in the database
    const shipmentsSnapshot = await db.collection('shipments').limit(1).get();
    
    if (shipmentsSnapshot.empty) {
      console.log('⚠️  No shipments found in database');
      console.log('   Creating test shipment...');
      
      // Create a test shipment
      const testShipmentRef = db.collection('shipments').doc();
      const testShipment = {
        id: testShipmentRef.id,
        orderId: 'test-order-789',
        status: 'DRAFT',
        fromWarehouseId: 'MAIN',
        shipmentNumber: 'ALB-TEST-001',
        customerName: 'Cliente Test',
        toAddress: {
          street: 'Calle Prueba 789',
          city: 'Valencia',
          postalCode: '46001',
          country: 'España'
        },
        lines: [
          {
            sku: 'TEST-SKU-3',
            name: 'Producto Test 3',
            qty: 2,
            uom: 'UNIT',
            lotNumber: 'LOT-001'
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await testShipmentRef.set(testShipment);
      console.log('✅ Test shipment created:', testShipmentRef.id);
      
      console.log('\n📄 Generating PDF...');
      const pdfUrl = await generateAlbaranPDF(testShipmentRef.id);
      console.log('✅ PDF generated successfully:');
      console.log('   - URL:', pdfUrl);
      
      // Clean up test shipment
      console.log('\n🧹 Cleaning up test shipment...');
      await testShipmentRef.delete();
      console.log('✅ Test shipment deleted');
      
    } else {
      const shipmentId = shipmentsSnapshot.docs[0].id;
      console.log('📦 Using existing shipment:', shipmentId);
      
      console.log('\n📄 Generating PDF...');
      const pdfUrl = await generateAlbaranPDF(shipmentId);
      console.log('✅ PDF generated successfully:');
      console.log('   - URL:', pdfUrl);
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Albaran generation test FAILED:');
    console.error('   Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('   Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
    return { success: false, error };
  }
}

async function main() {
  console.log('🚀 Starting Logistics Integration Tests\n');
  console.log('Mode: MOCK (using mock clients, not real APIs)\n');
  
  const results = {
    sendcloud: await testSendcloudIntegration(),
    holded: await testHoldedIntegration(),
    albaran: await testAlbaranGeneration()
  };
  
  console.log('\n📊 SUMMARY');
  console.log('====================');
  console.log('Sendcloud:', results.sendcloud.success ? '✅ PASS' : '❌ FAIL');
  console.log('Holded:   ', results.holded.success ? '✅ PASS' : '❌ FAIL');
  console.log('Albaran:  ', results.albaran.success ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = results.sendcloud.success && results.holded.success && results.albaran.success;
  
  if (allPassed) {
    console.log('\n🎉 All tests PASSED!');
    console.log('\nIf you\'re still having issues in the UI:');
    console.log('1. Check browser console for errors');
    console.log('2. Check server logs (terminal where npm run dev is running)');
    console.log('3. Verify the shipment has the correct status');
  } else {
    console.log('\n⚠️  Some tests FAILED');
    console.log('\nNext steps:');
    console.log('1. Check the error messages above');
    console.log('2. Verify environment variables are set correctly');
    console.log('3. Check Firebase configuration');
  }
  
  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
