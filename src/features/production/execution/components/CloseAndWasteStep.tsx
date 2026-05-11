/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import React, { useState } from 'react';
import { ProductionOrderSchema } from '@/domain/bom-schemas';
import { z } from 'zod';

type ProductionOrder = z.infer<typeof ProductionOrderSchema>;

interface CloseAndWasteStepProps {
  order: ProductionOrder;
  onFinish: () => void;
  onComplete?: (actualQuantity: number, wasteQuantity: number) => Promise<void>;
}

const CloseAndWasteStep: React.FC<CloseAndWasteStepProps> = ({ order, onFinish, onComplete }) => {
  const [actualQuantity, setActualQuantity] = useState(order.targetQuantity);
  const [wasteQuantity, setWasteQuantity] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      if (onComplete) {
        await onComplete(actualQuantity, wasteQuantity);
      }
      onFinish();
    } catch (error) {
      console.error('Failed to complete production order:', error);
      alert('Failed to complete production order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h4>Close Production Order</h4>
      <div>
        <label>Actual Quantity Produced:</label>
        <input
          type="number"
          value={actualQuantity}
          onChange={(e) => setActualQuantity(Number(e.target.value))}
          className="sb-input"
        />
      </div>
      <div>
        <label>Waste Quantity:</label>
        <input
          type="number"
          value={wasteQuantity}
          onChange={(e) => setWasteQuantity(Number(e.target.value))}
          className="sb-input"
        />
      </div>
      <button onClick={handleFinish} className="sb-btn--primary" disabled={isSubmitting}>
        {isSubmitting ? 'Finishing...' : 'Finish Production'}
      </button>
    </div>
  );
};

export default CloseAndWasteStep;
