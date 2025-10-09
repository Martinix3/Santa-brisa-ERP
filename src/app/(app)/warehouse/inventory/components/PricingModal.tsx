// src/app/(app)/warehouse/inventory/components/PricingModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { SBButton, Input } from '@/components/ui/ui-primitives';
import { DollarSign, TrendingUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { updateItemPricing } from '@/server/actions/item-pricing.actions';

interface PricingModalProps {
  item: any; // Using any to avoid type issues with priceBase, priceList, costUnit
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SEGMENTS = [
  { key: 'HORECA', label: '🍽️ HORECA' },
  { key: 'RETAIL', label: '🛒 RETAIL' },
  { key: 'DISTRIBUTOR', label: '🚚 DISTRIBUIDOR' },
  { key: 'ONLINE', label: '🌐 ONLINE' },
  { key: 'PRIVADA', label: '👤 PRIVADA' },
];

export function PricingModal({ item, open, onClose, onSuccess }: PricingModalProps) {
  const [priceBase, setPriceBase] = useState(0);
  const [costUnit, setCostUnit] = useState(0);
  const [priceList, setPriceList] = useState<Record<string, number>>({});
  const [isActive, setIsActive] = useState(true);
  const [logistics, setLogistics] = useState({
    unitsPerCase: 0,
    casesPerPallet: 0,
    weightPerUnit: 0,
    volumePerUnit: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && item) {
      setPriceBase(item.priceBase || item.priceUnit || 0);
      setCostUnit(item.costUnit || 0);
      setIsActive(item.isActive !== false); // Por defecto true
      setPriceList({
        HORECA: 0,
        RETAIL: 0,
        DISTRIBUTOR: 0,
        ONLINE: 0,
        PRIVADA: 0,
        ...(item.priceList || {}),
      });
      setLogistics({
        unitsPerCase: item.unitsPerCase || 0,
        casesPerPallet: item.casesPerPallet || 0,
        weightPerUnit: item.weightPerUnit || 0,
        volumePerUnit: item.volumePerUnit || 0,
      });
    }
  }, [item, open]);

  const handlePriceListChange = (segment: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setPriceList(prev => ({ ...prev, [segment]: numValue }));
  };

  const calculateMargin = (price: number) => {
    if (!costUnit || costUnit === 0) return null;
    const margin = ((price - costUnit) / price) * 100;
    return margin.toFixed(1);
  };

  const handleSave = async () => {
    if (priceBase <= 0) {
      toast.error('El precio base debe ser mayor a 0');
      return;
    }

    if (costUnit < 0) {
      toast.error('El costo no puede ser negativo');
      return;
    }

    if (costUnit >= priceBase) {
      toast.warning('⚠️ El costo es mayor o igual al precio base');
    }

    setSaving(true);
    try {
      const result = await updateItemPricing(item.id, {
        priceBase,
        priceList,
        costUnit,
        isActive,
        logistics,
      });

      if (result.ok) {
        toast.success('✅ Precios actualizados correctamente');
        onSuccess();
        onClose();
      } else {
        toast.error(result.message || 'Error al actualizar precios');
      }
    } catch (error) {
      console.error('Error updating pricing:', error);
      toast.error('Error inesperado al actualizar precios');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const baseMargin = calculateMargin(priceBase);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-bold">📦 Ficha de Producto</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Product Info */}
          <div className="bg-zinc-50 rounded-lg p-3 border">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-bold text-sm">{item.name}</p>
                <p className="text-xs text-zinc-500 font-mono">SKU: {item.sku || item.id}</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded"
                />
                <span className={`text-xs font-medium ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
                  {isActive ? '✓ En catálogo' : 'Inactivo'}
                </span>
              </label>
            </div>
          </div>

          {/* Costo - Calculado automáticamente */}
          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              Costo de Producción
            </label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={costUnit}
                onChange={(e) => setCostUnit(parseFloat(e.target.value) || 0)}
                className="pr-8 bg-gray-50"
                disabled
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">€</span>
            </div>
            <p className="text-xs text-orange-600 mt-1">
              ⚙️ Calculado automáticamente desde BOM
            </p>
          </div>

          {/* Precio Base */}
          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Precio Base (Público)
            </label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={priceBase}
                onChange={(e) => setPriceBase(parseFloat(e.target.value) || 0)}
                className="pr-8 font-semibold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">€</span>
            </div>
            {baseMargin && (
              <p className="text-xs text-green-600 mt-1 font-medium">
                Margen: {baseMargin}%
              </p>
            )}
          </div>

          {/* Precios por Segmento */}
          <div>
            <label className="block text-sm font-semibold mb-3">
              📊 Precios por Segmento
            </label>
            <div className="space-y-3">
              {SEGMENTS.map(segment => {
                const segmentPrice = priceList[segment.key] || 0;
                const margin = calculateMargin(segmentPrice);
                
                return (
                  <div key={segment.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{segment.label}</span>
                      {margin && segmentPrice > 0 && (
                        <span className="text-xs text-green-600 font-medium">
                          {margin}% margen
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={segmentPrice}
                        onChange={(e) => handlePriceListChange(segment.key, e.target.value)}
                        className="pr-8"
                        placeholder="0.00"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">€</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              💡 Dejar en 0 para usar precio base como fallback
            </p>
          </div>

          {/* Datos Logísticos */}
          <div className="border-t pt-4">
            <label className="block text-sm font-semibold mb-3">
              📦 Datos Logísticos
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Unidades por Caja</label>
                <Input
                  type="number"
                  min="0"
                  value={logistics.unitsPerCase}
                  onChange={(e) => setLogistics({...logistics, unitsPerCase: parseInt(e.target.value) || 0})}
                  placeholder="6"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Cajas por Pallet</label>
                <Input
                  type="number"
                  min="0"
                  value={logistics.casesPerPallet}
                  onChange={(e) => setLogistics({...logistics, casesPerPallet: parseInt(e.target.value) || 0})}
                  placeholder="80"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Peso por Unidad (kg)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={logistics.weightPerUnit}
                  onChange={(e) => setLogistics({...logistics, weightPerUnit: parseFloat(e.target.value) || 0})}
                  placeholder="0.75"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Volumen por Unidad (L)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={logistics.volumePerUnit}
                  onChange={(e) => setLogistics({...logistics, volumePerUnit: parseFloat(e.target.value) || 0})}
                  placeholder="0.75"
                />
              </div>
            </div>
            {logistics.unitsPerCase > 0 && logistics.casesPerPallet > 0 && (
              <p className="text-xs text-blue-600 mt-2">
                💡 {logistics.unitsPerCase * logistics.casesPerPallet} unidades por pallet completo
              </p>
            )}
          </div>

          {/* Resumen */}
          {costUnit > 0 && Object.values(priceList).some(p => p > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-800 mb-2">📊 Resumen de Márgenes</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(priceList)
                  .filter(([_, price]) => price > 0)
                  .map(([key, price]) => {
                    const margin = calculateMargin(price);
                    return (
                      <div key={key} className="flex justify-between">
                        <span>{key}:</span>
                        <span className="font-semibold">{margin}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t sticky bottom-0 bg-white">
          <SBButton
            variant="secondary"
            onClick={onClose}
            disabled={saving}
            className="flex-1"
          >
            Cancelar
          </SBButton>
          <SBButton
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </SBButton>
        </div>
      </div>
    </div>
  );
}
