import { adminDb } from '../src/server/firebase';

async function testParties() {
  console.log('🔍 Testing parties collection...');
  
  const snap = await adminDb.collection('parties').limit(10).get();
  console.log(`📊 parties count: ${snap.size}`);
  
  if (snap.size > 0) {
    console.log('✅ Sample party:');
    console.log(JSON.stringify(snap.docs[0].data(), null, 2));
  } else {
    console.log('❌ parties collection is EMPTY');
    
    // Check accounts instead
    const accountsSnap = await adminDb.collection('accounts').limit(5).get();
    console.log(`📊 accounts count: ${accountsSnap.size}`);
    
    if (accountsSnap.size > 0) {
      console.log('✅ Sample account:');
      console.log(JSON.stringify(accountsSnap.docs[0].data(), null, 2));
    }
  }
}

testParties().then(() => process.exit(0)).catch(console.error);
