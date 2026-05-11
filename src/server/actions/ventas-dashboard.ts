"use server";

import { adminDb as db } from "@/server/firebase";
import type { OrderSellOut, Account, Interaction } from "@/domain/ssot";

// ============================================================================
// DASHBOARD PRINCIPAL VENTAS
// ============================================================================

export async function getVentasKPIs() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthISO = startOfMonth.toISOString();

    // Sell-In: ordersSellOut del mes actual
    const sellInSnap = await db
      .collection("ordersSellOut")
      .where("createdAt", ">=", startOfMonthISO)
      .get();

    const sellInTotal = sellInSnap.docs.reduce((sum, doc) => {
      const order = doc.data() as OrderSellOut;
      return sum + (order.totalAmount || 0);
    }, 0);

    // Pipeline: Accounts en stage POTENCIAL + SEGUIMIENTO
    const pipelineSnap = await db
      .collection("accounts")
      .where("stage", "in", ["POTENCIAL", "SEGUIMIENTO"])
      .get();

    // Estimar valor de pipeline (mock por ahora)
    const pipelineValue = pipelineSnap.size * 5000; // €5K promedio por oportunidad

    return {
      success: true,
      kpis: {
        sellInMes: Math.round(sellInTotal),
        sellOutMes: 0, // TODO: Implementar cuando haya datos sell-out
        pipeline: pipelineValue,
        cuentasActivas: pipelineSnap.size
      }
    };
  } catch (error: any) {
    console.error("[getVentasKPIs] Error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function getTopClientes(limit: number = 5) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthISO = startOfMonth.toISOString();

    // Obtener pedidos del mes
    const ordersSnap = await db
      .collection("ordersSellOut")
      .where("createdAt", ">=", startOfMonthISO)
      .get();

    const orders = ordersSnap.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as OrderSellOut[];

    // Agrupar por accountId
    const accountTotals = new Map<string, { total: number; count: number }>();

    for (const order of orders) {
      const current = accountTotals.get(order.accountId) || { total: 0, count: 0 };
      accountTotals.set(order.accountId, {
        total: current.total + (order.totalAmount || 0),
        count: current.count + 1
      });
    }

    // Obtener nombres de cuentas
    const topAccounts = Array.from(accountTotals.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, limit);

    const result = await Promise.all(
      topAccounts.map(async ([accountId, data]) => {
        // Validar que accountId no esté vacío
        if (!accountId || accountId.trim() === '') {
          return {
            id: 'unknown',
            name: "Cliente sin ID",
            value: Math.round(data.total),
            pedidos: data.count
          };
        }

        try {
          const accountDoc = await db.collection("accounts").doc(accountId).get();
          const account = accountDoc.data() as Account | undefined;

          return {
            id: accountId,
            name: account?.name || "Cliente",
            value: Math.round(data.total),
            pedidos: data.count
          };
        } catch (error) {
          console.error(`[getTopClientes] Error fetching account ${accountId}:`, error);
          return {
            id: accountId,
            name: "Cliente (error)",
            value: Math.round(data.total),
            pedidos: data.count
          };
        }
      })
    );

    return {
      success: true,
      clientes: result
    };
  } catch (error: any) {
    console.error("[getTopClientes] Error:", error);
    return {
      success: false,
      error: error.message,
      clientes: []
    };
  }
}

// ============================================================================
// SELL-IN
// ============================================================================

export async function getSellInData() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthISO = startOfMonth.toISOString();

    // Pedidos del mes
    const ordersSnap = await db
      .collection("ordersSellOut")
      .where("createdAt", ">=", startOfMonthISO)
      .orderBy("createdAt", "desc")
      .get();

    const orders = ordersSnap.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as OrderSellOut[];

    // KPIs
    const totalMes = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const pedidosActivos = orders.filter(o =>
      ['open', 'confirmed'].includes(o.status)
    ).length;
    const ticketMedio = orders.length > 0 ? totalMes / orders.length : 0;

    // Crecimiento vs mes anterior
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthISO = prevMonth.toISOString();
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const endOfPrevMonthISO = endOfPrevMonth.toISOString();

    const prevMonthSnap = await db
      .collection("ordersSellOut")
      .where("createdAt", ">=", prevMonthISO)
      .where("createdAt", "<=", endOfPrevMonthISO)
      .get();

    const prevMonthTotal = prevMonthSnap.docs.reduce((sum, doc) => {
      const order = doc.data() as OrderSellOut;
      return sum + (order.totalAmount || 0);
    }, 0);

    const crecimiento = prevMonthTotal > 0 ? ((totalMes - prevMonthTotal) / prevMonthTotal) * 100 : 100;


    // Mix comercial por canal V2.1
    const mixComercial = {
      PRIVATE: 0,
      DISTRIBUTOR: 0,
      ONLINE: 0,
      HORECA: 0,
      CATERING: 0,
      LEGACY: 0 // Para pedidos sin channel
    };

    for (const order of orders) {
      const amount = order.totalAmount || 0;
      // Usar el nuevo campo channel si existe
      if (order.channel) {
        if (mixComercial[order.channel as keyof typeof mixComercial] !== undefined) {
          mixComercial[order.channel as keyof typeof mixComercial] += amount;
        } else {
          mixComercial.LEGACY += amount;
        }
      } else {
        // Fallback a lógica antigua para pedidos sin migrar
        if (order.source === 'SHOPIFY') {
          mixComercial.ONLINE += amount;
        } else if (order.flow === 'PLACEMENT') {
          mixComercial.DISTRIBUTOR += amount;
        } else if (order.flow === 'DIRECT') {
          mixComercial.HORECA += amount;
        } else {
          mixComercial.LEGACY += amount;
        }
      }
    }

    // Enriquecer pedidos con nombres de cuentas y datos V2.1
    const enrichedOrders = await Promise.all(
      orders.slice(0, 50).map(async (order) => {
        let account: Account | undefined = undefined;

        // Solo buscar account si accountId existe y no está vacío
        if (order.accountId && order.accountId.trim() !== '') {
          try {
            const accountDoc = await db.collection("accounts").doc(order.accountId).get();
            account = accountDoc.data() as Account | undefined;
          } catch (e) {
            console.error(`Error fetching account ${order.accountId}:`, e);
          }
        }

        // Determinar canal (priorizar V2.1 channel)
        let canal = 'Sin clasificar';
        if (order.channel) {
          const channelMap: Record<string, string> = {
            PRIVATE: 'Privado',
            DISTRIBUTOR: 'Distribuidor',
            ONLINE: 'Online',
            HORECA: 'Horeca',
            CATERING: 'Catering'
          };
          canal = channelMap[order.channel] || order.channel;
        } else {
          // Fallback a lógica antigua
          canal = order.source === 'SHOPIFY' ? 'Online' :
            order.flow === 'PLACEMENT' ? 'Distribuidor' : 'Horeca';
        }

        return {
          id: order.id,
          docNumber: order.docNumber || order.id.slice(-8),
          cliente: order.customerName || account?.name || "Cliente",
          comercial: order.ownerName || "Sin asignar",
          canal,
          total: Math.round(order.totalAmount || 0),
          estado: order.status,
          fecha: new Date(order.createdAt).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short'
          }),
          items: order.lines.length
        };
      })
    );

    return {
      success: true,
      kpis: {
        totalMes: Math.round(totalMes),
        pedidosActivos,
        ticketMedio: Math.round(ticketMedio),
        crecimiento: Math.round(crecimiento)
      },
      mixComercial: [
        { name: 'Privado', value: Math.round(mixComercial.PRIVATE), percentage: 0 },
        { name: 'Distribuidor', value: Math.round(mixComercial.DISTRIBUTOR), percentage: 0 },
        { name: 'Online', value: Math.round(mixComercial.ONLINE), percentage: 0 },
        { name: 'Horeca', value: Math.round(mixComercial.HORECA), percentage: 0 },
        { name: 'Catering', value: Math.round(mixComercial.CATERING), percentage: 0 },
        { name: 'Sin clasificar', value: Math.round(mixComercial.LEGACY), percentage: 0 }
      ]
        .filter(item => item.value > 0) // Solo mostrar canales con ventas
        .map((item: any) => ({
          ...item,
          percentage: totalMes > 0 ? Math.round((item.value / totalMes) * 100) : 0
        })),
      pedidos: enrichedOrders
    };
  } catch (error: any) {
    console.error("[getSellInData] Error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// UPCOMING VISITS (CALENDAR)
// ============================================================================

/**
 * Get upcoming visits for calendar widget
 */
export async function getUpcomingVisits(limit: number = 10) {
  try {
    const now = new Date();
    const nowISO = now.toISOString();

    // Get upcoming visits from interactions
    const visitsSnap = await db
      .collection("interactions")
      .where("kind", "==", "VISITA")
      .where("plannedFor", ">=", nowISO)
      .orderBy("plannedFor", "asc")
      .limit(limit)
      .get();

    const visits = await Promise.all(
      visitsSnap.docs.map(async (doc) => {
        const visit = { id: doc.id, ...doc.data() } as Interaction;

        // Get account name
        let accountName = "Cliente";
        if (visit.accountId) {
          try {
            const accountDoc = await db.collection("accounts").doc(visit.accountId).get();
            const account = accountDoc.data();
            accountName = account?.name || "Cliente";
          } catch (e) {
            console.error(`Error fetching account ${visit.accountId}:`, e);
          }
        }

        return {
          id: visit.id,
          accountId: visit.accountId,
          accountName,
          date: visit.plannedFor,
          notes: visit.note
        };
      })
    );

    return {
      success: true,
      visits
    };
  } catch (error: any) {
    console.error("[getUpcomingVisits] Error:", error);
    return {
      success: false,
      error: error.message,
      visits: []
    };
  }
}

/**
 * Get calendar events for the current month
 * Returns visits grouped by day for calendar widget
 */
export async function getCalendarEvents() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const startISO = startOfMonth.toISOString();
    const endISO = endOfMonth.toISOString();

    // Get all visits in the month
    const visitsSnap = await db
      .collection("interactions")
      .where("kind", "==", "VISITA")
      .where("plannedFor", ">=", startISO)
      .where("plannedFor", "<=", endISO)
      .get();

    // Group by day
    const eventsByDay: Record<number, number> = {};

    visitsSnap.docs.forEach((doc) => {
      const visit = doc.data();
      if (visit.plannedFor) {
        const visitDate = new Date(visit.plannedFor);
        const day = visitDate.getDate();
        eventsByDay[day] = (eventsByDay[day] || 0) + 1;
      }
    });

    return {
      success: true,
      eventsByDay,
      totalEvents: visitsSnap.size
    };
  } catch (error: any) {
    console.error("[getCalendarEvents] Error:", error);
    return {
      success: false,
      error: error.message,
      eventsByDay: {},
      totalEvents: 0
    };
  }
}

// ============================================================================
// CRM
// ============================================================================

export async function getCRMData() {
  try {
    // Obtener accounts en pipeline
    const accountsSnap = await db
      .collection("accounts")
      .where("stage", "in", ["POTENCIAL", "SEGUIMIENTO", "ACTIVA"])
      .get();

    const accounts = accountsSnap.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as Account[];

    // Funnel data
    const funnelData = {
      POTENCIAL: { count: 0, value: 0 },
      SEGUIMIENTO: { count: 0, value: 0 },
      ACTIVA: { count: 0, value: 0 },
      CERRADA: { count: 0, value: 0 },
      FALLIDA: { count: 0, value: 0 }
    };

    const opportunities = accounts.map(account => {
      const valorEstimado = 5000; // Valor estimado por oportunidad

      // Contar para funnel
      if (account.stage && funnelData[account.stage as keyof typeof funnelData]) {
        funnelData[account.stage as keyof typeof funnelData].count++;
        funnelData[account.stage as keyof typeof funnelData].value += valorEstimado;
      }

      return {
        id: account.id,
        nombre: account.name,
        persona: account.ownerId || "Sin asignar",
        ciudad: "Madrid", // TODO: Extraer de address
        distribuidor: account.distributorPartyId || "Direct",
        stage: account.stage,
        valor: valorEstimado,
        prob: account.stage === 'ACTIVA' ? 80 :
          account.stage === 'SEGUIMIENTO' ? 50 : 30
      };
    });

    return {
      success: true,
      funnelData,
      opportunities
    };
  } catch (error: any) {
    console.error("[getCRMData] Error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
