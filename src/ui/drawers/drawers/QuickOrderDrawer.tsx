/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/ui/drawers/drawers/QuickOrderDrawer.tsx
'use client';
import React from 'react';
import { ShoppingCart, Package, Plus, X, DollarSign } from 'lucide-react';
import { createQuickOrder } from '@/server/actions/sales-interactions.actions';
import { listOrderItems } from '@/server/actions/orders-data';
import { useData } from '@/lib/dataprovider';
import type { Item } from '@/domain/ssot';

interface QuickOrderDrawerProps {
  accountId: string;
  accountName: string;
  onClose: () => void;
}

interface OrderLine {
  itemId: string;
  productName: string;
  quantity: number;
  priceUnit: number;
}

export function QuickOrderDrawer({
  accountId,
  accountName,
  onClose,
}: QuickOrderDrawerProps) {
  const [lines, setLines] = React.useState<OrderLine[]>([]);
  const [products, setProducts] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedItemId, setSelectedItemId] = React.useState('');
  const [currentQty, setCurrentQty] = React.useState('1');
  const [currentPrice, setCurrentPrice] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const { currentUser } = useData();

  // Cargar productos al montar
  React.useEffect(() => {
    listOrderItems().then(items => {
      setProducts(items);
      setLoading(false);
    });
  }, []);

  const handleAddLine = () => {
    if (!selectedItemId || !currentPrice) {
      alert('Selecciona un producto y añade el precio');
      return;
    }

    const selectedProduct = products.find(p => p.id === selectedItemId);
    if (!selectedProduct) return;

    const newLine: OrderLine = {
      itemId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: parseInt(currentQty) || 1,
      priceUnit: parseFloat(currentPrice) || 0,
    };

    setLines([...lines, newLine]);
    setSelectedItemId('');
    setCurrentQty('1');
    setCurrentPrice('');
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const total = lines.reduce((sum, line) => sum + (line.quantity * line.priceUnit), 0);

  const handleSave = async () => {
    if (lines.length === 0) {
      alert('Añade al menos un producto');
      return;
    }

    if (!currentUser?.id) {
      alert('Usuario no identificado');
      return;
    }

    setSaving(true);
    try {
      const result = await createQuickOrder({
        accountId,
        accountName,
        lines,
        notes,
        userId: currentUser.id,
      });

      if (result.success) {
        alert(`Pedido creado correctamente (ID: ${result.docNumber})`);
        onClose();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error creando pedido:', error);
      alert('Error al crear el pedido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="sb-drawer sb-drawer--medium">
      <header className="sb-drawer__header">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Nuevo Pedido
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{accountName}</p>
        </div>
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>
          ✕
        </button>
      </header>

      <div className="sb-drawer__body space-y-4">
        {/* Añadir Producto */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <label className="text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Añadir Producto
          </label>
          
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Producto *
            </label>
            <select
              className="sb-input w-full"
              value={selectedItemId}
              onChange={(e) => {
                setSelectedItemId(e.target.value);
                const item = products.find(p => p.id === e.target.value);
                if (item?.priceUnit) {
                  setCurrentPrice(item.priceUnit.toString());
                }
              }}
            >
              <option value="">
                {loading ? 'Cargando productos...' : 'Selecciona un producto'}
              </option>
              {products.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Cantidad *
              </label>
              <input
                type="number"
                className="sb-input w-full"
                placeholder="1"
                value={currentQty}
                onChange={(e) => setCurrentQty(e.target.value)}
                min="1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                <DollarSign className="w-3 h-3 inline" /> Precio Unitario (€) *
              </label>
              <input
                type="number"
                className="sb-input w-full"
                placeholder="0.00"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <button
            type="button"
            className="sb-btn sb-btn--primary w-full"
            onClick={handleAddLine}
          >
            <Plus className="w-4 h-4" />
            Añadir Línea
          </button>
        </div>

        {/* Líneas del Pedido */}
        {lines.length > 0 && (
          <div className="sb-card-glass-light p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Package className="w-4 h-4" />
                Líneas ({lines.length})
              </label>
              <button
                type="button"
                className="text-xs text-destructive"
                onClick={() => setLines([])}
              >
                Limpiar todo
              </button>
            </div>

            <div className="space-y-2">
              {lines.map((line, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg border border-border/30"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{line.productName}</div>
                    <div className="text-xs text-muted-foreground">
                      {line.quantity} × €{line.priceUnit.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold">
                        €{(line.quantity * line.priceUnit).toFixed(2)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-destructive p-1"
                      onClick={() => handleRemoveLine(index)}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-border/30">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total:</span>
                <span className="text-2xl font-bold text-primary">
                  €{total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Notas */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <label className="text-sm font-semibold">Notas del Pedido</label>
          <textarea
            className="sb-textarea w-full"
            rows={3}
            placeholder="Observaciones, instrucciones especiales..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <footer className="sb-drawer__footer">
        <button className="sb-btn sb-btn--ghost" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button
          className="sb-btn sb-btn--primary"
          onClick={handleSave}
          disabled={saving || lines.length === 0}
        >
          {saving ? 'Guardando...' : 'Crear Pedido'}
        </button>
      </footer>
    </aside>
  );
}
