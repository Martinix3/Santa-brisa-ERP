// src/server/integrations/shopify/hmac.ts
import crypto from 'crypto';

const SHOPIFY_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET!;

/**
 * Verifies the HMAC signature of a Shopify webhook request.
 * @param rawBody The raw request body as a string.
 * @param hmacHeader The value of the 'X-Shopify-Hmac-SHA256' header.
 * @returns True if the signature is valid, false otherwise.
 */
export function verifyShopifyHmac(rawBody: string, hmacHeader?: string | null): boolean {
  if (!hmacHeader || !SHOPIFY_SECRET) {
    console.warn("Missing HMAC header or Shopify secret. Cannot verify webhook.");
    return false;
  }
  
  const digest = crypto
    .createHmac('sha256', SHOPIFY_SECRET)
    .update(rawBody, 'utf-8')
    .digest('base64');
  
  try {
    // Use timingSafeEqual to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(hmacHeader), Buffer.from(digest));
  } catch (error) {
    console.error("Error during HMAC comparison:", error);
    return false;
  }
}
