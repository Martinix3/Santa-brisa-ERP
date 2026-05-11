/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import React from 'react';
import { ProductionOrderSchema } from '@/domain/bom-schemas';
import { z } from 'zod';

type ProductionOrder = z.infer<typeof ProductionOrderSchema>;

interface ProductionOrdersTableProps {
  orders: ProductionOrder[];
  onOrderSelect: (order: ProductionOrder) => void;
}

const ProductionOrdersTable: React.FC<ProductionOrdersTableProps> = ({
  orders,
  onOrderSelect,
}) => {
  return (
    <div className="sb-table-wrap">
      <table className="sb-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Product</th>
            <th>Target Lot</th>
            <th>Status</th>
            <th>Assigned To</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-muted-foreground py-8">
                No production orders found
              </td>
            </tr>
          ) : (
            orders.map((order, index) => (
              <tr 
                key={order.id || `order-${index}`} 
                onClick={() => onOrderSelect(order)} 
                className="hover:bg-secondary/30 cursor-pointer"
              >
                <td className="font-mono text-sm">{order.id}</td>
                <td>{order.targetItemId}</td>
                <td className="font-mono text-sm">{order.targetLotCode}</td>
                <td>
                  <span className={`sb-badge--${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                </td>
                <td>{order.assignedTo || <span className="text-muted-foreground">Unassigned</span>}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all" 
                        style={{ width: '0%' }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">0%</span>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProductionOrdersTable;
