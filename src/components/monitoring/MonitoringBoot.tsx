'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { useEffect } from 'react';
import { installRuntimeCapture } from './runtime-capture';

export default function MonitoringBoot(){
  useEffect(() => { installRuntimeCapture(); }, []);
  return null;
}
