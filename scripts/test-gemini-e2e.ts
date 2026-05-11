/**
 * Test E2E - Gemini Intelligence System
 * 
 * Prueba completa de:
 * - Stock Analyzer
 * - Sales Analyzer
 * - Server Actions
 * - Integración Firestore
 * - Cost tracking
 */

import admin from 'firebase-admin';

// Inicializar Firebase Admin ANTES de importar los módulos
if (!admin.apps.length) {
  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// AHORA importar los módulos que dependen de Firebase
import { StockAnalyzer } from '../src/server/gemini/analyzers/stock-analyzer';
import { SalesAnalyzer } from '../src/server/gemini/analyzers/sales-analyzer';
import { 
  analyzeStock, 
  analyzeSales,
  analyzeAllCriticalStock,
  analyzeAllAccounts,
  getStockAnalysisHistory,
  getSalesForecastHistory,
  getGeminiUsageStats
} from '../src/server/actions/ai-insights';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(emoji: string, message: string, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log(`${'='.repeat(60)}\n`);
}

function logSuccess(message: string) {
  log('✅', message, colors.green);
}

function logError(message: string) {
  log('❌', message, colors.red);
}

function logWarning(message: string) {
  log('⚠️', message, colors.yellow);
}

function logInfo(message: string) {
  log('ℹ️', message, colors.blue);
}

// Helper para obtener un item de prueba
async function getTestItem(): Promise<string | null> {
  try {
    const onHandSnap = await db.collection('onHand')
      .where('qty', '>', 0)
      .where('qty', '<', 100)
      .limit(1)
      .get();
    
    if (!onHandSnap.empty) {
      return onHandSnap.docs[0].data().itemId;
    }
    
    // Fallback: cualquier item
    const itemsSnap = await db.collection('items').limit(1).get();
    if (!itemsSnap.empty) {
      return itemsSnap.docs[0].id;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting test item:', error);
    return null;
  }
}

// Helper para obtener una cuenta de prueba
async function getTestAccount(): Promise<string | null> {
  try {
    const accountsSnap = await db.collection('accounts')
      .where('status', '==', 'active')
      .limit(1)
      .get();
    
    if (!accountsSnap.empty) {
      return accountsSnap.docs[0].id;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting test account:', error);
    return null;
  }
}

// Tests
async function testStockAnalyzer() {
  logSection('TEST 1: Stock Analyzer');
  
  try {
    const testItemId = await getTestItem();
    
    if (!testItemId) {
      logWarning('No test item found in database');
      return { success: false, skipped: true };
    }
    
    logInfo(`Testing with item: ${testItemId}`);
    
    const analyzer = new StockAnalyzer();
    const analysis = await analyzer.analyze(testItemId);
    
    // Validaciones
    if (!analysis.id) throw new Error('Missing analysis.id');
    if (analysis.type !== 'stock') throw new Error('Wrong analysis type');
    if (!analysis.itemId) throw new Error('Missing itemId');
    if (!analysis.itemName) throw new Error('Missing itemName');
    if (typeof analysis.freeStock !== 'number') throw new Error('Invalid freeStock');
    if (typeof analysis.avgConsumption !== 'number') throw new Error('Invalid avgConsumption');
    if (!['low', 'medium', 'high', 'critical'].includes(analysis.riskLevel)) {
      throw new Error('Invalid riskLevel');
    }
    
    logSuccess('Analysis structure validated');
    logInfo(`  - Risk Level: ${analysis.riskLevel}`);
    logInfo(`  - Free Stock: ${analysis.freeStock} units`);
    logInfo(`  - Avg Consumption: ${analysis.avgConsumption.toFixed(2)} units/day`);
    logInfo(`  - Days Until Stockout: ${Math.floor(analysis.daysUntilStockout)}`);
    logInfo(`  - Insights: ${analysis.insights?.length || 0}`);
    logInfo(`  - Recommendations: ${analysis.recommendations.length}`);
    
    return { success: true, analysis };
  } catch (error) {
    logError(`Stock Analyzer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    return { success: false, error };
  }
}

async function testSalesAnalyzer() {
  logSection('TEST 2: Sales Analyzer');
  
  try {
    const testAccountId = await getTestAccount();
    
    if (!testAccountId) {
      logWarning('No test account found in database');
      return { success: false, skipped: true };
    }
    
    logInfo(`Testing with account: ${testAccountId}`);
    
    const analyzer = new SalesAnalyzer();
    const forecast = await analyzer.analyze(testAccountId);
    
    // Validaciones
    if (!forecast.id) throw new Error('Missing forecast.id');
    if (forecast.type !== 'sales') throw new Error('Wrong forecast type');
    if (!forecast.accountId) throw new Error('Missing accountId');
    if (!forecast.accountName) throw new Error('Missing accountName');
    if (typeof forecast.currentMonthRevenue !== 'number') throw new Error('Invalid currentMonthRevenue');
    if (typeof forecast.forecastNextMonth !== 'number') throw new Error('Invalid forecastNextMonth');
    if (typeof forecast.confidence !== 'number') throw new Error('Invalid confidence');
    if (!['growing', 'stable', 'declining'].includes(forecast.trend)) {
      throw new Error('Invalid trend');
    }
    
    logSuccess('Forecast structure validated');
    logInfo(`  - Trend: ${forecast.trend}`);
    logInfo(`  - Current Month Revenue: €${forecast.currentMonthRevenue.toFixed(2)}`);
    logInfo(`  - Forecast Next Month: €${forecast.forecastNextMonth.toFixed(2)}`);
    logInfo(`  - Confidence: ${forecast.confidence}%`);
    logInfo(`  - Monthly History: ${forecast.monthlyHistory.length} months`);
    logInfo(`  - Factors: ${forecast.factors.length}`);
    logInfo(`  - Recommendations: ${forecast.recommendations.length}`);
    
    return { success: true, forecast };
  } catch (error) {
    logError(`Sales Analyzer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    return { success: false, error };
  }
}

async function testStockServerAction() {
  logSection('TEST 3: Stock Server Action');
  
  try {
    const testItemId = await getTestItem();
    
    if (!testItemId) {
      logWarning('No test item found');
      return { success: false, skipped: true };
    }
    
    const result = await analyzeStock(testItemId);
    
    if (!result.success) {
      throw new Error(result.error || 'Server action failed');
    }
    
    if (!result.analysis) {
      throw new Error('No analysis returned');
    }
    
    logSuccess('Server action successful');
    logInfo(`  - Analysis ID: ${result.analysis.id}`);
    logInfo(`  - Risk Level: ${result.analysis.riskLevel}`);
    
    // Verificar que se guardó en Firestore
    const analysisDoc = await db.collection('ai_analyses')
      .where('type', '==', 'stock')
      .where('entityId', '==', testItemId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (analysisDoc.empty) {
      throw new Error('Analysis not saved to Firestore');
    }
    
    logSuccess('Analysis saved to Firestore');
    
    // Verificar alertas si es crítico
    if (result.analysis.riskLevel === 'critical' || result.analysis.riskLevel === 'high') {
      const alertsSnap = await db.collection('alerts')
        .where('kind', '==', 'STOCK_PREDICTION')
        .where('entities.itemId', '==', testItemId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (!alertsSnap.empty) {
        logSuccess('Alert created for critical stock');
      }
    }
    
    return { success: true, result };
  } catch (error) {
    logError(`Stock server action failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    return { success: false, error };
  }
}

async function testSalesServerAction() {
  logSection('TEST 4: Sales Server Action');
  
  try {
    const testAccountId = await getTestAccount();
    
    if (!testAccountId) {
      logWarning('No test account found');
      return { success: false, skipped: true };
    }
    
    const result = await analyzeSales(testAccountId);
    
    if (!result.success) {
      throw new Error(result.error || 'Server action failed');
    }
    
    if (!result.forecast) {
      throw new Error('No forecast returned');
    }
    
    logSuccess('Server action successful');
    logInfo(`  - Forecast ID: ${result.forecast.id}`);
    logInfo(`  - Trend: ${result.forecast.trend}`);
    
    // Verificar que se guardó en Firestore
    const forecastDoc = await db.collection('ai_analyses')
      .where('type', '==', 'sales')
      .where('entityId', '==', testAccountId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (forecastDoc.empty) {
      throw new Error('Forecast not saved to Firestore');
    }
    
    logSuccess('Forecast saved to Firestore');
    
    // Verificar alertas si es declining
    if (result.forecast.trend === 'declining' || result.forecast.confidence < 50) {
      const alertsSnap = await db.collection('alerts')
        .where('kind', '==', 'SALES_PREDICTION')
        .where('entities.accountId', '==', testAccountId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (!alertsSnap.empty) {
        logSuccess('Alert created for declining sales');
      }
    }
    
    return { success: true, result };
  } catch (error) {
    logError(`Sales server action failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    return { success: false, error };
  }
}

async function testBulkAnalysis() {
  logSection('TEST 5: Bulk Analysis');
  
  try {
    logInfo('Testing analyzeAllCriticalStock()...');
    const stockResult = await analyzeAllCriticalStock();
    
    if (!stockResult.success) {
      throw new Error('Bulk stock analysis failed');
    }
    
    logSuccess(`Analyzed ${stockResult.analyses.length} critical items`);
    logInfo(`  - Critical items: ${stockResult.criticalItems}`);
    
    logInfo('Testing analyzeAllAccounts()...');
    const salesResult = await analyzeAllAccounts();
    
    if (!salesResult.success) {
      throw new Error('Bulk sales analysis failed');
    }
    
    logSuccess(`Analyzed ${salesResult.forecasts.length} accounts`);
    logInfo(`  - Declining accounts: ${salesResult.declining}`);
    
    return { success: true, stockResult, salesResult, skipped: false };
  } catch (error) {
    logError(`Bulk analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    return { success: false, error, skipped: false };
  }
}

async function testHistory() {
  logSection('TEST 6: Analysis History');
  
  try {
    const testItemId = await getTestItem();
    const testAccountId = await getTestAccount();
    
    if (testItemId) {
      const stockHistory = await getStockAnalysisHistory(testItemId, 5);
      if (stockHistory.success) {
        logSuccess(`Retrieved ${stockHistory.analyses.length} stock analyses`);
      } else {
        throw new Error('Failed to get stock history');
      }
    }
    
    if (testAccountId) {
      const salesHistory = await getSalesForecastHistory(testAccountId, 5);
      if (salesHistory.success) {
        logSuccess(`Retrieved ${salesHistory.forecasts.length} sales forecasts`);
      } else {
        throw new Error('Failed to get sales history');
      }
    }
    
    return { success: true, skipped: false };
  } catch (error) {
    logError(`History retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    return { success: false, error, skipped: false };
  }
}

async function testCostTracking() {
  logSection('TEST 7: Cost Tracking');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const stats = await getGeminiUsageStats(today, today);
    
    if (!stats.success) {
      throw new Error('Failed to get usage stats');
    }
    
    if (stats.stats) {
      logSuccess('Usage stats retrieved');
      logInfo(`  - Total Calls: ${stats.stats.totalCalls}`);
      logInfo(`  - Total Tokens: ${stats.stats.totalTokens}`);
      logInfo(`  - Total Cost: $${stats.stats.totalCost.toFixed(4)}`);
      logInfo(`  - Avg Latency: ${stats.stats.avgLatency.toFixed(0)}ms`);
      logInfo(`  - Simple calls: ${stats.stats.byComplexity.simple.calls}`);
      logInfo(`  - Medium calls: ${stats.stats.byComplexity.medium.calls}`);
      logInfo(`  - Complex calls: ${stats.stats.byComplexity.complex.calls}`);
    } else {
      logWarning('No usage data for today yet');
    }
    
    return { success: true, stats, skipped: false };
  } catch (error) {
    logError(`Cost tracking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    return { success: false, error, skipped: false };
  }
}

// Main test runner
async function runTests() {
  console.log('\n🧪 GEMINI INTELLIGENCE E2E TESTS');
  console.log('='.repeat(60));
  console.log('Testing: Stock + Sales Analyzers + Server Actions');
  console.log('='.repeat(60));
  
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: [] as any[]
  };
  
  // Test 1: Stock Analyzer
  const test1 = await testStockAnalyzer();
  results.tests.push({ name: 'Stock Analyzer', ...test1 });
  if (test1.success) results.passed++;
  else if (test1.skipped) results.skipped++;
  else results.failed++;
  
  // Test 2: Sales Analyzer
  const test2 = await testSalesAnalyzer();
  results.tests.push({ name: 'Sales Analyzer', ...test2 });
  if (test2.success) results.passed++;
  else if (test2.skipped) results.skipped++;
  else results.failed++;
  
  // Test 3: Stock Server Action
  const test3 = await testStockServerAction();
  results.tests.push({ name: 'Stock Server Action', ...test3 });
  if (test3.success) results.passed++;
  else if (test3.skipped) results.skipped++;
  else results.failed++;
  
  // Test 4: Sales Server Action
  const test4 = await testSalesServerAction();
  results.tests.push({ name: 'Sales Server Action', ...test4 });
  if (test4.success) results.passed++;
  else if (test4.skipped) results.skipped++;
  else results.failed++;
  
  // Test 5: Bulk Analysis
  const test5 = await testBulkAnalysis();
  results.tests.push({ name: 'Bulk Analysis', ...test5 });
  if (test5.success) results.passed++;
  else if (test5.skipped) results.skipped++;
  else results.failed++;
  
  // Test 6: History
  const test6 = await testHistory();
  results.tests.push({ name: 'Analysis History', ...test6 });
  if (test6.success) results.passed++;
  else if (test6.skipped) results.skipped++;
  else results.failed++;
  
  // Test 7: Cost Tracking
  const test7 = await testCostTracking();
  results.tests.push({ name: 'Cost Tracking', ...test7 });
  if (test7.success) results.passed++;
  else if (test7.skipped) results.skipped++;
  else results.failed++;
  
  // Summary
  logSection('TEST SUMMARY');
  log('📊', `Total Tests: ${results.tests.length}`, colors.cyan);
  log('✅', `Passed: ${results.passed}`, colors.green);
  log('❌', `Failed: ${results.failed}`, colors.red);
  log('⏭️', `Skipped: ${results.skipped}`, colors.yellow);
  
  if (results.failed > 0) {
    console.log('\n' + colors.red + 'Some tests failed. See details above.' + colors.reset);
    process.exit(1);
  } else if (results.passed === 0) {
    console.log('\n' + colors.yellow + 'All tests were skipped (no test data available).' + colors.reset);
    console.log(colors.yellow + 'Please ensure you have items and accounts in Firestore.' + colors.reset);
    process.exit(0);
  } else {
    console.log('\n' + colors.green + '🎉 All tests passed successfully!' + colors.reset);
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('\n' + colors.red + '💥 Fatal error running tests:' + colors.reset);
  console.error(error);
  process.exit(1);
});
