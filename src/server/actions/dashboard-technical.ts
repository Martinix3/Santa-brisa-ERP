"use server";

import { db } from "@/lib/firebase-admin";
import { auth } from "@clerk/nextjs/server";
import { FORMULAS, ALERT_RULES, DATE_HELPERS } from "@/config/dashboard-config";

export async function getTechnicalDashboardData() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "No autorizado" };
    }

    const startOfMonth = DATE_HELPERS.getStartOfMonth();
    const endOfMonth = DATE_HELPERS.getEndOfMonth();

    const [productionSnapshot, lotsSnapshot, equipmentSnapshot, maintenanceSnapshot] = await Promise.all([
      db.collection("productionOrders")
        .where("createdAt", ">=", startOfMonth)
        .where("createdAt", "<=", endOfMonth)
        .get(),
      db.collection("lots")
        .where("createdAt", ">=", startOfMonth)
        .where("createdAt", "<=", endOfMonth)
        .get(),
      db.collection("equipment")
        .where("status", "in", ["ACTIVE", "MAINTENANCE"])
        .get(),
      db.collection("maintenance")
        .where("status", "in", ["PENDING", "IN_PROGRESS"])
        .get()
    ]);

    const totalProduction = productionSnapshot.size;
    const completedProduction = productionSnapshot.docs.filter(
      doc => doc.data().status === "COMPLETED"
    ).length;

    const totalProduced = productionSnapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      return sum + (data.qtyProduced || 0);
    }, 0);

    const totalPlanned = productionSnapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      return sum + (data.qtyPlanned || 0);
    }, 0);

    const efficiency = totalPlanned > 0 
      ? Math.round((totalProduced / totalPlanned) * 100)
      : 0;

    const totalLots = lotsSnapshot.size;
    const approvedLots = lotsSnapshot.docs.filter(
      doc => doc.data().qcStatus === "APPROVED"
    ).length;
    const rejectedLots = lotsSnapshot.docs.filter(
      doc => doc.data().qcStatus === "REJECTED"
    ).length;

    const qualityRate = totalLots > 0
      ? Math.round((approvedLots / totalLots) * 100)
      : 0;

    const activeEquipment = equipmentSnapshot.docs.filter(
      doc => doc.data().status === "ACTIVE"
    ).length;

    const equipmentInMaintenance = equipmentSnapshot.docs.filter(
      doc => doc.data().status === "MAINTENANCE"
    ).length;

    const pendingMaintenance = maintenanceSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledDate: doc.data().scheduledDate?.toDate() || new Date()
    }));

    const recentProduction = productionSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }))
      .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    return {
      success: true,
      data: {
        technicalKpis: {
          totalProduction,
          completedProduction,
          efficiency,
          totalLots,
          approvedLots,
          rejectedLots,
          qualityRate,
          activeEquipment,
          equipmentInMaintenance,
          pendingMaintenance: maintenanceSnapshot.size
        },
        recentProduction,
        pendingMaintenance: pendingMaintenance.slice(0, 10)
      }
    };
  } catch (error: any) {
    console.error("[getTechnicalDashboardData] Error:", error);
    return { success: false, error: error.message };
  }
}
