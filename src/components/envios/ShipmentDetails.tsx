/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/envios/ShipmentDetails.tsx
"use client";

import React from 'react';
import { Package, MapPin, User, Hash } from 'lucide-react';

interface ShipmentDetailsProps {
  shipment: any;
}

export function ShipmentDetails({ shipment }: ShipmentDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Destinatario */}
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 mb-3">
          <User size={16} />
          Destinatario
        </div>
        <div className="bg-zinc-50 rounded-lg p-4">
          <div className="font-medium text-zinc-900 mb-1">
            {shipment.customerName || 'N/A'}
          </div>
          {shipment.toAddress && (
            <div className="text-sm text-zinc-600 space-y-0.5">
              {shipment.toAddress.street && <div>{shipment.toAddress.street}</div>}
              <div>
                {shipment.toAddress.postalCode && `${shipment.toAddress.postalCode} `}
                {shipment.toAddress.city || shipment.city}
              </div>
              {shipment.toAddress.country && <div>{shipment.toAddress.country}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Productos */}
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 mb-3">
          <Package size={16} />
          Productos ({shipment.lines?.length || 0})
        </div>
        <div className="bg-zinc-50 rounded-lg divide-y divide-zinc-200">
          {shipment.lines && shipment.lines.length > 0 ? (
            shipment.lines.map((line: any, index: number) => (
              <div key={index} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-zinc-900 text-sm">
                    {line.name || line.sku || 'N/A'}
                  </div>
                  {line.lotNumber && (
                    <div className="text-xs text-zinc-500 mt-1">
                      Lote: {line.lotNumber}
                    </div>
                  )}
                </div>
                <div className="text-sm font-semibold text-zinc-700">
                  {line.qty}x
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-sm text-zinc-500 text-center">
              No hay productos listados
            </div>
          )}
        </div>
      </div>

      {/* Información adicional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ID Envío */}
        <div className="bg-zinc-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-600 mb-1">
            <Hash size={12} />
            ID de Envío
          </div>
          <div className="font-mono text-sm text-zinc-900">
            {shipment.id?.substring(0, 12)}...
          </div>
        </div>

        {/* Fecha creación */}
        <div className="bg-zinc-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-600 mb-1">
            <Package size={12} />
            Fecha de Creación
          </div>
          <div className="text-sm text-zinc-900">
            {formatDate(shipment.createdAt)}
          </div>
        </div>

        {/* Origen */}
        {shipment.fromWarehouseId && (
          <div className="bg-zinc-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-600 mb-1">
              <MapPin size={12} />
              Origen
            </div>
            <div className="text-sm text-zinc-900">
              {getWarehouseName(shipment.fromWarehouseId)}
            </div>
          </div>
        )}

        {/* Carrier */}
        {shipment.carrier && (
          <div className="bg-zinc-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-600 mb-1">
              <Package size={12} />
              Transportista
            </div>
            <div className="text-sm text-zinc-900 capitalize">
              {shipment.carrier}
            </div>
          </div>
        )}
      </div>

      {/* Notas */}
      {shipment.notes && (
        <div>
          <div className="text-sm font-semibold text-zinc-700 mb-2">
            Notas
          </div>
          <div className="bg-zinc-50 rounded-lg p-4 text-sm text-zinc-600">
            {shipment.notes}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getWarehouseName(warehouseId: string): string {
  const warehouses: Record<string, string> = {
    MAIN: 'Almacén Principal',
    SECONDARY: 'Almacén Secundario',
    EXTERNAL: 'Almacén Externo',
  };
  return warehouses[warehouseId] || warehouseId;
}
