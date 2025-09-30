// src/app/(app)/production/dashboard/page.tsx
'use client';
import React from "react";
import { useData } from "@/lib/dataprovider";
import ProductionDashboard from "@/features/production/dashboard/index.page";

export default function Page() {
  const { data } = useData();
  const { billOfMaterials: recipes, items, onHand, productionOrders: orders } = data || {};
  
  if(!recipes || !items || !onHand || !orders) {
    return <div className="p-6">Cargando datos de producción...</div>;
  }
  
  return <ProductionDashboard />;
}
