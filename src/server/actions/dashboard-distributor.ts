"use server";

import { adminDb as db } from "@/server/firebase";
import { FORMULAS, ALERT_RULES, DATE_HELPERS } from "@/config/dashboard-config";

export async function getDistributorDashboardData() {
  try {
    const userDoc = await db.collection("teamMembers").doc("current-user").get();
    const user = userDoc.data();
    
    if (!user || !user.distributorId) {
      return { success: false, error: "Usuario no es distribuidor" };
    }

    const distributorId = user.distributorId;
    const startOfMonth = DATE_HELPERS.getStartOfMonth();

    const [ordersSnapshot, accountsSnapshot, stockSnapshot, shipmentsSnapshot] = await Promise.all([
      db.collection("ordersSellOut")
        .where("distributorId", "==", distributorId)
        .where("createdAt", ">=", startOfMonth)
        .get(),
      db.collection("accounts")
        .where("distributorId", "==", distributorId)
        .get(),
      db.collection("onHand")
        .where("locationId", "==", distributorId)
        .get(),
      db.collection("shipments")
        .where("destinationId", "==", distributorId)
        .where("status", "in", ["PENDING", "IN_TRANSIT"])
        .get()
    ]);

    const totalOrders = ordersSnapshot.size;
    const totalRevenue = ordersSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().totalAmount || 0);
    }, 0);

    const activeAccounts = accountsSnapshot.docs.filter(doc => {
      const lastOrder = doc.data().lastOrderDate?.toDate();
      return lastOrder && !ALERT_RULES.isAccountInactive(lastOrder);
    }).length;

    const stockValue = stockSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().value || 0);
    }, 0);

    const criticalStock = stockSnapshot.docs.filter(doc => {
      const data = doc.data();
      return ALERT_RULES.isStockCritical(data.qtyOnHand, data.minQty || 0);
    }).length;

    const topProducts = await getTopProducts(distributorId, startOfMonth);
    const pendingShipments = shipmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledDate: doc.data().scheduledDate?.toDate() || new Date()
    }));

    return {
      success: true,
      data: {
        distributorKpis: {
          totalOrders,
          totalRevenue,
          activeAccounts,
          totalAccounts: accountsSnapshot.size,
          stockValue,
          criticalStock,
          pendingShipments: shipmentsSnapshot.size
        },
        topProducts,
        pendingShipments: pendingShipments.slice(0, 10)
      }
    };
  } catch (error: any) {
    console.error("[getDistributorDashboardData] Error:", error);
    return { success: false, error: error.message };
  }
}

async function getTopProducts(distributorId: string, startOfMonth: Date) {
  const ordersSnapshot = await db.collection("ordersSellOut")
    .where("distributorId", "==", distributorId)
    .where("createdAt", ">=", startOfMonth)
    .get();

  const productSales: Record<string, { qty: number; revenue: number; name: string }> = {};

  ordersSnapshot.docs.forEach(doc => {
    const order = doc.data();
    const items = order.items || [];
    
    items.forEach((item: any) => {
      const sku = item.sku || item.productId;
      if (!sku) return;

      if (!productSales[sku]) {
        productSales[sku] = {
          qty: 0,
          revenue: 0,
          name: item.productName || sku
        };
      }

      productSales[sku].qty += item.qty || 0;
      productSales[sku].revenue += (item.qty || 0) * (item.price || 0);
    });
  });

  return Object.entries(productSales)
    .map(([sku, data]) => ({ sku, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}
