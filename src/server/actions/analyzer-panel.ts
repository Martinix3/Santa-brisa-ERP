"use server";

import { SalesAnalyzer } from "../gemini/analyzers/sales-analyzer";
import { MarketingAnalyzer } from "../gemini/analyzers/marketing-analyzer";
import { ProductionAnalyzer } from "../gemini/analyzers/production-analyzer";
import { QualityAnalyzer } from "../gemini/analyzers/quality-analyzer";
import { StockAnalyzer } from "../gemini/analyzers/stock-analyzer";
import { WarehouseAnalyzer } from "../gemini/analyzers/warehouse-analyzer";
import { BomAnalyzer } from "../gemini/analyzers/bom-analyzer";
import { CodeAnalyzer } from "../gemini/analyzers/code-analyzer";
import { analyzeDocument } from "../gemini/analyzers/document-analyzer";
import { analyzeEmail } from "../gemini/analyzers/email-analyzer";
import { analyzeQuickLogIntent } from "../gemini/analyzers/quicklog-analyzer";
import { UIUXAnalyzer } from "../gemini/analyzers/uiux-analyzer";

const ANALYZERS: { [key: string]: any } = {
  sales: SalesAnalyzer,
  marketing: MarketingAnalyzer,
  production: ProductionAnalyzer,
  quality: QualityAnalyzer,
  stock: StockAnalyzer,
  warehouse: WarehouseAnalyzer,
  bom: BomAnalyzer,
  code: CodeAnalyzer,
  document: analyzeDocument,
  email: analyzeEmail,
  quicklog: analyzeQuickLogIntent,
  uiux: UIUXAnalyzer,
};

export async function getAnalyzerConfig(analyzer: string) {
  try {
    const analyzerClass = ANALYZERS[analyzer];
    if (!analyzerClass) {
      throw new Error(`Analyzer ${analyzer} not found`);
    }
    const instance = new analyzerClass();
    const config = await instance.getConfig();
    return { success: true, data: config };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAnalyzerConfig(analyzer: string, config: any) {
  try {
    const analyzerClass = ANALYZERS[analyzer];
    if (!analyzerClass) {
      throw new Error(`Analyzer ${analyzer} not found`);
    }
    const instance = new analyzerClass();
    await instance.updateConfig(config);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function runAnalyzer(analyzer: string, entityId: string, config?: any) {
  try {
    let result;
    const analyzerClass = ANALYZERS[analyzer];
    if (!analyzerClass) {
      throw new Error(`Analyzer ${analyzer} not found`);
    }

    // Handle both classes and functions
    if (analyzerClass.prototype && analyzerClass.prototype.constructor === analyzerClass) {
      const instance = new analyzerClass();
      result = await instance.analyze(entityId, config);
    } else {
      // @ts-ignore
      result = await analyzerClass(entityId, config);
    }
    
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
