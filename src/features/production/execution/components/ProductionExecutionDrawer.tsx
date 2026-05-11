/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import React, { useState, useEffect } from 'react';
import { getBom } from '@/server/actions/production';
import { ProductionOrderSchema, BomSchema } from '@/domain/bom-schemas';
import ProductionStepper from './ProductionStepper';
import { z } from 'zod';

type ProductionOrder = z.infer<typeof ProductionOrderSchema>;

interface ProductionExecutionDrawerProps {
  order: ProductionOrder;
  isOpen: boolean;
  onClose: () => void;
}

const ProductionExecutionDrawer: React.FC<ProductionExecutionDrawerProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const [bom, setBom] = useState<z.infer<typeof BomSchema> | null>(null);

  useEffect(() => {
    if (order) {
      getBom(order.bomId).then(bomData => {
        if (bomData) {
          setBom(bomData);
        }
      });
    }
  }, [order]);

  if (!isOpen || !order) {
    return null;
  }

  return (
    <div className={`sb-drawer ${isOpen ? 'sb-drawer--open' : ''}`}>
      <div className="sb-drawer__header">
        <h2>Production Order: {order.targetLotCode}</h2>
        <div>
          <span className={`sb-badge--${order.status.toLowerCase()}`}>
            {order.status}
          </span>
          {/* TODO: Implement chronometer */}
          <span>00:00:00</span>
          <button onClick={onClose} className="sb-btn--icon">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
      <div className="sb-drawer__content">
        {bom ? (
          <ProductionStepper order={order} bom={bom} />
        ) : (
          <p>Loading BOM...</p>
        )}
      </div>
      <div className="sb-drawer__footer">
        <button className="sb-btn--secondary">Register Incident</button>
        <button className="sb-btn--ghost">Pause</button>
        <button className="sb-btn--primary">Next Step / Finish</button>
      </div>
    </div>
  );
};

export default ProductionExecutionDrawer;
