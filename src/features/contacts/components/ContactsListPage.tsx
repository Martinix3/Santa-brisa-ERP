"use client";
import React, { useState, useMemo } from "react";
import { useData } from "@/lib/dataprovider";
import { PageShell } from "@/components/shared/PageShell";
import { SBButton, Input } from "@/components/ui";
import { Plus, Search, Mail, Phone, MapPin, Building2, User, Filter } from "lucide-react";
import type { Party, PartyRoleType } from "@/domain/ssot";
import { PARTY_ROLE_META } from "@/domain/ssot";
import { NewContactDialog } from "./NewContactDialog";

export function ContactsListPage() {
  const { data } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<PartyRoleType | "ALL">("ALL");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | undefined>();

  const parties = useMemo(() => data?.parties || [], [data]);
  const partyRoles = useMemo(() => data?.partyRoles || [], [data]);

  // Get roles for each party
  const partiesWithRoles = useMemo(() => {
    return parties.map(party => {
      const roles = partyRoles
        .filter(pr => pr.partyId === party.id && pr.isActive)
        .map(pr => pr.role);
      return { ...party, activeRoles: roles };
    });
  }, [parties, partyRoles]);

  // Filter parties
  const filteredParties = useMemo(() => {
    let filtered = partiesWithRoles;

    // Filter by role
    if (selectedRole !== "ALL") {
      filtered = filtered.filter(p => p.activeRoles.includes(selectedRole));
    }

    // Filter by search term
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(lower) ||
        p.legalName?.toLowerCase().includes(lower) ||
        p.vat?.toLowerCase().includes(lower) ||
        p.emails?.some(e => e.value.toLowerCase().includes(lower)) ||
        p.phones?.some(ph => ph.value.includes(searchTerm))
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [partiesWithRoles, selectedRole, searchTerm]);

  const handleEdit = (party: Party) => {
    setEditingParty(party);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingParty(undefined);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingParty(undefined);
  };

  // Count by role
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: partiesWithRoles.length };
    partiesWithRoles.forEach(p => {
      p.activeRoles.forEach(role => {
        counts[role] = (counts[role] || 0) + 1;
      });
    });
    return counts;
  }, [partiesWithRoles]);

  const roleOptions: Array<{ value: PartyRoleType | "ALL"; label: string }> = [
    { value: "ALL", label: `Todos (${roleCounts.ALL || 0})` },
    { value: "CUSTOMER", label: `${PARTY_ROLE_META.CUSTOMER.label} (${roleCounts.CUSTOMER || 0})` },
    { value: "DISTRIBUTOR", label: `${PARTY_ROLE_META.DISTRIBUTOR.label} (${roleCounts.DISTRIBUTOR || 0})` },
    { value: "SUPPLIER", label: `${PARTY_ROLE_META.SUPPLIER.label} (${roleCounts.SUPPLIER || 0})` },
    { value: "INFLUENCER", label: `${PARTY_ROLE_META.INFLUENCER.label} (${roleCounts.INFLUENCER || 0})` },
    { value: "CREATOR", label: `${PARTY_ROLE_META.CREATOR.label} (${roleCounts.CREATOR || 0})` },
    { value: "EMPLOYEE", label: `${PARTY_ROLE_META.EMPLOYEE.label} (${roleCounts.EMPLOYEE || 0})` },
    { value: "BRAND_AMBASSADOR", label: `${PARTY_ROLE_META.BRAND_AMBASSADOR.label} (${roleCounts.BRAND_AMBASSADOR || 0})` },
    { value: "IMPORTER", label: `${PARTY_ROLE_META.IMPORTER.label} (${roleCounts.IMPORTER || 0})` },
    { value: "OTHER", label: `${PARTY_ROLE_META.OTHER.label} (${roleCounts.OTHER || 0})` },
  ];

  return (
    <PageShell title="📇 Contactos">
      <div className="space-y-4">
        {/* Header with Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, CIF, email, teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as PartyRoleType | "ALL")}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors appearance-none cursor-pointer min-w-[200px]"
              >
                {roleOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <SBButton onClick={handleNew}>
            <Plus className="w-4 h-4 mr-1" />
            Nuevo Contacto
          </SBButton>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600">
          {filteredParties.length} {filteredParties.length === 1 ? 'contacto' : 'contactos'}
          {selectedRole !== "ALL" && ` (${PARTY_ROLE_META[selectedRole].label})`}
        </div>

        {/* Contacts Grid */}
        {filteredParties.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No se encontraron contactos</p>
            <p className="text-sm mt-1">Prueba con otros filtros o crea uno nuevo</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredParties.map(party => (
              <ContactCard
                key={party.id}
                party={party}
                roles={party.activeRoles}
                onEdit={() => handleEdit(party)}
              />
            ))}
          </div>
        )}
      </div>

      <NewContactDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        party={editingParty}
      />
    </PageShell>
  );
}

// ============================================================================
// CONTACT CARD COMPONENT
// ============================================================================

function ContactCard({ 
  party, 
  roles, 
  onEdit 
}: { 
  party: Party & { activeRoles: PartyRoleType[] }; 
  roles: PartyRoleType[]; 
  onEdit: () => void;
}) {
  const primaryEmail = party.emails?.find(e => e.isPrimary)?.value || party.emails?.[0]?.value;
  const primaryPhone = party.phones?.find(p => p.isPrimary)?.value || party.phones?.[0]?.value;
  const address = party.billingAddress || party.shippingAddress;

  return (
    <div 
      className="sb-card hover:shadow-md transition-shadow cursor-pointer"
      onClick={onEdit}
    >
      <div className="sb-card__content space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {party.kind === 'ORG' ? (
                <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
              ) : (
                <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
              )}
              <h3 className="font-semibold text-gray-900 truncate">
                {party.name}
              </h3>
            </div>
            {party.legalName && party.legalName !== party.name && (
              <p className="text-xs text-gray-500 truncate">{party.legalName}</p>
            )}
          </div>
        </div>

        {/* Roles */}
        {roles.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {roles.map(role => (
              <span
                key={role}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${PARTY_ROLE_META[role].accent}20`,
                  color: PARTY_ROLE_META[role].accent
                }}
              >
                {PARTY_ROLE_META[role].label}
              </span>
            ))}
          </div>
        )}

        {/* Contact Info */}
        <div className="space-y-1.5 text-sm text-gray-600">
          {party.vat && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-400">CIF/VAT:</span>
              <span className="font-mono text-xs">{party.vat}</span>
            </div>
          )}
          
          {primaryEmail && (
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate text-xs">{primaryEmail}</span>
            </div>
          )}
          
          {primaryPhone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-xs">{primaryPhone}</span>
            </div>
          )}
          
          {address && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate text-xs">
                {address.city}, {address.country}
              </span>
            </div>
          )}
        </div>

        {/* Tags */}
        {party.tags && party.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t">
            {party.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
            {party.tags.length > 3 && (
              <span className="text-xs text-gray-400">
                +{party.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
