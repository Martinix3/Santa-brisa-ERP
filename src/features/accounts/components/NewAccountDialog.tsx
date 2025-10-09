// src/features/accounts/components/NewAccountDialog.tsx

"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import { Input, Select, Textarea } from '@/components/ui/ui-primitives';
import type { Account, Party, PartyRole, User, Segment, CustomerData, CommercialFlow, Stage } from '@/domain/ssot.v7';
import { useData } from '@/lib/dataprovider';
import { Building2, TrendingUp, MapPin, User as UserIcon, Truck } from 'lucide-react';

interface NewAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  onError?: (message: string) => void;
  users: User[];
  distributors: { value: string; label: string }[];
}

export function NewAccountDialog({
  open,
  onClose,
  onSuccess,
  onError,
  users,
  distributors,
}: NewAccountDialogProps) {
  const { saveAllCollections } = useData();
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('');
  const [segment, setSegment] = useState<Segment>('HORECA');
  const [stage, setStage] = useState<Stage>('POTENCIAL');
  const [ownerId, setOwnerId] = useState('');
  const [flow, setFlow] = useState<CommercialFlow>('DIRECT');
  const [distributorPartyId, setDistributorPartyId] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Get zones from selected comercial
  const selectedUser = useMemo(() => 
    users.find(u => u.id === ownerId),
    [users, ownerId]
  );

  const availableDistributors = useMemo(() => {
    if (!selectedUser?.assignedDistributors) return distributors;
    const assignedDistIds = selectedUser.assignedDistributors.map(d => d.partyId);
    return distributors.filter(d => assignedDistIds.includes(d.value));
  }, [selectedUser, distributors]);

  // Auto-update flow based on distributor selection
  useEffect(() => {
    setFlow(distributorPartyId ? 'PLACEMENT' : 'DIRECT');
  }, [distributorPartyId]);

  useEffect(() => {
    if (open) {
      setName('');
      setTaxId('');
      setCity('');
      setAddress('');
      setProvince('');
      setSegment('HORECA');
      setStage('POTENCIAL');
      setOwnerId('');
      setFlow('DIRECT');
      setDistributorPartyId(undefined);
      setNotes('');
      setIsSaving(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onError?.('El nombre de la cuenta es obligatorio.');
      return;
    }
    
    // Para PLACEMENT, el comercial es obligatorio
    if(flow === 'PLACEMENT' && !ownerId) {
        onError?.('Para cuentas de colocación, el comercial responsable es obligatorio.');
        return;
    }
    
    if(flow === 'PLACEMENT' && !distributorPartyId) {
        onError?.('Se debe seleccionar un distribuidor para cuentas de colocación.');
        return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();
    const partyId = `party_${Date.now()}`;
    const accountId = `acc_${Date.now()}`;
    const roleId = `role_${Date.now()}`;

    const newParty: Party = {
      id: partyId,
      name: name,
      legalName: name,
      tradeName: name,
      vat: taxId,
      kind: 'ORG',
      billingAddress: { 
        street: address, 
        city: city, 
        province: province,
        zip: '', 
        country: 'España' 
      },
      phones: [],
      emails: [],
      people: [],
      tags: [],
      createdAt: now,
      updatedAt: now,
    } as Party;

    const newAccount: Account = {
      id: accountId,
      partyId: partyId,
      name: name,
      segment,
      stage,
      ownerId: ownerId || undefined, // Opcional para venta directa
      flow,
      distributorPartyId,
      source: 'CRM',
      createdById: 'currentUser', // TODO: Obtener del contexto
      createdAt: now,
      updatedAt: now,
    };

    const newRole: PartyRole = {
        id: roleId,
        partyId: partyId,
        role: segment === 'DISTRIBUIDOR' ? 'DISTRIBUTOR' : 'CUSTOMER',
        isActive: true,
        createdAt: now,
        data: {
            salesRepId: ownerId || undefined,
            billerId: distributorPartyId || 'SB'
        } as CustomerData
    };
    
    try {
        await saveAllCollections({
            parties: [newParty],
            accounts: [newAccount],
            partyRoles: [newRole]
        });
        onSuccess({ party: newParty, account: newAccount, role: newRole });
    } catch (error: any) {
        onError?.(error.message || 'Error desconocido al guardar la cuenta.');
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
                  setFlow('DIRECT');
                  setDistributorPartyId(undefined);
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  flow === 'DIRECT'
                    ? 'border-green-500 bg-green-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className={`w-5 h-5 ${flow === 'DIRECT' ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={`font-semibold ${flow === 'DIRECT' ? 'text-green-900' : 'text-gray-700'}`}>
                    Venta Directa
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Santa Brisa factura directamente al cliente
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFlow('PLACEMENT')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  flow === 'PLACEMENT'
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Truck className={`w-5 h-5 ${flow === 'PLACEMENT' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`font-semibold ${flow === 'PLACEMENT' ? 'text-blue-900' : 'text-gray-700'}`}>
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
                </Select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Estado Inicial</span>
                <Select value={stage} onChange={e => setStage(e.target.value as Stage)}>
                  <option value="POTENCIAL">🎯 Potencial</option>
                  <option value="ACTIVA">✅ Activa</option>
                  <option value="SEGUIMIENTO">👁️ Seguimiento</option>
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
                  Comercial Responsable {flow === 'PLACEMENT' && '*'}
                </span>
                <Select 
                  value={ownerId} 
                  onChange={e => setOwnerId(e.target.value)} 
                  required={flow === 'PLACEMENT'}
                >
                  <option value="">
                    {flow === 'DIRECT' ? 'Venta Propia (sin asignar)' : 'Selecciona...'}
                  </option>
                  {users.filter(u => u.role === 'comercial' || u.role === 'owner').map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </Select>
                {flow === 'DIRECT' && !ownerId && (
                  <span className="text-xs text-muted-foreground">
                    ℹ️ Esta cuenta será gestionada directamente por la empresa
                  </span>
                )}
              </label>

              {flow === 'PLACEMENT' && (
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium">Distribuidor *</span>
                  <Select 
                    value={distributorPartyId || ''} 
                    onChange={e => setDistributorPartyId(e.target.value || undefined)}
                    required={flow === 'PLACEMENT'}
                  >
                    <option value="" disabled>Selecciona...</option>
                    {availableDistributors.map(dist => (
                      <option key={dist.value} value={dist.value}>{dist.label}</option>
                    ))}
                  </Select>
                  {selectedUser && availableDistributors.length === 0 && (
                    <span className="text-xs text-amber-600">
                      ⚠️ Este comercial no tiene distribuidores asignados
                    </span>
                  )}
                </label>
              )}
            </div>
          </div>

          {/* NOTAS */}
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Notas</span>
            <Textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              placeholder="Información adicional sobre la cuenta..."
              rows={3}
            />
          </label>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
