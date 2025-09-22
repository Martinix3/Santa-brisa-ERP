
"use client";

import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import type { Party, PartyRole, PartyRoleType, Account } from '@/domain/ssot';
import { SBCard, Input, Select } from '@/components/ui/ui-primitives';
import { Search, Building, User as UserIcon, Mail, Phone, Globe } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import Link from 'next/link';
import { PARTY_ROLE_META, hexToRgba } from '@/domain/ssot';


function PartyRoleBadge({ role }: { role: PartyRoleType }) {
    const meta = PARTY_ROLE_META[role];
    if (!meta) {
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-zinc-100 text-zinc-800">{role}</span>;
    }

    return (
        <span 
            className="px-2 py-0.5 text-[10px] font-semibold rounded-full border"
            style={{
                backgroundColor: hexToRgba(meta.accent, 0.1),
                borderColor: hexToRgba(meta.accent, 0.2),
                color: meta.accent
            }}
        >
            {meta.label}
        </span>
    );
}


export function ContactsPageContent() {
    const { data } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<PartyRoleType | ''>('');
    const [kindFilter, setKindFilter] = useState<Party['kind'] | ''>('');

    const { parties, partyRolesByPartyId } = useMemo(() => {
        if (!data) return { parties: [], partyRolesByPartyId: new Map() };

        const rolesMap = new Map<string, PartyRole[]>();
        (data.partyRoles || []).forEach(role => {
            const existing = rolesMap.get(role.partyId) || [];
            rolesMap.set(role.partyId, [...existing, role]);
        });
        
        return { parties: data.parties || [], partyRolesByPartyId: rolesMap };
    }, [data]);

    const filteredParties = useMemo(() => {
        const lowerCaseSearch = searchTerm.toLowerCase();
        return parties.filter(party => {
            const roles = partyRolesByPartyId.get(party.id) || [];
            
            const matchesSearch = !searchTerm ||
                party.name.toLowerCase().includes(lowerCaseSearch) ||
                party.taxId?.toLowerCase().includes(lowerCaseSearch) ||
                party.contacts.some(c => c.value.toLowerCase().includes(lowerCaseSearch));

            const matchesRole = !roleFilter || roles.some(r => r.role === roleFilter);
            const matchesKind = !kindFilter || party.kind === kindFilter;

            return matchesSearch && matchesRole && matchesKind;
        });
    }, [parties, searchTerm, roleFilter, kindFilter, partyRolesByPartyId]);

    const uniqueRoles = useMemo(() => {
        const roles = new Set<PartyRoleType>();
        (data?.partyRoles || []).forEach(r => roles.add(r.role));
        return Array.from(roles).sort();
    }, [data?.partyRoles]);

    if (!data) {
        return <div className="p-6 text-center">Cargando contactos...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-800">Directorio de Contactos</h1>
                    <p className="text-sm text-zinc-600">Unifica la vista de todos tus clientes, proveedores, influencers y empleados.</p>
                </div>
                <div className="flex w-full md:w-auto items-center gap-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Buscar por nombre, CIF, email..."
                            className="pl-9 w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                     <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)}>
                        <option value="">Todos los Roles</option>
                        {uniqueRoles.map(role => <option key={role} value={role}>{PARTY_ROLE_META[role]?.label || role}</option>)}
                    </Select>
                     <Select value={kindFilter} onChange={e => setKindFilter(e.target.value as any)}>
                        <option value="">Todos los Tipos</option>
                        <option value="ORG">Organización</option>
                        <option value="PERSON">Persona</option>
                    </Select>
                </div>
            </div>

            <SBCard title="">
                <div className="divide-y divide-zinc-100">
                     <div className="grid grid-cols-[auto_2fr_1.5fr_1.5fr_1fr] items-center gap-4 px-4 py-3 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 tracking-wider">
                        <div />
                        <span>Nombre / Razón Social</span>
                        <span>Roles</span>
                        <span>Contacto Principal</span>
                        <span className="text-right">CIF / NIF</span>
                    </div>
                    {filteredParties.map(party => {
                        const roles = partyRolesByPartyId.get(party.id) || [];
                        const primaryContact = party.contacts.find(c => c.isPrimary) || party.contacts[0];
                        const account = data.accounts.find(a => a.partyId === party.id);
                        
                        return (
                            <div key={party.id} className="grid grid-cols-[auto_2fr_1.5fr_1.5fr_1fr] items-center gap-4 px-4 py-3 hover:bg-zinc-50/50">
                                <div className="flex-shrink-0">
                                    {party.kind === 'PERSON' ? <Avatar name={party.name} size="lg"/> : <Building className="h-6 w-6 text-zinc-500"/>}
                                </div>
                                <div className="font-medium text-zinc-800">
                                    {account ? (
                                        <Link href={`/accounts/${account.id}`} className="hover:underline">{party.name}</Link>
                                    ) : (
                                        party.name
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {roles.map(role => <PartyRoleBadge key={role.id} role={role.role} />)}
                                    {roles.length === 0 && <span className="text-xs text-zinc-400">Sin rol asignado</span>}
                                </div>
                                <div>
                                    {primaryContact ? (
                                        <div className="text-sm text-zinc-600 flex items-center gap-2">
                                            {primaryContact.type === 'email' && <Mail size={14} className="text-zinc-400" />}
                                            {primaryContact.type === 'phone' && <Phone size={14} className="text-zinc-400" />}
                                            {primaryContact.type === 'web' && <Globe size={14} className="text-zinc-400" />}
                                            <span>{primaryContact.value}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-zinc-400">Sin contacto</span>
                                    )}
                                </div>
                                <div className="text-right font-mono text-xs text-zinc-500">
                                    {party.taxId || 'N/A'}
                                </div>
                            </div>
                        )
                    })}
                     {filteredParties.length === 0 && (
                        <div className="p-8 text-center text-sm text-zinc-500">
                            No se encontraron contactos que coincidan con tu búsqueda.
                        </div>
                    )}
                </div>
            </SBCard>
        </div>
    );
}
