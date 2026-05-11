/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/server/integrations/gmail/parser.ts
import 'server-only';

import type { 
  GmailMessage, 
  ParsedEmail, 
  EmailAttachment,
  GmailHeader,
  GmailMessagePart 
} from './types';

/**
 * GMAIL MESSAGE PARSER
 * 
 * Utilidades para parsear mensajes de Gmail API
 */

// =================================================================
// PARSE GMAIL MESSAGE
// =================================================================

export function parseGmailMessage(message: GmailMessage): ParsedEmail {
  const headers = extractHeaders(message.payload?.headers || []);
  
  return {
    messageId: message.id,
    threadId: message.threadId,
    from: headers.from || '',
    fromName: extractNameFromEmail(headers.from || ''),
    to: parseEmailList(headers.to || ''),
    cc: headers.cc ? parseEmailList(headers.cc) : undefined,
    bcc: headers.bcc ? parseEmailList(headers.bcc) : undefined,
    subject: headers.subject || '(No Subject)',
    body: extractTextBody(message.payload) || '',
    bodyHtml: extractHtmlBody(message.payload),
    date: headers.date || new Date().toISOString(),
    inReplyTo: headers['in-reply-to'],
    references: headers.references ? headers.references.split(' ') : undefined,
    attachments: extractAttachments(message.payload),
    labels: message.labelIds,
  };
}

// =================================================================
// EXTRACT HEADERS
// =================================================================

function extractHeaders(headers: GmailHeader[]): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const header of headers) {
    const name = header.name.toLowerCase();
    result[name] = header.value;
  }
  
  return result;
}

// =================================================================
// EXTRACT BODY
// =================================================================

function extractTextBody(part?: GmailMessagePart): string | undefined {
  if (!part) return undefined;
  
  // Si es text/plain, retornar directamente
  if (part.mimeType === 'text/plain' && part.body?.data) {
    return decodeBase64(part.body.data);
  }
  
  // Si tiene parts, buscar recursivamente
  if (part.parts && part.parts.length > 0) {
    for (const subPart of part.parts) {
      const text = extractTextBody(subPart);
      if (text) return text;
    }
  }
  
  return undefined;
}

function extractHtmlBody(part?: GmailMessagePart): string | undefined {
  if (!part) return undefined;
  
  // Si es text/html, retornar directamente
  if (part.mimeType === 'text/html' && part.body?.data) {
    return decodeBase64(part.body.data);
  }
  
  // Si tiene parts, buscar recursivamente
  if (part.parts && part.parts.length > 0) {
    for (const subPart of part.parts) {
      const html = extractHtmlBody(subPart);
      if (html) return html;
    }
  }
  
  return undefined;
}

// =================================================================
// EXTRACT ATTACHMENTS
// =================================================================

function extractAttachments(
  part?: GmailMessagePart,
  attachments: EmailAttachment[] = []
): EmailAttachment[] {
  if (!part) return attachments;
  
  // Si tiene filename, es un attachment
  if (part.filename && part.body?.attachmentId) {
    attachments.push({
      filename: part.filename,
      mimeType: part.mimeType || 'application/octet-stream',
      size: part.body.size || 0,
      attachmentId: part.body.attachmentId,
      data: part.body.data,
    });
  }
  
  // Buscar en parts recursivamente
  if (part.parts && part.parts.length > 0) {
    for (const subPart of part.parts) {
      extractAttachments(subPart, attachments);
    }
  }
  
  return attachments;
}

// =================================================================
// EMAIL PARSING UTILITIES
// =================================================================

export function parseEmailList(emailString: string): string[] {
  if (!emailString) return [];
  
  // Split por comas y limpiar
  return emailString
    .split(',')
    .map(email => {
      // Extraer email de formato "Name <email@domain.com>"
      const match = email.match(/<([^>]+)>/);
      return match ? match[1].trim() : email.trim();
    })
    .filter(email => email.length > 0);
}

export function extractNameFromEmail(emailString: string): string | undefined {
  if (!emailString) return undefined;
  
  // Formato: "John Doe <john@example.com>"
  const match = emailString.match(/^([^<]+)</);
  if (match) {
    return match[1].trim().replace(/"/g, '');
  }
  
  return undefined;
}

export function extractEmailAddress(emailString: string): string {
  if (!emailString) return '';
  
  // Extraer email de formato "Name <email@domain.com>"
  const match = emailString.match(/<([^>]+)>/);
  return match ? match[1].trim() : emailString.trim();
}

// =================================================================
// BASE64 UTILITIES
// =================================================================

export function decodeBase64(data: string): string {
  try {
    // Gmail usa base64url (sin padding)
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (error) {
    console.error('[Gmail Parser] Error decoding base64:', error);
    return '';
  }
}

export function encodeBase64(data: string): string {
  try {
    const base64 = Buffer.from(data, 'utf-8').toString('base64');
    // Convertir a base64url
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (error) {
    console.error('[Gmail Parser] Error encoding base64:', error);
    return '';
  }
}

// =================================================================
// MIME MESSAGE BUILDER
// =================================================================

export function createMimeMessage(params: {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: Array<{ filename: string; mimeType: string; content: string | Buffer }>;
}): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const lines: string[] = [];
  
  // Headers
  lines.push(`From: ${params.from}`);
  lines.push(`To: ${params.to.join(', ')}`);
  
  if (params.cc && params.cc.length > 0) {
    lines.push(`Cc: ${params.cc.join(', ')}`);
  }
  
  if (params.bcc && params.bcc.length > 0) {
    lines.push(`Bcc: ${params.bcc.join(', ')}`);
  }
  
  lines.push(`Subject: ${params.subject}`);
  lines.push(`Date: ${new Date().toUTCString()}`);
  
  if (params.inReplyTo) {
    lines.push(`In-Reply-To: ${params.inReplyTo}`);
  }
  
  if (params.references && params.references.length > 0) {
    lines.push(`References: ${params.references.join(' ')}`);
  }
  
  lines.push(`MIME-Version: 1.0`);
  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  lines.push('');
  
  // Body (text)
  lines.push(`--${boundary}`);
  lines.push(`Content-Type: text/plain; charset=UTF-8`);
  lines.push(`Content-Transfer-Encoding: quoted-printable`);
  lines.push('');
  lines.push(params.body);
  lines.push('');
  
  // Body (html) si existe
  if (params.bodyHtml) {
    lines.push(`--${boundary}`);
    lines.push(`Content-Type: text/html; charset=UTF-8`);
    lines.push(`Content-Transfer-Encoding: quoted-printable`);
    lines.push('');
    lines.push(params.bodyHtml);
    lines.push('');
  }
  
  // Attachments
  if (params.attachments && params.attachments.length > 0) {
    for (const attachment of params.attachments) {
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`);
      lines.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
      lines.push(`Content-Transfer-Encoding: base64`);
      lines.push('');
      
      const content = typeof attachment.content === 'string'
        ? attachment.content
        : attachment.content.toString('base64');
      
      lines.push(content);
      lines.push('');
    }
  }
  
  // Final boundary
  lines.push(`--${boundary}--`);
  
  return lines.join('\r\n');
}

// =================================================================
// EMAIL VALIDATION
// =================================================================

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateEmailList(emails: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  for (const email of emails) {
    if (isValidEmail(email)) {
      valid.push(email);
    } else {
      invalid.push(email);
    }
  }
  
  return { valid, invalid };
}

// =================================================================
// STRIP HTML
// =================================================================

export function stripHtml(html: string): string {
  // Remover tags HTML básico
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

// =================================================================
// EXTRACT PLAIN TEXT FROM HTML
// =================================================================

export function htmlToPlainText(html: string): string {
  let text = html;
  
  // Reemplazar <br> y <p> con saltos de línea
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  
  // Remover todos los tags
  text = stripHtml(text);
  
  // Limpiar espacios múltiples
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/ {2,}/g, ' ');
  
  return text.trim();
}
