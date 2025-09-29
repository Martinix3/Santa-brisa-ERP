// src/features/accounts/components/NewAccountDialog.tsx

"use client";
import React, { useState, useEffect } from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import { Input, Select, Textarea } from '@/components/ui/ui-primitives';
import type { Account, Party, PartyRole, User, AccountType, CustomerData, CommercialFlow, Stage, Segment } from '@/domain/ssot';
import { useData } from '@/lib/dataprovider';


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
  const [cif, setCif] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [segment, setSegment] = useState<Segment>('HORECA');
  const [ownerId, setOwnerId] = useState('');
  const [distributorPartyId, setDistributorPartyId] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setCif('');
      setCity('');
      setAddress('');
      setSegment('HORECA');
      setOwnerId('');
      setDistributorPartyId(undefined);
      setIsSaving(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ownerId) {
      onError?.('Nombre y Responsable son obligatorios.');
      return;
    }
    
    const flow: CommercialFlow = distributorPartyId ? 'PLACEMENT' : 'DIRECT';
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
      legalName: name,
      cif,
      billingAddress: { street: address, city: city, zip: '', country: 'España' },
      createdAt: now,
      updatedAt: now,
    };

    const newAccount: Account = {
      id: accountId,
      partyId: partyId,
      name: name,
      segment,
      stage: 'POTENCIAL' as Stage,
      ownerId: ownerId,
      flow,
      distributorPartyId,
      createdAt: now,
      updatedAt: now,
      mode: flow === 'DIRECT' ? 'DIRECTA' : 'COLOCACION', // For compatibility
    };

    const newRole: PartyRole = {
        id: roleId,
        partyId: partyId,
        role: segment === 'DISTRIBUIDOR' ? 'DISTRIBUTOR' : 'CUSTOMER',
        isActive: true,
        createdAt: now,
        data: {
            salesRepId: ownerId,
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
        title="Crear Nueva Cuenta"
        description="Introduce los detalles del nuevo cliente potencial."
        onSubmit={handleSubmit}
        primaryAction={{ label: isSaving ? 'Guardando...' : 'Crear Cuenta', type: 'submit', disabled: isSaving }}
        secondaryAction={{ label: 'Cancelar', onClick: onClose, disabled: isSaving }}
        maxWidth="36rem"
      >
        <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
                <label className="grid gap-1.5"><span className="text-sm font-medium">Nombre de la cuenta</span><Input value={name} onChange={e => setName(e.target.value)} required /></label>
                <label className="grid gap-1.5"><span className="text-sm font-medium">CIF/NIF</span><Input value={cif} onChange={e => setCif(e.target.value)} /></label>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <label className="grid gap-1.5"><span className="text-sm font-medium">Ciudad</span><Input value={city} onChange={e => setCity(e.target.value)} /></label>
                <label className="grid gap-1.5"><span className="text-sm font-medium">Segmento</span>
                    <Select value={segment} onChange={e => setSegment(e.target.value as Segment)}>
                        <option value="HORECA">HORECA</option>
                        <option value="RETAIL">Retail</option>
                        <option value="ONLINE">Online</option>
                        <option value="PRIVADA">Privada</option>
                    </Select>
                </label>
            </div>
            <label className="grid gap-1.5"><span className="text-sm font-medium">Dirección</span><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Calle, número, piso..."/></label>
            <div className="grid grid-cols-2 gap-4">
                <label className="grid gap-1.5"><span className="text-sm font-medium">Responsable (Comercial)</span>
                    <Select value={ownerId} onChange={e => setOwnerId(e.target.value)} required>
                        <option value="" disabled>Selecciona un comercial...</option>
                        {users.filter(u => u.role === 'comercial' || u.role === 'owner').map(user => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </Select>
                </label>
                 <label className="grid gap-1.5"><span className="text-sm font-medium">Distribuidor (si aplica)</span>
                    <Select value={distributorPartyId || ''} onChange={e => setDistributorPartyId(e.target.value || undefined)}>
                        <option value="">Venta Propia (Santa Brisa)</option>
                        {distributors.map(dist => (
                            <option key={dist.value} value={dist.value}>{dist.label}</option>
                        ))}
                    </Select>
                </label>
            </div>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
