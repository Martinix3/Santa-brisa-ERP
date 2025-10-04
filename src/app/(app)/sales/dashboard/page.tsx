// src/app/(app)/sales/dashboard/page.tsx
"use client";

import React from 'react';
import { PipelineBoard } from '@/features/sales/pipeline/components/PipelineBoard';

export default function SalesDashboardPage() {
  return (
    <div className="h-full">
      <PipelineBoard />
    </div>
  );
}
