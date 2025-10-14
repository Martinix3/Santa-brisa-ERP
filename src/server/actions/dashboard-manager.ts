"use server";

import { adminDb as db } from "@/server/firebase";
import { FORMULAS, DATE_HELPERS } from "@/config/dashboard-config";

export async function getManagerDashboardData() {
  try {
    const startOfMonth = DATE_HELPERS.getStartOfMonth();
    const endOfMonth = DATE_HELPERS.getEndOfMonth();

    const [teamSnapshot, ordersSnapshot, accountsSnapshot, tasksSnapshot] = await Promise.all([
      db.collection("teamMembers").where("role", "==", "sales").get(),
      db.collection("ordersSellOut")
        .where("createdAt", ">=", startOfMonth)
        .where("createdAt", "<=", endOfMonth)
        .get(),
      db.collection("accounts").get(),
      db.collection("tasks")
        .where("status", "in", ["PENDING", "IN_PROGRESS"])
        .get()
    ]);

    const teamPerformance = await Promise.all(
      teamSnapshot.docs.map(async (doc) => {
        const memberId = doc.id;
        const member = doc.data();

        const memberOrders = ordersSnapshot.docs.filter(
          orderDoc => orderDoc.data().createdBy === memberId
        );

        const revenue = memberOrders.reduce((sum, orderDoc) => {
          return sum + (orderDoc.data().totalAmount || 0);
        }, 0);

        const target = member.salesTarget || 50000;
        const progress = FORMULAS.targetProgress(revenue, target);

        const memberAccounts = await db.collection("accounts")
          .where("ownerId", "==", memberId)
          .get();

        return {
          id: memberId,
          name: member.fullName || member.email || "Sin nombre",
          revenue,
          target,
          progress,
          orders: memberOrders.length,
          accounts: memberAccounts.size
        };
      })
    );

    const totalTeamRevenue = teamPerformance.reduce((sum, member) => sum + member.revenue, 0);
    const totalTeamTarget = teamPerformance.reduce((sum, member) => sum + member.target, 0);
    const teamProgress = FORMULAS.targetProgress(totalTeamRevenue, totalTeamTarget);

    const topPerformers = [...teamPerformance]
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5);

    return {
      success: true,
      data: {
        teamKpis: {
          totalRevenue: totalTeamRevenue,
          totalTarget: totalTeamTarget,
          progress: teamProgress,
          teamSize: teamSnapshot.size,
          totalOrders: ordersSnapshot.size,
          totalAccounts: accountsSnapshot.size,
          pendingTasks: tasksSnapshot.size
        },
        teamPerformance,
        topPerformers
      }
    };
  } catch (error: any) {
    console.error("[getManagerDashboardData] Error:", error);
    return { success: false, error: error.message };
  }
}
