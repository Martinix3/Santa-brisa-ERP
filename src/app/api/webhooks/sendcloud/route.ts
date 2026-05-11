import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/server/firebase';
import { logGeminiContext } from '@/server/gemini/context-logger';
import crypto from 'crypto';

/**
 * Sendcloud Webhook Handler
 * Receives tracking updates from Sendcloud
 * 
 * Webhook Events:
 * - parcel_status_changed: When shipment status changes
 * - integration_*: Various integration events
 * 
 * Security: Validates webhook signature using SENDCLOUD_WEBHOOK_SECRET
 */

interface SendcloudWebhookPayload {
  action: string;
  timestamp: number;
  parcel: {
    id: number;
    tracking_number: string;
    status: {
      id: number;
      message: string;
    };
    carrier: {
      code: string;
    };
    shipment?: {
      id: string;
      name: string;
    };
  };
  integration?: {
    id: number;
    shop_name: string;
  };
}

/**
 * Verify Sendcloud webhook signature
 */
function verifySignature(payload: string, signature: string | null): boolean {
  const secret = process.env.SENDCLOUD_WEBHOOK_SECRET;
  
  if (!secret) {
    console.warn('SENDCLOUD_WEBHOOK_SECRET not configured, skipping signature validation');
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

/**
 * Map Sendcloud status to our internal status
 */
function mapSendcloudStatus(statusId: number): string {
  // Sendcloud status codes: https://docs.sendcloud.sc/api/v2/shipping/#status-codes
  const statusMap: Record<number, string> = {
    1: 'PENDING',      // Announced
    2: 'PROCESSING',   // En route to sorting center
    3: 'PROCESSING',   // Delivered at sorting center
    4: 'PROCESSING',   // Sorted
    5: 'IN_TRANSIT',   // Delivery delayed
    6: 'IN_TRANSIT',   // En route to delivery location
    7: 'DELIVERED',    // Delivered
    8: 'FAILED',       // Exception
    9: 'FAILED',       // Cancelled
    10: 'PENDING',     // Not collected
    11: 'IN_TRANSIT',  // Ready for collection
    12: 'DELIVERED',   // Collected
    13: 'FAILED',      // Announced but not collected
    14: 'RETURNED',    // Returned to sender
    15: 'IN_TRANSIT',  // En route to pick-up point
  };
  
  return statusMap[statusId] || 'UNKNOWN';
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('x-sendcloud-signature');
    
    // Verify signature
    if (!verifySignature(payload, signature)) {
      console.error('Invalid Sendcloud webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    const data: SendcloudWebhookPayload = JSON.parse(payload);
    
    console.log('Received Sendcloud webhook:', data.action);
    
    // Handle parcel_status_changed event
    if (data.action === 'parcel_status_changed') {
      const trackingNumber = data.parcel.tracking_number;
      const newStatus = mapSendcloudStatus(data.parcel.status.id);
      
      // Find shipment by tracking number
      const shipmentsRef = db.collection('shipments');
      const snapshot = await shipmentsRef
        .where('trackingNumber', '==', trackingNumber)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        console.warn(`Shipment not found for tracking number: ${trackingNumber}`);
        return NextResponse.json({ 
          status: 'not_found',
          message: 'Shipment not found' 
        });
      }
      
      const shipmentDoc = snapshot.docs[0];
      const shipmentId = shipmentDoc.id;
      const currentData = shipmentDoc.data();
      
      // Update shipment status
      await shipmentDoc.ref.update({
        status: newStatus,
        sendcloudStatus: data.parcel.status.message,
        sendcloudStatusId: data.parcel.status.id,
        lastStatusUpdate: new Date(),
        updatedAt: new Date(),
      });
      
      // Log event for Gemini AI
      await logGeminiContext('shipment_status_change', {
        shipmentId,
        trackingNumber,
        oldStatus: currentData.status,
        newStatus,
        sendcloudStatus: data.parcel.status.message,
        carrier: data.parcel.carrier.code,
        webhookAction: data.action,
      });
      
      console.log(`Updated shipment ${shipmentId} status: ${currentData.status} → ${newStatus}`);
      
      return NextResponse.json({
        status: 'success',
        shipmentId,
        newStatus,
      });
    }
    
    // Log other webhook events as tracking assignment
    await logGeminiContext('shipment_tracking_assigned', {
      webhookAction: data.action,
      parcelId: data.parcel.id,
      trackingNumber: data.parcel.tracking_number,
      source: 'sendcloud_webhook',
    }, 'logistics');
    
    return NextResponse.json({ 
      status: 'acknowledged',
      action: data.action 
    });
    
  } catch (error) {
    console.error('Error processing Sendcloud webhook:', error);
    
    await logGeminiContext('integration_failure', {
      provider: 'sendcloud',
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
    service: 'sendcloud-webhook',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}
