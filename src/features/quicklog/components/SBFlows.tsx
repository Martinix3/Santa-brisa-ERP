
// src/features/quicklog/components/SBFlows.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, CalendarDays, ClipboardList, UserPlus2, Briefcase, Search, Check, MapPin, Pencil, Save, MessageSquare, Zap, Mail, Phone, History, ShoppingCart, Building, CreditCard, Star } from "lucide-react";
import { useData } from "@/lib/dataprovider";
import { generateNextOrder } from '@/lib/codes';
import type { AccountType, Account, OrderSellOut, Product, Party, SB_THEME, InteractionKind, PosTactic } from '@/domain/ssot';
import { SB_COLORS } from "@/domain/ssot";

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

type QuickOrderPayload = { mode:"order"; account?:string; newAccount?: Partial<Account>; newParty?: Partial<Party>; items:{ sku:string; qty:number }[]; note?:string; isVentaPropia: boolean; posTactic?: Partial<Omit<PosTactic, 'id' | 'items'>> };
type QuickInteractionPayload = { mode:"interaction"; account?:string; newAccount?: Partial<Account>; newParty?: Partial<Party>; kind:InteractionKind; note:string; nextAction?:string; posTactic?: Partial<Omit<PosTactic, 'id' | 'items'>> };

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

type CreateOrderPayload = { account?:string; newAccount?: Partial<Account>; newParty?: Partial<Party>; requestedDate?:string; deliveryDate?:string; channel:AccountType; paymentTerms?:string; shipTo?:string; note?:string; items:{ sku:string; qty:number; unit:"uds", priceUnit: number, lotNumber?: string }[] };

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

// ===== AccountPicker (search + inline create + "dejar para más tarde") =====
// Este componente ya no se usa, pero lo mantenemos por si se necesita en otro sitio.
function AccountPicker({
  value,
  onChange,
  accounts,
  onSearchAccounts,
  onCreateAccount,
  allowDefer=false,
  placeholder="Ej. Bar Pepe",
}:{
  value:string;
  onChange:(v:string, newAccount?:Partial<Account>, newParty?:Partial<Party>)=>void;
  accounts?: Account[];
  onSearchAccounts?: (q:string)=>Promise<Account[]>;
  onCreateAccount?: (data:{name:string; city?:string; type?:AccountType})=>Promise<Account>;
  allowDefer?: boolean;
  placeholder?: string;
}){
  const { currentUser, data: santaData } = useData();
  const [q, setQ] = useState(value);
  const [list, setList] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"search"|"create">("search");
  const [newName,setNewName] = useState("");
  const [newCity,setNewCity] = useState("");
  const [newType,setNewType] = useState<AccountType>("HORECA");
  const debounced = useDebounced(q, 250);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ setQ(value); },[value]);
  
  useEffect(()=>{
    const handler = async()=>{
      if(!debounced){ 
        setList([]);
        return; 
      }
      setLoading(true);
      let results: Account[] = [];
      const norm = (s:string)=> s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
      try{
        if(onSearchAccounts){ results = await onSearchAccounts(debounced); }
        else if(accounts){ const nq = norm(debounced); results = accounts.filter(a => norm(a.name).includes(nq)).slice(0,8); }
      } finally{ 
        setLoading(false); 
        setList(results||[]);
        if (results.length === 0 && debounced) {
            setMode("create");
            setNewName(debounced);
        } else {
            setMode("search");
        }
      }
    };
    handler();
  },[debounced, onSearchAccounts, accounts]);

  useEffect(()=>{ const onDocClick=(e:MouseEvent)=>{ if(!boxRef.current) return; if(!boxRef.current.contains(e.target as any)) setOpen(false); }; document.addEventListener('mousedown', onDocClick); return ()=> document.removeEventListener('mousedown', onDocClick); },[]);

  async function createInline(){
    const name = newName || q.trim(); if(!name) return alert("Pon un nombre");
    if(onCreateAccount){
        const partyId = `party_${Date.now()}`;
        const accountId = `acc_${Date.now()}`;

        const newParty: Partial<Party> = {
            id: partyId, name, kind: 'ORG',
            addresses: newCity ? [{type: 'main', street: '', city: newCity, country: 'España', postalCode: ''}] : [],
            contacts: [], createdAt: new Date().toISOString(),
        };

        const newAccount: Partial<Account> = {
            id: accountId, partyId: partyId, name, type: newType,
            stage: 'POTENCIAL', ownerId: currentUser?.id || 'u_admin',
            createdAt: new Date().toISOString(),
        };

        onChange('__internal_new_account', newAccount, newParty);
    }
    setMode("search"); setQ(name); setOpen(false);
  }

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2"/>
        <input value={q} onChange={(e)=>{ setQ(e.target.value); onChange(""); setOpen(true); }} onFocus={()=>setOpen(true)} placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm outline-none focus:ring-2 focus:ring-[#F7D15F]"/>
      </div>
      {/* ... (resto del componente AccountPicker que no usaremos en el nuevo flujo) ... */}
    </div>
  );
}

const TACTIC_CODES = [
    "ICE_BUCKET", "GLASSWARE", "BARTENDER_INCENTIVE", "MENU_PLACEMENT",
    "CHALKBOARD", "TWO_FOR_ONE", "HAPPY_HOUR", "SECONDARY_PLACEMENT", "OTHER"
];


// ===== Quick Interaction / Order (Switcher) =====
function QuickSwitcher({accounts, onSearchAccounts, onCreateAccount, onSubmit, onCancel}:{
  accounts: Account[];
  onSearchAccounts:(q:string)=>Promise<Account[]>;
  onCreateAccount:(d:{name:string;city?:string;type?:AccountType})=>Promise<Account>;
  onSubmit:(p: QuickOrderPayload | QuickInteractionPayload)=>void;
  onCancel:()=>void;
}){
  const { currentUser, data: santaData } = useData();
  const [mode, setMode] = useState<QuickMode>("interaction");
  
  // State for the unified form
  const [accountName, setAccountName] = useState("");
  const [accountCity, setAccountCity] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("HORECA");
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();
  const [searchSuggestions, setSearchSuggestions] = useState<Account[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const nameInputRef = useRef<HTMLDivElement>(null);
  
  // quick order state
  const [items, setItems] = useState<{sku:string; qty:number}[]>([{sku:"SB-750", qty:1}]);
  const [orderNote, setOrderNote] = useState("");
  const [isVentaPropia, setIsVentaPropia] = useState(true);
  
  // quick interaction state
  const [interactionNote, setInteractionNote] = useState("");
  const [nextAction, setNextAction] = useState("");
  
  // POS Tactic State
  const [showPosTacticForm, setShowPosTacticForm] = useState(false);
  const [posTacticData, setPosTacticData] = useState<Partial<Omit<PosTactic, 'id' | 'items'>>>({ tacticCode: 'OTHER', status: 'planned', actualCost: 0 });

  const debouncedName = useDebounced(accountName, 250);

  useEffect(() => {
    const handleSearch = async () => {
      if (debouncedName.length > 1 && !selectedAccountId) {
        const results = await onSearchAccounts(debouncedName);
        setSearchSuggestions(results);
        setIsSearchOpen(results.length > 0);
      } else {
        setSearchSuggestions([]);
        setIsSearchOpen(false);
      }
    };
    handleSearch();
  }, [debouncedName, onSearchAccounts, selectedAccountId]);

  const handleAccountSelect = (account: Account) => {
    const party = santaData?.parties.find(p => p.id === account.partyId);
    setAccountName(account.name);
    setAccountCity(party?.billingAddress?.city || "");
    setAccountType(account.type);
    setSelectedAccountId(account.id);
    setIsSearchOpen(false);
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setAccountName(e.target.value);
      // Si el usuario modifica el nombre, reseteamos la cuenta seleccionada.
      if (selectedAccountId) {
          setSelectedAccountId(undefined);
          setAccountCity("");
          setAccountType("HORECA");
      }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nameInputRef.current && !nameInputRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function addLine(){ setItems(v=>[...v,{sku:"SB-750", qty:1}]); }
  function setLine(i:number, patch:Partial<{sku:string; qty:number}>){ setItems(v=> v.map((it,idx)=> idx===i? {...it,...patch}: it)); }
  function removeLine(i:number){ setItems(v=> v.filter((_,idx)=> idx!==i)); }

  function submit(){
    let posPayload: Partial<Omit<PosTactic, 'id' | 'items'>> | undefined = undefined;
    if (showPosTacticForm && posTacticData.tacticCode && posTacticData.actualCost !== undefined && posTacticData.actualCost > 0) {
      posPayload = {
        ...posTacticData,
        status: 'active',
        executionScore: 80, // Default value
      };
    }
    
    let newAccountPayload: Partial<Account> | undefined;
    let newPartyPayload: Partial<Party> | undefined;
    
    if(!selectedAccountId && accountName.trim()){
      const partyId = `party_${Date.now()}`;
      newPartyPayload = {
          id: partyId, name: accountName.trim(), kind: 'ORG',
          addresses: accountCity ? [{type: 'main', street: '', city: accountCity, country: 'España', postalCode: ''}] : [],
          contacts: [], createdAt: new Date().toISOString(),
      };
      newAccountPayload = {
          id: `acc_${Date.now()}`, partyId, name: accountName.trim(), type: accountType,
          stage: 'POTENCIAL', ownerId: currentUser?.id || 'u_admin', createdAt: new Date().toISOString(),
      };
    }


    if(mode==="order"){
      if(items.length===0 || items.some(it=>!it.sku || it.qty<=0)) return alert("Revisa las líneas del pedido");
      onSubmit({ mode:"order", account: selectedAccountId ? accountName : undefined, newAccount: newAccountPayload, newParty: newPartyPayload, items, note: orderNote, isVentaPropia, posTactic: posPayload });
    } else {
      if(!interactionNote) return alert("Añade un resumen de la interacción");
      onSubmit({ mode:"interaction", account: selectedAccountId ? accountName : undefined, newAccount: newAccountPayload, newParty: newPartyPayload, kind: 'OTRO', note: interactionNote, nextAction: nextAction || undefined, posTactic: posPayload });
    }
  }

  const posTacticSection = (
    <div className="pt-2">
      {!showPosTacticForm ? (
          <button type="button" onClick={() => setShowPosTacticForm(true)} className="w-full text-sm flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed hover:bg-yellow-50">
              <Star size={16} className="text-yellow-500" />
              Añadir Táctica POS a esta entrada
          </button>
      ) : (
        <div className="p-3 border rounded-lg bg-zinc-50 space-y-3">
           <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">Detalles de Táctica POS</h4>
              <button type="button" onClick={() => setShowPosTacticForm(false)} className="text-xs text-zinc-500 hover:text-zinc-800">Cancelar</button>
           </div>
           <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1.5"><span className="text-xs font-medium">Táctica</span>
                  <Select value={posTacticData.tacticCode || ''} onChange={e => setPosTacticData(p => ({...p, tacticCode: e.target.value}))} className="h-9">
                    {TACTIC_CODES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                  </Select>
              </label>
              <label className="grid gap-1.5"><span className="text-xs font-medium">Coste Total (€)</span>
                  <Input type="number" min="0" value={posTacticData.actualCost ?? ''} onChange={e => setPosTacticData(p => ({...p, actualCost: Number(e.target.value)}))} className="h-9"/>
              </label>
           </div>
           {posTacticData.tacticCode === 'OTHER' && (
              <label className="grid gap-1.5"><span className="text-xs font-medium">Descripción (si es "OTRO")</span>
                  <Input value={posTacticData.description ?? ''} onChange={e => setPosTacticData(p => ({...p, description: e.target.value}))} className="h-9"/>
              </label>
           )}
        </div>
      )}
    </div>
  );

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
              <Input value={accountName} onChange={handleNameChange} placeholder="Buscar o crear cuenta..." />
            </Row>
            {isSearchOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
                <ul className="max-h-40 overflow-y-auto divide-y">
                  {searchSuggestions.map(account => (
                    <li key={account.id} onClick={() => handleAccountSelect(account)} className="px-3 py-2 text-sm hover:bg-zinc-50 cursor-pointer">
                      {account.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
        <div className="grid grid-cols-2 gap-3">
            <Row><Label>Ciudad</Label><Input value={accountCity} onChange={e=>setAccountCity(e.target.value)} /></Row>
            <Row><Label>Tipo</Label>
                <Select value={accountType} onChange={e=>setAccountType(e.target.value as AccountType)}>
                    <option>HORECA</option><option>RETAIL</option><option>DISTRIBUIDOR</option><option>ONLINE</option><option>OTRO</option>
                </Select>
            </Row>
        </div>
      </div>

      {mode==="order" ? (
        <>
            <div className="rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-3 py-2 text-xs uppercase tracking-wide text-zinc-500 border-b bg-zinc-50">Líneas (rápido)</div>
            {items.map((it,i)=> (
                <div key={i} className="grid grid-cols-[1.2fr_0.6fr_40px] gap-2 items-center px-3 py-2 border-b last:border-b-0">
                <Input placeholder="SKU" value={it.sku} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setLine(i,{sku:e.target.value})}/>
                <Input type="number" min={1} value={it.qty} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setLine(i,{qty: Number(e.target.value)})}/>
                <button onClick={()=>removeLine(i)} className="p-2 rounded-md hover:bg-zinc-100" aria-label="Eliminar"><X className="h-4 w-4"/></button>
                </div>
            ))}
            <div className="px-3 py-2 flex justify-between items-center">
                <button onClick={addLine} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-zinc-300 bg-white hover:bg-zinc-50"><Plus className="h-3.5 w-3.5"/>Añadir línea</button>
                <div className="w-1/2"><Input placeholder="Nota opcional" value={orderNote} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setOrderNote(e.target.value)}/></div>
            </div>
            </div>
            <div className="flex items-center gap-2">
                <input type="checkbox" id="venta-propia-check" checked={isVentaPropia} onChange={(e) => setIsVentaPropia(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"/>
                <label htmlFor="venta-propia-check" className="text-sm font-medium text-gray-700">Es Venta Propia (factura Santa Brisa)</label>
            </div>
        </>
      ) : (
        <div className="space-y-3">
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
  onSearchAccounts:(q:string)=>Promise<Account[]>;
  onCreateAccount:(d:{name:string;city?:string;type?:AccountType})=>Promise<Account>;
  onSubmit:(p:CreateOrderPayload)=>void;
  onCancel:()=>void;
  defaults?: any;
}){
  const { data: santaData } = useData();
  const [accountName, setAccountName] = useState(defaults?.account || "");
  const [newAccountData, setNewAccountData] = useState<{account: Partial<Account>, party: Partial<Party>} | null>(null);

  const handleAccountChange = (value: string, newAccount?: Partial<Account>, newParty?: Partial<Party>) => {
    if (value === '__internal_new_account' && newAccount && newParty) {
        setNewAccountData({ account: newAccount, party: newParty });
        setAccountName(newAccount.name!);
    } else {
        setAccountName(value);
        setNewAccountData(null);
    }
  };

  const [note, setNote] = useState(defaults?.note || "");
  const [requestedDate, setRequestedDate] = useState(new Date().toISOString().slice(0,16));
  const [deliveryDate, setDeliveryDate] = useState("");
  const [channel, setChannel] = useState<CreateOrderPayload["channel"]>("HORECA");
  const [paymentTerms, setTerms] = useState("Contado");
  const [shipTo, setShipTo] = useState("");
  const [items, setItems] = useState<CreateOrderPayload["items"]>(defaults?.items || [{sku:"SB-750", qty:1, unit:"uds", priceUnit: 12, lotNumber: ''}]);
  
  const availableInventory = useMemo(() => (santaData?.inventory || []).filter(i => i.locationId && i.locationId.startsWith('FG/')), [santaData]);

  function addLine(){ setItems(v=>[...v,{sku:"", qty:1, unit:"uds", priceUnit: 0}]); }
  function setLine(i:number, patch:Partial<CreateOrderPayload["items"][number]>){
    const newItems = items.map((it,idx)=> idx===i? {...it,...patch}: it);
    if(patch.sku) {
        newItems[i].priceUnit = 0;
    }
    setItems(newItems);
  }
  function removeLine(i:number){ setItems(v=> v.filter((_,idx)=> idx!==i)); }
  function submit(){ 
      if(!accountName) return alert("Selecciona una cuenta"); 
      if(items.length===0 || items.some(it=>!it.sku || it.qty<=0)) return alert("Revisa las líneas"); 
      
      const payload: CreateOrderPayload = {
          account: accountName,
          requestedDate,
          deliveryDate: deliveryDate||undefined,
          channel,
          paymentTerms,
          shipTo: shipTo||undefined,
          note,
          items
      };
      if (newAccountData) {
          payload.newAccount = newAccountData.account;
          payload.newParty = newAccountData.party;
      }
      onSubmit(payload);
  }
  
  const orderTotal = useMemo(() => items.reduce((total, item) => total + (item.qty * item.priceUnit), 0), [items]);

  return (
    <div className="p-4 space-y-3">
      <Row><Label>Cuenta</Label>
        <AccountPicker value={accountName} onChange={handleAccountChange as any} accounts={accounts} onSearchAccounts={onSearchAccounts} onCreateAccount={onCreateAccount}/>
      </Row>
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
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_0.5fr_1fr_1fr_40px] gap-2 items-center px-3 py-2 border-b last:border-b-0">
                <Select value={it.sku} onChange={e => setLine(i, { sku: e.target.value })}>
                    <option value="">Seleccionar producto...</option>
                    {santaData?.products.filter(p => p.category === 'finished_good').map(p => (
                        <option key={p.sku} value={p.sku}>{p.name}</option>
                    ))}
                </Select>
                <Select value={it.lotNumber || ''} onChange={e => setLine(i, { lotNumber: e.target.value })}>
                    <option value="">Seleccionar lote...</option>
                    {lotsForSku.map(lot => (
                        <option key={lot.id} value={lot.lotNumber}>
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
  onSearchAccounts:(q:string)=>Promise<Account[]>;
  onCreateAccount:(d:{name:string;city?:string;type?:AccountType})=>Promise<Account>;
  defaults?: any;
  onSubmit:(payload:any)=>void; // (en real tipa por variante)
}){
  if(!open) return null;
  if(variant==="quick"){
    return (
      <div className="w-full h-full rounded-2xl border border-zinc-200 bg-white/95 shadow-xl overflow-hidden flex flex-col backdrop-blur-sm">
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
