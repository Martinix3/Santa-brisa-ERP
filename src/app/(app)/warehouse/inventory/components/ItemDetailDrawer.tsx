/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/warehouse/inventory/components/ItemDetailDrawer.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { BaseDrawer } from '@/components/drawers/BaseDrawer';
import { Input, Select, SBButton, Textarea } from '@/components/ui/ui-primitives';
import { DollarSign, TrendingUp, Package, Barcode, History } from 'lucide-react';
import { toast } from 'sonner';
import { updateItemPricing } from '@/server/actions/item-pricing.actions';
import type { Item, StockMove } from '@/domain/ssot';
import { ITEM_CATEGORY_META } from '@/domain/ssot';

interface ItemDetailDrawerProps {
  item: Item;
  recentReceipts?: StockMove[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SEGMENTS = [
  { key: 'HORECA', label: 'HORECA' },
  { key: 'RETAIL', label: 'RETAIL' },
  { key: 'DISTRIBUTOR', label: 'DISTRIBUIDOR' },
  { key: 'ONLINE', label: 'ONLINE' },
  { key: 'PRIVADA', label: 'PRIVADA' },
];

const PACKAGING_TYPES = [
  { value: 'bottle', label: 'Botella' },
  { value: 'case', label: 'Caja' },
  { value: 'pallet', label: 'Pallet' },
  { value: 'bag', label: 'Bolsa' },
  { value: 'bulk', label: 'A granel' },
  { value: 'other', label: 'Otro' },
];

export function ItemDetailDrawer({ 
  item, 
  recentReceipts = [],
  open, 
  onClose, 
  onSuccess 
}: ItemDetailDrawerProps) {
  const [priceBase, setPriceBase] = useState(0);
  const [costUnit, setCostUnit] = useState(0);
  const [priceList, setPriceList] = useState<Record<string, number>>({});
  const [isActive, setIsActive] = useState(true);
  const [eanCode, setEanCode] = useState('');
  const [packagingType, setPackagingType] = useState('bottle');
  const [logistics, setLogistics] = useState({
    unitsPerCase: 0,
    casesPerPallet: 0,
    weightPerUnit: 0,
    volumePerUnit: 0,
    bottleMl: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && item) {
      setPriceBase(item.priceBase || item.priceUnit || 0);
      setCostUnit(item.costUnit || item.stdCost || 0);
      setIsActive(item.isActive ?? true);
      setEanCode((item as any).eanCode ?? '');
      setPackagingType((item as any).packagingType || 'bottle');
      setPriceList({
        HORECA: 0,
        RETAIL: 0,
        DISTRIBUTOR: 0,
        ONLINE: 0,
        PRIVADA: 0,
        ...(item.priceList || {}),
      });
      setLogistics({
        unitsPerCase: item.unitsPerCase ?? 0,
        casesPerPallet: item.casesPerPallet || 0,
        weightPerUnit: item.weightPerUnit || 0,
        volumePerUnit: item.volumePerUnit || 0,
        bottleMl: item.bottleMl || 0,
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
        eanCode,
        packagingType,
        logistics,
      });

      if (result.ok) {
        toast.success('Datos actualizados correctamente');
        onSuccess();
        onClose();
      } else {
        toast.error(result.message || 'Error al actualizar');
      }
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast.error('Error inesperado al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const baseMargin = calculateMargin(priceBase);
  const categoryLabel = item.category ? ITEM_CATEGORY_META[item.category]?.label : 'Sin categoría';

  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      title={item.name}
      subtitle={`SKU: ${item.sku} · ${categoryLabel}`}
      className="z-[100]"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <SBButton
            variant="ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </SBButton>
          <SBButton
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </SBButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Estado del producto */}
        <section className="sb-card-glass-light p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{item.name}</p>
              <p className="text-xs text-muted-foreground font-mono">SKU: {item.sku}</p>
              <p className="text-xs text-muted-foreground">Categoría: {categoryLabel}</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded accent-primary"
              />
              <span className={`text-xs font-medium ${isActive ? 'text-success' : 'text-muted-foreground'}`}>
                {isActive ? '✓ Activo' : 'Inactivo'}
              </span>
            </label>
          </div>
        </section>

        {/* Identificación */}
        <section className="sb-card-glass-light p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Barcode size={14} />
            Identificación
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Código EAN/Barcode
              </label>
              <Input
                value={eanCode}
                onChange={(e) => setEanCode(e.target.value)}
                placeholder="8412345678901"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Tipo de Empaque
              </label>
              <Select
                value={packagingType}
                onChange={(e) => setPackagingType(e.target.value)}
              >
                {PACKAGING_TYPES.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </section>

        {/* Costos y Precios */}
        <section className="sb-card-glass-light p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <DollarSign size={14} />
            Costos y Precios
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <TrendingUp size={12} className="text-warning" />
                Costo Estándar
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costUnit}
                  onChange={(e) => setCostUnit(parseFloat(e.target.value) || 0)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Editable manualmente. En el futuro será calculado automáticamente desde BOM.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <DollarSign size={12} className="text-success" />
                Precio Base
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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
              </div>
              {baseMargin && (
                <p className="text-xs text-success font-medium">
                  Margen: {baseMargin}%
                </p>
              )}
            </div>
          </div>

          {/* Precios por segmento */}
          <div className="rounded-lg border bg-card/50 p-3">
            <p className="text-xs font-semibold mb-3">Precios por Segmento</p>
            <div className="space-y-2">
              {SEGMENTS.map(segment => {
                const segmentPrice = priceList[segment.key] || 0;
                const margin = calculateMargin(segmentPrice);
                
                return (
                  <div key={segment.key} className="flex items-center gap-2">
                    <span className="text-xs w-28 font-medium">{segment.label}</span>
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={segmentPrice}
                        onChange={(e) => handlePriceListChange(segment.key, e.target.value)}
                        className="pr-8 text-sm h-9"
                        placeholder="0.00"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
                    </div>
                    {margin && segmentPrice > 0 && (
                      <span className="text-xs text-success font-medium w-16 text-right">
                        {margin}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Si es 0, se usa el precio base
            </p>
          </div>
        </section>

        {/* Datos Logísticos */}
        <section className="sb-card-glass-light p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Package size={14} />
            Datos Logísticos
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Unidades por Caja
              </label>
              <Input
                type="number"
                min="0"
                value={logistics.unitsPerCase}
                onChange={(e) => setLogistics({...logistics, unitsPerCase: parseInt(e.target.value) || 0})}
                placeholder="6"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Cajas por Pallet
              </label>
              <Input
                type="number"
                min="0"
                value={logistics.casesPerPallet}
                onChange={(e) => setLogistics({...logistics, casesPerPallet: parseInt(e.target.value) || 0})}
                placeholder="80"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Peso por Unidad (kg)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={logistics.weightPerUnit}
                onChange={(e) => setLogistics({...logistics, weightPerUnit: parseFloat(e.target.value) || 0})}
                placeholder="0.75"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Volumen por Unidad (L)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={logistics.volumePerUnit}
                onChange={(e) => setLogistics({...logistics, volumePerUnit: parseFloat(e.target.value) || 0})}
                placeholder="0.75"
              />
            </div>
            {item.category === 'fg' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Contenido (mL)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={logistics.bottleMl}
                  onChange={(e) => setLogistics({...logistics, bottleMl: parseInt(e.target.value) || 0})}
                  placeholder="750"
                />
              </div>
            )}
          </div>
          {logistics.unitsPerCase > 0 && logistics.casesPerPallet > 0 && (
            <div className="rounded-lg bg-info/10 border border-info/20 p-2">
              <p className="text-xs text-info font-medium">
                Total: {logistics.unitsPerCase * logistics.casesPerPallet} unidades por pallet completo
              </p>
            </div>
          )}
        </section>

        {/* Historial de Costes */}
        {recentReceipts.length > 0 && (
          <section className="sb-card-glass-light p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <History size={14} />
              Últimas Recepciones
            </p>
            <div className="rounded-lg border bg-card/50">
              <div className="divide-y">
                {recentReceipts.slice(0, 5).map((receipt, idx) => (
                  <div key={receipt.id || idx} className="p-3 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {new Date(receipt.occurredAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {receipt.unitCost && (
                        <span className="font-semibold text-sm">
                          {receipt.unitCost.toFixed(2)} €/{receipt.uom}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{receipt.qty} {receipt.uom}</span>
                      {(receipt.ref as any)?.supplier && (
                        <>
                          <span>·</span>
                          <span>{(receipt.ref as any).supplier}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {recentReceipts.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                Mostrando 5 de {recentReceipts.length} recepciones
              </p>
            )}
          </section>
        )}

        {/* Resumen de Márgenes */}
        {costUnit > 0 && Object.values(priceList).some(p => p > 0) && (
          <section className="sb-card-glass-light p-4 bg-success/5">
            <p className="text-xs font-semibold text-success mb-2 flex items-center gap-2">
              <TrendingUp size={14} />
              Resumen de Márgenes
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(priceList)
                .filter(([_, price]) => price > 0)
                .map(([key, price]) => {
                  const margin = calculateMargin(price);
                  const segment = SEGMENTS.find(s => s.key === key);
                  return (
                    <div key={key} className="flex justify-between text-success">
                      <span>{segment?.label}:</span>
                      <span className="font-semibold">{margin}%</span>
                    </div>
                  );
                })}
            </div>
          </section>
        )}
      </div>
    </BaseDrawer>
  );
}
