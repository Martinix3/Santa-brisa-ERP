
'use client';
import React, { useTransition } from 'react';
import { useData } from '@/lib/dataprovider';
import type { PartyDuplicate, Party, SB_THEME } from '@/domain/ssot';
import { mergePartyDuplicateAction } from '../actions';

export default function MergeSuggestionsPage(){
  const { data } = useData() as { data: { partyDuplicates: PartyDuplicate[]; parties: Party[] } };
  const partyDuplicates = data?.partyDuplicates || [];
  const parties = data?.parties || [];
  const [isPending, start] = useTransition();

  const open = (partyId: string) => parties.find(p => p.id === partyId);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Sugerencias de fusión</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b"><th>Primaria</th><th>Duplicada</th><th>Razón</th><th>Score</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          {(partyDuplicates ?? []).filter(d => d.status === 'OPEN').sort((a,b)=>b.score-a.score).map(dup => {
            const A = open(dup.primaryPartyId); const B = open(dup.duplicatePartyId);
            return (
              <tr key={dup.id} className="border-b">
                <td>{A?.legalName ?? A?.tradeName ?? A?.id}</td>
                <td>{B?.legalName ?? B?.tradeName ?? B?.id}</td>
                <td>{dup.reason}</td>
                <td>{Math.round((dup.score ?? 0) * 100)/100}</td>
                <td>{dup.status}</td>
                <td>
                  <button disabled={isPending} className="sb-btn-primary px-3 py-1 rounded bg-emerald-600 text-white"
                          onClick={()=> start(async ()=> await mergePartyDuplicateAction(dup.id))}>Fusionar</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
