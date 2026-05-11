/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/accounts/[id]/page.tsx
import { notFound } from 'next/navigation';
import { adminDb } from '@/server/firebase';
import type { Account } from '@/domain/ssot';
import AccountEditor from './ui/AccountEditor';
import { getAccountKPIs, getAccountNotes } from '@/server/actions/accounts';
import { AccountKPIs as AccountKPIsView } from '@/components/accounts/AccountKPIs';
import { AccountTimeline } from '@/components/accounts/AccountTimeline';
import TimelineSection from './ui/AccountTimelineSection';
import AccountImportantDates from './ui/AccountImportantDates';
import { getAccountTimeline } from '@/server/actions/accounts';
import { TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getAccount(id: string): Promise<Account | null> {
  const snap = await adminDb.collection('accounts').doc(id).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as Account) : null;
}

export default async function AccountPage({ params }: { params: { id: string } }) {
  const account = await getAccount(params.id);
  if (!account) return notFound();
  // Contact/Party info
  const [contactSnap, partySnap] = await Promise.all([
    account.partyId ? adminDb.collection('contacts').doc(account.partyId).get() : Promise.resolve({ exists: false } as any),
    account.partyId ? adminDb.collection('parties').doc(account.partyId).get() : Promise.resolve({ exists: false } as any),
  ]);
  const contact: any = contactSnap && (contactSnap as any).exists ? { id: (contactSnap as any).id, ...(contactSnap as any).data() } : null;
  const party: any = partySnap && (partySnap as any).exists ? { id: (partySnap as any).id, ...(partySnap as any).data() } : null;
  const primaryEmail = contact?.emails?.find((e: any) => e.isPrimary)?.value || contact?.emails?.[0]?.value || account.email || party?.emails?.[0]?.value || '';
  const primaryPhone = contact?.phones?.find((p: any) => p.isPrimary)?.value || contact?.phones?.[0]?.value || account.phone || party?.phones?.[0]?.value || '';
  const vat = party?.vat || account.vat || contact?.vat || '';

  const [kpisRes, notesRes, timelineRes] = await Promise.all([
    getAccountKPIs(account.id),
    getAccountNotes(account.id),
    getAccountTimeline(account.id, { limit: 20 }),
  ]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="sb-header-glass p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{account.name}</h1>
            <p className="text-sm text-muted-foreground">ID: {account.id}</p>
          </div>
        </div>
      </div>

      {kpisRes.success && kpisRes.data && (
        <AccountKPIsView data={kpisRes.data} />
      )}

      {/* Recomendaciones (fuera del drawer) */}
      {kpisRes.success && kpisRes.data && kpisRes.data.health.recommendations.length > 0 && (
        <div className="sb-card-glass-light p-4 border-l-4 border-l-orange-500">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <TrendingUp size={16} /> Recomendaciones
          </h3>
          <ul className="space-y-1">
            {kpisRes.data.health.recommendations.map((rec: string, idx: number) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span>•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Contact info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="sb-card-glass-light p-4">
          <div className="text-xs text-muted-foreground mb-1">Email</div>
          <div className="font-medium break-all">{primaryEmail || '—'}</div>
        </div>
        <div className="sb-card-glass-light p-4">
          <div className="text-xs text-muted-foreground mb-1">Teléfono</div>
          <div className="font-medium">{primaryPhone || '—'}</div>
        </div>
        <div className="sb-card-glass-light p-4">
          <div className="text-xs text-muted-foreground mb-1">CIF/NIF</div>
          <div className="font-medium">{vat || '—'}</div>
        </div>
      </div>

      {/* Important dates */}
      <AccountImportantDates accountId={account.id} />

      {/* Editor */}
      <AccountEditor initialAccount={account} initialNotes={notesRes.success ? (notesRes.data || []) : []} />

      {/* Timeline */}
      <div className="sb-card-glass-light p-4 space-y-4">
        <h3 className="font-semibold">Timeline</h3>
        <TimelineSection
          accountId={account.id}
          initialEvents={timelineRes.success ? (timelineRes.data || []) : []}
          initialHasMore={!!timelineRes.hasMore}
        />
      </div>
    </div>
  );
}
