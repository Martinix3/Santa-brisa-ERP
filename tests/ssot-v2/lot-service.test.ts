// tests/ssot-v2/lot-service.test.ts
import { LotService } from '../../src/services/canonical/lot.service';

/**
 * Tests básicos para LotService
 * Ejecutar con: npx tsx tests/ssot-v2/lot-service.test.ts
 */

function testLotCodeValidation() {
  console.log('🧪 Testing LotCode validation...');
  
  // Casos válidos
  const validCodes = [
    '25001-SB-001',      // Sin línea
    '25365-MAD-L1-999',  // Con línea
    '25100-BCN-PKG-123', // Packaging line
    '24001-SB-001',      // Año 2024
  ];
  
  validCodes.forEach(code => {
    const isValid = LotService.validateLotCode(code);
    console.log(`  ✅ ${code}: ${isValid ? 'VALID' : '❌ INVALID'}`);
    if (!isValid) throw new Error(`Expected ${code} to be valid`);
  });
  
  // Casos inválidos
  const invalidCodes = [
    'SB-ICE-001',        // Formato legacy
    '2025-SB-001',       // Año completo
    '25001-sb-001',      // Minúsculas
    '25001-SB-1',        // Secuencia corta
    '25366-SB-001',      // Día inválido (366)
    'abc-SB-001',        // No numérico
  ];
  
  invalidCodes.forEach(code => {
    const isValid = LotService.validateLotCode(code);
    console.log(`  ❌ ${code}: ${isValid ? '⚠️  INVALID PASSED' : 'INVALID'}`);
    if (isValid) throw new Error(`Expected ${code} to be invalid`);
  });
}

function testLotCodeParsing() {
  console.log('🧪 Testing LotCode parsing...');
  
  // Test sin línea
  const parsed1 = LotService.parseLotCode('25001-SB-001');
  if (!parsed1) throw new Error('Failed to parse valid lot code');
  
  console.log('  📅 25001-SB-001 parsed:');
  console.log(`    Year: ${parsed1.year}`);
  console.log(`    Day: ${parsed1.dayOfYear}`);
  console.log(`    Plant: ${parsed1.plant}`);
  console.log(`    Line: ${parsed1.line || 'none'}`);
  console.log(`    Sequence: ${parsed1.sequence}`);
  
  // Test con línea
  const parsed2 = LotService.parseLotCode('25365-MAD-L1-999');
  if (!parsed2) throw new Error('Failed to parse valid lot code with line');
  
  console.log('  📅 25365-MAD-L1-999 parsed:');
  console.log(`    Year: ${parsed2.year}`);
  console.log(`    Day: ${parsed2.dayOfYear}`);
  console.log(`    Plant: ${parsed2.plant}`);
  console.log(`    Line: ${parsed2.line || 'none'}`);
  console.log(`    Sequence: ${parsed2.sequence}`);
}

function testLegacyMigration() {
  console.log('🧪 Testing legacy lot migration...');
  
  const legacyLots = [
    {
      lotNumber: 'SB-ICE-001-2410-001',
      receivedAt: '2024-10-15T10:00:00Z'
    },
    {
      lotNumber: 'LOT-2024-001',
      createdAt: '2024-12-01T15:30:00Z'
    },
    {
      lotNumber: 'BATCH_XYZ_123',
      receivedAt: '2025-01-10T08:00:00Z'
    }
  ];
  
  legacyLots.forEach(lot => {
    const migrated = LotService.generateLotCodeFromLegacy(lot);
    console.log(`  🔄 ${lot.lotNumber} → ${migrated}`);
    
    // Verificar que el resultado es válido
    if (!LotService.validateLotCode(migrated)) {
      throw new Error(`Migration produced invalid lot code: ${migrated}`);
    }
  });
}

async function runTests() {
  try {
    console.log('🚀 LotService Tests\n');
    
    testLotCodeValidation();
    console.log('');
    
    testLotCodeParsing();
    console.log('');
    
    testLegacyMigration();
    console.log('');
    
    console.log('✅ All LotService tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runTests().catch(console.error);
}

export { testLotCodeValidation, testLotCodeParsing, testLegacyMigration };
