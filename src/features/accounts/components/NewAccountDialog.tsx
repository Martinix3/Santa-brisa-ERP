// src/features/accounts/components/NewAccountDialog.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import { Input, Select, Textarea } from '@/components/ui/ui-primitives';
import type { Account, Team, Segment, CommercialFlow, Stage } from '@/domain/ssot.v7';
import { createAccount } from '@/app/(app)/accounts/actions';
import { Building2, TrendingUp, MapPin, User as UserIcon, Truck } from 'lucide-react';

interface NewAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: Account) => void;
  onError?: (message: string) => void;
  teams: Team[];
}

export function NewAccountDialog({
  open,
  onClose,
  onSuccess,
  onError,
  teams,
}: NewAccountDialogProps) {
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('');
  const [segment, setSegment] = useState<Segment>('HORECA');
  const [stage, setStage] = useState<Stage>('POTENCIAL');
  const [salesRepId, setSalesRepId] = useState('');
  const [commercialFlow, setCommercialFlow] = useState<CommercialFlow>('DIRECTA');
  const [distributorId, setDistributorId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setTaxId('');
      setCity('');
      setAddress('');
      setProvince('');
      setSegment('HORECA');
      setStage('POTENCIAL');
      setSalesRepId('');
      setCommercialFlow('DIRECTA');
      setDistributorId('');
      setIsSaving(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onError?.('El nombre de la cuenta es obligatorio.');
      return;
    }
    
    if (!salesRepId) {
      onError?.('Debes seleccionar un representante de ventas.');
      return;
    }

    setIsSaving(true);
    
    try {
      const newAccount = await createAccount({
        name: name.trim(),
        salesRepId,
      });
      
      onSuccess(newAccount);
      onClose();
    } catch (error: any) {
      onError?.(error.message || 'Error al crear la cuenta.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SBDialog open={open} onOpenChange={onClose}>
      <SBDialogContent
        title="Nueva Cuenta Comercial"
        description="Crea una nueva cuenta de cliente"
        onSubmit={handleSubmit}
        primaryAction={{ label: isSaving ? 'Guardando...' : 'Crear Cuenta', type: 'submit', disabled: isSaving }}
        secondaryAction={{ label: 'Cancelar', onClick: onClose, disabled: isSaving }}
        maxWidth="48rem"
      >
        <div className="space-y-6 pt-4">
          {/* FLOW SELECTOR - Visual */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              <Building2 className="w-4 h-4 inline mr-1" />
              Tipo de Venta *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCommercialFlow('DIRECTA');
                  setDistributorId('');
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  commercialFlow === 'DIRECTA'
                    ? 'border-green-500 bg-green-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className={`w-5 h-5 ${commercialFlow === 'DIRECTA' ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={`font-semibold ${commercialFlow === 'DIRECTA' ? 'text-green-900' : 'text-gray-700'}`}>
                    Venta Directa
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Santa Brisa factura directamente al cliente
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCommercialFlow('COLOCACION')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  commercialFlow === 'COLOCACION'
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Truck className={`w-5 h-5 ${commercialFlow === 'COLOCACION' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`font-semibold ${commercialFlow === 'COLOCACION' ? 'text-blue-900' : 'text-gray-700'}`}>
                    Colocación
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Se factura a través de distribuidor
                </p>
              </button>
            </div>
          </div>

          {/* INFORMACIÓN BÁSICA */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
              Información Básica
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Nombre de la Cuenta *</span>
                <Input 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Ej: Restaurante El Jardín"
                  required 
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">CIF/NIF</span>
                <Input 
                  value={taxId} 
                  onChange={e => setTaxId(e.target.value)}
                  placeholder="Ej: B12345678"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Segmento *</span>
                <Select value={segment} onChange={e => setSegment(e.target.value as Segment)}>
                  <option value="HORECA">🍽️ HORECA</option>
                  <option value="RETAIL">🏪 Retail</option>
                  <option value="ONLINE">💻 Online</option>
                  <option value="PRIVADA">🏡 Privada</option>
                  <option value="DISTRIBUIDOR">🚚 Distribuidor</option>
                  <option value="IMPORTADOR">📦 Importador</option>
                </Select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Estado Inicial</span>
                <Select value={stage} onChange={e => setStage(e.target.value as Stage)}>
                  <option value="POTENCIAL">🎯 Potencial</option>
                  <option value="ACTIVA">✅ Activa</option>
                  <option value="SEGUIMIENTO">👁️ Seguimiento</option>
                  <option value="FALLIDA">❌ Fallida</option>
                  <option value="CERRADA">🔒 Cerrada</option>
                </Select>
              </label>
            </div>
          </div>

          {/* UBICACIÓN */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Ubicación
            </h3>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Dirección</span>
              <Input 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                placeholder="Calle, número, piso..."
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Ciudad</span>
                <Input 
                  value={city} 
                  onChange={e => setCity(e.target.value)}
                  placeholder="Ej: Madrid"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Provincia</span>
                <Input 
                  value={province} 
                  onChange={e => setProvince(e.target.value)}
                  placeholder="Ej: Madrid"
                />
              </label>
            </div>
          </div>

          {/* ASIGNACIONES */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
              <UserIcon className="w-4 h-4 inline mr-1" />
              Asignaciones
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">
                  Representante de Ventas *
                </span>
                <Select 
                  value={salesRepId} 
                  onChange={e => setSalesRepId(e.target.value)} 
                  required
                >
                  <option value="">Selecciona...</option>
                  {teams.filter(t => t.role === 'SALES' || t.role === 'MANAGER').map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </Select>
              </label>

              {commercialFlow === 'COLOCACION' && (
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium">Distribuidor</span>
                  <Select 
                    value={distributorId} 
                    onChange={e => setDistributorId(e.target.value)}
                  >
                    <option value="">Selecciona...</option>
                    {/* TODO: Cargar distribuidores de accounts con segment='DISTRIBUIDOR' */}
                  </Select>
                </label>
              )}
            </div>
          </div>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
