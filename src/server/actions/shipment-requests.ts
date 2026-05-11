// src/server/actions/shipment-requests.ts
"use server";

import { adminDb as db } from "@/server/firebase";
import { revalidatePath } from "next/cache";
import type { Account, Item } from "@/domain/ssot";

interface CreateShipmentRequestInput {
  contactId: string;
  contactName: string;
  products: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
  }>;
  motivo: 'muestra' | 'influencer' | 'pos' | 'evento' | 'otro';
  requestedBy: string; // userId
  notes?: string;
}

export async function createShipmentRequest(input: CreateShipmentRequestInput) {
  try {
    const {
      contactId,
      contactName,
      products,
      motivo,
      requestedBy,
      notes,
    } = input;

    // Verificar si el usuario es de warehouse
    const userDoc = await db.collection("teamMembers").doc(requestedBy).get();
    const userData = userDoc.data();
    const isWarehouse = userData?.department === "warehouse" || userData?.role === "admin";

    // Si es warehouse, crear shipment directamente
    // Si no, crear solicitud pendiente
    if (isWarehouse) {
      // Crear shipment directamente
      const shipmentRef = db.collection("shipments").doc();
      const shipmentData = {
        id: shipmentRef.id,
        orderId: "DIRECT_REQUEST", // No viene de pedido
        accountId: contactId,
        customerName: contactName,
        status: "pending" as const,
        lines: products.map(p => ({
          itemId: p.itemId,
          name: p.itemName,
          qty: p.quantity,
        })),
        requestType: motivo,
        requestedBy,
        notes: notes || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await shipmentRef.set(shipmentData);

      revalidatePath("/warehouse/logistics");

      return {
        success: true,
        shipmentId: shipmentRef.id,
        message: "Envío creado directamente",
      };
    } else {
      // Crear solicitud pendiente aprobación
      const requestRef = db.collection("shipmentRequests").doc();
      const requestData = {
        id: requestRef.id,
        contactId,
        contactName,
        products,
        motivo,
        requestedBy,
        notes: notes || "",
        status: "pending" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await requestRef.set(requestData);

      revalidatePath("/envios/solicitar");

      return {
        success: true,
        requestId: requestRef.id,
        message: "Solicitud enviada para aprobación",
      };
    }
  } catch (error: any) {
    console.error("Error creating shipment request:", error);
    return {
      success: false,
      error: error.message || "Error al crear solicitud",
    };
  }
}

export async function approveShipmentRequest(requestId: string, approvedBy: string) {
  try {
    const requestRef = db.collection("shipmentRequests").doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return {
        success: false,
        error: "Solicitud no encontrada",
      };
    }

    const requestData = requestDoc.data()!;

    // Crear shipment
    const shipmentRef = db.collection("shipments").doc();
    const shipmentData = {
      id: shipmentRef.id,
      orderId: "APPROVED_REQUEST",
      accountId: requestData.contactId,
      customerName: requestData.contactName,
      status: "pending" as const,
      lines: requestData.products.map((p: any) => ({
        itemId: p.itemId,
        name: p.itemName,
        qty: p.quantity,
      })),
      requestType: requestData.motivo,
      requestedBy: requestData.requestedBy,
      approvedBy,
      notes: requestData.notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await shipmentRef.set(shipmentData);

    // Actualizar solicitud
    await requestRef.update({
      status: "approved",
      approvedBy,
      approvedAt: new Date().toISOString(),
      shipmentId: shipmentRef.id,
    });

    revalidatePath("/warehouse/logistics");
    revalidatePath("/envios/solicitar");

    return {
      success: true,
      shipmentId: shipmentRef.id,
      message: "Solicitud aprobada y envío creado",
    };
  } catch (error: any) {
    console.error("Error approving request:", error);
    return {
      success: false,
      error: error.message || "Error al aprobar solicitud",
    };
  }
}

export async function rejectShipmentRequest(requestId: string, rejectedBy: string, reason: string) {
  try {
    await db.collection("shipmentRequests").doc(requestId).update({
      status: "rejected",
      rejectedBy,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
    });

    revalidatePath("/envios/solicitar");

    return {
      success: true,
      message: "Solicitud rechazada",
    };
  } catch (error: any) {
    console.error("Error rejecting request:", error);
    return {
      success: false,
      error: error.message || "Error al rechazar solicitud",
    };
  }
}

export async function getUserShipmentRequests(userId: string) {
  try {
    const snapshot = await db
      .collection("shipmentRequests")
      .where("requestedBy", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const requests = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      requests,
    };
  } catch (error: any) {
    console.error("Error getting user requests:", error);
    return {
      success: false,
      error: error.message,
      requests: [],
    };
  }
}
