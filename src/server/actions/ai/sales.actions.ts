'use server';

import { SalesAnalyzer, type SalesForecast } from '../../gemini/analyzers/sales-analyzer';
import { adminDb as db } from '@/server/firebase';

/**
 * Analiza las ventas de una cuenta específica
 */
export async function analyzeSales(accountId: string): Promise<{
    success: boolean;
    forecast?: SalesForecast;
    error?: string;
}> {
    try {
        console.log(`[analyzeSales] Starting analysis for account: ${accountId}`);

        const salesAnalyzer = new SalesAnalyzer();
        const forecast = await salesAnalyzer.analyze(accountId);

        // Crear alertas si hay tendencia decreciente o bajo engagement
        if (forecast.trend === 'declining' || forecast.confidence < 50) {
            await createSalesAlert(forecast);
        }

        console.log(`[analyzeSales] Analysis complete: ${forecast.trend} trend, ${forecast.confidence}% confidence`);

        return { success: true, forecast };
    } catch (error) {
        console.error('[analyzeSales] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Analiza todas las cuentas activas
 */
export async function analyzeAllAccounts(): Promise<{
    success: boolean;
    forecasts: SalesForecast[];
    declining: number;
    error?: string;
}> {
    try {
        console.log('[analyzeAllAccounts] Starting bulk analysis');

        // Obtener todas las cuentas activas
        const accountsSnap = await db.collection('accounts')
            .where('status', '==', 'active')
            .get();

        console.log(`[analyzeAllAccounts] Found ${accountsSnap.size} active accounts`);

        const forecasts: SalesForecast[] = [];
        let declining = 0;
        const salesAnalyzer = new SalesAnalyzer();

        for (const accountDoc of accountsSnap.docs) {
            try {
                const forecast = await salesAnalyzer.analyze(accountDoc.id);
                forecasts.push(forecast);

                if (forecast.trend === 'declining') {
                    declining++;
                }
            } catch (error) {
                console.error(`[analyzeAllAccounts] Error analyzing account ${accountDoc.id}:`, error);
            }
        }

        console.log(`[analyzeAllAccounts] Complete: ${forecasts.length} analyzed, ${declining} declining`);

        return { success: true, forecasts, declining };
    } catch (error) {
        console.error('[analyzeAllAccounts] Error:', error);
        return {
            success: false,
            forecasts: [],
            declining: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Obtiene el historial de forecasts de una cuenta
 */
export async function getSalesForecastHistory(
    accountId: string,
    limit: number = 10
): Promise<{
    success: boolean;
    forecasts: SalesForecast[];
    error?: string;
}> {
    try {
        const analysesSnap = await db.collection('ai_analyses')
            .where('type', '==', 'sales')
            .where('entityId', '==', accountId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const forecasts = analysesSnap.docs.map(doc => doc.data().analysis as SalesForecast);

        return { success: true, forecasts };
    } catch (error) {
        console.error('[getSalesForecastHistory] Error:', error);
        return {
            success: false,
            forecasts: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Helper: Crea una alerta de ventas
 */
async function createSalesAlert(forecast: SalesForecast): Promise<void> {
    try {
        const severity = forecast.trend === 'declining' ? 80 : 60;
        const title = forecast.trend === 'declining'
            ? `Ventas en declive: ${forecast.accountName}`
            : `Bajo engagement: ${forecast.accountName}`;

        await db.collection('alerts').add({
            department: 'SALES',
            kind: 'SALES_PREDICTION',
            severity,
            title,
            message: `Confianza del forecast: ${forecast.confidence}%. ${forecast.forecastNextMonth > 0
                ? `Previsión próximo mes: €${forecast.forecastNextMonth.toFixed(2)}`
                : 'Sin actividad prevista'
                }`,
            entities: {
                accountId: forecast.accountId
            },
            metadata: {
                analysisId: forecast.id,
                trend: forecast.trend,
                confidence: forecast.confidence,
                currentMonthRevenue: forecast.currentMonthRevenue,
                forecastNextMonth: forecast.forecastNextMonth,
                recommendations: forecast.recommendations,
                factors: forecast.factors
            },
            createdAt: new Date().toISOString(),
            resolved: false
        });

        console.log(`[createSalesAlert] Alert created for account ${forecast.accountId}`);
    } catch (error) {
        console.error('[createSalesAlert] Error creating alert:', error);
    }
}

import { unstable_cache } from 'next/cache';

/**
 * Calcula la tasa de conversión de ventas (Cuentas Ganadas / Total)
 */
export const getSalesConversionMetric = unstable_cache(
    async (): Promise<{
        success: boolean;
        rate: number;
        details: {
            total: number;
            won: number;
            potential: number;
            lost: number;
        };
    }> => {
        try {
            const accountsSnap = await db.collection('accounts').get();
            const accounts = accountsSnap.docs.map(doc => doc.data());

            let won = 0;
            let lost = 0;
            let potential = 0;

            accounts.forEach((acc: any) => {
                // Asumiendo que 'ACTIVA' y 'CERRADA' son ganadas
                if (['ACTIVA', 'CERRADA'].includes(acc.stage)) {
                    won++;
                } else if (['FALLIDA', 'BAJA'].includes(acc.stage)) {
                    lost++;
                } else {
                    potential++;
                }
            });

            const total = won + lost + potential;
            const rate = total > 0 ? (won / total) * 100 : 0;

            return {
                success: true,
                rate: Number(rate.toFixed(1)),
                details: { total, won, potential, lost }
            };
        } catch (error) {
            console.error('[getSalesConversionMetric] Error:', error);
            return {
                success: false,
                rate: 0,
                details: { total: 0, won: 0, potential: 0, lost: 0 }
            };
        }
    },
    ['sales-conversion-metric'],
    { revalidate: 3600 } // 1 hour cache
);

/**
 * Calcula el margen de ventas reciente (Revenue - Cost)
 * Basado en los pedidos del último mes y el costo estándar de los items
 */
export const getSalesMarginMetric = unstable_cache(
    async (): Promise<{
        success: boolean;
        marginPct: number;
        grossProfit: number;
    }> => {
        try {
            // 1. Obtener pedidos del último mes (cerrados/pagados/enviados)
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            const ordersSnap = await db.collection('ordersSellOut')
                .where('createdAt', '>=', lastMonth.toISOString())
                .where('status', 'in', ['confirmed', 'shipped', 'invoiced', 'paid'])
                .get();

            if (ordersSnap.empty) {
                return { success: true, marginPct: 0, grossProfit: 0 };
            }

            // 2. Obtener todos los items para tener sus costos
            const itemsSnap = await db.collection('items').get();
            const itemCosts = new Map<string, number>();
            itemsSnap.docs.forEach(doc => {
                const data = doc.data();
                // Usar costUnit o stdCost, fallback a 0
                itemCosts.set(doc.id, data.costUnit || data.stdCost || 0);
            });

            let totalRevenue = 0;
            let totalCost = 0;

            // 3. Calcular revenue y cost
            ordersSnap.docs.forEach(doc => {
                const order = doc.data();
                const lines = order.lines || order.items || [];

                lines.forEach((line: any) => {
                    const qty = line.qty || 0;
                    const price = line.priceUnit || 0;
                    const cost = itemCosts.get(line.itemId) || 0;

                    totalRevenue += qty * price;
                    totalCost += qty * cost;
                });
            });

            const grossProfit = totalRevenue - totalCost;
            const marginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

            return {
                success: true,
                marginPct: Number(marginPct.toFixed(1)),
                grossProfit: Number(grossProfit.toFixed(2))
            };
        } catch (error) {
            console.error('[getSalesMarginMetric] Error:', error);
            return { success: false, marginPct: 0, grossProfit: 0 };
        }
    },
    ['sales-margin-metric'],
    { revalidate: 3600 } // 1 hour cache
);
