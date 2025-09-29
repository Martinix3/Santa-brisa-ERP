// src/features/pos/PosLinesPicker.tsx
"use client";

import React from 'react';
import type { PosLineInput } from './server/pos-actions';

interface PosLinesPickerProps {
  catalog: { id: string; name: string }[];
  lines: PosLineInput[];
  setLines: React.Dispatch<React.SetStateAction<PosLineInput[]>>;
}

export function PosLinesPicker({ catalog, lines, setLines }: PosLinesPickerProps) {
  
  const addLine = () => {
    setLines(prev => [...prev, { kind: 'CATALOGO', catalogItemId: '', qty: 1 }]);
  };

  const removeLine = (index: number) => {
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof PosLineInput, value: any) => {
    setLines(prev => {
      const newLines = [...prev];
      (newLines[index] as any)[field] = value;
      return newLines;
    });
  };

  return (
    <div className="space-y-2 rounded-lg border p-3 bg-zinc-50/50">
      {lines.map((line, index) => (
        <div key={index} className="flex items-center gap-2">
          {line.kind === 'CATALOGO' ? (
            <select 
              value={line.catalogItemId} 
              onChange={e => updateLine(index, 'catalogItemId', e.target.value)}
              className="flex-grow border rounded px-2 py-1 text-sm"
            >
              <option value="">Selecciona del catálogo...</option>
              {catalog.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          ) : (
             <input
              type="text"
              value={line.desc}
              onChange={e => updateLine(index, 'desc', e.target.value)}
              placeholder="Descripción custom"
              className="flex-grow border rounded px-2 py-1 text-sm"
            />
          )}
          <input 
            type="number" 
            value={line.qty || 1}
            onChange={e => updateLine(index, 'qty', parseInt(e.target.value, 10))}
            className="w-20 border rounded px-2 py-1 text-sm"
            placeholder="Qty"
          />
          <button type="button" onClick={() => removeLine(index)} className="text-red-500 p-1 hover:bg-red-50 rounded-md">
            &times;
          </button>
        </div>
      ))}
      <button type="button" onClick={addLine} className="text-xs text-blue-600 hover:underline">
        + Añadir Táctica
      </button>
    </div>
  );
}
