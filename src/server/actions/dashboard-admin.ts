"use server";

import { db } from "@/lib/firebase-admin";
import { auth } from "@clerk/nextjs/server";
import { FORMULAS, DATE_HELPERS } from "@/config/dashboard-config";

export async function getAdminDashboardData() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "No autorizado" };
    }

    const startOfMonth = DATE_HELPERS.getStartOfMonth();
    const endOfMonth = DATE_HELPERS.getEndOfMonth();

    const [ordersSnapshot, accountsSnapshot, invoicesSnapshot, productionSnapshot] = await Promise.all([
      db.collection("ordersSellOut")
        .where("createdAt", ">=", startOfMonth)
        .where("createdAt", "<=", endOfMonth)
        .get(),
      db.collection("accounts").get(),
      db.collection("invoices")
        .where("createdAt", ">=", startOfMonth)
        .where("createdAt", "<=", endOfMonth)
        .get(),
      db.collection("productionOrders")
        .where("status", "in", ["PENDING", "IN_PROGRESS", "COMPLETED"])
        .get()
    ]);

    // KPIs financieros
    const totalRevenue = ordersSnapshot.docs.reduce((sum, doc) => {
      const order = doc.data();
      return sum + (order.totalAmount || 0);
    }, 0);

    const totalInvoiced = invoicesSnapshot.docs.reduce((sum, doc) => {
      const invoice = doc.data();
      return sum + (invoice.amount || 0);
    }, 0);

    const totalCollected = invoicesSnapshot.docs
      .filter(doc => doc.data().status === "PAID")
      .reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

    const collectionRate = FORMULAS.collectionRate(totalCollected, totalInvoiced);

    // Top cuentas
    const accountsWithRevenue = await Promise.all(
      accountsSnapshot.docs.map(async (doc) => {
        const accountOrders = await db.collection("ordersSellOut")
          .where("accountId", "==", doc.id)
          .where("createdAt", ">=", startOfMonth)
          .get();
        
        const revenue = accountOrders.docs.reduce((sum, orderDoc) => {
          return sum + (orderDoc.data().totalAmount || 0);
        }, 0);

        return {
          id: doc.id,
          name: doc.data().name || "Sin nombre",
          revenue
        };
      })
    );

    const topAccounts = accountsWithRevenue
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Pipeline value
    const pipelineSnapshot = await db.collection("opportunities")
      .where("status", "in", ["OPEN", "QUALIFIED", "PROPOSAL"])
      .get();

    const pipelineValue = pipelineSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().estimatedValue || 0);
    }, 0);

    // Producción stats
    const completedProduction = productionSnapshot.docs.filter(
      doc => doc.data().status === "COMPLETED"
    ).length;

    return {
      success: true,
      data: {
        financialKpis: {
          totalRevenue,
          totalInvoiced,
          totalCollected,
          collectionRate,
          pipelineValue
        },
        topAccounts,
        productionStats: {
          total: productionSnapshot.size,
          completed: completedProduction,
          completionRate: productionSnapshot.size > 0
            ? Math.round((completedProduction / productionSnapshot.size) * 100)
            : 0
        },
        ordersCount: ordersSnapshot.size,
        accountsCount: accountsSnapshot.size
      }
    };
  } catch (error: any) {
    console.error("[getAdminDashboardData] Error:", error);
    return { success: false, error: error.message };
  }
}
