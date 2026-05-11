/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/server/integrations/gmail/types.ts
import 'server-only';

/**
 * GMAIL INTEGRATION TYPES
 * 
 * Tipos para la integración con Gmail API
 */

// =================================================================
// GMAIL MESSAGE & THREAD
// =================================================================

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
  sizeEstimate?: number;
  raw?: string;
}

export interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: GmailMessagePartBody;
  parts?: GmailMessagePart[];
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessagePartBody {
  attachmentId?: string;
  size?: number;
  data?: string;
}

export interface GmailThread {
  id: string;
  historyId?: string;
  messages?: GmailMessage[];
}

// =================================================================
// PARSED EMAIL
// =================================================================

export interface ParsedEmail {
  messageId: string;
  threadId: string;
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  date: string;
  inReplyTo?: string;
  references?: string[];
  attachments: EmailAttachment[];
  labels?: string[];
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
  data?: string;
}

// =================================================================
// SEND EMAIL PARAMS
// =================================================================

export interface SendEmailParams {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  attachments?: EmailAttachmentToSend[];
  accountId?: string;
  inReplyTo?: string;
  references?: string[];
  threadId?: string;
  scheduledAt?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  templateId?: string;
  templateVariables?: Record<string, any>;
}

export interface EmailAttachmentToSend {
  filename: string;
  mimeType: string;
  content: string | Buffer;
}

// =================================================================
// EMAIL TEMPLATE
// =================================================================

export interface EmailTemplate {
  id: string;
  category: 'sales' | 'orders' | 'quality' | 'tasks' | 'general';
  name: string;
  description?: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: string[];
  attachments?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// =================================================================
// EMAIL ANALYSIS (IA)
// =================================================================

export interface EmailAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'prospection' | 'support' | 'complaint' | 'order' | 'general';
  requiresAction: boolean;
  entities: ExtractedEntities;
  suggestedResponse?: string;
  summary?: string;
}

export interface ExtractedEntities {
  orders?: string[];
  products?: string[];
  dates?: string[];
  amounts?: number[];
  contacts?: string[];
  accounts?: string[];
}

// =================================================================
// EMAIL TRACKING
// =================================================================

export interface EmailTracking {
  messageId: string;
  accountId?: string;
  contactId?: string;
  sentAt: string;
  openedAt?: string;
  clickedAt?: string;
  repliedAt?: string;
  bouncedAt?: string;
  openCount: number;
  clickCount: number;
  userAgent?: string;
  ipAddress?: string;
}

// =================================================================
// SYNC STATE
// =================================================================

export interface GmailSyncState {
  userId: string;
  historyId: string;
  lastSyncAt: string;
  lastError?: string;
  totalSynced: number;
}

// =================================================================
// GMAIL CONFIG
// =================================================================

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken: string;
  userId: string;
  email: string;
}

// =================================================================
// EMAIL NOTIFICATION CONFIG
// =================================================================

export interface EmailNotificationConfig {
  userId: string;
  notifications: {
    newOrder: { enabled: boolean; template: string };
    shipmentReady: { enabled: boolean; template: string };
    qualityAlert: { enabled: boolean; template: string };
    taskAssigned: { enabled: boolean; template: string };
    accountActivity: { enabled: boolean; template: string };
  };
  createdAt: string;
  updatedAt: string;
}

// =================================================================
// EMAIL STATS
// =================================================================

export interface EmailStats {
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  bounceRate: number;
  avgResponseTime?: number; // in hours
  byTemplate?: Record<string, {
    sent: number;
    opened: number;
    clicked: number;
  }>;
  bySalesRep?: Record<string, {
    sent: number;
    avgResponseTime: number;
  }>;
}

// =================================================================
// LIST FILTERS
// =================================================================

export interface EmailListFilters {
  unreadOnly?: boolean;
  accountId?: string;
  contactId?: string;
  labelIds?: string[];
  query?: string;
  after?: string;
  before?: string;
  maxResults?: number;
  pageToken?: string;
}
