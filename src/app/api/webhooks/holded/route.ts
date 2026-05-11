import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/server/firebase';
import { logGeminiContext } from '@/server/gemini/context-logger';
import crypto from 'crypto';

/**
 * Holded Webhook Handler
 * Receives invoice events from Holded
 * 
 * Webhook Events:
 * - invoice.paid: When an invoice is paid
 * - invoice.created: When a new invoice is created
 * - invoice.deleted: When an invoice is deleted
 * 
 * Security: Validates webhook signature using HOLDED_WEBHOOK_SECRET
 */

interface HoldedWebhookPayload {
  event: string;
  data: {
    id: string;
    docNumber?: string;
    contactId?: string;
    contactName?: string;
    items?: Array<{
      sku?: string;
      name: string;
      units: number;
      subtotal: number;
    }>;
    subtotal?: number;
    total?: number;
    currency?: string;
    status?: string;
    date?: string;
    dueDate?: string;
  };
  timestamp: number;
}

/**
 * Verify Holded webhook signature
 */
function verifySignature(payload: string, signature: string | null): boolean {
  const secret = process.env.HOLDED_WEBHOOK_SECRET;
  
  if (!secret) {
    console.warn('HOLDED_WEBHOOK_SECRET not configured, skipping signature validation');
    return true; // In development, allow without signature
  }
  
  if (!signature) {
    return false;
  }
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('x-holded-signature');
    
    // Verify signature
    if (!verifySignature(payload, signature)) {
      console.error('Invalid Holded webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    const data: HoldedWebhookPayload = JSON.parse(payload);
    
    console.log('Received Holded webhook:', data.event);
    
    // Handle invoice.paid event
    if (data.event === 'invoice.paid') {
      const invoiceId = data.data.id;
      const docNumber = data.data.docNumber;
      
      // Find shipment by Holded invoice ID
      const shipmentsRef = db.collection('shipments');
      const snapshot = await shipmentsRef
        .where('holdedInvoiceId', '==', invoiceId)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        console.warn(`Shipment not found for Holded invoice: ${invoiceId}`);
        
        // Log event even if shipment not found
        await logGeminiContext('invoice_created', {
          invoiceId,
          docNumber,
          total: data.data.total,
          contactName: data.data.contactName,
          source: 'holded_webhook',
          shipmentNotFound: true,
        }, 'finance');
        
        return NextResponse.json({ 
          status: 'not_found',
          message: 'Shipment not found for this invoice' 
        });
      }
      
      const shipmentDoc = snapshot.docs[0];
      const shipmentId = shipmentDoc.id;
      const currentData = shipmentDoc.data();
      
      // Update shipment payment status
      await shipmentDoc.ref.update({
        paymentStatus: 'PAID',
        paidAt: new Date(),
        holdedInvoiceStatus: 'paid',
        updatedAt: new Date(),
      });
      
      // Check if this triggers an overdue resolution
      const wasOverdue = currentData.paymentStatus === 'OVERDUE';
      
      // Log event for Gemini AI
      if (wasOverdue) {
        await logGeminiContext('invoice_overdue', {
          shipmentId,
          invoiceId,
          docNumber,
          resolved: true,
          oldStatus: 'OVERDUE',
          newStatus: 'PAID',
          amount: data.data.total,
          contactName: data.data.contactName,
        }, 'finance');
      }
      
      await logGeminiContext('invoice_created', {
        shipmentId,
        invoiceId,
        docNumber,
        status: 'paid',
        total: data.data.total,
        contactName: data.data.contactName,
        source: 'holded_webhook',
      }, 'finance');
      
      console.log(`Updated shipment ${shipmentId} payment status: PAID`);
      
      return NextResponse.json({
        status: 'success',
        shipmentId,
        invoiceId,
        paymentStatus: 'PAID',
      });
    }
    
    // Handle invoice.created event
    if (data.event === 'invoice.created') {
      await logGeminiContext('invoice_created', {
        invoiceId: data.data.id,
        docNumber: data.data.docNumber,
        total: data.data.total,
        contactName: data.data.contactName,
        source: 'holded_webhook',
        status: data.data.status,
      }, 'finance');
      
      return NextResponse.json({
        status: 'acknowledged',
        event: data.event,
      });
    }
    
    // Handle invoice.deleted event
    if (data.event === 'invoice.deleted') {
      const invoiceId = data.data.id;
      
      // Find and update shipment
      const shipmentsRef = db.collection('shipments');
      const snapshot = await shipmentsRef
        .where('holdedInvoiceId', '==', invoiceId)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        const shipmentDoc = snapshot.docs[0];
        await shipmentDoc.ref.update({
          holdedInvoiceId: null,
          holdedInvoiceStatus: 'deleted',
          updatedAt: new Date(),
        });
        
        await logGeminiContext('integration_failure', {
          provider: 'holded',
          operation: 'invoice_deleted',
          shipmentId: shipmentDoc.id,
          invoiceId,
          message: 'Invoice was deleted in Holded',
        });
      }
      
      return NextResponse.json({
        status: 'acknowledged',
        event: data.event,
      });
    }
    
    // Log unhandled webhook events
    console.log('Unhandled Holded webhook event:', data.event);
    
    return NextResponse.json({ 
      status: 'acknowledged',
      event: data.event 
    });
    
  } catch (error) {
    console.error('Error processing Holded webhook:', error);
    
    await logGeminiContext('integration_failure', {
      provider: 'holded',
      operation: 'webhook',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    service: 'holded-webhook',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}
