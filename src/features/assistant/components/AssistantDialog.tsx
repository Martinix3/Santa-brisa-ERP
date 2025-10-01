// src/features/assistant/components/AssistantDialog.tsx
"use client";

import React from 'react';
import { useAssistant } from './AssistantProvider';

export function AssistantDialog() {
  const { isOpen, closeAssistant } = useAssistant();

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
      onClick={closeAssistant}
    >
      <div 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-lg h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b">
          <h2 className="font-semibold">Santa Brain Assistant</h2>
        </div>
        <div className="flex-1 p-4 text-center text-sm text-zinc-500">
          <p>El componente de Chat irá aquí.</p>
        </div>
      </div>
    </div>
  );
}
