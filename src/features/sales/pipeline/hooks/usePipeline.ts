// src/features/sales/pipeline/hooks/usePipeline.ts
"use client";
import { useState, useEffect, useCallback } from 'react';
import type { PipelineAccount } from '../pipeline.service';

export type PipelineFilters = {
  zones?: string[];
  distributors?: string[];
  stages?: ("POTENCIAL" | "SEGUIMIENTO" | "ACTIVA" | "FALLIDA")[];
  userIds?: string[];
  dept?: "VENTAS" | "MARKETING" | "OPS";
  riskDays?: number;
  plv?: "yes" | "no";
  hasTarget?: "yes" | "no";
  q?: string;
};

async function fetchPipelineData(filters: PipelineFilters): Promise<PipelineAccount[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v));
      } else {
        params.set(key, String(value));
      }
    }
  });

  const res = await fetch(`/api/pipeline-board?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: "Error de red" }));
    throw new Error(errorData.message || 'Error al cargar los datos del pipeline');
  }
  const data = await res.json();
  return data.accounts;
}

export function usePipeline() {
  const [accounts, setAccounts] = useState<PipelineAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PipelineFilters>({ userIds: [] });

  const loadData = useCallback(async (currentFilters: PipelineFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPipelineData(currentFilters);
      setAccounts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(filters);
  }, [filters, loadData]);

  return { accounts, isLoading, error, filters, setFilters };
}
