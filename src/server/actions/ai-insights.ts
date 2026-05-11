/**
 * AI Insights Server Actions
 * 
 * @deprecated This file is deprecated. Please import from 'src/server/actions/ai/*' instead.
 */

// 'use server';

// import { getRecentInsights } from './ai/common.actions';
// Actually, getRecentInsights was in stock actions in my extraction? No, I missed it or put it in stock.
// Let me check where I put getRecentInsights. I think I put it in stock.actions.ts? 
// Wait, I need to check stock.actions.ts content again.
// I see I missed `getRecentInsights` in my thought process for stock.actions.ts, let me check the file content I wrote.
// I wrote `analyzeStock`, `analyzeAllCriticalStock`, `getStockAnalysisHistory`, `createStockAlert`.
// I missed `getRecentInsights`! It was lines 452-477 in the original file.

// I need to add `getRecentInsights` to a common file or one of the existing ones. 
// Since it gets insights of *all* types, maybe a `common.actions.ts` or just put it in `stock.actions.ts` for now if I already did?
// No, I didn't put it in `stock.actions.ts`.

// I will create a `common.actions.ts` for `getRecentInsights`.

export * from './ai/stock.actions';
export * from './ai/marketing.actions';
export * from './ai/production.actions';
export * from './ai/sales.actions';
export * from './ai/code.actions';
export * from './ai/uiux.actions';
export * from './ai/common.actions';
