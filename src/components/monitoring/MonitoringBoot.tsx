'use client';
import { useEffect } from 'react';
import { installRuntimeCapture } from './runtime-capture';

export default function MonitoringBoot(){
  useEffect(() => { installRuntimeCapture(); }, []);
  return null;
}
