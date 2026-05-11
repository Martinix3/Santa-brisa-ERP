"use server";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import 'server-only';

import crypto from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { adminDb as db } from '@/server/firebase';

export type IntegrationLogDirection = 'inbound' | 'outbound';
export type IntegrationLogStatus = 'success' | 'error' | 'retry' | 'skipped';

export interface IntegrationLogInput {
  integration: string;
  direction: IntegrationLogDirection;
  operation: string;
  status: IntegrationLogStatus;
  source?: string;
  request?: unknown;
  response?: unknown;
  error?: { message: string; stack?: string };
  metadata?: Record<string, unknown>;
  correlationId?: string;
  attempt?: number;
  durationMs?: number;
  traceEventId?: string;
  alertKey?: string;
  taskKey?: string;
  useMock?: boolean;
  loggedAt?: string;
}

export interface IntegrationLogEntry extends IntegrationLogInput {
  id: string;
  loggedAt: string;
  day: string;
}

const COLLECTION = 'integration_logs';
const SENSITIVE_KEYS = ['authorization', 'apiKey', 'token', 'password', 'secret', 'signature', 'key'];

export async function logIntegrationEvent(
  input: IntegrationLogInput,
  options?: { dbOverride?: Firestore }
): Promise<IntegrationLogEntry> {
  const loggedAt = input.loggedAt ?? new Date().toISOString();
  const id = crypto.randomUUID();

  const entry: IntegrationLogEntry = {
    ...input,
    id,
    loggedAt,
    day: loggedAt.slice(0, 10),
    request: maskSensitive(input.request),
    response: maskSensitive(input.response),
    error: input.error ? maskError(input.error) : undefined,
  };

  try {
    const targetDb = options?.dbOverride ?? db;
    await targetDb.collection(COLLECTION).doc(id).set(entry);
  } catch (error) {
    console.error('[IntegrationLogger] Failed to persist log', entry.integration, entry.operation, error);
  }

  if (entry.status === 'error') {
    console.error(
      `[IntegrationLogger] ${entry.integration} ${entry.operation} failed`,
      pick(entry as unknown as Record<string, unknown>, ['correlationId', 'attempt', 'error'])
    );
  } else {
    console.debug(
      `[IntegrationLogger] ${entry.integration} ${entry.operation} -> ${entry.status}`,
      pick(entry as unknown as Record<string, unknown>, ['correlationId', 'attempt', 'durationMs'])
    );
  }

  return entry;
}

export async function logIntegrationSuccess(
  input: Omit<IntegrationLogInput, 'status'>,
  options?: { dbOverride?: Firestore }
) {
  return logIntegrationEvent({ ...input, status: 'success' }, options);
}

export async function logIntegrationError(
  input: Omit<IntegrationLogInput, 'status'>,
  error: unknown,
  options?: { dbOverride?: Firestore }
) {
  const normalized = normalizeError(error);
  return logIntegrationEvent(
    {
      ...input,
      status: 'error',
      error: normalized,
    },
    options
  );
}

function maskSensitive(value: unknown): unknown {
  if (!value) return value;
  if (typeof value === 'string') {
    if (!value.trim()) return value;
    try {
      const parsed = JSON.parse(value);
      return maskSensitive(parsed);
    } catch {
      return value.length > 120 ? `${value.slice(0, 120)}…` : value;
    }
  }
  if (Array.isArray(value)) {
    return value.map(maskSensitive);
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
        result[key] = '***';
      } else {
        result[key] = maskSensitive(val);
      }
    }
    return result;
  }
  return value;
}

function maskError(error: { message: string; stack?: string }) {
  return {
    message: error.message,
    stack: error.stack ? redactStack(error.stack) : undefined,
  };
}

function normalizeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  if (typeof error === 'string') {
    return { message: error };
  }
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: 'Unknown integration error' };
  }
}

function redactStack(stack: string) {
  return stack
    .split('\n')
    .filter((line) => !line.includes('node_modules'))
    .join('\n');
}

function pick<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]) {
  return keys.reduce<Record<string, unknown>>((acc, key) => {
    if (obj[key] !== undefined && obj[key] !== null) {
      acc[String(key)] = obj[key];
    }
    return acc;
  }, {});
}
