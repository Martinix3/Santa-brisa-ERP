#!/usr/bin/env tsx
// Test Algolia search

import { findContactByName } from '../src/lib/algolia/search';

const testName = process.argv[2] || 'Le Clab';
const userId = process.argv[3] || 'Nico';

console.log(`\n🔍 Testing Algolia search...`);
console.log(`   Name: "${testName}"`);
console.log(`   UserId: "${userId}"\n`);

(async () => {
  try {
    const result = await findContactByName(testName, userId);
    
    if (result) {
      console.log('✅ FOUND:');
      console.log('   ID:', result.id);
      console.log('   Display Name:', result.displayName);
      console.log('   Segment:', result.segment || 'N/A');
      console.log('   Score:', result.score);
      console.log();
    } else {
      console.log('❌ NOT FOUND\n');
    }
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    console.error(error);
  }
})();
