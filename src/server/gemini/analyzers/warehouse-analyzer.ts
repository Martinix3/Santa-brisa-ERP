/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/server/gemini/analyzers/warehouse-analyzer.ts
import { BaseAnalyzer, type AnalysisResult, type Recommendation } from "./base-analyzer";
import type { GoodsReceipt, OnHandView, StockMove, Item } from "@/domain/ssot";

export interface WarehouseAnalysisInput {
  goodsReceipts: GoodsReceipt[];
  onHand: OnHandView[];
  stockMoves: StockMove[];
  items: Item[];
  analysisType: "cost" | "supplier_quality" | "expiry_alerts" | "full";
}

export interface WarehouseInsight {
  type: "cost_savings" | "supplier_performance" | "expiry_warning" | "quality_alert";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  affectedItems: string[];
  actionable: boolean;
  recommendation?: string;
  metadata?: Record<string, any>;
}

export interface WarehouseAnalysisResult {
  insights: WarehouseInsight[];
  summary: string;
  keyMetrics: {
    totalValue: number;
    avgCostPerUnit: number;
    supplierCount: number;
    itemsNearExpiry: number;
    qcPassRate: number;
    avgLeadTime: number;
  };
  recommendations: string[];
}

export class WarehouseAnalyzer extends BaseAnalyzer {
  name = 'WarehouseAnalyzer';

  // Implement required abstract methods
  async analyze(entityId: string, config?: any): Promise<AnalysisResult> {
    // This method would analyze a specific warehouse entity (e.g., a supplier or location)
    // For now, return a basic structure
    return {
      id: `warehouse-analysis-${Date.now()}`,
      type: 'warehouse',
      entityId,
      createdAt: new Date().toISOString(),
      metadata: { message: 'Use analyzeCostOptimization for full warehouse analysis' }
    };
  }

  async getRecommendations(analysis: AnalysisResult): Promise<Recommendation[]> {
    // Generate recommendations based on analysis metadata
    return [];
  }

  async analyzeCostOptimization(input: WarehouseAnalysisInput): Promise<WarehouseAnalysisResult> {
    const context = this.buildCostContext(input);
    const prompt = `Analiza los siguientes datos de almacén y proporciona insights sobre optimización de costos, rendimiento de proveedores y gestión de inventario.

CONTEXTO:
${context}

ANÁLISIS REQUERIDO:
1. Identifica oportunidades de ahorro en compras y almacenamiento
2. Evalúa el rendimiento de proveedores (calidad, puntualidad, costos)
3. Detecta items cerca de expiración que requieren acción inmediata
4. Analiza patrones de recepción para optimizar frecuencias de pedido
5. Identifica problemas de calidad recurrentes por proveedor/categoría

Responde en formato JSON con esta estructura exacta:
{
  "insights": [
    {
      "type": "cost_savings" | "supplier_performance" | "expiry_warning" | "quality_alert",
      "severity": "info" | "warning" | "critical",
      "title": "Título corto del insight",
      "description": "Descripción detallada del problema u oportunidad",
      "affectedItems": ["SKU1", "SKU2"],
      "actionable": true|false,
      "recommendation": "Acción recomendada específica",
      "metadata": {}
    }
  ],
  "summary": "Resumen ejecutivo de 2-3 líneas",
  "keyMetrics": {
    "totalValue": 0,
    "avgCostPerUnit": 0,
    "supplierCount": 0,
    "itemsNearExpiry": 0,
    "qcPassRate": 0,
    "avgLeadTime": 0
  },
  "recommendations": ["Recomendación 1", "Recomendación 2"]
}`;

    try {
      const result = await this.callGeminiJSON<WarehouseAnalysisResult>(prompt, context);
      return result;
    } catch (error) {
      console.error("[WarehouseAnalyzer] Cost optimization analysis failed:", error);
      return this.getEmptyResult();
    }
  }

  async analyzeSupplierQuality(input: WarehouseAnalysisInput): Promise<WarehouseInsight[]> {
    const supplierData = this.buildSupplierQualityContext(input);
    const prompt = `Analiza el rendimiento de calidad de los siguientes proveedores basándote en las recepciones y resultados de QC:

${supplierData}

Identifica:
1. Proveedores con tasa de rechazo alta (>5%)
2. Proveedores con entregas inconsistentes
3. Categorías de producto problemáticas por proveedor
4. Tendencias de mejora o deterioro en la calidad

Responde en formato JSON con array de insights según la estructura de WarehouseInsight.`;

    try {
      const result = await this.callGeminiJSON<WarehouseInsight[] | { insights: WarehouseInsight[] }>(prompt, supplierData);
      return Array.isArray(result) ? result : result.insights || [];
    } catch (error) {
      console.error("[WarehouseAnalyzer] Supplier quality analysis failed:", error);
      return [];
    }
  }

  async analyzeExpiryRisks(input: WarehouseAnalysisInput): Promise<WarehouseInsight[]> {
    const expiryData = this.buildExpiryContext(input);
    const prompt = `Analiza los siguientes items de inventario y sus fechas de expiración:

${expiryData}

Identifica:
1. Items que expiran en menos de 30 días (CRÍTICO)
2. Items que expiran en 30-60 días (ADVERTENCIA)
3. Patrones de rotación lenta que aumentan riesgo de expiración
4. Recomendaciones para liquidar stock antes de expiración

Responde en formato JSON con array de insights de tipo "expiry_warning".`;

    try {
      const result = await this.callGeminiJSON<WarehouseInsight[] | { insights: WarehouseInsight[] }>(prompt, expiryData);
      return Array.isArray(result) ? result : result.insights || [];
    } catch (error) {
      console.error("[WarehouseAnalyzer] Expiry risks analysis failed:", error);
      return [];
    }
  }

  private buildCostContext(input: WarehouseAnalysisInput): string {
    const { goodsReceipts, onHand, items } = input;

    // GoodsReceipt tiene lines array
    const receiptSummary = goodsReceipts.slice(0, 50).map(gr => ({
      id: gr.receiptNumber || gr.id,
      supplierId: gr.supplierPartyId,
      linesCount: gr.lines?.length || 0,
      status: gr.status,
      receivedAt: gr.receivedAt
    }));

    // Item.id ES el SKU canónico
    const stockSummary = onHand.slice(0, 50).map(oh => ({
      sku: oh.sku,
      name: items.find((i) => i.id === oh.sku)?.name || oh.sku,
      qty: oh.qty,
      reservedQty: oh.reservedQty || 0,
      qcStatus: oh.qcStatus,
      location: oh.locationId
    }));

    return JSON.stringify({
      receipts: receiptSummary,
      currentStock: stockSummary,
      totalReceipts: goodsReceipts.length,
      totalStockValue: onHand.reduce((sum, oh) => sum + oh.qty, 0),
      uniqueSkus: new Set(onHand.map(oh => oh.sku)).size
    }, null, 2);
  }

  private buildSupplierQualityContext(input: WarehouseAnalysisInput): string {
    const { goodsReceipts } = input;

    const supplierStats = new Map<string, {
      supplierId: string;
      receipts: number;
      totalLines: number;
      qcCompleted: number;
      qcPending: number;
    }>();

    goodsReceipts.forEach(gr => {
      const supplierId = gr.supplierPartyId || "Unknown";
      if (!supplierStats.has(supplierId)) {
        supplierStats.set(supplierId, {
          supplierId,
          receipts: 0,
          totalLines: 0,
          qcCompleted: 0,
          qcPending: 0,
        });
      }

      const stats = supplierStats.get(supplierId)!;
      stats.receipts++;
      stats.totalLines += gr.lines?.length || 0;

      if (gr.status === "completed") stats.qcCompleted++;
      if (gr.status === "pending_qc") stats.qcPending++;
    });

    const supplierArray = Array.from(supplierStats.values()).map(s => ({
      ...s,
      qcCompletionRate: s.receipts > 0
        ? ((s.qcCompleted / s.receipts) * 100).toFixed(2) + '%'
        : "N/A"
    }));

    return JSON.stringify(supplierArray, null, 2);
  }

  private buildExpiryContext(input: WarehouseAnalysisInput): string {
    const { onHand, items } = input;

    const today = new Date();
    const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDays = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

    const expiringItems = onHand
      .filter(oh => oh.lotCode) // OnHandView has lotCode (singular)
      .map(oh => {
        const item = items.find((i) => i.id === oh.sku); // Item.id IS the SKU
        return {
          sku: oh.sku,
          name: item?.name || oh.sku,
          qty: oh.qty,
          location: oh.locationId,
          lot: oh.lotCode,
          expiryAt: oh.expiryAt || null,
          // Note: Actual expiry dates come from expiryAt field
        };
      });

    return JSON.stringify(expiringItems.slice(0, 50), null, 2);
  }


  private getDefaultMetrics() {
    return {
      totalValue: 0,
      avgCostPerUnit: 0,
      supplierCount: 0,
      itemsNearExpiry: 0,
      qcPassRate: 0,
      avgLeadTime: 0
    };
  }

  private getEmptyResult(): WarehouseAnalysisResult {
    return {
      insights: [],
      summary: "Analysis unavailable",
      keyMetrics: this.getDefaultMetrics(),
      recommendations: []
    };
  }
}
