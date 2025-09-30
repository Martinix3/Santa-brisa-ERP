
// src/features/pos/PosLinesPicker.tsx
"use client";
import React from 'react';
import { SBButton, Select, Input } from '@/components/ui/ui-primitives';
import { Plus, Trash2 } from 'lucide-react';
import { PosCostCatalogEntry } from '@/domain/ssot';

export type PosLineInput =
  | { kind:'CATALOGO'; catalogItemId:string; qty?:number; scheduleAt?:string; estCost?:number, desc?: string }
  | { kind:'CUSTOM'; desc:string; visibility?:'ALTA'|'MEDIA'|'BAJA'; estCost?:number; scheduleAt?:string, catalogItemId?: undefined };

interface PosLinesPickerProps {
  catalog: PosCostCatalogEntry[];
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

  const updateLine = (index: number, updates: Partial<PosLineInput>) => {
    setLines(prev => {
        const newLines = [...prev];
        const currentLine = { ...newLines[index] };
        
        let finalUpdate: Partial<PosLineInput> = updates;

        if ('kind' in updates) {
            finalUpdate = { kind: updates.kind };
            if (updates.kind === 'CATALOGO') {
                finalUpdate.catalogItemId = '';
                finalUpdate.desc = undefined;
            } else {
                finalUpdate.desc = '';
                finalUpdate.catalogItemId = undefined;
            }
        }
        
        if ('catalogItemId' in updates && updates.catalogItemId) {
            const catItem = catalog.find(c => c.id === updates.catalogItemId);
            finalUpdate.desc = catItem?.name || '';
            finalUpdate.estCost = catItem?.defaultCost;
        }
        
        newLines[index] = { ...currentLine, ...finalUpdate };
        return newLines;
    });
  };

  return (
    <div className="space-y-2 rounded-lg border p-3 bg-zinc-50/50">
      {lines.map((line, index) => (
        <div key={index} className="grid grid-cols-[100px_2fr_1fr_auto] gap-2 items-center">
            <Select value={line.kind} onChange={e => updateLine(index, { kind: e.target.value as any })}>
                <option value="CATALOGO">Catálogo</option>
                <option value="CUSTOM">Custom</option>
            </Select>

          {line.kind === 'CATALOGO' ? (
            <Select 
              value={line.catalogItemId} 
              onChange={e => updateLine(index, { catalogItemId: e.target.value })}
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
              onChange={e => updateLine(index, { desc: e.target.value })}
              placeholder="Descripción custom"
              className="flex-grow"
            />
          )}
          <Input 
            type="number" 
            value={(line as any).qty || 1}
            onChange={e => updateLine(index, { qty: parseInt(e.target.value, 10) } as any)}
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
