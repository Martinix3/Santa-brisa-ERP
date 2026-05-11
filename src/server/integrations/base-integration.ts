/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/server/integrations/base-integration.ts
import 'server-only';

import { createJob, updateJobStatus, type IntegrationProvider, type IntegrationJobType } from './integration-jobs';
import { logIntegrationEvent, logIntegrationError } from './integration-logger';

export interface IntegrationConfig {
  apiKey: string;
  baseUrl: string;
  useMock?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export abstract class BaseIntegration {
  protected apiKey: string;
  protected baseUrl: string;
  protected useMock: boolean;
  protected retryAttempts = 3;
  protected trackJobs: boolean = true; // Enable job tracking by default
  
  constructor(config: IntegrationConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.useMock = config.useMock ?? true; // Mock por defecto
  }

  /**
   * Each integration must declare its provider name for job tracking
   */
  protected abstract getProviderName(): IntegrationProvider;

  protected async call<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any
  ): Promise<ApiResponse<T>> {
    // Create job for tracking (if enabled)
    let jobId: string | null = null;
    const startTime = Date.now();
    
    if (this.trackJobs && !this.useMock) {
      try {
        jobId = await createJob({
          provider: this.getProviderName(),
          jobType: this.mapMethodToJobType(method, endpoint),
          refId: this.extractRefId(endpoint, data),
          status: 'pending',
          attempts: 0,
          maxAttempts: this.retryAttempts,
          metadata: { endpoint, method, data },
        });
      } catch (error) {
        console.error('[BaseIntegration] Error creating job:', error);
      }
    }
    
    if (this.useMock) {
      const result = await this.mockCall(endpoint, method, data);
      
      // Update job as success for mock calls
      if (jobId) {
        await updateJobStatus(jobId, 'success', undefined, Date.now() - startTime);
      }
      
      return result;
    }
    
    // Real API call with retry logic
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        // Update job status to running
        if (jobId && attempt === 1) {
          await updateJobStatus(jobId, 'running');
        }
        
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {
          'key': this.apiKey,
          'Accept': 'application/json',
          'User-Agent': 'SantaBrisaERP/1.0 (+sync)',
        };
        
        // Solo añadir Content-Type en POST/PUT con body
        if (data && (method === 'POST' || method === 'PUT')) {
          headers['Content-Type'] = 'application/json';
        }
        
        console.log(`[${this.constructor.name}] Making ${method} request to:`, url);
        console.log(`[${this.constructor.name}] Headers:`, { ...headers, key: '***' });
        
        const response = await fetch(url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          cache: 'no-store',
        });
        
        console.log(`[${this.constructor.name}] Response status:`, response.status);
        console.log(`[${this.constructor.name}] Response content-type:`, response.headers.get('content-type'));

        const latencyMs = Date.now() - startTime;

        if (!response.ok) {
          const bodyText = await response.text();
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          console.error(`[${this.constructor.name}] API Error ${response.status}:`, bodyText.substring(0, 500));

          await this.logCall({
            endpoint,
            method,
            status: 'error',
            durationMs: latencyMs,
            jobId,
            attempt,
            data,
            error: { message: error.message },
          });

          throw error;
        }

        // Tolerant JSON parsing: some APIs return wrong content-type
        const contentType = response.headers.get('content-type') || '';
        let result: any;

        if (contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const text = await response.text();
          const head = text.trim().slice(0, 1);

          if (head === '{' || head === '[') {
            try {
              result = JSON.parse(text);
            } catch (parseError) {
              console.error(`[${this.constructor.name}] Non-JSON content-type and parse failed:`, text.substring(0, 200));
              const err = new Error(`API returned non-JSON response (${contentType}) and could not parse`);

              await this.logCall({
                endpoint,
                method,
                status: 'error',
                durationMs: latencyMs,
                jobId,
                attempt,
                data,
                error: { message: err.message },
              });

              throw err;
            }
          } else {
            console.error(`[${this.constructor.name}] Expected JSON but got ${contentType}:`, text.substring(0, 200));
            const err = new Error(`API returned non-JSON response (${contentType})`);

            await this.logCall({
              endpoint,
              method,
              status: 'error',
              durationMs: latencyMs,
              jobId,
              attempt,
              data,
              error: { message: err.message },
            });

            throw err;
          }
        }

        if (jobId) {
          await updateJobStatus(jobId, 'success', undefined, latencyMs);
        }

        await this.logCall({
          endpoint,
          method,
          status: 'success',
          durationMs: latencyMs,
          jobId,
          attempt,
          data,
        });

        return { success: true, data: result };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (attempt === this.retryAttempts) {
          await this.logCall({
            endpoint,
            method,
            status: 'error',
            durationMs: Date.now() - startTime,
            jobId,
            attempt,
            data,
            error: { message: errorMessage },
          });

          // Update job as failed
          if (jobId) {
            const latencyMs = Date.now() - startTime;
            await updateJobStatus(jobId, 'failed', errorMessage, latencyMs);
          }
          
          throw error;
        }
        
        // Update job as retry
        if (jobId) {
          await updateJobStatus(jobId, 'retry', errorMessage);
        }

        await this.logCall({
          endpoint,
          method,
          status: 'retry',
          durationMs: Date.now() - startTime,
          jobId,
          attempt,
          data,
          error: { message: errorMessage },
        });

        await this.wait(1000 * attempt); // Exponential backoff
      }
    }
    
    // This should never be reached, but TypeScript requires it
    const errorMsg = 'Max retries exceeded';
    if (jobId) {
      await updateJobStatus(jobId, 'failed', errorMsg, Date.now() - startTime);
    }
    throw new Error(errorMsg);
  }

  protected abstract mockCall(
    endpoint: string, 
    method: string, 
    data?: any
  ): Promise<ApiResponse<any>>;
  
  private async logCall(options: {
    endpoint: string;
    method: string;
    status: 'success' | 'error' | 'retry';
    durationMs?: number;
    jobId?: string | null;
    attempt?: number;
    data?: any;
    error?: { message: string; stack?: string };
  }): Promise<void> {
    const { endpoint, method, status, durationMs, jobId, attempt, data, error } = options;
    const operation = `${method} ${endpoint}`;

    if (status === 'error' && error) {
      await logIntegrationError(
        {
          integration: this.getProviderName(),
          direction: 'outbound',
          operation,
          source: this.constructor.name,
          request: data,
          metadata: { jobId, useMock: this.useMock },
          attempt,
          durationMs,
        },
        error
      );
      return;
    }

    await logIntegrationEvent({
      integration: this.getProviderName(),
      direction: 'outbound',
      operation,
      status,
      source: this.constructor.name,
      request: data,
      metadata: { jobId, useMock: this.useMock },
      attempt,
      durationMs,
    });
  }

  protected async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Map HTTP method and endpoint to a job type
   * Subclasses can override for more specific mapping
   */
  protected mapMethodToJobType(method: string, endpoint: string): IntegrationJobType {
    if (endpoint.includes('invoice') || endpoint.includes('document')) {
      return 'create_invoice';
    }
    if (endpoint.includes('shipment') || endpoint.includes('parcel')) {
      return 'create_shipment';
    }
    if (endpoint.includes('label')) {
      return 'create_label';
    }
    return 'sync_order';
  }

  /**
   * Extract reference ID from endpoint or data
   * Subclasses should override for better extraction
   */
  protected extractRefId(endpoint: string, data?: any): string {
    // Try to find an ID in the endpoint path
    const matches = endpoint.match(/\/([a-zA-Z0-9_-]+)$/);
    if (matches) return matches[1];
    
    // Try to find an ID in the data
    if (data) {
      if (data.id) return data.id;
      if (data.shipmentId) return data.shipmentId;
      if (data.orderId) return data.orderId;
      if (data.invoiceId) return data.invoiceId;
    }
    
    // Fallback to timestamp
    return `ref_${Date.now()}`;
  }
}
