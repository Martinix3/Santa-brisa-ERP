/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import React from 'react';
import { ProductionProtocolRunSchema } from '@/domain/ssot-v2-plus-schemas';
import { z } from 'zod';

type ProtocolRun = z.infer<typeof ProductionProtocolRunSchema>;

interface PreFlightChecksStepProps {
  protocolRuns: ProtocolRun[];
}

const PreFlightChecksStep: React.FC<PreFlightChecksStepProps> = ({
  protocolRuns,
}) => {
  if (!protocolRuns || protocolRuns.length === 0) {
    return <p>No pre-flight checks required for this order.</p>;
  }

  return (
    <div>
      <h4>Pre-flight Checks</h4>
      {protocolRuns.map((run) => (
        <div key={run.id}>
          <h5>Protocol: {run.protocolId}</h5>
          {/* TODO: Render individual checks from the protocol */}
          <p>Checks placeholder</p>
        </div>
      ))}
    </div>
  );
};

export default PreFlightChecksStep;
