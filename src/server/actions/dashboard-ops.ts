"use server";

import { db } from "@/lib/firebase-admin";
import { auth } from "@clerk/nextjs/server";
import { FORMULAS, ALERT_RULES, DATE_HELPERS } from "@/config/dashboard-config";

/**
 * Server actions para Dashboard Ops
 * 5 tabs: Today, Logistics, Inventory, Quality, Production
 */

export async function getOpsDashboardData(tab: string = "today") {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "No autorizado" };
    }

    switch (tab) {
      case "today":
        return await getTodayData();
      case "logistics":
        return await getLogisticsData();
      case "inventory":
        return await getInventoryData();
      case "quality":
        return await getQualityData();
      case "production":
        return await getProductionData();
      default:
        return await getTodayData();
    }
  } catch (error: any) {
    console.error("[getOpsDashboardData] Error:", error);
    return { success: false, error: error.message };
  }
}

async function getTodayData() {
  const today = DATE_HELPERS.getStartOfDay();

  const [shipmentsSnapshot, stockSnapshot, lotsSnapshot, productionSnapshot, movesSnapshot] = await Promise.all([
    db.collection("shipments").where("status", "in", ["PENDING", "IN_TRANSIT"]).get(),
    db.collection("onHand").where("qtyOnHand", "<", 100).get(),
    db.collection("lots").where("qcStatus", "in", ["PENDING", "IN_PROGRESS"]).get(),
    db.collection("productionOrders").where("status", "==", "IN_PROGRESS").get(),
    db.collection("stockMoves").where("timestamp", ">=", today).orderBy("timestamp", "desc").limit(10).get()
  ]);

  const criticalStock = stockSnapshot.docs.filter(doc => {
    const data = doc.data();
    return ALERT_RULES.isStockCritical(data.qtyOnHand, data.minQty || 0);
  }).length;

  return {
    success: true,
    data: {
      todayKpis: {
        ordersInTransit: shipmentsSnapshot.size,
        criticalStock,
        lotsInQC: lotsSnapshot.size,
        activeProductionOrders: productionSnapshot.size
      },
      movements: movesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }))
    }
  };
}

async function getLogisticsData() {
  const shipmentsSnapshot = await db
    .collection("shipments")
    .where("status", "in", ["PENDING", "PREPARING", "IN_TRANSIT"])
    .orderBy("scheduledDate", "asc")
    .limit(50)
    .get();

  const shipments = shipmentsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    scheduledDate: doc.data().scheduledDate?.toDate() || new Date(),
    actualDate: doc.data().actualDate?.toDate()
  }));

  const pendingShipments = shipments.filter((s: any) => s.status === "PENDING").length;
  const inTransit = shipments.filter((s: any) => s.status === "IN_TRANSIT").length;

  return {
    success: true,
    data: {
      logisticsKpis: { pendingShipments, inTransit, total: shipments.length },
      shipments
    }
  };
}

async function getInventoryData() {
  const stockSnapshot = await db.collection("onHand").get();
  
  const stock = stockSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const totalSKUs = stock.length;
  const totalValue = stock.reduce((sum: number, s: any) => sum + (s.value || 0), 0);
  const criticalSKUs = stock.filter((s: any) => 
    ALERT_RULES.isStockCritical(s.qtyOnHand, s.minQty || 0)
  ).length;

  const criticalStock = stock
    .filter((s: any) => ALERT_RULES.isStockCritical(s.qtyOnHand, s.minQty || 0))
    .sort((a: any, b: any) => a.qtyOnHand - b.qtyOnHand)
    .slice(0, 20);

  return {
    success: true,
    data: {
      inventoryKpis: { totalSKUs, totalValue, criticalSKUs },
      criticalStock
    }
  };
}

async function getQualityData() {
  const lotsSnapshot = await db
    .collection("lots")
    .where("qcStatus", "in", ["PENDING", "IN_PROGRESS", "HOLD"])
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const lots = lotsSnapshot.docs.map(doc => {
    const data = doc.data();
    const qcStartDate = data.qcStartDate?.toDate();
    const isDelayed = qcStartDate ? ALERT_RULES.isQCDelayed(qcStartDate) : false;
    
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      qcStartDate,
      isDelayed
    };
  });

  const pending = lots.filter((l: any) => l.qcStatus === "PENDING").length;
  const inProgress = lots.filter((l: any) => l.qcStatus === "IN_PROGRESS").length;
  const hold = lots.filter((l: any) => l.qcStatus === "HOLD").length;
  const delayed = lots.filter((l: any) => l.isDelayed).length;

  return {
    success: true,
    data: {
      qcKpis: { pending, inProgress, hold, delayed, total: lots.length },
      lots
    }
  };
}

async function getProductionData() {
  const productionSnapshot = await db
    .collection("productionOrders")
    .where("status", "in", ["PENDING", "IN_PROGRESS"])
    .orderBy("scheduledStartDate", "asc")
    .limit(50)
    .get();

  const orders = productionSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    scheduledStartDate: doc.data().scheduledStartDate?.toDate() || new Date(),
    actualStartDate: doc.data().actualStartDate?.toDate(),
    scheduledEndDate: doc.data().scheduledEndDate?.toDate()
  }));

  const pending = orders.filter((o: any) => o.status === "PENDING").length;
  const inProgress = orders.filter((o: any) => o.status === "IN_PROGRESS").length;

  return {
    success: true,
    data: {
      productionKpis: { pending, inProgress, total: orders.length },
      orders
    }
  };
}
