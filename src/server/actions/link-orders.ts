// src/server/actions/link-orders.ts
"use server";

import { adminDb as db } from "@/server/firebase";
import { revalidatePath } from "next/cache";

/**
 * Enlaza pedidos Shopify con pedidos Holded automáticamente
 * Busca en desc de Holded patrones como "Shopify #1058"
 */
export async function linkShopifyHoldedOrders(): Promise<{
  success: boolean;
  linked?: number;
  message?: string;
  error?: string;
}> {
  try {
    console.log('[linkShopifyHoldedOrders] Starting automatic linking...');

    // 1. Construir índice de Shopify orders por orderNumber
    const shopifyIdx = new Map<number, { id: string; amount: number; accountId?: string; dayKey?: string }>();
    const shopifySnap = await db
      .collection('ordersSellOut')
      .where('source', '==', 'SHOPIFY')
      .get();

    shopifySnap.forEach((doc) => {
      const data = doc.data();
      const orderNumber = data.external?.shopifyOrderNumber;
      if (orderNumber) {
        shopifyIdx.set(Number(orderNumber), {
          id: doc.id,
          amount: data.totalAmount || 0,
          accountId: data.accountId,
          dayKey: data.importMeta?.dayKey,
        });
      }
    });

    console.log(`[linkShopifyHoldedOrders] Found ${shopifyIdx.size} Shopify orders in index`);

    // 2. Buscar pedidos Holded con "Shopify #N" en campos de texto
    const holdedSnap = await db
      .collection('ordersSellOut')
      .where('sourceSystems', 'array-contains', 'HOLDED')
      .get();

    let linked = 0;
    const batch = db.batch();

    for (const holdedDoc of holdedSnap.docs) {
      const holdedData = holdedDoc.data();
      
      // Skip si ya está linked
      if (holdedData.linkage?.matchedWith === 'SHOPIFY') {
        continue;
      }

      // Buscar en varios campos posibles
      const searchFields = [
        holdedData.notes,
        holdedData.desc,
        holdedData.description,
        holdedData.docNumber,
      ].filter(Boolean);

      let matchedOrderNumber: number | null = null;

      for (const field of searchFields) {
        const match = String(field).match(/Shopify\s*#?(\d+)/i);
        if (match) {
          matchedOrderNumber = Number(match[1]);
          break;
        }
      }

      if (!matchedOrderNumber) continue;

      const shopifyOrder = shopifyIdx.get(matchedOrderNumber);
      if (!shopifyOrder) {
        console.log(`[linkShopifyHoldedOrders] Holded ${holdedDoc.id} references Shopify #${matchedOrderNumber} but not found`);
        continue;
      }

      // Validaciones adicionales para aumentar confianza
      let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
      const reasons: string[] = [`shopify_order_${matchedOrderNumber}`];

      // Check mismo accountId (si ambos lo tienen)
      if (holdedData.accountId && shopifyOrder.accountId) {
        if (holdedData.accountId === shopifyOrder.accountId) {
          reasons.push('same_account');
        } else {
          confidence = 'MEDIUM';
          reasons.push('different_account');
        }
      }

      // Check monto similar (± 5%)
      if (holdedData.totalAmount && shopifyOrder.amount) {
        const diff = Math.abs(holdedData.totalAmount - shopifyOrder.amount);
        const pct = (diff / shopifyOrder.amount) * 100;
        if (pct < 5) {
          reasons.push('amount_match');
        } else if (pct < 15) {
          confidence = 'MEDIUM';
          reasons.push('amount_similar');
        } else {
          confidence = 'LOW';
          reasons.push('amount_different');
        }
      }

      // Check misma fecha (dayKey)
      if (holdedData.importMeta?.dayKey && shopifyOrder.dayKey) {
        if (holdedData.importMeta.dayKey === shopifyOrder.dayKey) {
          reasons.push('same_date');
        }
      }

      // Actualizar ambos documentos
      batch.update(db.collection('ordersSellOut').doc(holdedDoc.id), {
        'linkage.matchedWith': 'SHOPIFY',
        'linkage.confidence': confidence,
        'linkage.reason': reasons.join(', '),
        'linkage.linkedOrderId': shopifyOrder.id,
        updatedAt: new Date().toISOString(),
      });

      batch.update(db.collection('ordersSellOut').doc(shopifyOrder.id), {
        'linkage.matchedWith': 'HOLDED',
        'linkage.confidence': confidence,
        'linkage.reason': reasons.join(', '),
        'linkage.linkedOrderId': holdedDoc.id,
        updatedAt: new Date().toISOString(),
      });

      linked++;
      console.log(`[linkShopifyHoldedOrders] Linked: Holded ${holdedDoc.id} ↔ Shopify #${matchedOrderNumber} (${confidence})`);
    }

    if (linked > 0) {
      await batch.commit();
    }

    revalidatePath('/ventas/shopify');
    revalidatePath('/ventas/pedidos');

    console.log(`[linkShopifyHoldedOrders] Complete: ${linked} orders linked`);

    return {
      success: true,
      linked,
      message: linked > 0 
        ? `${linked} pedidos enlazados automáticamente`
        : 'No se encontraron pedidos para enlazar',
    };
  } catch (error: any) {
    console.error('[linkShopifyHoldedOrders] Error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Obtiene estadísticas de linking
 */
export async function getLinkingStats(): Promise<{
  success: boolean;
  stats?: {
    totalShopify: number;
    totalHolded: number;
    linked: number;
    linkableShopify: number;
    linkableHolded: number;
  };
  error?: string;
}> {
  try {
    const [shopifySnap, holdedSnap] = await Promise.all([
      db.collection('ordersSellOut').where('source', '==', 'SHOPIFY').get(),
      db.collection('ordersSellOut').where('sourceSystems', 'array-contains', 'HOLDED').get(),
    ]);

    const totalShopify = shopifySnap.size;
    const totalHolded = holdedSnap.size;

    let linkedShopify = 0;
    let linkedHolded = 0;

    shopifySnap.forEach((doc) => {
      if (doc.data().linkage?.matchedWith === 'HOLDED') linkedShopify++;
    });

    holdedSnap.forEach((doc) => {
      if (doc.data().linkage?.matchedWith === 'SHOPIFY') linkedHolded++;
    });

    return {
      success: true,
      stats: {
        totalShopify,
        totalHolded,
        linked: Math.min(linkedShopify, linkedHolded),
        linkableShopify: totalShopify - linkedShopify,
        linkableHolded: totalHolded - linkedHolded,
      },
    };
  } catch (error: any) {
    console.error('[getLinkingStats] Error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
