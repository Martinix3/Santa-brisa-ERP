"use server";

import { adminDb as db } from "@/server/firebase";
import type { DistributorWithKPIs } from "@/types/distributors";
import type { Account, OrderSellOut } from "@/domain/ssot";

/**
 * Get all distributors with calculated KPIs
 * For display in distributors management page
 */
export async function getDistributorsWithKPIs(): Promise<{
  success: boolean;
  data?: DistributorWithKPIs[];
  error?: string;
}> {
  try {
    // 1. Fetch all distributor accounts
    const distributorsSnapshot = await db
      .collection("accounts")
      .where("segment", "==", "DISTRIBUIDOR")
      .get();

    if (distributorsSnapshot.empty) {
      return {
        success: true,
        data: [],
      };
    }

    const distributors: Account[] = distributorsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Account));

    // 2. Fetch all accounts and orders in parallel
    const [allAccountsSnapshot, allOrdersSnapshot] = await Promise.all([
      db.collection("accounts").get(),
      db.collection("ordersSellOut").get(),
    ]);

    const allAccounts: Account[] = allAccountsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Account));

    const allOrders: OrderSellOut[] = allOrdersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as OrderSellOut));

    // 3. Calculate date thresholds
    const now = new Date();
    const ytdStart = new Date(now.getFullYear(), 0, 1);
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // 4. Calculate KPIs for each distributor
    const distributorsWithKPIs: DistributorWithKPIs[] = distributors.map(
      (distributor) => {
        const distributorPartyId = distributor.partyId;

        // Accounts assigned to this distributor
        const assignedAccounts = allAccounts.filter(
          (acc) => acc.distributorPartyId === distributorPartyId
        );

        // Orders for this distributor (sell-in)
        const distributorOrders = allOrders.filter(
          (order) =>
            order.distributorId === distributorPartyId ||
            order.partyId === distributorPartyId
        );

        // Orders YTD
        const ytdOrders = distributorOrders.filter((order) => {
          const orderDate = order.orderDate
            ? new Date(order.orderDate)
            : order.createdAt
              ? new Date(order.createdAt)
              : null;
          return orderDate && orderDate >= ytdStart;
        });

        // Recent orders (last 90 days)
        const recentOrders = distributorOrders.filter((order) => {
          const orderDate = order.orderDate
            ? new Date(order.orderDate)
            : order.createdAt
              ? new Date(order.createdAt)
              : null;
          return orderDate && orderDate >= ninetyDaysAgo;
        });

        // Accounts with recent orders
        const activeAccountIds = new Set(
          recentOrders.map((o) => o.accountId).filter(Boolean)
        );

        const activeAccountsInAssigned = assignedAccounts.filter((acc) =>
          activeAccountIds.has(acc.id)
        );

        // Total sell-in YTD
        const totalSellIn = ytdOrders.reduce(
          (sum, order) => sum + (order.totalAmount || 0),
          0
        );

        // Last order date
        const lastOrder = distributorOrders
          .map((order) => ({
            order,
            date: order.orderDate
              ? new Date(order.orderDate)
              : order.createdAt
                ? new Date(order.createdAt)
                : null,
          }))
          .filter((item: any) => item.date !== null)
          .sort((a, b) => (b.date!.getTime() - a.date!.getTime()))
          [0];

        const lastOrderDate = lastOrder?.date?.toISOString();

        // Average order value
        const avgOrderValue =
          ytdOrders.length > 0
            ? totalSellIn / ytdOrders.length
            : 0;

        // Status: ACTIVO if has orders in last 90 days
        const status: "ACTIVO" | "INACTIVO" =
          recentOrders.length > 0 ? "ACTIVO" : "INACTIVO";

        return {
          ...distributor,
          totalAccounts: assignedAccounts.length,
          activeAccounts: activeAccountsInAssigned.length,
          totalSellIn,
          lastOrderDate,
          avgOrderValue,
          status,
        };
      }
    );

    // Sort by status (active first) then by sell-in volume
    distributorsWithKPIs.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "ACTIVO" ? -1 : 1;
      }
      return b.totalSellIn - a.totalSellIn;
    });

    return {
      success: true,
      data: distributorsWithKPIs,
    };
  } catch (error) {
    console.error("Error fetching distributors with KPIs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
