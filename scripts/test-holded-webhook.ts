// scripts/test-holded-webhook.ts
// Script para testear el webhook de Holded Estimate

const WEBHOOK_URL = 'http://localhost:3000/api/integrations/holded/webhooks/estimate';

const mockEstimatePayload = {
  event: 'estimate.created',
  data: {
    id: 'est_test_123456',
    contactId: '507f1f77bcf86cd799439011', // Mock Holded contact ID
    date: new Date().toISOString().split('T')[0],
    items: [
      {
        sku: 'SB-KOMBUCHA-350',
        name: 'Kombucha Santa Brisa 350ml',
        units: 24,
        price: 2.50,
        tax: 21,
        discount: 0
      },
      {
        sku: 'SB-KOMBUCHA-750',
        name: 'Kombucha Santa Brisa 750ml',
        units: 12,
        price: 4.80,
        tax: 21,
        discount: 10
      }
    ],
    total: 121.56,
    notes: 'Pedido de prueba desde webhook test'
  }
};

async function testWebhook() {
  console.log('🧪 Testing Holded Estimate Webhook...\n');
  console.log('📤 Sending payload:');
  console.log(JSON.stringify(mockEstimatePayload, null, 2));
  console.log('\n---\n');

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockEstimatePayload),
    });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('\n📥 Response body:');
    console.log(JSON.stringify(data, null, 2));

    if (response.ok && data.ok) {
      console.log('\n✅ Test PASSED!');
      console.log(`   Order created: ${data.orderId}`);
      console.log(`   Message: ${data.message}`);
    } else {
      console.log('\n❌ Test FAILED!');
      console.log(`   Error: ${data.error || 'Unknown error'}`);
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ Test ERROR!');
    console.error(error.message);
    process.exit(1);
  }
}

// Run test
testWebhook();
