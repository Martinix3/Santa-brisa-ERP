"use client";

import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import type { Party, PartyRole, Account } from '@/domain/ssot';
import { SBCard, Input } from '@/components/ui/ui-primitives';
import { Search, Building, User as UserIcon, Briefcase } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import Link from 'next/link';

function PartyRoleBadge({ role }: { role: PartyRole['role'] }) {
    const roleStyles: Record<PartyRole['role'], string> = {
        CUSTOMER: 'bg-blue-100 text-blue-800',
        SUPPLIER: 'bg-emerald-100 text-emerald-800',
        DISTRIBUTOR: 'bg-purple-100 text-purple-800',
        IMPORTER: 'bg-indigo-100 text-indigo-800',
        INFLUENCER: 'bg-pink-100 text-pink-800',
        CREATOR: 'bg-rose-100 text-rose-800',
        EMPLOYEE: 'bg-sky-100 text-sky-800',
        BRAND_AMBASSADOR: 'bg-teal-100 text-teal-800',
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${roleStyles[role] || 'bg-zinc-100 text-zinc-800'}`}>{role}</span>;
}


export function ContactsPageContent() {
    const { data } = useData();
    const [searchTerm, setSearchTerm] = useState('');

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
        if (!searchTerm) return parties;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return parties.filter(party =>
            party.name.toLowerCase().includes(lowerCaseSearch) ||
            party.taxId?.toLowerCase().includes(lowerCaseSearch) ||
            party.contacts.some(c => c.value.toLowerCase().includes(lowerCaseSearch)) ||
            (partyRolesByPartyId.get(party.id) || []).some(r => r.role.toLowerCase().includes(lowerCaseSearch))
        );
    }, [parties, searchTerm, partyRolesByPartyId]);

    if (!data) {
        return <div className="p-6 text-center">Cargando contactos...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-800">Directorio de Contactos</h1>
                    <p className="text-sm text-zinc-600">Unifica la vista de todos tus clientes, proveedores, influencers y empleados.</p>
                </div>
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                        placeholder="Buscar por nombre, CIF, rol, email..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <SBCard title="">
                <div className="divide-y divide-zinc-100">
                     <div className="grid grid-cols-[auto_2fr_1.5fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 tracking-wider">
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
                            <div key={party.id} className="grid grid-cols-[auto_2fr_1.5fr_1fr_1fr] items-center gap-4 px-4 py-3 hover:bg-zinc-50/50">
                                <div className="flex-shrink-0">
                                    {party.kind === 'PERSON' ? <UserIcon className="h-6 w-6 text-zinc-500"/> : <Building className="h-6 w-6 text-zinc-500"/>}
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
                                </div>
                                <div>
                                    {primaryContact ? (
                                        <div className="text-sm text-zinc-600">{primaryContact.value}</div>
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
