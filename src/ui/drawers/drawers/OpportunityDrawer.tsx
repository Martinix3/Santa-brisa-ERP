/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/ui/drawers/drawers/OpportunityDrawer.tsx
'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useDrawer } from '@/ui/drawers/drawer-registry';
import { addAccountNote } from '@/server/actions/sales-interactions.actions';
import { useData } from '@/lib/dataprovider';
import {
  Bell, 
  TrendingDown, 
  Target, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  DollarSign,
  User,
  Building2,
  ExternalLink,
  Plus,
  MessageSquare
} from 'lucide-react';
import type { PipelineItem } from '@/components/pipeline/types';

export function OpportunityDrawer({
  item,
  onClose,
}: {
  item: PipelineItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const { open } = useDrawer();
  const { currentUser } = useData();
  const [noteText, setNoteText] = React.useState('');
  const [addingNote, setAddingNote] = React.useState(false);

  const handleViewFull = () => {
    router.push(`/accounts/${item.id}`);
    onClose();
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    
    if (!currentUser?.id) {
      alert('Usuario no identificado');
      return;
    }

    setAddingNote(true);
    try {
      const result = await addAccountNote({
        accountId: item.id,
        text: noteText,
        userId: currentUser.id,
      });

      if (result.success) {
        setNoteText('');
        alert('Nota añadida correctamente');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Error al añadir nota');
    } finally {
      setAddingNote(false);
    }
  };

  return (
    <aside className="sb-drawer sb-drawer--medium">
      <header className="sb-drawer__header">
        <div className="flex items-start justify-between w-full">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold">{item.name}</h3>
              {item.isTarget && (
                <span title="Cuenta Target">
                  <Target className="w-5 h-5 text-[--sb-copper]" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              {item.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {item.city}
                </span>
              )}
              {item.zone && (
                <span className="px-2 py-0.5 rounded-full bg-secondary/50 text-xs">
                  {item.zone}
                </span>
              )}
            </div>
          </div>
          <button className="sb-btn sb-btn--ghost" onClick={onClose}>
            ✕
          </button>
        </div>
      </header>

      <div className="sb-drawer__body space-y-4">
        {/* Alertas y Estado */}
        {(item.hasAlerts || item.noConsumption) && (
          <div className="sb-card-glass-light p-3 border-l-4 border-l-orange-500">
            <div className="flex items-center gap-2 text-sm">
              {item.hasAlerts && (
                <div className="flex items-center gap-1.5 text-[--sb-yellow]">
                  <Bell className="w-4 h-4" />
                  <span>Tiene alertas activas</span>
                </div>
              )}
              {item.noConsumption && (
                <div className="flex items-center gap-1.5 text-[--destructive]">
                  <TrendingDown className="w-4 h-4" />
                  <span>Sin consumo reciente</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Métricas Clave */}
        <div className="grid grid-cols-3 gap-3">
          <div className="sb-card-glass-light p-3 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Últ. contacto
            </div>
            <div className="text-lg font-semibold">
              {item.lastInteractionDays !== undefined ? `${item.lastInteractionDays}d` : '—'}
            </div>
            {item.lastInteractionDate && (
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(item.lastInteractionDate).toLocaleDateString('es-ES')}
              </div>
            )}
          </div>

          <div className="sb-card-glass-light p-3 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Últ. pedido
            </div>
            <div className="text-lg font-semibold">
              {item.lastOrderDays !== undefined ? `${item.lastOrderDays}d` : '—'}
            </div>
          </div>

          <div className="sb-card-glass-light p-3 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Valor est.
            </div>
            <div className="text-lg font-semibold">
              {item.estValueEUR ? `€${item.estValueEUR.toLocaleString('es-ES')}` : '—'}
            </div>
          </div>
        </div>

        {/* Información Comercial */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <h4 className="font-semibold text-sm">Información Comercial</h4>
          
          <div className="space-y-2 text-sm">
            {item.commercialId && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Comercial:</span>
                <span className="font-medium">{item.commercialId}</span>
              </div>
            )}
            
            {item.distributorPartyId && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Distribuidor:</span>
                <span className="font-medium">{item.distributorPartyId}</span>
              </div>
            )}

            {item.posInstalled && (
              <div className="flex items-center gap-2">
                <div className="px-2 py-1 rounded bg-[--sb-green]/10 text-[--sb-green] text-xs font-medium">
                  POS Instalado
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nota Rápida */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Añadir Nota Rápida
          </h4>
          <textarea
            className="sb-textarea w-full"
            rows={3}
            placeholder="Escribe una nota sobre esta cuenta..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              className="sb-btn sb-btn--secondary sb-btn--sm"
              onClick={handleAddNote}
              disabled={!noteText.trim() || addingNote}
            >
              {addingNote ? 'Guardando...' : 'Guardar nota'}
            </button>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Acciones Rápidas</h4>
          <div className="grid grid-cols-2 gap-2">
            <button 
              className="sb-btn sb-btn--primary"
              onClick={() => {
                open('quick-order', { 
                  accountId: item.id,
                  accountName: item.name 
                });
              }}
            >
              <Plus className="w-4 h-4" />
              Nuevo Pedido
            </button>
            
            <button 
              className="sb-btn sb-btn--secondary"
              onClick={() => {
                open('register-interaction', { 
                  accountId: item.id,
                  accountName: item.name 
                });
              }}
            >
              <Calendar className="w-4 h-4" />
              Registrar Interacción
            </button>

            <button 
              className="sb-btn sb-btn--ghost"
              onClick={() => {
                open('register-event', { 
                  accountId: item.id,
                  accountName: item.name 
                });
              }}
            >
              <Mail className="w-4 h-4" />
              Crear Evento
            </button>

            <button 
              className="sb-btn sb-btn--ghost"
              onClick={() => {
                open('register-pos', { 
                  accountId: item.id,
                  accountName: item.name 
                });
              }}
            >
              Registrar POS
            </button>
          </div>
        </div>
      </div>

      <footer className="sb-drawer__footer">
        <button 
          className="sb-btn sb-btn--ghost" 
          onClick={onClose}
        >
          Cerrar
        </button>
        <button 
          className="sb-btn sb-btn--primary"
          onClick={handleViewFull}
        >
          <ExternalLink className="w-4 h-4" />
          Ver Detalle Completo
        </button>
      </footer>
    </aside>
  );
}
