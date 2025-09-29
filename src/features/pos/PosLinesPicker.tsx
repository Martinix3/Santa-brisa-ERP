// src/features/pos/PosLinesPicker.tsx
"use client";
import React from 'react';
import type { PosLineInput } from './server/pos-actions';
import { SBButton, Select, Input } from '@/components/ui/ui-primitives';
import { Plus, Trash2 } from 'lucide-react';

interface PosLinesPickerProps {
  catalog: { id: string; name: string }[];
  lines: Partial<PosLineInput>[];
  setLines: React.Dispatch<React.SetStateAction<Partial<PosLineInput>[]>>;
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
      const currentLine = { ...newLines[index] } as any;
      currentLine[field] = value;
      if (field === 'kind') {
          currentLine.catalogItemId = '';
          currentLine.desc = '';
      }
      if(field === 'catalogItemId' && value) {
          const catItem = catalog.find(c => c.id === value);
          currentLine.desc = catItem?.name || '';
      }
      newLines[index] = currentLine;
      return newLines;
    });
  };

  return (
    <div className="space-y-2 rounded-lg border p-3 bg-zinc-50/50">
      {lines.map((line, index) => (
        <div key={index} className="grid grid-cols-[100px_2fr_1fr_auto] items-center gap-2">
            <Select value={line.kind} onChange={e => updateLine(index, 'kind', e.target.value)} className="text-xs">
                <option value="CATALOGO">Catálogo</option>
                <option value="CUSTOM">Custom</option>
            </Select>

          {line.kind === 'CATALOGO' ? (
            <Select 
              value={line.catalogItemId} 
              onChange={e => updateLine(index, 'catalogItemId', e.target.value)}
              className="flex-grow"
            >
              <option value="">Selecciona del catálogo...</option>
              {catalog.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </Select>
          ) : (
             <Input
              type="text"
              value={line.desc}
              onChange={e => updateLine(index, 'desc', e.target.value)}
              placeholder="Descripción custom"
              className="flex-grow"
            />
          )}
          <Input 
            type="number" 
            value={line.qty || 1}
            onChange={e => updateLine(index, 'qty', parseInt(e.target.value, 10))}
            className="w-20"
            placeholder="Qty"
          />
          <SBButton variant="ghost" size="sm" onClick={() => removeLine(index)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </SBButton>
        </div>
      ))}
      <SBButton type="button" variant="secondary" size="sm" onClick={addLine}>
        <Plus size={14} className="mr-2"/> Añadir Táctica
      </SBButton>
    </div>
  );
}
