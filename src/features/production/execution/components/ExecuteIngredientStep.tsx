/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import React, { useState } from 'react';
import { BomLineSchema } from '@/domain/bom-schemas';
import { z } from 'zod';

type BomLine = z.infer<typeof BomLineSchema>;

interface ExecuteIngredientStepProps {
  line: BomLine;
  onLog: (log: any) => void;
  availableLots?: Array<{ lotCode: string; availableQty: number; uom: string }>;
}

const ExecuteIngredientStep: React.FC<ExecuteIngredientStepProps> = ({
  line,
  onLog,
  availableLots = [],
}) => {
  const [selectedLot, setSelectedLot] = useState('');
  const [actualQuantity, setActualQuantity] = useState(0);

  const handleLog = () => {
    const log = {
      stepTitle: `Añadir ${line.itemId}`,
      targetQuantity: line.quantity,
      actualQuantity,
      inputLotCode: selectedLot,
      executedBy: 'current_user_id', // TODO: Replace with actual user ID
      executedAt: new Date(),
      deviation: actualQuantity - line.quantity,
    };
    onLog(log);
  };

  return (
    <div>
      <h4>Añadir {line.itemId}</h4>
      <p>Objetivo: {line.quantity} {line.uom}</p>
      <div>
        <label>Lote:</label>
        {/* TODO: Populate with available lots */}
        <select
          value={selectedLot}
          onChange={(e) => setSelectedLot(e.target.value)}
        >
          <option value="">Select Lot</option>
          {availableLots.map(lot => (
            <option key={lot.lotCode} value={lot.lotCode}>
              {lot.lotCode} ({lot.availableQty} {line.uom})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Cantidad Real:</label>
        <input
          type="number"
          value={actualQuantity}
          onChange={(e) => setActualQuantity(Number(e.target.value))}
          className="sb-input"
        />
      </div>
      <button onClick={handleLog} className="sb-btn--primary">
        Añadir
      </button>
    </div>
  );
};

export default ExecuteIngredientStep;
