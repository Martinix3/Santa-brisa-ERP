"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import React, { useState } from 'react';
import { ProductionOrderSchema } from '@/domain/bom-schemas';
import ProductionOrdersTable from './ProductionOrdersTable';
import ProductionExecutionDrawer from '../../execution/components/ProductionExecutionDrawer';
import { z } from 'zod';

type ProductionOrder = z.infer<typeof ProductionOrderSchema>;

interface ProductionDashboardProps {
  initialOrders: ProductionOrder[];
  initialKpis: {
    openOrders: number;
    pausedOrders: number;
    waste7d: number;
    performance7d: number;
    fgStock: number;
  };
}

const ProductionDashboard: React.FC<ProductionDashboardProps> = ({ initialOrders, initialKpis }) => {
  const [orders, setOrders] = useState<ProductionOrder[]>(initialOrders);
  const [kpis, setKpis] = useState(initialKpis);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  const handleOrderSelect = (order: ProductionOrder) => {
    setSelectedOrder(order);
  };

  const handleDrawerClose = () => {
    setSelectedOrder(null);
  };

  return (
    <main className="p-4 md:p-6 space-y-5">
      <header className="sb-header-glass p-5">
        <h1>Production Dashboard</h1>
        <p className="text-muted-foreground">Gestión centralizada de órdenes de producción</p>
        <div className="mt-3 flex gap-2">
          <button className="sb-btn--primary">Plan New Order</button>
          <button className="sb-btn--secondary">Export</button>
        </div>
      </header>

      <nav className="sb-tabs" role="tablist">
        <button className="sb-tab" role="tab" aria-selected="true">
          In Progress <span className="sb-kpi-badge">{kpis.openOrders}</span>
        </button>
        <button className="sb-tab" role="tab" aria-selected="false">
          Planned <span className="sb-kpi-badge">0</span>
        </button>
        <button className="sb-tab" role="tab" aria-selected="false">
          History <span className="sb-kpi-badge">0</span>
        </button>
      </nav>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* KPIs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="sb-card-glass-light p-4">
              <h5 className="text-sm text-muted-foreground mb-1">Open Orders</h5>
              <p className="text-2xl font-semibold">{kpis.openOrders}</p>
            </div>
            <div className="sb-card-glass-light p-4">
              <h5 className="text-sm text-muted-foreground mb-1">Paused</h5>
              <p className="text-2xl font-semibold">{kpis.pausedOrders}</p>
            </div>
            <div className="sb-card-glass-light p-4">
              <h5 className="text-sm text-muted-foreground mb-1">Waste (7d)</h5>
              <p className="text-2xl font-semibold">{kpis.waste7d}%</p>
            </div>
            <div className="sb-card-glass-light p-4">
              <h5 className="text-sm text-muted-foreground mb-1">Performance</h5>
              <p className="text-2xl font-semibold">{kpis.performance7d}%</p>
            </div>
            <div className="sb-card-glass-light p-4">
              <h5 className="text-sm text-muted-foreground mb-1">FG Stock</h5>
              <p className="text-2xl font-semibold">{kpis.fgStock}</p>
            </div>
          </div>

          {/* Orders Table */}
          <div className="sb-card-glass-light p-5">
            <ProductionOrdersTable orders={orders} onOrderSelect={handleOrderSelect} />
          </div>
        </div>

        <aside className="space-y-5">
          <div className="sb-card-glass-light p-5">
            <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button className="sb-btn--secondary w-full justify-start">View Reports</button>
              <button className="sb-btn--secondary w-full justify-start">Manage BOMs</button>
              <button className="sb-btn--secondary w-full justify-start">Stock Levels</button>
            </div>
          </div>
        </aside>
      </section>

      {selectedOrder && (
        <ProductionExecutionDrawer
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={handleDrawerClose}
        />
      )}
    </main>
  );
};

export default ProductionDashboard;
