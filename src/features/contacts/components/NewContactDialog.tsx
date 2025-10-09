"use client";
import React, { useState, useEffect } from "react";
import { SBDialog, SBDialogContent, SBButton, Input, Textarea, Select } from "@/components/ui";
import type { Party, PartyRoleType, Address, CommItem } from "@/domain/ssot";
import { PARTY_ROLE_META } from "@/domain/ssot";
import { Plus, Trash2, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  party?: Party;
};

export function NewContactDialog({ open, onOpenChange, party }: Props) {
  const isEditing = !!party;
  
  // Form state
  const [kind, setKind] = useState<'ORG' | 'PERSON'>('ORG');
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [vat, setVat] = useState('');
  const [emails, setEmails] = useState<CommItem[]>([]);
  const [phones, setPhones] = useState<CommItem[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<PartyRoleType[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  // Address
  const [address, setAddress] = useState<Partial<Address>>({
    street: '',
    city: '',
    zip: '',
    country: 'España'
  });

  // Reset form when dialog opens/closes or party changes
  useEffect(() => {
    if (open) {
      if (party) {
        setKind(party.kind);
        setName(party.name);
        setLegalName(party.legalName || '');
        setVat(party.vat || party.taxId || '');
        setEmails(party.emails || []);
        setPhones(party.phones || []);
        setSelectedRoles(party.roles || []);
        setTags(party.tags || []);
        setAddress(party.billingAddress || {
          street: '',
          city: '',
          zip: '',
          country: 'España'
        });
      } else {
        // Reset to defaults
        setKind('ORG');
        setName('');
        setLegalName('');
        setVat('');
        setEmails([]);
        setPhones([]);
        setSelectedRoles([]);
        setTags([]);
        setAddress({ street: '', city: '', zip: '', country: 'España' });
      }
      setNewTag('');
    }
  }, [open, party]);

  const handleAddEmail = () => {
    setEmails([...emails, { value: '', isPrimary: emails.length === 0 }]);
  };

  const handleRemoveEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const handleAddPhone = () => {
    setPhones([...phones, { value: '', isPrimary: phones.length === 0 }]);
  };

  const handleRemovePhone = (index: number) => {
    setPhones(phones.filter((_, i) => i !== index));
  };

  const handleToggleRole = (role: PartyRoleType) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    if (selectedRoles.length === 0) {
      toast.error("Selecciona al menos un rol");
      return;
    }

    const partyData: Partial<Party> = {
      kind,
      name: name.trim(),
      legalName: legalName.trim() || undefined,
      vat: vat.trim() || undefined,
      emails: emails.filter(e => e.value.trim()),
      phones: phones.filter(p => p.value.trim()),
      roles: selectedRoles,
      tags: tags,
      billingAddress: address.street ? address as Address : undefined,
      createdAt: party?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // TODO: Implement actual save logic with Firestore
    console.log('Saving party:', partyData);
    toast.success(isEditing ? "Contacto actualizado" : "Contacto creado");
    onOpenChange(false);
  };

  const roleOptions: PartyRoleType[] = [
    'CUSTOMER',
    'DISTRIBUTOR',
    'SUPPLIER',
    'INFLUENCER',
    'CREATOR',
    'EMPLOYEE',
    'BRAND_AMBASSADOR',
    'IMPORTER',
    'OTHER'
  ];

  return (
    <SBDialog open={open} onOpenChange={onOpenChange}>
      <SBDialogContent 
        title={isEditing ? `Editar: ${party.name}` : "Nuevo Contacto"}
        maxWidth="50rem"
      >
        <div className="space-y-6 pt-4">
          {/* Tipo de Contacto */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Tipo de Contacto *
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setKind('ORG')}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    kind === 'ORG' 
                      ? 'border-primary bg-primary/10 text-primary font-medium' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  🏢 Organización
                </button>
                <button
                  onClick={() => setKind('PERSON')}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    kind === 'PERSON' 
                      ? 'border-primary bg-primary/10 text-primary font-medium' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  👤 Persona
                </button>
              </div>
            </div>
          </div>

          {/* Información Básica */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Nombre Comercial *
              </label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={kind === 'ORG' ? "Ej: Bar Central" : "Ej: Juan Pérez"}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                {kind === 'ORG' ? 'Razón Social' : 'Nombre Completo'}
              </label>
              <Input
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
                placeholder={kind === 'ORG' ? "Ej: Bar Central S.L." : "Ej: Juan Antonio Pérez García"}
              />
            </div>
          </div>

          {/* CIF/VAT */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              CIF/VAT
            </label>
            <Input
              value={vat}
              onChange={e => setVat(e.target.value)}
              placeholder="ESB12345678"
            />
          </div>

          {/* Roles */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Roles * <span className="text-gray-500 font-normal">(selecciona al menos uno)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {roleOptions.map(role => (
                <button
                  key={role}
                  onClick={() => handleToggleRole(role)}
                  className={`py-2 px-3 rounded-lg border-2 transition-colors text-sm ${
                    selectedRoles.includes(role)
                      ? 'border-primary bg-primary/10 font-medium'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{
                    color: selectedRoles.includes(role) ? PARTY_ROLE_META[role].accent : undefined
                  }}
                >
                  {PARTY_ROLE_META[role].label}
                </button>
              ))}
            </div>
          </div>

          {/* Emails */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Emails
            </label>
            <div className="space-y-2">
              {emails.map((email, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={email.value}
                    onChange={e => {
                      const newEmails = [...emails];
                      newEmails[idx].value = e.target.value;
                      setEmails(newEmails);
                    }}
                    placeholder="correo@ejemplo.com"
                    type="email"
                    className="flex-1"
                  />
                  <label className="flex items-center gap-1 px-3 border border-gray-200 rounded-lg text-sm">
                    <input
                      type="checkbox"
                      checked={email.isPrimary}
                      onChange={e => {
                        const newEmails = emails.map((em, i) => ({
                          ...em,
                          isPrimary: i === idx ? e.target.checked : false
                        }));
                        setEmails(newEmails);
                      }}
                    />
                    Principal
                  </label>
                  <SBButton variant="ghost" size="sm" onClick={() => handleRemoveEmail(idx)}>
                    <Trash2 className="w-4 h-4" />
                  </SBButton>
                </div>
              ))}
              <SBButton variant="outline" size="sm" onClick={handleAddEmail}>
                <Plus className="w-4 h-4 mr-1" />
                Añadir Email
              </SBButton>
            </div>
          </div>

          {/* Phones */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Teléfonos
            </label>
            <div className="space-y-2">
              {phones.map((phone, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={phone.value}
                    onChange={e => {
                      const newPhones = [...phones];
                      newPhones[idx].value = e.target.value;
                      setPhones(newPhones);
                    }}
                    placeholder="+34 600 000 000"
                    type="tel"
                    className="flex-1"
                  />
                  <label className="flex items-center gap-1 px-3 border border-gray-200 rounded-lg text-sm">
                    <input
                      type="checkbox"
                      checked={phone.isPrimary}
                      onChange={e => {
                        const newPhones = phones.map((ph, i) => ({
                          ...ph,
                          isPrimary: i === idx ? e.target.checked : false
                        }));
                        setPhones(newPhones);
                      }}
                    />
                    Principal
                  </label>
                  <SBButton variant="ghost" size="sm" onClick={() => handleRemovePhone(idx)}>
                    <Trash2 className="w-4 h-4" />
                  </SBButton>
                </div>
              ))}
              <SBButton variant="outline" size="sm" onClick={handleAddPhone}>
                <Plus className="w-4 h-4 mr-1" />
                Añadir Teléfono
              </SBButton>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Dirección
            </label>
            <div className="space-y-2">
              <Input
                value={address.street || ''}
                onChange={e => setAddress({...address, street: e.target.value})}
                placeholder="Calle, número, piso..."
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={address.city || ''}
                  onChange={e => setAddress({...address, city: e.target.value})}
                  placeholder="Ciudad"
                />
                <Input
                  value={address.zip || ''}
                  onChange={e => setAddress({...address, zip: e.target.value})}
                  placeholder="CP"
                />
                <Input
                  value={address.country || ''}
                  onChange={e => setAddress({...address, country: e.target.value})}
                  placeholder="País"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Etiquetas
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-600 transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddTag()}
                placeholder="Nueva etiqueta..."
                className="flex-1"
              />
              <SBButton variant="outline" size="sm" onClick={handleAddTag}>
                <Plus className="w-4 h-4" />
              </SBButton>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t mt-6">
          <SBButton variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </SBButton>
          <SBButton variant="primary" onClick={handleSave}>
            {isEditing ? 'Guardar Cambios' : 'Crear Contacto'}
          </SBButton>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
