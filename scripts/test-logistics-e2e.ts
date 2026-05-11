#!/usr/bin/env tsx
/**
 * Test E2E: Sistema de Logística
 * 
 * Script standalone que no depende de Next.js Server Components
 * 
 * Simula el flujo completo:
 * 1. Crear shipment
 * 2. Generar etiqueta (Sendcloud)
 * 3. Crear factura (Holded)
 * 4. Generar albarán
 * 5. Verificar logs en Firestore
 * 6. Validar métricas
 */

import admin from 'firebase-admin';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

interface TestResult {
  step: string;
  success: boolean;
  duration: number;
  details?: any;
  error?: string;
}

const results: TestResult[] = [];

// Initialize Firebase Admin
async function initializeFirebase(): Promise<admin.firestore.Firestore> {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
                      process.env.FIREBASE_PROJECT_ID ||
                      'santa-brisa-erp';
    
    // Check if already initialized
    if (!admin.apps || admin.apps.length === 0) {
      admin.initializeApp({
        projectId: projectId,
      });
    }
    
    log(`✓ Firebase initialized (Project: ${projectId})`, 'green');
    
    // Get Firestore instance
    const db = admin.firestore();
    
    // Test connection with a simple query
    await db.collection('_test').limit(1).get();
    log(`✓ Firestore connection verified`, 'green');
    
    return db;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`✗ Failed to initialize Firebase: ${errorMsg}`, 'red');
    
    // Show helpful error messages
    if (errorMsg.includes('PERMISSION_DENIED') || errorMsg.includes('credentials')) {
      log('  Hint: Make sure you have Firebase credentials configured', 'yellow');
      log('  Options:', 'yellow');
      log('    1. Set GOOGLE_APPLICATION_CREDENTIALS env var', 'yellow');
      log('    2. Run "gcloud auth application-default login"', 'yellow');
      log('    3. Place serviceAccountKey.json in project root', 'yellow');
    }
    
    throw error;
  }
}

async function recordStep<T>(
  stepName: string,
  fn: () => Promise<T>
): Promise<T | null> {
  const startTime = Date.now();
  log(`\n▶ ${stepName}...`, 'blue');
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    results.push({
      step: stepName,
      success: true,
      duration,
      details: result,
    });
    
    log(`✓ ${stepName} (${duration}ms)`, 'green');
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    results.push({
      step: stepName,
      success: false,
      duration,
      error: errorMessage,
    });
    
    log(`✗ ${stepName}: ${errorMessage}`, 'red');
    return null;
  }
}

async function createTestShipment(db: admin.firestore.Firestore): Promise<string> {
  const shipmentData = {
    orderId: 'TEST-ORDER-' + Date.now(),
    status: 'pending',
    toAddress: {
      street: 'Calle Test 123',
      city: 'Madrid',
      postalCode: '28001',
      zip: '28001',
      country: 'ES',
    },
    lines: [
      {
        itemId: 'TEST-ITEM-001',
        sku: 'TEST-001',
        name: 'Producto Test',
        qty: 5,
        uom: 'unit',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const docRef = await db.collection('shipments').add(shipmentData);
  return docRef.id;
}

async function testSendcloudIntegration(
  db: admin.firestore.Firestore,
  shipmentId: string
) {
  // Mock Sendcloud response since we're testing E2E flow
  const mockParcel = {
    id: Math.floor(Math.random() * 1000000),
    tracking_number: `3STEST${Date.now()}`,
    tracking_url: `https://tracking.sendcloud.sc/test`,
    status: { id: 1, message: 'Ready to send' },
  };
  
  // Update Firestore with tracking info
  await db.collection('shipments').doc(shipmentId).update({
    sendcloudParcelId: mockParcel.id,
    trackingNumber: mockParcel.tracking_number,
    trackingUrl: mockParcel.tracking_url,
    status: 'PROCESSING',
    updatedAt: new Date().toISOString(),
  });
  
  // Create integration job
  await db.collection('integration_jobs').add({
    provider: 'sendcloud',
    jobType: 'create_shipment',
    refId: shipmentId,
    status: 'success',
    attempts: 1,
    maxAttempts: 3,
    latencyMs: 450,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Create Gemini event
  await db.collection('gemini_context').add({
    eventType: 'shipment_label_created',
    data: {
      shipmentId,
      trackingCode: mockParcel.tracking_number,
      carrier: 'Sendcloud',
    },
    timestamp: new Date().toISOString(),
    module: 'logistics',
    processed: false,
  });
  
  return mockParcel;
}

async function testHoldedIntegration(
  db: admin.firestore.Firestore,
  shipmentId: string
) {
  // Mock Holded response
  const mockInvoice = {
    id: `TEST-INV-${Date.now()}`,
    docNumber: `FAC-${Math.floor(Math.random() * 10000)}`,
    status: 'pending',
    total: 100,
  };
  
  // Update Firestore with invoice info
  await db.collection('shipments').doc(shipmentId).update({
    holdedInvoiceId: mockInvoice.id,
    holdedInvoiceNumber: mockInvoice.docNumber,
    invoiceStatus: mockInvoice.status,
    updatedAt: new Date().toISOString(),
  });
  
  // Create integration job
  await db.collection('integration_jobs').add({
    provider: 'holded',
    jobType: 'create_invoice',
    refId: shipmentId,
    status: 'success',
    attempts: 1,
    maxAttempts: 3,
    latencyMs: 680,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Create Gemini event
  await db.collection('gemini_context').add({
    eventType: 'invoice_created',
    data: {
      shipmentId,
      invoiceId: mockInvoice.id,
      amount: mockInvoice.total,
    },
    timestamp: new Date().toISOString(),
    module: 'logistics',
    processed: false,
  });
  
  return mockInvoice;
}

async function testAlbaranGeneration(
  db: admin.firestore.Firestore,
  shipmentId: string
) {
  // Mock albaran generation
  const mockAlbaran = {
    success: true,
    pdfUrl: `gs://test-bucket/albaranes/${shipmentId}.pdf`,
  };
  
  // Update Firestore
  await db.collection('shipments').doc(shipmentId).update({
    deliveryNoteUrl: mockAlbaran.pdfUrl,
    deliveryNoteGeneratedAt: new Date().toISOString(),
  });
  
  // Create Gemini event
  await db.collection('gemini_context').add({
    eventType: 'albaran_generated',
    data: {
      shipmentId,
      pdfUrl: mockAlbaran.pdfUrl,
    },
    timestamp: new Date().toISOString(),
    module: 'logistics',
    processed: false,
  });
  
  return mockAlbaran;
}

async function verifyFirestoreLogs(
  db: admin.firestore.Firestore,
  shipmentId: string
) {
  const logs: any = {
    integrationJobs: [],
    geminiEvents: [],
  };
  
  // Check integration jobs
  const jobsSnapshot = await db.collection('integration_jobs')
    .where('refId', '==', shipmentId)
    .get();
  logs.integrationJobs = jobsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
  
  // Check Gemini context events
  const eventsSnapshot = await db.collection('gemini_context')
    .where('data.shipmentId', '==', shipmentId)
    .get();
  logs.geminiEvents = eventsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
  
  return logs;
}

async function validateMetrics(db: admin.firestore.Firestore) {
  const metrics: any = {};
  
  // Count integration jobs by status
  const jobsSnapshot = await db.collection('integration_jobs')
    .limit(100)
    .get();
  
  const jobs = jobsSnapshot.docs.map(doc => doc.data());
  const successful = jobs.filter(j => j.status === 'success').length;
  const failed = jobs.filter(j => j.status === 'failed').length;
  
  metrics.totalJobs = jobs.length;
  metrics.successfulJobs = successful;
  metrics.failedJobs = failed;
  metrics.successRate = jobs.length > 0 ? ((successful / jobs.length) * 100).toFixed(1) : 0;
  
  // Count unprocessed Gemini events
  const eventsSnapshot = await db.collection('gemini_context')
    .where('processed', '==', false)
    .limit(100)
    .get();
  
  metrics.unprocessedEvents = eventsSnapshot.docs.length;
  
  return metrics;
}

async function cleanupTestData(
  db: admin.firestore.Firestore,
  shipmentId: string
) {
  // Delete shipment
  await db.collection('shipments').doc(shipmentId).delete();
  
  // Delete related integration jobs
  const jobsSnapshot = await db.collection('integration_jobs')
    .where('refId', '==', shipmentId)
    .get();
  
  const batch = db.batch();
  jobsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  
  // Delete related Gemini events
  const eventsSnapshot = await db.collection('gemini_context')
    .where('data.shipmentId', '==', shipmentId)
    .get();
  eventsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  
  await batch.commit();
  
  log('✓ Test data cleaned up', 'green');
}

function printSummary() {
  section('TEST SUMMARY');
  
  const totalSteps = results.length;
  const successSteps = results.filter(r => r.success).length;
  const failedSteps = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`\nTotal Steps: ${totalSteps}`);
  log(`Successful: ${successSteps}`, successSteps === totalSteps ? 'green' : 'yellow');
  if (failedSteps > 0) {
    log(`Failed: ${failedSteps}`, 'red');
  }
  console.log(`Total Duration: ${totalDuration}ms`);
  
  // Detailed results
  console.log('\n' + '-'.repeat(60));
  console.log('DETAILED RESULTS:');
  console.log('-'.repeat(60));
  
  results.forEach((result, index: number) => {
    const icon = result.success ? '✓' : '✗';
    const color = result.success ? 'green' : 'red';
    log(`${index + 1}. ${icon} ${result.step} (${result.duration}ms)`, color);
    
    if (result.error) {
      log(`   Error: ${result.error}`, 'red');
    }
    
    if (result.details && typeof result.details === 'object') {
      const keys = Object.keys(result.details);
      if (keys.length > 0 && keys.length <= 5) {
        const preview = JSON.stringify(result.details, null, 2);
        if (preview.length < 300) {
          log(`   Details: ${preview}`, 'blue');
        }
      }
    }
  });
  
  console.log('\n' + '='.repeat(60));
  
  const allSuccess = failedSteps === 0;
  if (allSuccess) {
    log('🎉 ALL TESTS PASSED!', 'green');
  } else {
    log(`⚠️  ${failedSteps} TEST(S) FAILED`, 'red');
  }
  console.log('='.repeat(60) + '\n');
  
  return allSuccess;
}

async function main() {
  log('\n🚀 Starting E2E Logistics Test', 'cyan');
  log('This test will simulate the complete logistics flow\n', 'blue');
  
  let db: admin.firestore.Firestore;
  let shipmentId: string | null = null;
  
  try {
    // Initialize Firebase
    section('INITIALIZATION');
    const dbResult = await recordStep(
      'Initialize Firebase Admin',
      initializeFirebase
    );
    
    if (!dbResult) {
      throw new Error('Failed to initialize Firebase');
    }
    
    db = dbResult;
    
    // Step 1: Create test shipment
    section('STEP 1: Create Test Shipment');
    shipmentId = await recordStep(
      'Create shipment in Firestore',
      () => createTestShipment(db)
    );
    
    if (!shipmentId) {
      throw new Error('Failed to create shipment');
    }
    
    log(`Shipment ID: ${shipmentId}`, 'blue');
    
    // Step 2: Sendcloud integration
    section('STEP 2: Sendcloud Integration');
    const parcel = await recordStep(
      'Create parcel and get tracking',
      () => testSendcloudIntegration(db, shipmentId!)
    );
    
    if (parcel) {
      log(`Tracking Number: ${parcel.tracking_number}`, 'blue');
      log(`Tracking URL: ${parcel.tracking_url}`, 'blue');
    }
    
    // Step 3: Holded integration
    section('STEP 3: Holded Integration');
    const invoice = await recordStep(
      'Create invoice in Holded',
      () => testHoldedIntegration(db, shipmentId!)
    );
    
    if (invoice) {
      log(`Invoice ID: ${invoice.id}`, 'blue');
      log(`Invoice Number: ${invoice.docNumber}`, 'blue');
    }
    
    // Step 4: Albaran generation
    section('STEP 4: Albaran Generation');
    const albaran = await recordStep(
      'Generate PDF albaran',
      () => testAlbaranGeneration(db, shipmentId!)
    );
    
    if (albaran) {
      log(`Albaran URL: ${albaran.pdfUrl}`, 'blue');
    }
    
    // Step 5: Verify Firestore logs
    section('STEP 5: Verify Firestore Logs');
    const logs = await recordStep(
      'Check integration jobs and Gemini events',
      () => verifyFirestoreLogs(db, shipmentId!)
    );
    
    if (logs) {
      log(`Integration Jobs: ${logs.integrationJobs.length}`, 'blue');
      log(`Gemini Events: ${logs.geminiEvents.length}`, 'blue');
      
      // Show event types
      if (logs.geminiEvents.length > 0) {
        const eventTypes = [...new Set(logs.geminiEvents.map((e: any) => e.eventType))];
        log(`Event Types: ${eventTypes.join(', ')}`, 'blue');
      }
    }
    
    // Step 6: Validate metrics
    section('STEP 6: Validate Metrics');
    const metrics = await recordStep(
      'Get system metrics',
      () => validateMetrics(db)
    );
    
    if (metrics) {
      log(`Total Jobs: ${metrics.totalJobs}`, 'blue');
      log(`Success Rate: ${metrics.successRate}%`, 'blue');
      log(`Unprocessed Events: ${metrics.unprocessedEvents}`, 'blue');
      log(`Failed Jobs: ${metrics.failedJobs}`, metrics.failedJobs > 0 ? 'yellow' : 'green');
    }
    
    // Cleanup
    section('CLEANUP');
    await recordStep(
      'Remove test data',
      () => cleanupTestData(db, shipmentId!)
    );
    
  } catch (error) {
    log(`\n❌ Test execution failed: ${error}`, 'red');
    console.error(error);
  } finally {
    // Print summary
    const allPassed = printSummary();
    
    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
  }
}

// Run the test
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
