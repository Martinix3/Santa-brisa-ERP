"use server";

import { adminDb as db } from "@/server/firebase";
import { FORMULAS, DATE_HELPERS } from "@/config/dashboard-config";

export async function getMarketingDashboardData() {
  try {
    const startOfMonth = DATE_HELPERS.getStartOfMonth();
    const endOfMonth = DATE_HELPERS.getEndOfMonth();

    const [campaignsSnapshot, eventsSnapshot, collabsSnapshot, adsSnapshot] = await Promise.all([
      db.collection("campaigns")
        .where("status", "==", "ACTIVE")
        .get(),
      db.collection("events")
        .where("startDate", ">=", startOfMonth)
        .where("startDate", "<=", endOfMonth)
        .get(),
      db.collection("collaborations")
        .where("status", "in", ["ACTIVE", "PENDING"])
        .get(),
      db.collection("ads")
        .where("status", "==", "ACTIVE")
        .get()
    ]);

    const campaigns = campaignsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate() || new Date(),
      endDate: doc.data().endDate?.toDate()
    }));

    const campaignBudget = campaigns.reduce((sum, c: any) => sum + (c.budget || 0), 0);
    const campaignSpent = campaigns.reduce((sum, c: any) => sum + (c.spent || 0), 0);

    const events = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate() || new Date(),
      endDate: doc.data().endDate?.toDate()
    }));

    const upcomingEvents = events
      .filter((e: any) => e.startDate > new Date())
      .sort((a: any, b: any) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 5);

    const activeCollabs = collabsSnapshot.size;
    const activeAds = adsSnapshot.size;

    const adsSpent = adsSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().spent || 0);
    }, 0);

    return {
      success: true,
      data: {
        marketingKpis: {
          activeCampaigns: campaignsSnapshot.size,
          campaignBudget,
          campaignSpent,
          budgetUsage: FORMULAS.targetProgress(campaignSpent, campaignBudget),
          upcomingEvents: upcomingEvents.length,
          activeCollabs,
          activeAds,
          adsSpent
        },
        campaigns,
        upcomingEvents,
        recentActivity: []
      }
    };
  } catch (error: any) {
    console.error("[getMarketingDashboardData] Error:", error);
    return { success: false, error: error.message };
  }
}
