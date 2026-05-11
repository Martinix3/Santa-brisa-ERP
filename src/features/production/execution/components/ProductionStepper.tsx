/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import React, { useState } from 'react';
import { ProductionOrderSchema, BomSchema, ProductSpecSchema } from '@/domain/bom-schemas';
import { ProductionProtocolRunSchema } from '@/domain/ssot-v2-plus-schemas';
import PreFlightChecksStep from './PreFlightChecksStep';
import ExecuteIngredientStep from './ExecuteIngredientStep';
import FormulaAdjustmentStep from './FormulaAdjustmentStep';
import CloseAndWasteStep from './CloseAndWasteStep';
import { z } from 'zod';

type ProductionOrder = z.infer<typeof ProductionOrderSchema>;
type Bom = z.infer<typeof BomSchema>;

interface ProductionStepperProps {
  order: ProductionOrder;
  bom: Bom;
  protocolRuns?: z.infer<typeof ProductionProtocolRunSchema>[];
}

const ProductionStepper: React.FC<ProductionStepperProps> = ({ order, bom, protocolRuns = [] }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    'Pre-flight Checks',
    ...bom.lines.map(line => `Execute: ${line.itemId}`),
    'Formula Adjustment',
    'Close & Waste',
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    const stepTitle = steps[currentStep];

    if (stepTitle === 'Pre-flight Checks') {
      return <PreFlightChecksStep protocolRuns={protocolRuns} />;
    }

    if (stepTitle.startsWith('Execute:')) {
      const itemId = stepTitle.split(': ')[1];
      const line = bom.lines.find(l => l.itemId === itemId);
      if (!line) return null;
      return <ExecuteIngredientStep line={line} onLog={console.log} />;
    }

    if (stepTitle === 'Formula Adjustment') {
      const specs = bom.lines
        .map(line => line.requiredSpec)
        .filter(spec => spec !== undefined) as z.infer<typeof ProductSpecSchema>[];
      return <FormulaAdjustmentStep specs={specs} />;
    }

    if (stepTitle === 'Close & Waste') {
      return <CloseAndWasteStep order={order} onFinish={() => setCurrentStep(0)} />;
    }

    return null;
  };

  return (
    <div>
      <h3>Step {currentStep + 1}: {steps[currentStep]}</h3>
      <div>{renderStepContent()}</div>
      <div>
        <button onClick={handleBack} disabled={currentStep === 0}>
          Back
        </button>
        <button onClick={handleNext} disabled={currentStep === steps.length - 1}>
          Next
        </button>
      </div>
    </div>
  );
};

export default ProductionStepper;
