// src/features/quicklog/components/SBFlows.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, CalendarDays, ClipboardList, UserPlus2, Briefcase, Search, Check, MapPin, Pencil, Save, MessageSquare, Zap, Mail, Phone, History, ShoppingCart, Building, CreditCard, Star, Loader2 } from "lucide-react";
import { useData } from "@/lib/dataprovider";
import { generateNextOrder } from '@/lib/codes';
import type { AccountType, Account, OrderSellOut, Product, Party, SB_THEME, InteractionKind, PosTactic, PosTacticItem, PartyRole, CustomerData, PosCostCatalogEntry } from '@/domain/ssot';
import { SB_COLORS } from "@/domain/ssot";
import { TimePicker } from "@/components/ui/TimePicker";

const hexToRgba = (hex: string, a: number) => { const h = hex.replace('#',''); const f = h.length===3? h.split('').map(c=>c+c).join(''):h; const n=parseInt(f,16); const r=(n>>16)&255, g=(n>>8)&255, b=n&255; return `rgba(${r},${g},${b},${a})`; };
const waterHeader = (seed = "hdr", base = "#A7D8D9") => {
  const hash = Array.from(seed).reduce((s,c)=> (s*33+c.charCodeAt(0))>>>0,5381);
  let a = hash||1; const rnd = ()=> (a = (a*1664525+1013904223)>>>0, (a>>>8)/16777216);
  const L:string[]=[]; for(let i=0;i<3;i++){ const x=(i%2?80+rnd()*18:rnd()*18).toFixed(2); const y=(rnd()*70+15).toFixed(2); const rx=90+rnd()*120, ry=60+rnd()*120; const a1=0.06+rnd()*0.06, a2=a1*0.5, s1=45+rnd()*10, s2=70+rnd()*12; L.push(`radial-gradient(${rx}px ${ry}px at ${x}% ${y}%, ${hexToRgba(base,a1)}, ${hexToRgba(base,a2)} ${s1}%, rgba(255,255,255,0) ${s2}%)`);} L.push(`linear-gradient(to bottom, ${hexToRgba(base,0.08)}, rgba(255,255,255,0.02))`); return L.join(','); };
function AgaveEdge(){
  const cfg = useMemo(() => { const W=600,H=14; let seed=0xa94f1c2b; const rnd=()=> (seed=(seed*1664525+1013904223)>>>0, (seed>>>8)/16777216); const mk=(dense:boolean)=>{ const arr:any[]=[]; let x=0; while(x<W){ const w=dense?(1+Math.floor(rnd()*2)):(2+Math.floor(rnd()*2)); const h=dense?(4+Math.floor(rnd()*5)):(8+Math.floor(rnd()*7)); const dir=rnd()<0.5?-1:1; const skew=dir*(dense?0.18*h:0.08*h); arr.push({x,w,h,skew}); x+=w; } return arr; }; return {back:mk(false),front:mk(true)}; },[]);
  const H = 14;
  return (
    <svg className="h-3 w-full" viewBox={`0 0 600 14`} preserveAspectRatio="none" aria-hidden>
      {cfg.back.map((p:any,i:number)=> <polygon key={`b-${i}`} fill="#fff" points={`${p.x},${H} ${p.x+p.w/2+p.skew},${Math.max(0,H-p.h)} ${p.x+p.w},${H}`} />)}
      {cfg.front.map((p:any,i:number)=> <polygon key={`f-${i}`} fill="#fff" points={`${p.x},${H} ${p.x+p.w/2+p.skew},${Math.max(0,H-p.h)} ${p.x+p.w},${H}`} />)}
    </svg>
  );
}

// ===== Tipos =====
export type Variant = "quick" | "editAccount" | "createAccount" | "createOrder";
type QuickMode = "interaction" | "order";

type QuickOrderPayload = { mode:"order"; accountId?:string; newAccount?: Partial<Account>; newParty?: Partial<Party>; items:{ sku:string; qty:number, lotNumber?: string }[]; note?:string; isVentaPropia: boolean; posTactic?: Partial<Omit<PosTactic, 'id' | 'items'>> & { items?: Partial<PosTacticItem>[] } };
type QuickInteractionPayload = { mode:"interaction"; accountId?:string; newAccount?: Partial<Account>; newParty?: Partial<Party>; kind:InteractionKind; note:string; nextAction?:string; posTactic?: Partial<Omit<PosTactic, 'id' | 'items'>> & { items?: Partial<PosTacticItem>[] } };

type EditAccountPayload = {
  id:string;
  name:string;
  city:string;
  type:AccountType;
  mainContactName?:string;
  mainContactEmail?:string;
  phone?:string;
  address?:string;
  billingEmail?:string;
};

type CreateAccountPayload = { name:string; city:string; type:AccountType; mainContactName?:string; mainContactEmail?:string };

type CreateOrderPayload = { accountId?:string; newAccount?: Partial<Account>; newParty?: Partial<Party>; requestedDate?:string; deliveryDate?:string; channel:AccountType; paymentTerms?:string; shipTo?:string; note?:string; items:{ sku:string; qty:number; unit:"uds", priceUnit: number, lotNumber?: string }[] };

// ===== UI Primitives =====
function Row({children, className}:{children:React.ReactNode, className?: string}){ return <div className={`flex flex-col gap-1 ${className || ''}`}>{children}</div>; }
function Label({children}:{children:React.ReactNode}){ return <label className="text-xs text-zinc-600">{children}</label>; }
function Input(props:React.InputHTMLAttributes<HTMLInputElement>){ return <input {...props} className={`w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm outline-none focus:ring-2 focus:ring-[#F7D15F] ${props.className||""}`}/>; }
function Select(props:React.SelectHTMLAttributes<HTMLSelectElement>){ return <select {...props} className={`w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm outline-none focus:ring-2 focus:ring-[#F7D15F] ${props.className||""}`}/>; }
function Textarea(props:React.TextareaHTMLAttributes<HTMLTextAreaElement>){ return <textarea {...props} className={`w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm outline-none focus:ring-2 focus:ring-[#F7D15F] ${props.className||""}`}/>; }

function Header({title, color="#A7D8D9", icon:Icon=ClipboardList}:{title:string;color?:string;icon?:any}){
  return (
    <div className="relative border-b" style={{background: waterHeader("modal:"+title, color), borderColor: hexToRgba(color,0.18)}}>
      <div className="px-4 py-2.5 text-sm font-medium text-zinc-800 flex items-center gap-2"><Icon className="sb-icon h-4 w-4"/>{title}</div>
      <div className="absolute left-0 right-0 -bottom-px"><AgaveEdge/></div>
    </div>
  );
}

// ===== Utils =====
function useDebounced<T>(value:T, delay=250){ const [v,setV]=useState(value); useEffect(()=>{ const id=setTimeout(()=>setV(value), delay); return ()=>clearTimeout(id); },[value,delay]); return v; }

// ===== Quick Interaction / Order (Switcher) =====
function QuickSwitcher({accounts, onSearchAccounts, onCreateAccount, onSubmit, onCancel}:{
  accounts: Account[];
  onSearchAccounts:(q:string, options: { signal: AbortSignal })=>Promise<Account[]>;
  onCreateAccount:(d:{name:string;city?:string;type?:AccountType})=>Promise<Account>;
  onSubmit:(p: QuickOrderPayload | QuickInteractionPayload)=>void;
  onCancel:()=>void;
}){
  const { currentUser, data: santaData } = useData();
  const [mode, setMode] = useState<QuickMode>("interaction");
  
  // State for the unified form
  const [accountName, setAccountName] = useState("");
  const [accountCity, setAccountCity] = useState("");
  const [billerId, setBillerId] = useState("SB");
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();
  
  const [searchSuggestions, setSearchSuggestions] = useState<Account[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const nameInputRef = useRef<HTMLDivElement>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchCache = useRef<Map<string, Account[]>>(new Map());

  
  // quick order state
  const [items, setItems] = useState<{sku:string; qty:number, lotNumber?: string }[]>([{sku:"SB-750", qty:1, lotNumber: ''}]);
  
  // quick interaction state
  const [interactionNote, setInteractionNote] = useState("");
  const [interactionDate, setInteractionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [interactionTime, setInteractionTime] = useState<string | null>(() => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  const [nextAction, setNextAction] = useState("");
  
  // POS Tactic State
  const [showPosTacticForm, setShowPosTacticForm] = useState(false);
  const [posTacticLines, setPosTacticLines] = useState<{ code: string; description: string }[]>([{ code: 'OTHER', description: '' }]);

  const debouncedName = useDebounced(accountName, 250);

  const distributors = useMemo(() => {
    if (!santaData) return [];
    const distRoles = (santaData.partyRoles || []).filter(r => r.role === 'DISTRIBUTOR');
    const distPartyIds = new Set(distRoles.map(r => r.partyId));
    return (santaData.parties || []).filter(p => distPartyIds.has(p.id));
  }, [santaData]);

    useEffect(() => {
    const run = async () => {
      if (debouncedName.length < 1 || selectedAccountId) {
        setSearchSuggestions([]);
        setIsSearchOpen(false);
        return;
      }

      searchAbortRef.current?.abort();
      const ac = new AbortController();
      searchAbortRef.current = ac;

      try {
        const key = debouncedName.toLowerCase();
        if (searchCache.current.has(key)) {
          setSearchSuggestions(searchCache.current.get(key)!);
          setIsSearchOpen(true);
          return;
        }

        setLoading(true);
        setIsSearchOpen(true);
        const results = await onSearchAccounts(debouncedName, { signal: ac.signal });
        if (!ac.signal.aborted) {
          searchCache.current.set(key, results);
          setSearchSuggestions(results);
        }
      } catch (e) {
        if ((e as any).name !== 'AbortError') console.error(e);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    };
    run();
    return () => searchAbortRef.current?.abort();
  }, [debouncedName, onSearchAccounts, selectedAccountId]);
  

  const handleAccountSelect = (account: Account) => {
    const party = santaData?.parties.find(p => p.id === account.partyId);
    const role = santaData?.partyRoles.find(pr => pr.partyId === account.partyId && pr.role === 'CUSTOMER');
    setAccountName(account.name);
    setAccountCity(party?.billingAddress?.city || "");
    setBillerId((role?.data as CustomerData)?.billerId || 'SB');
    setSelectedAccountId(account.id);
    setIsSearchOpen(false);
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setAccountName(e.target.value);
      if (selectedAccountId) {
          setSelectedAccountId(undefined);
          setAccountCity("");
          setBillerId("SB");
      }
  };

  useEffect(() => {
    const close = () => setIsSearchOpen(false);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    if (nameInputRef.current) {
        const handleClickOutside = (event: MouseEvent) => {
            if (nameInputRef.current && !nameInputRef.current.contains(event.target as Node)) {
                close();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', close);
            window.removeEventListener('scroll', close, true);
        };
    }
  }, []);

  function addOrderLine(){ setItems(v=>[...v,{sku:"SB-750", qty:1, lotNumber: ''}]); }
  function setOrderLine(i:number, patch:Partial<(typeof items)[0]>){ setItems(v=> v.map((it,idx)=> idx===i? {...it,...patch}: it)); }
  function removeOrderLine(i:number){ setItems(v=> v.filter((_,idx)=> idx!==i)); }
  
  function addPosTacticLine() { setPosTacticLines(p => [...p, { code: 'OTHER', description: '' }]) }
  function setPosTacticLine(i:number, patch: Partial<(typeof posTacticLines)[0]>) {
    setPosTacticLines(p => p.map((l, idx) => idx === i ? {...l, ...patch} : l));
  }
  function removePosTacticLine(i:number) { setPosTacticLines(p => p.filter((_, idx) => idx !== i)); }


  function submit(){
    let posPayload: Partial<Omit<PosTactic, 'id' | 'items'>> & { items?: Partial<PosTacticItem>[] } | undefined;
    if (showPosTacticForm) {
      posPayload = {
        tacticCode: 'MULTI',
        items: posTacticLines.filter(l => l.code && l.description).map(l => ({ catalogCode: l.code, description: l.description }))
      };
    }
    
    let newAccountPayload: Partial<Account> | undefined;
    let newPartyPayload: Partial<Party> | undefined;
    
    if(!selectedAccountId && accountName.trim()){
      const partyId = `party_${Date.now()}`;
      newPartyPayload = {
          id: partyId, name: accountName.trim(), legalName: accountName.trim(), kind: 'ORG',
          billingAddress: accountCity ? { city: accountCity, country: 'España'} : undefined,
          createdAt: new Date().toISOString(),
      };
      newAccountPayload = {
          id: `acc_${Date.now()}`, partyId, name: accountName.trim(), type: 'HORECA',
          stage: 'POTENCIAL', ownerId: currentUser?.id || 'u_admin', createdAt: new Date().toISOString(),
      };
    }

    if(mode==="order"){
      if(items.length===0 || items.some(it=>!it.sku || it.qty<=0)) return alert("Revisa las líneas del pedido");
      onSubmit({ mode:"order", accountId: selectedAccountId, newAccount: newAccountPayload, newParty: newPartyPayload, items, note: '', posTactic: posPayload, isVentaPropia: billerId === 'SB' });
    } else {
        if(!interactionNote) return alert("Añade un resumen de la interacción");
        const plannedFor = interactionDate && interactionTime
            ? new Date(`${interactionDate}T${interactionTime}`).toISOString()
            : interactionDate ? new Date(interactionDate).toISOString() : undefined;
        onSubmit({ mode:"interaction", accountId: selectedAccountId, newAccount: newAccountPayload, newParty: newPartyPayload, kind: 'OTRO', note: interactionNote, nextAction: nextAction || undefined, posTactic: posPayload, plannedFor });
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) setIsSearchOpen(true);
    if (e.key === 'ArrowDown') setActiveIdx(i => Math.min(i + 1, searchSuggestions.length - 1));
    if (e.key === 'ArrowUp') setActiveIdx(i => Math.max(i - 1, -1));
    if (e.key === 'Escape') setIsSearchOpen(false);
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && searchSuggestions[activeIdx]) {
        handleAccountSelect(searchSuggestions[activeIdx]);
      } else if (!selectedAccountId && accountName.trim()) {
        setIsSearchOpen(false);
      }
    }
  };
  
  const availableInventory = useMemo(() => (santaData?.inventory || []).filter(i => i.locationId && i.locationId.startsWith('FG/')), [santaData]);

  const posTacticSection = (
    <div className="pt-2">
      {!showPosTacticForm ? (
          <button type="button" onClick={() => setShowPosTacticForm(true)} className="w-full text-sm flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed hover:bg-yellow-50">
              <Star size={16} className="text-yellow-500" />
              Añadir Táctica POS
          </button>
      ) : (
        <div className="p-3 border rounded-lg bg-zinc-50 space-y-3">
           <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">Detalles de Táctica POS</h4>
              <button type="button" onClick={() => setShowPosTacticForm(false)} className="text-xs text-zinc-500 hover:text-zinc-800">Cancelar</button>
           </div>
           
           <div className="space-y-2">
                {posTacticLines.map((line, i) => (
                    <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
                        <Select value={line.code} onChange={e => setPosTacticLine(i, { code: e.target.value })}>
                            {(santaData?.posCostCatalog || []).map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                            <option value="OTHER">Otro</option>
                        </Select>
                        <Input value={line.description} onChange={e => setPosTacticLine(i, { description: e.target.value })} placeholder="Descripción..."/>
                        <button type="button" onClick={() => removePosTacticLine(i)} className="p-1 text-red-500 hover:bg-red-50 rounded-md">
                            <X size={14}/>
                        </button>
                    </div>
                ))}
           </div>
           <button type="button" onClick={addPosTacticLine} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <Plus size={12}/>Añadir Táctica
           </button>
        </div>
      )}
    </div>
  );

  const setQuickDate = (preset: 'now' | 'hour' | 'day') => {
    const d = new Date();
    if(preset === 'hour') d.setHours(d.getHours() - 1);
    if(preset === 'day') d.setDate(d.getDate() - 1);
    setInteractionDate(d.toISOString().slice(0, 10));
    setInteractionTime(d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <button onClick={()=>setMode("interaction")} className={`px-3 py-1.5 rounded-lg border ${mode==="interaction"?"bg-white border-zinc-300":"border-zinc-200 hover:bg-zinc-50"}`}><MessageSquare className="h-4 w-4 inline mr-1"/> Interacción</button>
        <button onClick={()=>setMode("order")} className={`px-3 py-1.5 rounded-lg border ${mode==="order"?"bg-white border-zinc-300":"border-zinc-200 hover:bg-zinc-50"}`}><Zap className="h-4 w-4 inline mr-1"/> Pedido rápido</button>
      </div>
      
      <div className="border border-zinc-200 rounded-xl p-3 bg-white space-y-3">
        <div className="text-xs text-zinc-500 uppercase font-semibold">Cuenta</div>
        <div className="relative" ref={nameInputRef}>
            <Row>
              <Label>Nombre</Label>
              <Input 
                value={accountName} 
                onChange={handleNameChange} 
                onKeyDown={handleKeyDown} 
                onFocus={() => { if (accountName && !selectedAccountId) setIsSearchOpen(true); }}
                placeholder="Buscar o crear cuenta..."
              />
            </Row>
            {isSearchOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
                {loading ? <div className="px-3 py-2 text-sm text-zinc-500">Buscando...</div> :
                searchSuggestions.length > 0 ? (
                  <ul className="max-h-40 overflow-y-auto divide-y">
                    {searchSuggestions.map((account, i) => (
                      <li key={account.id} onClick={() => handleAccountSelect(account)} className={`px-3 py-2 text-sm hover:bg-zinc-50 cursor-pointer ${i === activeIdx ? 'bg-zinc-50' : ''}`}>
                        {account.name}
                      </li>
                    ))}
                  </ul>
                ) : debouncedName ? (
                    <div className="px-3 py-2 text-sm text-zinc-600">
                        Sin resultados. Pulsa ↵ para crear “<strong>{debouncedName}</strong>”.
                    </div>
                ) : null}
              </div>
            )}
        </div>
        <div className="grid grid-cols-2 gap-3">
            <Row><Label>Ciudad</Label><Input value={accountCity} onChange={e=>setAccountCity(e.target.value)} /></Row>
            <Row>
              <Label>Canal de Venta / Facturador</Label>
              <Select value={billerId} onChange={e => setBillerId(e.target.value)}>
                <option value="SB">Venta Propia (Santa Brisa)</option>
                {distributors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </Row>
        </div>
      </div>

      {mode==="order" ? (
         <Row>
            <Label>Pedido Rápido</Label>
            <div className="border rounded-xl p-2 space-y-2">
                <div className="grid grid-cols-[2fr_1fr_auto] gap-2 items-center">
                    <Select value={items[0].sku} onChange={e => setOrderLine(0, { sku: e.target.value })}>
                        <option value="">Producto...</option>
                        {(santaData?.products || []).filter(p => p.category === 'finished_good').map(p => (
                            <option key={p.sku} value={p.sku}>{p.name}</option>
                        ))}
                    </Select>
                    <Input type="number" min="1" value={items[0].qty} onChange={e=>setOrderLine(0,{qty: Number(e.target.value)})}/>
                    <Select value={items[0].lotNumber || ''} onChange={e => setOrderLine(0, { lotNumber: e.target.value })}>
                        <option value="">Lote...</option>
                        {availableInventory.filter(i => i.sku === items[0].sku).map(i => (
                            <option key={i.lotNumber} value={i.lotNumber}>{i.lotNumber} ({i.qty} uds)</option>
                        ))}
                    </Select>
                </div>
            </div>
          </Row>
      ) : (
        <div className="space-y-3">
            <Row>
              <Label>Fecha y Hora</Label>
              <div className="flex gap-2">
                <Input type="date" value={interactionDate} onChange={e => setInteractionDate(e.target.value)} className="flex-1"/>
                <TimePicker value={interactionTime} onChange={setInteractionTime} step={5} className="flex-1"/>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <button type="button" onClick={() => setQuickDate('now')} className="text-xs px-2 py-1 rounded-md border bg-zinc-100 hover:bg-zinc-200">Ahora</button>
                <button type="button" onClick={() => setQuickDate('hour')} className="text-xs px-2 py-1 rounded-md border bg-zinc-100 hover:bg-zinc-200">Hace 1h</button>
                <button type="button" onClick={() => setQuickDate('day')} className="text-xs px-2 py-1 rounded-md border bg-zinc-100 hover:bg-zinc-200">Ayer</button>
              </div>
            </Row>
            <Row><Label>Resumen</Label>
                <Textarea rows={3} placeholder="¿Qué ha pasado? ¿De qué se ha hablado?" value={interactionNote} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)=>setInteractionNote(e.target.value)}/>
            </Row>
             <Row><Label>Próxima Acción (opcional)</Label>
                <Input placeholder="Ej. Enviar propuesta, volver a llamar en 7 días..." value={nextAction} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setNextAction(e.target.value)}/>
            </Row>
        </div>
      )}
      
      {posTacticSection}

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-2 text-sm rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50">Cancelar</button>
        <button onClick={submit} className="px-3 py-2 text-sm rounded-lg bg-sb-sun text-zinc-900 hover:brightness-110">Guardar</button>
      </div>
    </div>
  );
}

// ===== Edit Account =====
function EditAccountForm({defaults, onSubmit, onCancel}:{
  defaults: EditAccountPayload;
  onSubmit:(p:EditAccountPayload)=>void;
  onCancel:()=>void;
}){
  const [form, setForm] = useState<EditAccountPayload>(defaults);
  function set<K extends keyof EditAccountPayload>(k:K, v:EditAccountPayload[K]){ setForm(f=>({...f,[k]:v})); }
  function submit(){ if(!form.name) return alert("Falta el nombre"); if(!form.city) return alert("Falta la ciudad"); onSubmit(form); }
  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Row><Label>Nombre</Label><Input value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>set("name", e.target.value)} /></Row>
        <Row><Label>Ciudad</Label><Input value={form.city} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>set("city", e.target.value)} /></Row>
      </div>
      <Row><Label>Dirección</Label><Input value={form.address||""} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>set("address", e.target.value)} placeholder="Calle, número, piso..."/></Row>
      <div className="grid grid-cols-2 gap-3">
        <Row><Label>Tipo</Label>
          <Select value={form.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>set("type", e.target.value as AccountType)}>
            <option>HORECA</option><option>RETAIL</option><option>DISTRIBUIDOR</option><option>ONLINE</option><option>OTRO</option>
          </Select>
        </Row>
        <Row><Label>Teléfono</Label><Input value={form.phone||""} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>set("phone", e.target.value)} placeholder="+34..."/></Row>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Row><Label>Contacto Principal</Label><Input value={form.mainContactName||""} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>set("mainContactName", e.target.value)} placeholder="Nombre del contacto"/></Row>
        <Row><Label>Email Contacto</Label><Input type="email" value={form.mainContactEmail||""} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>set("mainContactEmail", e.target.value)} placeholder="email@dominio.com"/></Row>
      </div>
       <Row><Label>Email Facturación</Label><Input type="email" value={form.billingEmail||""} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>set("billingEmail", e.target.value)} placeholder="facturacion@dominio.com"/></Row>

      <div className="flex justify-between items-center pt-1">
        <div className="text-[11px] text-zinc-500">ID: <code>{form.id}</code></div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-2 text-sm rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50">Cancelar</button>
          <button onClick={submit} className="px-3 py-2 text-sm rounded-lg bg-sb-sun text-zinc-900 hover:brightness-110"><Save className="h-4 w-4 inline mr-1"/>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ===== Create Account (full) =====
function CreateAccountForm({onSubmit, onCancel}:{ onSubmit:(p:CreateAccountPayload)=>void; onCancel:()=>void; }){
  const [form, setForm] = useState<CreateAccountPayload>({ name:"", city:"", type:"HORECA", mainContactName:"", mainContactEmail:"" });
  function set<K extends keyof CreateAccountPayload>(k:K, v:CreateAccountPayload[K]){ setForm(f=>({...f,[k]:v})); }
  function submit(){ if(!form.name) return alert("Falta el nombre"); if(!form.city) return alert("Falta la ciudad"); onSubmit(form); }
  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Row><Label>Nombre</Label><Input value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>set("name", e.target.value)} placeholder="Ej. Bar Pepe"/></Row>
        <Row><Label>Ciudad</Label><Input value={form.city} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>set("city", e.target.value)} placeholder="Ej. Barcelona"/></Row>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Row><Label>Tipo</Label>
          <Select value={form.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>set("type", e.target.value as AccountType)}>
            <option>HORECA</option><option>RETAIL</option><option>DISTRIBUIDOR</option><option>ONLINE</option><option>OTRO</option>
          </Select>
        </Row>
        <Row><Label>Contacto principal</Label><Input value={form.mainContactName||""} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>set("mainContactName", e.target.value)} /></Row>
      </div>
      <Row><Label>Email contacto</Label><Input type="email" value={form.mainContactEmail||""} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>set("mainContactEmail", e.target.value)} placeholder="ana@bar.com"/></Row>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-2 text-sm rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50">Cancelar</button>
        <button onClick={submit} className="px-3 py-2 text-sm rounded-lg bg-sb-sun text-zinc-900 hover:brightness-110">Crear cuenta</button>
      </div>
    </div>
  );
}

// ===== Create Order (full) =====
export function CreateOrderForm({accounts, onSearchAccounts, onCreateAccount, onSubmit, onCancel, defaults}: {
  accounts: Account[];
  onSearchAccounts:(q:string, options: { signal: AbortSignal })=>Promise<Account[]>;
  onCreateAccount:(d:{name:string;city?:string;type?:AccountType})=>Promise<Account>;
  onSubmit:(p:CreateOrderPayload)=>void;
  onCancel:()=>void;
  defaults?: any;
}){
  const { data: santaData } = useData();
  const [accountId, setAccountId] = useState(defaults?.accountId || "");
  const [newAccountData, setNewAccountData] = useState<{account: Partial<Account>, party: Partial<Party>} | null>(null);

  const [note, setNote] = useState(defaults?.note || "");
  const [requestedDate, setRequestedDate] = useState(new Date().toISOString().slice(0,16));
  const [deliveryDate, setDeliveryDate] = useState("");
  const [channel, setChannel] = useState<CreateOrderPayload["channel"]>("HORECA");
  const [paymentTerms, setTerms] = useState("Contado");
  const [shipTo, setShipTo] = useState("");
  const [items, setItems] = useState<CreateOrderPayload["items"]>(defaults?.items || [{sku:"SB-750", qty:1, unit:"uds", priceUnit: 12, lotNumber: ''}]);
  
  const availableInventory = useMemo(() => (santaData?.inventory || []).filter(i => i.locationId && i.locationId.startsWith('FG/')), [santaData]);
  
  const handleAccountChange = (id?: string, newAccount?: Partial<Account>, newParty?: Partial<Party>) => {
    if (newAccount && newParty) {
        setNewAccountData({ account: newAccount, party: newParty });
        setAccountId("");
    } else {
        setAccountId(id || "");
        setNewAccountData(null);
    }
  };


  function addLine(){ setItems(v=>[...v,{sku:"", qty:1, unit:"uds", priceUnit: 0, lotNumber: ''}]); }
  function setLine(i:number, patch:Partial<CreateOrderPayload["items"][number]>){
    const newItems = items.map((it,idx)=> idx===i? {...it,...patch}: it);
    if(patch.sku) {
        newItems[i].priceUnit = 0;
    }
    setItems(newItems);
  }
  function removeLine(i:number){ setItems(v=> v.filter((_,idx)=> idx!==i)); }
  function submit(){ 
      if(!accountId && !newAccountData) return alert("Selecciona una cuenta"); 
      if(items.length===0 || items.some(it=>!it.sku || it.qty<=0)) return alert("Revisa las líneas"); 
      
      const payload: CreateOrderPayload = {
          accountId: accountId || undefined,
          newAccount: newAccountData?.account,
          newParty: newAccountData?.party,
          requestedDate,
          deliveryDate: deliveryDate||undefined,
          channel,
          paymentTerms,
          shipTo: shipTo||undefined,
          note,
          items
      };
      onSubmit(payload);
  }
  
  const orderTotal = useMemo(() => items.reduce((total, item) => total + (item.qty * item.priceUnit), 0), [items]);

  return (
    <div className="p-4 space-y-3">
       {/* AccountPicker is not used here, the parent modal handles the account selection */}
      <div className="grid grid-cols-2 gap-3">
        <Row><Label>Fecha pedido</Label><Input type="datetime-local" value={requestedDate} onChange={e=>setRequestedDate(e.target.value)}/></Row>
        <Row><Label>Entrega deseada</Label><Input type="datetime-local" value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)}/></Row>
        <Row><Label>Tipo de Cuenta</Label>
          <Select value={channel} onChange={e=>setChannel(e.target.value as any)}>
            <option value="HORECA">HORECA</option><option value="RETAIL">RETAIL</option><option value="DISTRIBUIDOR">Distribuidor</option><option value="ONLINE">Online</option><option value="OTRO">Otro</option>
          </Select>
        </Row>
        <Row><Label>Condiciones pago</Label><Input value={paymentTerms} onChange={e=>setTerms(e.target.value)} placeholder="Contado / 30d / 60d"/></Row>
        <Row className="col-span-2"><Label>Dirección envío</Label><Input value={shipTo} onChange={e=>setShipTo(e.target.value)} placeholder="Calle, ciudad…"/></Row>
      </div>
      <div className="rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-3 py-2 text-xs uppercase tracking-wide text-zinc-500 border-b bg-zinc-50">Líneas</div>
        {items.map((it,i)=> {
            const lotsForSku = availableInventory.filter(inv => inv.sku === it.sku);
            return (
              <div key={i} className="grid grid-cols-[2fr_1.5fr_1fr_0.5fr_1fr_1fr_40px] gap-2 items-center px-3 py-2 border-b last:border-b-0">
                <Select value={it.sku} onChange={e => setLine(i, { sku: e.target.value })}>
                    <option value="">Seleccionar producto...</option>
                    {santaData?.products.filter(p => p.category === 'finished_good').map(p => (
                        <option key={p.sku} value={p.sku}>{p.name}</option>
                    ))}
                </Select>
                <Select value={it.lotNumber || ''} onChange={e => setLine(i, { lotNumber: e.target.value })}>
                    <option value="">Seleccionar lote...</option>
                    {lotsForSku.map(lot => (
                        <option key={lot.lotNumber} value={lot.lotNumber || ''}>
                            {lot.lotNumber} ({lot.qty} uds)
                        </option>
                    ))}
                </Select>
                <Input type="number" min={1} value={it.qty} onChange={e=>setLine(i,{qty: Number(e.target.value)})}/>
                <Select value={it.unit} onChange={e=>setLine(i,{unit:e.target.value as any})}>
                  <option value="uds">uds</option>
                </Select>
                <Input type="number" value={it.priceUnit} onChange={e=>setLine(i, {priceUnit: Number(e.target.value)})} placeholder="Precio Unit."/>
                <div className="text-right font-medium pr-2">{(it.qty * it.priceUnit).toFixed(2)}€</div>
                <button onClick={()=>removeLine(i)} className="p-2 rounded-md hover:bg-zinc-100" aria-label="Eliminar"><X className="h-4 w-4"/></button>
              </div>
            )
        })}
        <div className="px-3 py-2 flex justify-between items-center bg-zinc-50">
            <button onClick={addLine} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-zinc-300 bg-white hover:bg-zinc-50"><Plus className="h-3.5 w-3.5"/>Añadir línea</button>
            <div className="text-right font-bold">Total: {orderTotal.toFixed(2)}€</div>
        </div>
      </div>
      <Row><Label>Notas</Label><Textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} /></Row>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-2 text-sm rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50">Cancelar</button>
        <button onClick={submit} className="px-3 py-2 text-sm rounded-lg bg-sb-sun text-zinc-900 hover:brightness-110">Crear pedido</button>
      </div>
    </div>
  );
}

// ===== Modal base =====
export function BaseModal({open, onClose, color="#A7D8D9", title, icon:Icon=ClipboardList, children}:{open:boolean; onClose:()=>void; color?:string; title:string; icon?:any; children:React.ReactNode}){
  if(!open) return null;
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
        <div className="absolute inset-0" onClick={onClose}/>
        <motion.div role="dialog" aria-modal="true" aria-labelledby="sb-modal-title"
          initial={{opacity:0, y:12, scale:0.98}} animate={{opacity:1, y:0, scale:1}} exit={{opacity:0, y:12, scale:0.98}}
          transition={{type:"spring", stiffness:260, damping:22}}
          className="relative w-[95vw] max-w-2xl h-[85vh] rounded-2xl border border-zinc-200 bg-white shadow-xl overflow-hidden flex flex-col">
          <Header title={title} color={color} icon={Icon}/>
          <div className="absolute right-2 top-2 z-10"><button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-100" aria-label="Cerrar"><X className="h-4 w-4"/></button></div>
          <div className="flex-grow overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ===== Orquestador: SBFlowModal =====
export function SBFlowModal({
  open,
  variant,
  onClose,
  accounts,
  onSearchAccounts,
  onCreateAccount,
  defaults,
  onSubmit
}:{
  open:boolean;
  variant: Variant;
  onClose:()=>void;
  accounts: Account[];
  onSearchAccounts:(q:string, options: { signal: AbortSignal })=>Promise<Account[]>;
  onCreateAccount:(d:{name:string;city?:string;type?:AccountType})=>Promise<Account>;
  defaults?: any;
  onSubmit:(payload:any)=>void; // (en real tipa por variante)
}){
  if(!open) return null;
  if(variant==="quick"){
    return (
      <div className="w-full h-full rounded-2xl flex flex-col">
        <div className="flex-grow overflow-y-auto">
          <QuickSwitcher accounts={accounts} onSearchAccounts={onSearchAccounts} onCreateAccount={onCreateAccount} onCancel={onClose} onSubmit={(p)=>{ onSubmit(p); }}/>
        </div>
      </div>
    );
  }
  if(variant==="editAccount"){
    return (
      <BaseModal open title="Editar cuenta" color={SB_COLORS.primary.sun} icon={Pencil} onClose={onClose}>
        <EditAccountForm defaults={defaults} onCancel={onClose} onSubmit={(p)=>{ onSubmit(p); }}/>
      </BaseModal>
    );
  }
  if(variant==="createAccount"){
    return (
      <BaseModal open title="Nueva cuenta" color={SB_COLORS.primary.sun} icon={UserPlus2} onClose={onClose}>
        <CreateAccountForm onCancel={onClose} onSubmit={(p)=>{ onSubmit(p); }}/>
      </BaseModal>
    );
  }
  // createOrder (full)
  return (
    <BaseModal open title="Crear pedido" color={SB_COLORS.primary.copper} icon={Briefcase} onClose={onClose}>
      <CreateOrderForm accounts={accounts} onSearchAccounts={onSearchAccounts} onCreateAccount={onCreateAccount} onCancel={onClose} onSubmit={(p)=>{ onSubmit(p); }} defaults={defaults}/>
    </BaseModal>
  );
}
