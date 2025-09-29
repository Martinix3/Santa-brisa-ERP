

"use client";
import React, { useState, useEffect } from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import { Input, Select, Textarea } from '@/components/ui/ui-primitives';
import type { Account, Party, PartyRole, User, AccountType, CustomerData } from '@/domain/ssot';
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
  const [type, setType] = useState<AccountType>('HORECA');
  const [ownerId, setOwnerId] = useState('');
  const [billerId, setBillerId] = useState('SB');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setCif('');
      setCity('');
      setAddress('');
      setType('HORECA');
      setOwnerId('');
      setBillerId('SB');
      setIsSaving(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ownerId) {
      onError?.('Nombre y Responsable son obligatorios.');
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
      kind: 'ORG',
      taxId: cif,
      addresses: [{ type: 'billing', street: address, city: city, country: 'España' }],
      createdAt: now,
      updatedAt: now,
    } as Party;

    const newAccount: Account = {
      id: accountId,
      partyId: partyId,
      name: name,
      type: type,
      stage: 'POTENCIAL',
      ownerId: ownerId,
      createdAt: now,
    };

    const newRole: PartyRole = {
        id: roleId,
        partyId: partyId,
        role: type === 'DISTRIBUIDOR' ? 'DISTRIBUTOR' : 'CUSTOMER',
        isActive: true,
        createdAt: now,
        data: {
            salesRepId: ownerId,
            billerId: billerId
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
                <label className="grid gap-1.5"><span className="text-sm font-medium">Tipo de Cuenta</span>
                    <Select value={type} onChange={e => setType(e.target.value as AccountType)}>
                        <option value="HORECA">HORECA</option>
                        <option value="RETAIL">Retail</option>
                        <option value="ONLINE">Online</option>
                        <option value="PRIVADA">Privada</option>
                        <option value="DISTRIBUIDOR">Distribuidor</option>
                        <option value="OTRO">Otro</option>
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
                 <label className="grid gap-1.5"><span className="text-sm font-medium">Facturador</span>
                    <Select value={billerId} onChange={e => setBillerId(e.target.value)}>
                        <option value="SB">Santa Brisa (Venta Propia)</option>
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
