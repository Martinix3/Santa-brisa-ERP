/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/envios/ProductosStep.tsx
"use client";

import React, { useState } from 'react';
import { Search, Plus, Minus, Trash2, Package } from 'lucide-react';
import { Input, Select, SBButton } from '@/components/ui/ui-primitives';
import type { Item, Account } from '@/domain/ssot';

interface SelectedProduct {
  item: Item;
  quantity: number;
}

interface ProductosStepProps {
  items: Item[];
  selectedProducts: SelectedProduct[];
  onUpdateProducts: (products: SelectedProduct[]) => void;
  motivo: string;
  onMotivoChange: (motivo: string) => void;
  contact: Account | null;
}

export function ProductosStep({
  items,
  selectedProducts,
  onUpdateProducts,
  motivo,
  onMotivoChange,
  contact,
}: ProductosStepProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Productos más enviados como muestras (primeros 8)
  const quickAccessProducts = items.slice(0, 8);

  // Filtrar por búsqueda
  const filteredItems = searchQuery
    ? items.filter((item: any) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : quickAccessProducts;

  const handleAddProduct = (item: Item) => {
    const existing = selectedProducts.find((p) => p.item.id === item.id);
    if (existing) {
      // Incrementar cantidad
      onUpdateProducts(
        selectedProducts.map((p) =>
          p.item.id === item.id ? { ...p, quantity: p.quantity + 1 } : p
        )
      );
    } else {
      // Añadir nuevo
      onUpdateProducts([...selectedProducts, { item, quantity: 1 }]);
    }
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    onUpdateProducts(
      selectedProducts
        .map((p) => {
          if (p.item.id === itemId) {
            const newQty = p.quantity + delta;
            return newQty > 0 ? { ...p, quantity: newQty } : null;
          }
          return p;
        })
        .filter((p) => p !== null) as SelectedProduct[]
    );
  };

  const handleRemoveProduct = (itemId: string) => {
    onUpdateProducts(selectedProducts.filter((p) => p.item.id !== itemId));
  };

  const totalItems = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Contact Summary */}
      {contact && (
        <div className="sb-card-glass-subtle p-3 text-sm">
          <span className="text-zinc-600">Envío para:</span>{' '}
          <span className="font-semibold">{contact.name}</span>
        </div>
      )}

      {/* Motivo */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          Motivo del envío *
        </label>
        <Select value={motivo} onChange={(e) => onMotivoChange(e.target.value)}>
          <option value="">Seleccionar motivo...</option>
          <option value="muestra">Muestra</option>
          <option value="influencer">Influencer</option>
          <option value="pos">Material POS</option>
          <option value="evento">Evento</option>
          <option value="otro">Otro</option>
        </Select>
      </div>

      {/* Selected Products Summary */}
      {selectedProducts.length > 0 && (
        <div className="sb-card-glass-light p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">
              Productos seleccionados ({totalItems})
            </h4>
            <SBButton
              variant="ghost"
              size="sm"
              onClick={() => onUpdateProducts([])}
            >
              Limpiar todo
            </SBButton>
          </div>
          <div className="space-y-2">
            {selectedProducts.map((p) => (
              <div
                key={p.item.id}
                className="flex items-center justify-between p-2 bg-white rounded border"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{p.item.name}</p>
                  <p className="text-xs text-zinc-600">
                    {(p.item as any).presentationSize || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateQuantity(p.item.id, -1)}
                    className="p-1 hover:bg-zinc-100 rounded"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-medium text-sm">
                    {p.quantity}
                  </span>
                  <button
                    onClick={() => handleUpdateQuantity(p.item.id, 1)}
                    className="p-1 hover:bg-zinc-100 rounded"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => handleRemoveProduct(p.item.id)}
                    className="p-1 hover:bg-red-100 text-red-600 rounded ml-2"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Search */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          Buscar productos
        </label>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            size={18}
          />
          <Input
            type="text"
            placeholder="Buscar por nombre..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Products Grid */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">
          {searchQuery ? 'Resultados de búsqueda' : 'Productos frecuentes'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredItems.length === 0 ? (
            <div className="col-span-full text-center py-8 text-zinc-500 text-sm">
              No se encontraron productos
            </div>
          ) : (
            filteredItems.map((item: any) => {
              const isSelected = selectedProducts.some(
                (p) => p.item.id === item.id
              );
              return (
                <button
                  key={item.id}
                  onClick={() => handleAddProduct(item)}
                  className={`sb-card p-3 text-left transition-all hover:border-primary ${
                    isSelected ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded bg-zinc-100 flex-shrink-0">
                      <Package className="h-4 w-4 text-zinc-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-0.5 truncate">
                        {item.name}
                      </h4>
                      <p className="text-xs text-zinc-600 truncate">
                        {(item as any).presentationSize || 'N/A'}
                      </p>
                      {isSelected && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-xs bg-primary text-white">
                          ✓ Añadido
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
