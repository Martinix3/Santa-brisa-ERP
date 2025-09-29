// src/features/quicklog/components/SBFlows.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { X, Plus, Search, Check, Loader2, MessageSquare, Zap } from "lucide-react";
import { useData } from "@/lib/dataprovider";
import type { AccountType, Account, OrderSellOut, Item, Party, InteractionKind, PosTactic, PosTacticItem, PartyRole, CustomerData, CommercialFlow } from '@/domain/ssot';
import { TimePicker } from "@/components/ui/TimePicker";
import { toast } from "sonner";

// ===== UI Primitives =====
function Row({children, className}:{children:React.ReactNode, className?: string}){ return <div className={`flex flex-col gap-1.5 ${className || ''}`}>{children}</div>; }
function Label({children, htmlFor}:{children:React.ReactNode, htmlFor?: string}){ return <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-700">{children}</label>; }
function Input(props:React.InputHTMLAttributes<HTMLInputElement>){ return <input {...props} className={`h-10 w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm outline-none focus:ring-2 focus:ring-[#F7D15F] ${props.className||""}`}/>; }
function Select(props:React.SelectHTMLAttributes<HTMLSelectElement>){ return <select {...props} className={`h-10 w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm outline-none focus:ring-2 focus:ring-[#F7D15F] ${props.className||""}`}/>; }
function Textarea(props:React.TextareaHTMLAttributes<HTMLTextAreaElement>){ return <textarea {...props} className={`w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm outline-none focus:ring-2 focus:ring-[#F7D15F] ${props.className||""}`}/>; }

// ===== Utils =====
function useDebounced<T>(value:T, delay=250){ const [v,setV]=useState(value); useEffect(()=>{ const id=setTimeout(()=>setV(value), delay); return ()=>clearTimeout(id); },[value,delay]); return v; }

// ===== Formulario Simplificado para Colocación =====
function PlacementFlowForm({accounts, onSearchAccounts, onCreateAccount, onSubmit, onCancel }:{
  accounts: Account[];
  onSearchAccounts:(q:string, options: { signal: AbortSignal })=>Promise<Account[]>;
  onCreateAccount:(d:{name:string;city?:string;type?:AccountType, distributorPartyId?: string})=>Promise<Account>;
  onSubmit:(p: any)=>void;
  onCancel:()=>void;
}){
  const { data: santaData } = useData();
  const [mode, setMode] = useState<'interaction' | 'account'>("interaction");
  
  const [accountName, setAccountName] = useState("");
  const [accountCity, setAccountCity] = useState("");
  const [distributorPartyId, setDistributorPartyId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();
  
  const [searchSuggestions, setSearchSuggestions] = useState<Account[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [interactionNote, setInteractionNote] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [nextActionTime, setNextActionTime] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const debouncedName = useDebounced(accountName, 250);

  const distributors = useMemo(() => {
    if (!santaData) return [];
    const distRoles = (santaData.partyRoles || []).filter(r => r.role === 'DISTRIBUTOR');
    const distPartyIds = new Set(distRoles.map(r => r.partyId));
    return (santaData.parties || []).filter(p => distPartyIds.has(p.id));
  }, [santaData]);

  useEffect(() => {
    const runSearch = async () => {
      if (debouncedName.length > 1 && !selectedAccountId) {
        const results = await onSearchAccounts(debouncedName, {});
        setSearchSuggestions(results);
        setIsSearchOpen(true);
      } else {
        setSearchSuggestions([]);
        setIsSearchOpen(false);
      }
    };
    runSearch();
  }, [debouncedName, onSearchAccounts, selectedAccountId]);

  const handleAccountSelect = (account: Account) => {
    const party = santaData?.parties.find(p => p.id === account.partyId);
    setAccountName(account.name);
    setAccountCity(party?.billingAddress?.city || "");
    setDistributorPartyId(account.distributorPartyId || '');
    setSelectedAccountId(account.id);
    setIsSearchOpen(false);
    setErrors(e => ({...e, accountName: ''}));
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setAccountName(e.target.value);
      if (selectedAccountId) {
          setSelectedAccountId(undefined);
          setAccountCity("");
          setDistributorPartyId('');
      }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!distributorPartyId) {
        newErrors.distributorPartyId = 'El distribuidor es obligatorio.';
    }
    if (!accountName.trim()) {
      newErrors.accountName = 'El nombre de la cuenta es obligatorio.';
    }
    if (mode === 'interaction' && !interactionNote.trim()) {
        newErrors.interactionNote = 'El resumen es obligatorio.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function submit(){
    if (!validate() || isSaving) return;

    setIsSaving(true);
    let finalAccountId = selectedAccountId;

    if(!selectedAccountId && accountName.trim()){
        const newAccount = await onCreateAccount({ name: accountName, city: accountCity, type: 'HORECA', distributorPartyId });
        finalAccountId = newAccount.id;
    }

    if (!finalAccountId) {
        toast.error("No se pudo determinar la cuenta.");
        setIsSaving(false);
        return;
    }
    
    if (mode === 'interaction'){
      const plannedFor = nextActionDate && nextActionTime
          ? new Date(`${nextActionDate}T${nextActionTime}`).toISOString()
          : nextActionDate ? new Date(nextActionDate).toISOString() : undefined;
      onSubmit({ mode:"interaction", accountId: finalAccountId, kind: 'OTRO', note: interactionNote, nextActionNote: '', plannedFor });
    } else { // mode === 'account'
        toast.success(`Cuenta "${accountName}" lista para usar.`);
        onCancel();
    }

    setIsSaving(false);
  }
  
  const isSaveDisabled = isSaving || !distributorPartyId || !accountName.trim() || (mode === 'interaction' && !interactionNote.trim());

  return (
    <div className="p-4 space-y-4 flex flex-col h-full">
       <div className="flex items-center gap-2 p-1 bg-zinc-100 rounded-xl">
        <button onClick={()=>setMode("interaction")} className={`flex-1 text-center px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${mode==="interaction"?"bg-white shadow-sm":"text-zinc-600 hover:bg-white/50"}`}>
            <MessageSquare className="h-4 w-4 inline mr-1.5"/> Interacción Rápida
        </button>
        <button onClick={()=>setMode("account")} className={`flex-1 text-center px-3 py-2 rounded-lg text-sm font-semibold transition-all ${mode==="account"?"bg-white shadow-sm":"text-zinc-600 hover:bg-white/50"}`}>
            <Zap className="h-4 w-4 inline mr-1.5"/> Nueva Cuenta
        </button>
      </div>
      
      <div className="flex-grow space-y-4">
        <div className="border border-zinc-200 rounded-xl p-3 bg-white space-y-3">
          <div className="text-xs text-zinc-500 uppercase font-semibold">Detalles de Colocación</div>
          <div className="relative">
              <Row>
                <Label htmlFor="accountName">Cuenta</Label>
                <Input id="accountName" value={accountName} onChange={handleNameChange} placeholder="Buscar o crear cuenta..."/>
                {errors.accountName && <p className="text-xs text-red-500">{errors.accountName}</p>}
                {isSearchOpen && searchSuggestions.length > 0 && (
                    <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {searchSuggestions.map(acc => <li key={acc.id} onMouseDown={()=> handleAccountSelect(acc)} className="px-3 py-2 cursor-pointer hover:bg-zinc-100">{acc.name}</li>)}
                    </ul>
                )}
              </Row>
          </div>
          <div className="grid grid-cols-2 gap-3">
              <Row><Label htmlFor="accountCity">Ciudad</Label><Input id="accountCity" value={accountCity} onChange={e=>setAccountCity(e.target.value)} /></Row>
              <Row>
                <Label htmlFor="distributorId">Distribuidor</Label>
                <Select id="distributorId" value={distributorPartyId} onChange={e => setDistributorPartyId(e.target.value)}>
                  <option value="">Selecciona distribuidor…</option>
                  {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
                {errors.distributorPartyId && <p className="text-xs text-red-500">{errors.distributorPartyId}</p>}
              </Row>
          </div>
        </div>

        {mode === "interaction" && (
          <div className="space-y-4">
            <Row>
              <Label htmlFor="interaction-note">Resumen de la Interacción</Label>
              <Textarea
                id="interaction-note"
                rows={3}
                maxLength={200}
                placeholder="Ej: Cliente interesado, enviar propuesta la semana que viene."
                value={interactionNote}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { setInteractionNote(e.target.value); setErrors(e => ({ ...e, interactionNote: '' })) }} />
              {errors.interactionNote && <p className="text-xs text-red-500">{errors.interactionNote}</p>}
            </Row>
            
            <Row>
              <Label>Fecha Próxima Acción (opcional)</Label>
              <div className="flex gap-2">
                <Input id="next-action-date" type="date" value={nextActionDate} onChange={e => setNextActionDate(e.target.value)} className="flex-1" />
                <TimePicker value={nextActionTime} onChange={setNextActionTime} step={15} className="flex-1" />
              </div>
            </Row>
          </div>
        )}
      </div>
      
      <div className="sticky bottom-0 bg-white/80 backdrop-blur-sm py-3 px-4 -m-4 mt-4 border-t border-zinc-200 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50">Cancelar</button>
        <button type="button" onClick={submit} disabled={isSaveDisabled} className="w-32 px-4 py-2 text-sm font-semibold rounded-lg bg-yellow-400 text-zinc-900 hover:brightness-110 disabled:bg-zinc-200 disabled:text-zinc-500 disabled:cursor-not-allowed flex items-center justify-center">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

export function SBFlowModal({ open, onClose, accounts, onSearchAccounts, onCreateAccount, onSubmit }: {
  open: boolean;
  onClose:()=>void;
  accounts: Account[];
  onSearchAccounts:(q:string, options: { signal: AbortSignal })=>Promise<Account[]>;
  onCreateAccount:(d:{name:string;city?:string;type?:AccountType, distributorPartyId?: string})=>Promise<Account>;
  onSubmit:(payload:any)=>void;
  context?: 'DIRECT'|'PLACEMENT';
}){
  if(!open) return null;
  return (
    <div className="w-full h-full rounded-2xl flex flex-col">
      <div className="flex-grow overflow-y-auto">
        <PlacementFlowForm 
            accounts={accounts} 
            onSearchAccounts={onSearchAccounts} 
            onCreateAccount={onCreateAccount} 
            onCancel={onClose} 
            onSubmit={onSubmit} 
        />
      </div>
    </div>
  );
}
