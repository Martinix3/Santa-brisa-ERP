
"use client";
import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { useData } from "@/lib/dataprovider";
import { Check, ChevronDown, Database, Download, FileCog, FileText, Map as MapIcon, Trash2, Upload, X } from "lucide-react";
import type { Account as AccountSchema, AccountType, AccountMode, Stage, Interaction, OrderSellOut } from "@/domain/ssot";
import AuthGuard from "@/components/auth/AuthGuard";
import { generateNextOrder, Channel } from "@/lib/codes";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { SB_COLORS } from "@/components/ui/ui-primitives";

// ===== Enums & Types =====
const CLIENT_TYPES = ["HORECA","RETAIL","ONLINE","PROPIA","DISTRIBUIDOR"] as const;
const STAGES = ["ACTIVA","SEGUIMIENTO","POTENCIAL","FALLIDA"] as const;

export type Account = AccountSchema & {
  mainContactName?: string;
  mainContactEmail?: string;
  mainContactPhone?: string;
  orderCount?: number;
};

type RosterUser = { id:string; name:string; email?:string; role?:string; active?:string|boolean; managerId?:string };
type Partner = { id:string; name:string; };
type MergeStrategy = 'prefer_new' | 'fill_empty' | 'prefer_existing';
type DatasetKind = "accounts" | "orders";

type ColumnMap = Record<string, string>; // ssotField -> sourceHeader

// ===== Utils =====
const normText = (s: any) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const norm = (s:any) => String(s ?? "").trim();
const BAD_NAMES = new Set(["","n/a","na","nd","—","-","sin nombre","unknown","desconocido","tbd","por definir"]);
const hasValidName = (s:any) => { const t = norm(s).toLowerCase(); return t.length >= 2 && !BAD_NAMES.has(t); };
const keyNameCity = (r: Partial<Account>) => `${norm(r.name).toLowerCase()}|${norm(r.city).toLowerCase()}`;

function parseCSV(file: File): Promise<{rows: any[]; headers: string[]}> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => String(h || "").trim(),
      complete: (res) => {
        const rows = (res.data as any[]).map(r => Object.fromEntries(Object.entries(r).map(([k,v]) => [k, typeof v === 'string' ? v.trim() : v])));
        const headers = (res.meta.fields as string[]) || Object.keys(rows[0] || {});
        resolve({ rows, headers });
      },
      error: (err) => reject(err),
    });
  });
}

async function parseAnyFile(file: File){
  const ext = file.name.toLowerCase();
  if (ext.endsWith(".csv")) {
    return parseCSV(file);
  }
  throw new Error("Formato de archivo no soportado. Por favor, usa CSV.");
}

// ===== Heurísticas de mapeo =====
const ACCOUNT_FIELDS = [
  "id","name","city","stage","type","cif","address", "phone", "distributorId",
  "mainContactName","mainContactPhone","mainContactEmail","tags","notes","mode_json","orderCount"
] as const;

const ORDER_FIELDS = [
  "orderId","accountId","accountName","orderDate","status","salesRep",
  "productSku","quantity","unitPrice","price","plv","notes","distributorId"
] as const;

const aliases: Record<string, string[]> = {
  // Accounts
  id:["id","accountid","account_id","uid"],
  name:["name","account","cliente","customer name","customer", "targets"],
  city:["city","ciudad","localidad","area","municipio","población","poblacion","provincia"],
  stage:["stage","status","estado","pipeline","pipeline stage"],
  type:["type","tipo","category","cliente tipo","segmento"],
  cif:["cif","nif","vat","tax_id","taxid"],
  address:["address","direccion","dirección","address line","calle"],
  distributorId:["distributorid","distribuidor","partner_id"],
  mainContactName:["maincontactname","contacto","contact name","contact_name", "contact name"],
  mainContactPhone:["maincontactphone","phone","telefono","teléfono","contact phone", "contact phone"],
  mainContactEmail:["maincontactemail","email","contact email"],
  tags:["tags","etiquetas","label", "comments"],
  notes:["notes","comentarios","obs","observaciones"],
  mode_json:["mode","mode_json","operacion","modo"],
  orderCount:["ordercount","pedidos","num pedidos"],
  // Orders
  orderId:["order id","order nr","order","id","num_pedido"],
  accountId:["account id","account_id","accountid"],
  accountName:["account name","customer name","cliente","account","customer", "targets"],
  orderDate:["order date","fecha","date"],
  status:["status","order status","estado","invoiced","paid"],
  salesRep:["sales rep","seller","responsable","vendedor", "responsible"],
  productSku:["product","sku","item sku","producto"],
  quantity:["qty","quantity","unidades","750 bottle","botellas", "cajas"],
  unitPrice:["unit price","precio unidad","pvp","unit_price"],
  price:["price","importe","total","paid"],
  plv:["plv","materiales","m. entregados","materiales entregados", "materiales entregados"],
};

function autoSuggestMap(headers: string[], dataset: DatasetKind): ColumnMap {
  const wanted = dataset === "accounts" ? [...ACCOUNT_FIELDS] : [...ORDER_FIELDS];
  const map: ColumnMap = {};
  for (const f of wanted){
    const keys = aliases[f] || [f];
    const hit = headers.find(h => keys.some(k => normText(h) === normText(k)));
    if (hit) map[f] = hit;
  }
  return map;
}

function getVal(r:any, col?:string){ if(!col) return ""; return r[col] ?? r[col.toLowerCase()] ?? ""; }

// ===== Coerciones =====
function parseModeJSON(raw:any): AccountMode|undefined {
  try{
    if (typeof raw === "string" && raw.includes("{")){
      const o = JSON.parse(raw);
      if (o?.mode === "COLOCACION" && o.billerPartnerId && o.ownerUserId) return { mode:"COLOCACION", ownerUserId:o.ownerUserId, billerPartnerId:o.billerPartnerId };
      if (o?.mode === "DISTRIB_PARTNER" && o.ownerPartnerId && o.billerPartnerId) return { mode:"DISTRIB_PARTNER", ownerPartnerId:o.ownerPartnerId, billerPartnerId:o.billerPartnerId };
      if (o?.mode === "PROPIA_SB" && o.ownerUserId) return { mode:"PROPIA_SB", ownerUserId:o.ownerUserId, biller:"SB" };
    }
  }catch{}
  return undefined;
}

function coerceAccountFromMapped(row:any): Account|null {
  const rawName = row.name ?? row.nombre ?? row["CUSTOMER NAME"] ?? row["Cliente"] ?? row["Account"] ?? row["cuenta"] ?? "";
  const name = norm(rawName);
  if (!hasValidName(name)) return null;

  const stageIn = String(row.stage||"").toUpperCase();
  let stage: Stage;
  switch (stageIn) {
      case 'CLOSED / WON': stage = 'ACTIVA'; break;
      case 'NEGOTATION':
      case 'SCHEDULE APPOINTMENT':
      case 'CONTACT NEXT SEASON': stage = 'SEGUIMIENTO'; break;
      case 'INTERESTED':
      case 'CONTACTED': stage = 'POTENCIAL'; break;
      default: stage = 'SEGUIMIENTO';
  }

  const typeIn = String(row.type||"").toUpperCase();
  const type: AccountType = (CLIENT_TYPES as readonly string[]).includes(typeIn) ? (typeIn as AccountType) : "HORECA";

  const modeParsed = parseModeJSON(row.mode_json);
  const mode: AccountMode = modeParsed ?? { mode: "PROPIA_SB", ownerUserId: "u_admin", biller: "SB" };

  return {
    id: String(row.id || `new_${Date.now()}_${Math.random().toString(36).slice(2,8)}`),
    name,
    city: norm(row.city),
    stage,
    type,
    mode,
    distributorId: norm(row.distributorId),
    cif: norm(row.cif),
    address: norm(row.address),
    phone: norm(row.mainContactPhone || row.phone),
    mainContactName: norm(row.mainContactName),
    mainContactEmail: norm(row.mainContactEmail),
    mainContactPhone: norm(row.mainContactPhone),
    tags: String(row.tags||"").split(",").map(t=>t.trim()).filter(Boolean),
    createdAt: new Date().toISOString(),
    orderCount: row.orderCount ? Number(row.orderCount) : 0,
  };
}

function coerceOrderFromMapped(row:any, accounts: Account[], products: any[], existingOrderIds: string[]): {order: OrderSellOut, interaction: Interaction} | null {
  const accountId = norm(row.accountId);
  let acc = accounts.find(a => a.id === accountId);
  if (!acc && row.accountName){
    const key = normText(row.accountName);
    acc = accounts.find(a => normText(a.name) === key);
  }
  if (!acc) return null;

  const qty = Number(row.quantity||0);
  const unit = Number(row.unitPrice||0);
  const price = Number(row.price||0) || (qty>0 && unit>0 ? qty*unit : 0);
  if (!qty || (!unit && !price)) return null;

  const orderId = String(row.orderId || generateNextOrder(existingOrderIds, 'SB', new Date()));
  
  let createdAt = new Date().toISOString();
  if (row.orderDate) {
      try {
          const parsedDate = new Date(row.orderDate);
          if (!isNaN(parsedDate.getTime())) {
              createdAt = parsedDate.toISOString();
          }
      } catch (e) {}
  }


  const order: OrderSellOut = {
    id: orderId,
    accountId: acc.id,
    distributorId: norm(row.distributorId) || acc.distributorId,
    userId: "u_admin",
    status: "confirmed",
    currency: "EUR",
    createdAt,
    lines: [{ sku: products?.[0]?.sku || "SB-750", qty, priceUnit: unit || (price/Math.max(1,qty)), unit: "caja" }], // Assuming caja for "CAJAS" column
    notes: String(row.notes||"")
  };

  const interaction: Interaction = {
    id: `i_${orderId}`,
    accountId: acc.id,
    userId: "u_admin",
    kind: "OTRO",
    note: `Pedido importado: ${qty} uds · PVP ${order.lines[0].priceUnit.toFixed(2)}.`,
    createdAt,
    dept: "VENTAS"
  };

  return { order, interaction };
}

// ===== CSV/JSONL Export =====
function toCSV(rows: any[], columns: string[]): string {
  if (!rows.length) return "";
  const out = [columns.join(",")];
  for (const r of rows) {
    const vals = columns.map(h => {
      let v = (r as any)[h];
      if (typeof v === "object" && v !== null) v = JSON.stringify(v);
      return `"${String(v ?? "").replace(/"/g,'""')}"`;
    });
    out.push(vals.join(","));
  }
  return out.join("\n");
}
function toJSONL(rows: any[]): string { return rows.map(r => JSON.stringify(r)).join("\n"); }

function download(filename: string, content: string, mime="text/plain") {
  const blob = new Blob([content], {type: mime+";charset=utf-8"});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

// ===== UI auxiliares =====
function EditableCell({ value, onBulkUpdate, numRows }: { value: string, onBulkUpdate: (newValues: string[]) => void, numRows: number }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const newValues = pastedText.split(/[\n\t]/).map(s => s.trim()).filter(Boolean);
    onBulkUpdate(newValues);
    setIsEditing(false);
  };
  
  if (isEditing) {
    return (
      <div className="absolute inset-0 z-10">
        <textarea
          ref={textareaRef}
          className="w-full h-full rounded-md border-2 border-yellow-400 px-2 py-1 text-sm bg-white resize-none"
          onPaste={handlePaste}
          onBlur={() => setIsEditing(false)}
          placeholder={`Pega hasta ${numRows} valores aquí...`}
        />
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full px-2 py-1 truncate cursor-cell" 
      onClick={() => setIsEditing(true)}
      title="Click to edit, paste column to bulk update"
    >
      {value}
    </div>
  );
}

function OwnerSelector({row, idx, users, partners, onUpdate}:{
  row: Account; idx: number; users: RosterUser[]; partners: Partner[]; onUpdate: (idx:number, key:keyof Account, value:any)=>void;
}){
    const handleModeChange = (newModeType: AccountMode['mode']) => {
    let newMode: AccountMode;
    switch(newModeType) {
      case 'PROPIA_SB': newMode = { mode: 'PROPIA_SB', ownerUserId: users[0]?.id || 'u_admin', biller: 'SB' }; break;
      case 'COLOCACION': newMode = { mode: 'COLOCACION', ownerUserId: users[0]?.id || 'u_admin', billerPartnerId: partners[0]?.id || 'd_rivera' }; break;
      case 'DISTRIB_PARTNER': newMode = { mode: 'DISTRIB_PARTNER', ownerPartnerId: partners[0]?.id || 'd_rivera', billerPartnerId: partners[0]?.id || 'd_rivera' }; break;
    }
    onUpdate(idx, 'mode', newMode);
  };
  const handleIdChange = (key: 'ownerUserId' | 'ownerPartnerId' | 'billerPartnerId', value: string) => onUpdate(idx, 'mode', { ...row.mode, [key]: value });
  
  if (!row.mode) {
      return <div>Modo no definido</div>;
  }
  
  return (
    <div className="flex items-center gap-2 min-w-[320px]">
      <select className="border rounded-md px-2 py-1 text-xs bg-white" value={row.mode.mode} onChange={e => handleModeChange(e.target.value as AccountMode['mode'])}>
        <option value="PROPIA_SB">Propia SB</option><option value="COLOCACION">Colocación</option><option value="DISTRIB_PARTNER">Partner</option>
      </select>
      <div className="flex-1">
        {row.mode.mode === 'PROPIA_SB' && (
          <select className="border rounded-md px-2 py-1 flex-1 w-full text-xs bg-white" value={(row.mode as any).ownerUserId} onChange={e=>handleIdChange('ownerUserId', e.target.value)}>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
        {row.mode.mode === 'COLOCACION' && (
          <div className="flex gap-1">
            <select className="border rounded-md px-1 py-1 flex-1 w-full text-xs bg-white" value={(row.mode as any).ownerUserId || ''} onChange={e=>handleIdChange('ownerUserId', e.target.value)}>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select className="border rounded-md px-1 py-1 flex-1 w-full text-xs bg-white" value={(row.mode as any).billerPartnerId || ''} onChange={e=>handleIdChange('billerPartnerId', e.target.value)}>
              {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        {row.mode.mode === 'DISTRIB_PARTNER' && (
          <select className="border rounded-md px-2 py-1 flex-1 w-full text-xs bg-white" value={(row.mode as any).ownerPartnerId || ''} onChange={e=>handleIdChange('ownerPartnerId', e.target.value)}>
            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

const ALL_COLUMNS: Array<keyof Account | "mode"> = [
  "id","name","city","stage","type","mode", "address", "phone", "cif", "distributorId", "mainContactName","mainContactPhone","mainContactEmail","orderCount"
];

const BULK_EDITABLE_FIELDS: (keyof Account | 'mode')[] = ["city","type","stage","mode","distributorId", "address", "phone", "cif"];

function ColumnPicker({ visibleColumns, setVisibleColumns }: { visibleColumns: Set<string>; setVisibleColumns: (s: Set<string>) => void; }) {
  const [isOpen, setIsOpen] = useState(false);
  const toggleColumn = (col: string) => { const s = new Set(visibleColumns); s.has(col)?s.delete(col):s.add(col); setVisibleColumns(s); };
  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 text-sm bg-white border border-zinc-200 rounded-md px-3 py-1.5 outline-none hover:bg-zinc-50 focus:ring-2 focus:ring-yellow-400">
        Columnas <ChevronDown size={14} />
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-56 bg-white border rounded-lg shadow-lg z-10">
          <div className="p-2 text-sm font-semibold border-b">Mostrar/Ocultar Columnas</div>
          <div className="p-2 max-h-60 overflow-y-auto">
            {ALL_COLUMNS.map(col => (
              <label key={col} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-zinc-50 text-sm">
                <input type="checkbox" checked={visibleColumns.has(col)} onChange={() => toggleColumn(col)} className="h-4 w-4 rounded border-zinc-300 text-yellow-500 focus:ring-yellow-400"/>
                {col}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Main Component =====
function SSOTEditorContent(){
  const { data: SantaData, setData } = useData();

  // State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [orders, setOrders] = useState<OrderSellOut[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);

  const [users, setUsers] = useState<RosterUser[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [selectedRows, setSelectedRows] = useState(new Set<string>());
  const [visibleColumns, setVisibleColumns] = useState(new Set<string>(["name","city","stage","mode","orderCount"]));
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Import wizard state
  const [importKind, setImportKind] = useState<DatasetKind>("accounts");
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<ColumnMap>({});
  const [showMapper, setShowMapper] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  function loadFromCurrentData() {
    if (!SantaData) return;
    setAccounts(SantaData.accounts as Account[]);
    setOrders(SantaData.ordersSellOut);
    setInteractions(SantaData.interactions);
    setUsers(SantaData.users as RosterUser[]);
    setPartners(SantaData.distributors as Partner[]);
    setPage(1);
    setNotification({ message: 'Datos actuales cargados.', type: 'success' });
  }

  // Filtering / paging
  const filtered = useMemo(() => accounts.filter(row =>
    Object.entries(filters).every(([key, value]) => !value || normText((row as any)[key]).includes(normText(value)))
  ), [accounts, filters]);

  const pageRows = useMemo(() => filtered.slice((page-1)*pageSize, page*pageSize), [filtered, page, pageSize]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => setSelectedRows(e.target.checked ? new Set(filtered.map(r => r.id)) : new Set());
  const handleSelectRow = (id: string, checked: boolean) => setSelectedRows(prev => { const next = new Set(prev); checked?next.add(id):next.delete(id); return next; });

  // ===== Import wizard handlers =====
  function dedupByNameCity(rows: Account[]) {
    const seen = new Set<string>();
    return rows.filter(r => { const k = keyNameCity(r); if (seen.has(k)) return false; seen.add(k); return true; });
  }

  async function handleFilePick(file: File | null){
    if (!file) return;
    try {
        const parsed = await parseAnyFile(file);
        setRawRows(parsed.rows);
        setFileHeaders(parsed.headers.length ? parsed.headers : Object.keys(parsed.rows[0] || {}));
        setColumnMap(autoSuggestMap(parsed.headers.length ? parsed.headers : Object.keys(parsed.rows[0]||{}), importKind));
        setFileName(file.name);
        setShowMapper(true);
    } catch (error) {
        setNotification({message: (error as Error).message, type: 'error'})
    }
  }

  function applyMapping(){
    if (!rawRows.length) return;
    if (importKind === "accounts"){
      // Construir filas normalizadas según el mapeo
      const normalized = rawRows.map((r:any) => {
        const row:any = {};
        for (const f of ACCOUNT_FIELDS){
          row[f] = getVal(r, columnMap[f]);
        }
        return row;
      });
      // Coerción
      let newAccounts = normalized.map(coerceAccountFromMapped).filter(Boolean) as Account[];
      newAccounts = dedupByNameCity(newAccounts);

      // Merge por id -> cif -> (name|city)
      const base = accounts.length ? accounts : (SantaData?.accounts || []);
      const idxById = new Map(base.map(a => [a.id, a]));
      const idxByCif = new Map(base.filter(a => a.cif).map(a => [normText(a.cif!), a]));
      const idxByNC = new Map(base.map(a => [keyNameCity(a), a]));
      const nextMap = new Map<string, Account>();
      base.forEach(a => nextMap.set(a.id, a));

      for (const inc of newAccounts){
        const byId = idxById.get(inc.id);
        const byCif = inc.cif ? idxByCif.get(normText(inc.cif)) : undefined;
        const byNC  = idxByNC.get(keyNameCity(inc));
        const baseAcc = byId || byCif || byNC;
        if (baseAcc){
          const merged: Account = { ...baseAcc, ...Object.fromEntries(
            Object.entries(inc).filter(([,v]) => v !== undefined && v !== "")) } as Account;
          nextMap.set(baseAcc.id, merged);
        } else {
          nextMap.set(inc.id, inc);
        }
      }
      setAccounts(Array.from(nextMap.values()));
      setNotification({ message: `Importadas ${newAccounts.length} cuentas desde “${fileName}”.`, type: 'success' });
    } else {
      // Orders
      const normalized = rawRows.map((r:any) => {
        const row:any = {};
        for (const f of ORDER_FIELDS) row[f] = getVal(r, columnMap[f]);
        return row;
      });
      const allAccounts = accounts.length ? accounts : (SantaData?.accounts || []);
      const products = SantaData?.products || [];
      const results = normalized.map((row:any) => coerceOrderFromMapped(row, allAccounts, products, (SantaData?.ordersSellOut || []).map(o => o.id))).filter(Boolean) as {order:OrderSellOut, interaction:Interaction}[];
      if (!results.length) { setNotification({ message: 'No se pudo mapear ningún pedido válido.', type: 'error' }); return; }

      const newOrders = results.map(r=>r.order);
      const newInts   = results.map(r=>r.interaction);

      const orderMap = new Map(orders.map(o => [o.id, o])); newOrders.forEach(o => orderMap.set(o.id, o));
      const intMap   = new Map(interactions.map(i => [i.id, i])); newInts.forEach(i => intMap.set(i.id, i));

      // Recalcular orderCount
      const counts = new Map<string, number>();
      orderMap.forEach(o => counts.set(o.accountId, (counts.get(o.accountId) || 0) + 1));
      setAccounts(prev => prev.map(a => ({ ...a, orderCount: counts.get(a.id) || 0 })));

      setOrders(Array.from(orderMap.values()));
      setInteractions(Array.from(intMap.values()));
      setNotification({ message: `Importados ${newOrders.length} pedidos desde “${fileName}”.`, type: 'success' });
    }
    setShowMapper(false);
    setRawRows([]); setFileHeaders([]); setColumnMap({}); setFileName("");
  }

  // Bulk actions
  const [bulkEditField, setBulkEditField] = useState<(keyof Account | 'mode') | ''>('');
  const [bulkEditValue, setBulkEditValue] = useState<any>('');

  function update(idxGlobal: number, key: keyof Account, value: any){
    setAccounts(prev => { const next = [...prev]; next[idxGlobal] = { ...next[idxGlobal], [key]: value }; return next; });
  }

  function handleBulkColumnUpdate(col: keyof Account, newValues: string[]) {
    setAccounts(prevAccounts => {
        const newAccounts = [...prevAccounts];
        pageRows.forEach((row, i) => {
            if (i < newValues.length) {
                const globalIndex = newAccounts.findIndex(acc => acc.id === row.id);
                if (globalIndex !== -1) {
                    (newAccounts[globalIndex] as any)[col] = newValues[i];
                }
            }
        });
        return newAccounts;
    });
    setNotification({ message: `Columna '${col}' actualizada para ${Math.min(newValues.length, pageRows.length)} filas.`, type: 'success' });
  }

  function applyBulkUpdate() {
    if (!bulkEditField || selectedRows.size === 0) return alert("Selecciona un campo y al menos una fila.");
    if (bulkEditField !== 'mode' && !bulkEditValue) return alert("Introduce un valor.");
    setAccounts(prev => prev.map(row => {
      if (!selectedRows.has(row.id)) return row;
      if (bulkEditField === 'mode') {
        if (!row.mode) return row;
        let newMode: AccountMode = row.mode;
        switch(bulkEditValue as AccountMode['mode']){
          case "PROPIA_SB": newMode = { mode:"PROPIA_SB", ownerUserId: (row.mode as any).ownerUserId || 'u_admin', biller:"SB" }; break;
          case "COLOCACION": newMode = { mode:"COLOCACION", ownerUserId: (row.mode as any).ownerUserId || 'u_admin', billerPartnerId: (partners[0]?.id || 'd_rivera') }; break;
          case "DISTRIB_PARTNER": newMode = { mode:"DISTRIB_PARTNER", ownerPartnerId: (partners[0]?.id || 'd_rivera'), billerPartnerId: (partners[0]?.id || 'd_rivera') }; break;
        }
        return { ...row, mode: newMode };
      }
      return { ...row, [bulkEditField]: bulkEditValue };
    }));
    setNotification({ message: `Campo '${bulkEditField}' actualizado en ${selectedRows.size} filas.`, type: 'success' });
  }

  function renderBulkValueInput() {
    const cls = "border rounded-md px-2 py-1 text-sm bg-white";
    switch (bulkEditField) {
      case 'stage': return <select className={cls} value={bulkEditValue} onChange={e=>setBulkEditValue(e.target.value)}>{STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select>;
      case 'type': return <select className={cls} value={bulkEditValue} onChange={e=>setBulkEditValue(e.target.value)}>{CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>;
      case 'mode': return <select className={cls} value={bulkEditValue} onChange={e=>setBulkEditValue(e.target.value)}><option value="">Elegir modo...</option><option value="PROPIA_SB">Propia SB</option><option value="COLOCACION">Colocación</option><option value="DISTRIB_PARTNER">Distrib. Partner</option></select>;
      default: return <input className={cls} value={bulkEditValue} onChange={e=>setBulkEditValue(e.target.value)} placeholder="Nuevo valor..." />;
    }
  }

  function handleBulkDelete() {
    if (selectedRows.size === 0) return setNotification({ message: 'Selecciona filas para eliminar.', type: 'error' });
    if (window.confirm(`¿Eliminar ${selectedRows.size} cuentas? Esta acción no se puede deshacer.`)) {
      setAccounts(prev => prev.filter(r => !selectedRows.has(r.id)));
      setNotification({ message: `${selectedRows.size} cuentas eliminadas.`, type: 'success' });
      setSelectedRows(new Set());
    }
  }

  function handleSaveChanges() {
    if (!SantaData || !setData) return;
    setData({ ...SantaData, accounts, ordersSellOut: orders, interactions });
    setNotification({ message: `Guardado: ${accounts.length} cuentas, ${orders.length} pedidos, ${interactions.length} interacciones.`, type: 'success' });
  }

  // ===== Render =====
  return (
    <AuthGuard>
        <ModuleHeader title="SSOT — Centro de Mando" icon={FileCog} color={SB_COLORS.admin}>
            <div className="flex gap-2">
            <ColumnPicker visibleColumns={visibleColumns} setVisibleColumns={setVisibleColumns} />
            <button onClick={handleSaveChanges} className="flex items-center gap-2 rounded-xl px-4 py-2 bg-blue-600 text-white font-semibold hover:bg-blue-700">
                <Database size={16}/> Guardar en DB
            </button>
            </div>
        </ModuleHeader>
        <div className="p-6 max-w-full mx-auto">
            {notification && (
            <div className={`fixed top-5 right-5 z-50 p-4 rounded-lg shadow-lg text-white ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                {notification.message}
                <button onClick={() => setNotification(null)} className="ml-4 font-bold">X</button>
            </div>
            )}

            {/* IMPORT WIZARD */}
            <section className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl border p-4 bg-white">
                <h2 className="font-medium mb-2 flex items-center gap-2"><Upload size={16}/>1) Importar desde archivo</h2>
                <div className="flex items-center gap-3 mb-3">
                <label className="text-sm">Tipo de datos:</label>
                <select className="border rounded-md px-2 py-1 text-sm" value={importKind} onChange={e=>setImportKind(e.target.value as DatasetKind)}>
                    <option value="accounts">Cuentas</option>
                    <option value="orders">Pedidos</option>
                </select>
                </div>
                <input
                type="file"
                accept=".csv,text/csv"
                className="text-sm"
                onChange={e => handleFilePick(e.target.files?.[0] || null)}
                />
                <button className="mt-2 rounded-lg px-3 py-1.5 border text-sm w-full hover:bg-zinc-50" onClick={loadFromCurrentData}>
                O cargar datos actuales de la app
                </button>
            </div>

            <div className="rounded-2xl border p-4 bg-white">
                <h2 className="font-medium mb-2 flex items-center gap-2"><Download size={16}/>2) Exportar</h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                <button className="rounded-lg px-3 py-1.5 border hover:bg-zinc-50" onClick={()=>download("accounts.csv", toCSV(accounts, Array.from(visibleColumns)), "text/csv")}>Cuentas (CSV)</button>
                <button className="rounded-lg px-3 py-1.5 border hover:bg-zinc-50" onClick={()=>download("orders.csv", toCSV(orders, ['id','accountId','userId','createdAt','status','notes']), "text/csv")}>Pedidos (CSV)</button>
                <button className="rounded-lg px-3 py-1.5 border hover:bg-zinc-50" onClick={()=>download("interactions.jsonl", toJSONL(interactions), "application/jsonl")}>Interacciones (JSONL)</button>
                <button className="rounded-lg px-3 py-1.5 border hover:bg-zinc-50" onClick={()=>download("full_export.json", JSON.stringify({accounts, orders, interactions}, null, 2), "application/json")}>Todo (JSON)</button>
                </div>
            </div>
            </section>

            {/* Mapper Drawer */}
            {showMapper && (
            <div className="rounded-2xl border p-4 bg-white mb-4">
                <h3 className="font-medium mb-2 flex items-center gap-2"><MapIcon size={16}/> Mapeo de columnas — {fileName}</h3>
                <p className="text-sm text-zinc-600 mb-3">Selecciona qué columna del archivo corresponde a cada campo del SSOT. Los no necesarios déjalos sin seleccionar.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                { (importKind === "accounts" ? ACCOUNT_FIELDS : ORDER_FIELDS).map(f => (
                    <div key={f} className="flex items-center gap-2">
                    <div className="w-48 text-sm font-medium">{f}</div>
                    <select className="border rounded-md px-2 py-1 text-sm flex-1 bg-white"
                            value={columnMap[f] || ""}
                            onChange={e=>setColumnMap(prev => ({ ...prev, [f]: e.target.value }))}>
                        <option value="">— (ignorar) —</option>
                        {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    </div>
                ))}
                </div>
                <div className="mt-3 flex gap-2">
                <button className="rounded-xl px-3 py-2 border bg-zinc-100 hover:bg-zinc-200" onClick={()=>setColumnMap(autoSuggestMap(fileHeaders, importKind))}>
                    Autocompletar
                </button>
                <button className="rounded-xl px-3 py-2 border bg-green-600 text-white hover:bg-green-700" onClick={applyMapping}>
                    Aplicar mapeo e importar
                </button>
                <button className="rounded-xl px-3 py-2 border" onClick={()=>{ setShowMapper(false); setRawRows([]); setColumnMap({}); }}>
                    Cancelar
                </button>
                </div>
            </div>
            )}

            {/* Bulk ops */}
            <section className="rounded-2xl border p-4 bg-white mb-4">
            <h3 className="font-medium mb-2">Acciones masivas (sobre {selectedRows.size} seleccionadas)</h3>
            <div className="flex flex-wrap gap-2 items-center">
                <select className="border rounded-md px-2 py-1 text-sm bg-white" value={bulkEditField} onChange={e => {setBulkEditField(e.target.value as any); setBulkEditValue('');}}>
                <option value="">Seleccionar campo...</option>
                {BULK_EDITABLE_FIELDS.map(field => (<option key={field} value={field}>{field}</option>))}
                </select>
                {bulkEditField && renderBulkValueInput()}
                <button className="rounded-xl px-3 py-2 border text-sm bg-zinc-100 hover:bg-zinc-200" onClick={applyBulkUpdate}>Aplicar Cambio</button>
                <button onClick={handleBulkDelete} className="flex items-center gap-2 rounded-xl px-3 py-2 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100">
                <Trash2 size={14}/> Eliminar Selección
                </button>
            </div>
            </section>

            {/* Tabla de cuentas */}
            {accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-zinc-600 bg-white">
                Carga un CSV de <b>{importKind === "accounts" ? "cuentas" : "pedidos"}</b> o usa los datos actuales para empezar.
            </div>
            ) : (
            <div className="rounded-2xl border overflow-auto bg-white">
                <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-50/70 backdrop-blur-sm border-b z-[1]">
                    <tr>
                    <th className="p-2 text-left whitespace-nowrap"><input type="checkbox" onChange={handleSelectAll} checked={selectedRows.size > 0 && selectedRows.size === filtered.length}/></th>
                    {ALL_COLUMNS.map(h=> visibleColumns.has(h) && (<th key={h} className="p-2 text-left whitespace-nowrap capitalize">{h}</th>))}
                    </tr>
                    <tr>
                    <th><button onClick={() => setSelectedRows(new Set())} title="Limpiar selección"><X size={14} className="mx-auto text-zinc-400 hover:text-red-500"/></button></th>
                    {ALL_COLUMNS.map(h => visibleColumns.has(h) && (
                        <th key={h} className="p-1 font-normal">
                        { !['mode','type','stage'].includes(h) &&
                            <input type="text" placeholder={`Filtrar...`} value={filters[h] || ''} onChange={e => setFilters(f => ({ ...f, [h]: e.target.value }))} className="w-full text-xs border-zinc-300 rounded-md px-2 py-1" />
                        }
                        </th>
                    ))}
                    </tr>
                </thead>
                <tbody>
                    {pageRows.map((r,i)=>{
                    const globalIndex = accounts.findIndex(row => row.id === r.id);
                    return (
                        <tr key={r.id} className={`transition-colors ${selectedRows.has(r.id) ? 'bg-yellow-100/50' : (i % 2 ? 'bg-white' : 'bg-zinc-50/50')} hover:bg-yellow-100/70`}>
                        <td className="p-2"><input type="checkbox" checked={selectedRows.has(r.id)} onChange={e => handleSelectRow(r.id, e.target.checked)} /></td>
                        {ALL_COLUMNS.map(col => visibleColumns.has(col) && (
                            <td key={col} className="p-0 relative">
                            {col === 'mode' ? <div className="p-2"><OwnerSelector row={r} idx={globalIndex} users={users} partners={partners} onUpdate={update} /></div> :
                            col === 'stage' ? <div className="p-2"><select className="border rounded-md px-2 py-1 bg-white w-full" value={r.stage} onChange={e=>update(globalIndex,'stage', e.target.value as Stage)}>{STAGES.map(t=> <option key={t} value={t}>{t}</option>)}</select></div> :
                            col === 'type' ? <div className="p-2"><select className="border rounded-md px-2 py-1 bg-white w-full" value={r.type} onChange={e=>update(globalIndex,'type', e.target.value as AccountType)}>{CLIENT_TYPES.map(t=> <option key={t} value={t}>{t}</option>)}</select></div> :
                            col === 'orderCount' ? <div className="p-2 text-center">{r.orderCount || 0}</div> :
                            <EditableCell value={(r as any)[col] || ''} onBulkUpdate={(newValues) => handleBulkColumnUpdate(col, newValues)} numRows={pageRows.length} />
                            }
                            </td>
                        ))}
                        </tr>
                    );
                    })}
                </tbody>
                </table>
            </div>
            )}

            <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-zinc-600">{filtered.length} cuentas ({selectedRows.size} seleccionadas)</div>
            <div className="flex gap-2">
                <button className="rounded-xl px-3 py-2 border" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</button>
                <span className="self-center px-2">Página {page} de {Math.max(1, Math.ceil(filtered.length / pageSize))}</span>
                <button className="rounded-xl px-3 py-2 border" disabled={page*pageSize >= filtered.length} onClick={()=>setPage(p=>p+1)}>Siguiente</button>
            </div>
        </div>
    </AuthGuard>
  );
}

export default function SSOTEditor() {
    return <SSOTEditorContent />;
}
