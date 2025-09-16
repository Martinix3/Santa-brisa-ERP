

"use client";
import React, { useMemo, useState, useEffect } from "react";
import { Printer, PackageCheck, Truck, CheckCircle2, Search, Plus, FileText, ClipboardList, Boxes, PackageOpen, BadgeCheck, AlertTriangle, Settings, Clipboard, Ruler, Weight, MoreHorizontal, Check as CheckIcon, FileDown, Package } from "lucide-react";
import { SBButton, SBCard, DataTableSB, Col as SBCol, STATUS_STYLES } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import type { Shipment, OrderSellOut, Account, ShipmentStatus } from "@/domain/ssot";


// ===============================
// UI Components
// ===============================

const Button = ({variant, className, ...props}: any) => <button className={`${variant} ${className}`} {...props}/>;
const Card = ({children, className}: any) => <div className={`border rounded-xl bg-white shadow-sm ${className}`}>{children}</div>
const CardHeader = ({children, className}: any) => <div className={`p-6 pb-2 ${className}`}>{children}</div>
const CardTitle = ({children, className}: any) => <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
const CardDescription = ({children, className}: any) => <p className={`text-sm text-zinc-500 ${className}`}>{children}</p>
const CardContent = ({children, className}: any) => <div className={`p-6 pt-0 ${className}`}>{children}</div>
const Input = (props: any) => <input {...props} className={`w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm outline-none focus:ring-2 focus:ring-[#F7D15F] ${props.className||""}`}/>;
const Badge = ({variant, className, ...props}: any) => <span className={`${variant} ${className}`} {...props} />;
const Checkbox = ({checked, onCheckedChange, ...props}: any) => <input type="checkbox" checked={checked} onChange={e => onCheckedChange(e.target.checked)} {...props} />;
const Select = ({children, ...props}: any) => <select {...props} className={`w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm outline-none focus:ring-2 focus:ring-[#F7D15F] ${props.className||""}`}>{children}</select>;
const SelectItem = ({children, ...props}: any) => <option {...props}>{children}</option>;
const Dialog = ({open, onOpenChange, children}: any) => open ? <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => onOpenChange(false)}><div onClick={e => e.stopPropagation()}>{children}</div></div> : null;
const DialogContent = ({children, className}: any) => <div className={`relative bg-white rounded-2xl p-6 shadow-xl w-full ${className}`}>{children}</div>;
const DialogHeader = ({children}: any) => <div className="mb-4">{children}</div>;
const DialogTitle = ({children}: any) => <h2 className="text-xl font-bold">{children}</h2>;
const DialogFooter = ({children, className}: any) => <div className={`mt-6 flex justify-end gap-2 ${className}`}>{children}</div>;
const Table = ({children, ...props}: any) => <table {...props}>{children}</table>;
const TableHeader = ({children, ...props}: any) => <thead {...props}>{children}</thead>;
const TableRow = ({children, ...props}: any) => <tr {...props}>{children}</tr>;
const TableHead = ({children, ...props}: any) => <th {...props}>{children}</th>;
const TableBody = ({children, ...props}: any) => <tbody {...props}>{children}</tbody>;
const TableCell = ({children, ...props}: any) => <td {...props}>{children}</td>;
const DropdownMenu = ({children}: any) => <div className="relative group">{children}</div>;
const DropdownMenuTrigger = ({children}: any) => <div>{children}</div>;
const DropdownMenuContent = ({children, className}: any) => <div className={`absolute right-0 mt-1 z-20 bg-white border rounded-md shadow-lg hidden group-hover:block ${className}`}>{children}</div>;
const DropdownMenuItem = ({children, ...props}: any) => <button {...props} className="w-full text-left block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100">{children}</button>;
const DropdownMenuLabel = ({children}: any) => <div className="px-4 py-2 text-xs font-semibold text-zinc-500">{children}</div>;
const DropdownMenuSeparator = () => <hr className="my-1"/>;


function KPI({ icon: Icon, label, value, color }: { icon: React.ElementType, label: string, value: string | number, color: string }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-sb-neutral-200 flex items-start gap-4">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${color}20`, color }}>
                <Icon size={20} />
            </div>
            <div>
                <p className="text-2xl font-bold text-sb-neutral-900">{value}</p>
                <p className="text-sm text-sb-neutral-600">{label}</p>
            </div>
        </div>
    )
}

// ===============================
// Mock data and types adapted to SSOT
// ===============================

const getChannelInfo = (order?: OrderSellOut, account?: Account) => {
    if (order?.source === 'SHOPIFY') return { label: "Online (Shopify)", className: "bg-emerald-100 text-emerald-900 border-emerald-200" };
    if (order?.totalAmount === 0) return { label: "Muestras (0€)", className: "bg-purple-100 text-purple-900 border-purple-200" };
    if (account?.type === 'DISTRIBUIDOR') return { label: "Distribuidor", className: "bg-sky-100 text-sky-900 border-sky-200" };
    return { label: "Venta Directa", className: "bg-zinc-100 text-zinc-900 border-zinc-200" };
}

// ===============================
// Helpers lógicos (null-safe) — testables
// ===============================
export const hasDimsAndWeight = (row: any) => {
  const w = Number(row?.logistics?.weightKg || 0);
  const d = row?.logistics?.dimsCm || {};
  return w > 0 && ["l", "w", "h"].every((k) => Number(d?.[k] || 0) > 0);
};
export const hasContactInfo = (row: Account) => Boolean(row?.phone) && Boolean(row?.address);
export const canGenerateDeliveryNote = (row: Shipment) => Boolean(row.checks?.visualOk);
export const canGenerateLabel = (row: Shipment, order: OrderSellOut) => Boolean(order.invoiceId) && Boolean(row.carrier) && hasDimsAndWeight(row);
export const canMarkShipped = (row: Shipment) => Boolean(row.labelUrl);

export const pendingReasons = (row: Shipment, order: OrderSellOut): string[] => {
  const reasons: string[] = [];
  if (!row.checks?.visualOk) reasons.push("Visual OK");
  if (!order.invoiceId) reasons.push("Albarán/Factura");
  if (!row.carrier || !hasDimsAndWeight(row)) reasons.push("Srv/Peso/Dim");
  if (!row.labelUrl) reasons.push("Etiqueta");
  return Array.from(new Set(reasons));
};


// ===============================
// Diálogo Validar Pedido (lotes + visual + dims/weight + servicio)
// ===============================
const ValidateDialog: React.FC<{ open: boolean; onOpenChange: (v: boolean) => void; order: Shipment | null; onSave: (payload: any) => void; }> = ({ open, onOpenChange, order, onSave }) => {
  const [visualOk, setVisualOk] = React.useState(false);
  const [lotMap, setLotMap] = React.useState<Record<string, { lotId: string; qty: number }[]>>({});
  const [weight, setWeight] = React.useState<number | "">(0);
  const [dims, setDims] = React.useState<{ l: number | ""; w: number | ""; h: number | "" }>({ l: "", w: "", h: "" });
  const [picker, setPicker] = React.useState<string>("");
  const [packer, setPacker] = React.useState<string>("");
  const [carrier, setCarrier] = React.useState<string>("");

  useEffect(() => {
    if(order) {
        setVisualOk(Boolean(order.checks?.visualOk));
        setPicker(order.packedById || "");
        setPacker(order.packedById || "");
        setCarrier(order.carrier || "");
        // Simplified lotMap initialization
        const initialLotMap: Record<string, { lotId: string; qty: number }[]> = {};
        order.lines.forEach(line => {
            if(!initialLotMap[line.sku]) initialLotMap[line.sku] = [];
            if (line.lotNumber) {
                initialLotMap[line.sku].push({lotId: line.lotNumber, qty: line.qty});
            }
        })
        setLotMap(initialLotMap);
    }
  }, [order]);


  const setLot = (sku: string, index: number, field: "lotId" | "qty", value: string) => {
    setLotMap((prev) => {
      const rows = prev[sku] ? [...prev[sku]] : [];
      while (rows.length <= index) rows.push({ lotId: "", qty: 0 });
      const nextRow = { ...rows[index], [field]: field === "qty" ? Number(value) : value } as any;
      const next = { ...prev, [sku]: rows.map((r, i) => (i === index ? nextRow : r)) };
      return next;
    });
  };

  const addLotRow = (sku: string) => setLotMap((p) => ({ ...p, [sku]: [...(p[sku] ?? []), { lotId: "", qty: 0 }] }));
  const removeEmpty = (m: typeof lotMap) => Object.fromEntries(Object.entries(m).map(([k, arr]) => [k, arr.filter((r) => r.lotId && r.qty > 0)]));

  const handleSave = () => onSave({ visualOk, lotMap: removeEmpty(lotMap), weightKg: weight || 0, dimsCm: { l: Number(dims.l || 0), w: Number(dims.w || 0), h: Number(dims.h || 0) }, picker: picker || "", packer: packer || "", carrier: carrier || undefined });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Validar pedido — {order?.id}</DialogTitle>
          <p className="text-sm text-zinc-500">Asigna lotes, marca Visual OK, añade peso/dimensiones y elige servicio.</p>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500">Servicio de envío</label>
            <Select value={carrier || ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCarrier(e.target.value)}>
                <option value="" disabled>Elige servicio</option>
                <option value="seur">SEUR Frío</option>
                <option value="correos_express">Correos Express</option>
                <option value="local_delivery">Entrega Local</option>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-zinc-500">Peso (kg)</label>
              <Input type="number" value={weight as any} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeight(e.target.value ? Number(e.target.value) : "")} />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Largo (cm)</label>
              <Input type="number" value={(dims.l as any) ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDims({ ...dims, l: e.target.value ? Number(e.target.value) : "" })} />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Ancho (cm)</label>
              <Input type="number" value={(dims.w as any) ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDims({ ...dims, w: e.target.value ? Number(e.target.value) : "" })} />
            </div>
            <div className="col-span-3">
              <label className="text-xs text-zinc-500">Alto (cm)</label>
              <Input type="number" value={(dims.h as any) ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDims({ ...dims, h: e.target.value ? Number(e.target.value) : "" })} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-xs text-zinc-500">Picker</label>
            <Input placeholder="Nombre de quien hace picking" value={picker ?? ""} onChange={(e) => setPicker(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Packer</label>
            <Input placeholder="Nombre de quien embala" value={packer ?? ""} onChange={(e) => setPacker(e.target.value)} />
          </div>
        </div>

        <div className="border rounded-xl p-3 mt-4">
          <p className="font-medium mb-2">Asignación de lotes</p>
          <div className="space-y-4">
            {order?.lines?.map((it: any) => (
              <div key={it.sku} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{it.name || it.sku}</p>
                    <p className="text-xs text-zinc-500">SKU {it.sku} · Cantidad solicitada: {it.qty} {it.unit}</p>
                  </div>
                  <SBButton onClick={() => addLotRow(it.sku)}><Plus className="w-4 h-4 mr-2"/>Añadir lote</SBButton>
                </div>
                <div className="space-y-2">
                  {(lotMap[it.sku] ?? [{ lotId: "", qty: 0 }]).map((row, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                      <div className="col-span-3">
                        <Input placeholder="ID Lote (escanea o escribe)" value={row.lotId} onChange={(e) => setLot(it.sku, idx, "lotId", e.target.value)} />
                      </div>
                      <div>
                        <Input placeholder="Qty" type="number" value={row.qty || ""} onChange={(e) => setLot(it.sku, idx, "qty", e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Checkbox id="visual-ok" checked={visualOk} onCheckedChange={(v:any) => setVisualOk(Boolean(v))} />
          <label htmlFor="visual-ok" className="text-sm">Revisión visual completada — producto en perfectas condiciones</label>
        </div>

        <DialogFooter className="mt-6">
          <SBButton variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</SBButton>
          <SBButton onClick={handleSave}><CheckCircle2 className="w-4 h-4 mr-2"/>Guardar validación</SBButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// ===============================
// Panel principal
// ===============================
export default function LogisticsPage() {
  const { data: santaData, setData } = useData();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [channel, setChannel] = useState<string>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [openValidate, setOpenValidate] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Shipment | null>(null);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);

  const { shipments, orders, accounts } = useMemo(() => ({
      shipments: santaData?.shipments || [],
      orders: santaData?.ordersSellOut || [],
      accounts: santaData?.accounts || [],
  }), [santaData]);

  const orderMap = useMemo(() => new Map(orders.map(o => [o.id, o])), [orders]);
  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

  const filtered = useMemo(() => shipments.filter(s => {
    const order = orderMap.get(s.orderId);
    const account = order ? accountMap.get(order.accountId) : undefined;
    const channelInfo = getChannelInfo(order, account);

    const st = (status === "all" || s.status === status);
    const ch = (channel === "all" || (channel === 'shopify' && order?.source === 'SHOPIFY') || (channel === 'muestra' && order?.totalAmount === 0) || (channel === 'distribuidor' && account?.type === 'DISTRIBUIDOR'));
    const query = (q.trim() === "" || s.id.includes(q) || (account?.name || "").toLowerCase().includes(q.toLowerCase()));
    
    return st && ch && query;
  }), [shipments, status, channel, q, orderMap, accountMap]);

  const kpis = useMemo(() => ({
    pending: shipments.filter(r => ["pending", "picking"].includes(r.status)).length,
    validated: shipments.filter(r => r.status === "ready_to_ship").length,
    shipped: shipments.filter(r => r.status === "shipped").length,
    otif: 96, // mock
  }), [shipments]);

  const bulkSetStatus = (next: ShipmentStatus) => {
    if (!santaData) return;
    const updatedShipments = santaData.shipments.map(s => selected.includes(s.id) ? { ...s, status: next } : s);
    setData({ ...santaData, shipments: updatedShipments });
    setSelected([]);
  };

  const openValidateFor = (row: Shipment) => { setCurrentOrder(row); setOpenValidate(true); };

  const handleSaveValidation = (payload: any) => {
    if (!santaData || !currentOrder) return;
    const updatedShipments: Shipment[] = santaData.shipments.map(s => s.id === currentOrder.id ? { 
        ...s, 
        status: "ready_to_ship",
        carrier: payload.carrier,
        packedById: payload.packer,
        checks: { ...s.checks, visualOk: payload.visualOk },
        // Lógica para actualizar líneas con lotes vendría aquí
    } : s);
     setData({ ...santaData, shipments: updatedShipments });
    setOpenValidate(false);
  };
  
  const generateDeliveryNote = (row: Shipment) => {
     if (!canGenerateDeliveryNote(row)) { alert("Primero marca Visual OK en Validar."); return; }
     if(!santaData) return;
     const order = orderMap.get(row.orderId);
     if(!order) return;

     const updatedOrders = santaData.ordersSellOut.map(o => o.id === order.id ? { ...o, invoiceId: o.invoiceId || `ALB-${Math.floor(Math.random()*90000+10000)}` } : o);
     setData({ ...santaData, ordersSellOut: updatedOrders });
     alert(`Albarán ${updatedOrders.find(o=>o.id === order.id)?.invoiceId} generado para envío ${row.id}`);
  };

  const generateLabel = (row: Shipment) => {
    const order = orderMap.get(row.orderId);
    if (!order || !canGenerateLabel(row, order)) { alert("Para la etiqueta necesitas: Albarán + Servicio + Peso y Dimensiones."); return; }
    if(!santaData) return;
    const updatedShipments: Shipment[] = santaData.shipments.map(r => r.id === row.id ? { ...r, labelUrl: "https://label.example/mock.pdf", tracking: `SC-${Math.floor(Math.random()*900000)}` } : r);
    setData({ ...santaData, shipments: updatedShipments });
  };

  const markShipped = (row: Shipment) => {
    if(!santaData) return;
    const updatedShipments: Shipment[] = santaData.shipments.map(r => r.id === row.id ? { ...r, status: "shipped" } : r);
    setData({ ...santaData, shipments: updatedShipments });
  };

  type RowAction = { id: string; label: string; icon: React.ReactNode; onClick: () => void; available: boolean; pendingReason?: string };
  const buildRowActions = (row: Shipment): RowAction[] => {
    const order = orderMap.get(row.orderId);
    if(!order) return [];
    const actions: RowAction[] = [
      { id: "sheet", label: "Imprimir hoja de pedido", icon: <Printer className="w-4 h-4"/>, onClick: () => alert(`Imprimiendo hoja para ${row.id}`), available: true },
      { id: "validate", label: "Validar (lotes + visual)", icon: <BadgeCheck className="w-4 h-4"/>, onClick: () => openValidateFor(row), available: true },
      { id: "delivery", label: "Generar albarán", icon: <FileText className="w-4 h-4"/>, onClick: () => generateDeliveryNote(row), available: canGenerateDeliveryNote(row), pendingReason: "Requiere Visual OK" },
      { id: "label", label: "Generar etiqueta", icon: <Truck className="w-4 h-4"/>, onClick: () => generateLabel(row), available: !!order && canGenerateLabel(row, order), pendingReason: "Requiere Albarán + Servicio" },
      { id: "ship", label: "Marcar enviado", icon: <PackageCheck className="w-4 h-4"/>, onClick: () => markShipped(row), available: canMarkShipped(row), pendingReason: "Requiere Etiqueta" },
    ];
    return showOnlyAvailable ? actions.filter(a => a.available) : actions;
  };

  const cols: SBCol<{row: Shipment, order?: OrderSellOut, account?: Account}>[] = [
      { key: 'select', header: '', render: ({row}) => <Checkbox checked={selected.includes(row.id)} onCheckedChange={(v:any) => setSelected((p) => v ? [...p, row.id] : p.filter(id => id !== row.id))} />},
      { key: 'id', header: 'ID', render: ({row, order}) => <div><p className="font-medium">{row.id}</p>{order?.source === 'SHOPIFY' && <p className="text-xs text-zinc-500">Shopify</p>}</div>},
      { key: 'date', header: 'Fecha', render: ({row}) => <div className="text-sm">{new Date(row.createdAt).toLocaleDateString('es-ES')}</div>},
      { key: 'channel', header: 'Canal / Tipo', render: ({order, account}) => {
          const channelInfo = getChannelInfo(order, account);
          return <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs ${channelInfo.className}`}>{channelInfo.label}</span>
      }},
      { key: 'customer', header: 'Cliente', render: ({account}) => <div><p className="text-sm font-medium">{account?.name || 'N/A'}</p><p className="text-xs text-zinc-500">{account?.city}</p></div>},
      { key: 'items', header: 'Artículos', render: ({row}) => (
        <ul className="text-sm space-y-1">
          {row.lines.map((it: any) => (
            <li key={it.sku} className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">{it.sku}</Badge>
              <span>{it.name}</span>
              <span className="text-zinc-500">×{it.qty}</span>
            </li>
          ))}
        </ul>
      )},
      { key: 'status', header: 'Estado', render: ({row}) => {
          const style = STATUS_STYLES[row.status as keyof typeof STATUS_STYLES] || STATUS_STYLES['pending'];
          return <span className={`inline-flex items-center px-2 py-1 rounded-md border text-xs ${style.bg} ${style.color}`}>{style.label}</span> 
      }},
      { key: 'actions', header: 'Acciones', render: ({row}) => (
        <div className="relative group">
            <DropdownMenuTrigger>
                <SBButton variant="secondary"><MoreHorizontal className="w-4 h-4"/></SBButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {buildRowActions(row).map((a) => (
                <DropdownMenuItem key={a.id} onClick={a.onClick} disabled={!a.available} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">{a.icon}<span>{a.label}</span></div>
                  {!a.available && !showOnlyAvailable && a.pendingReason && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">{a.pendingReason}</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </div>
      )},
  ];

  const tableRows = useMemo(() => filtered.map(row => ({
      id: row.id,
      row,
      order: orderMap.get(row.orderId),
      account: accountMap.get(orderMap.get(row.orderId)?.accountId || '')
  })), [filtered, orderMap, accountMap]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Logística de Salidas</h1>
          <p className="text-sm text-zinc-500">Confirmado → picking → validación → albarán → etiqueta → envío. Con trazabilidad por lote.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI icon={Package} label="Pendientes" value={kpis.pending} color="#f59e0b" />
        <KPI icon={BadgeCheck} label="Validados" value={kpis.validated} color="#0d9488" />
        <KPI icon={Truck} label="Enviados" value={kpis.shipped} color="#0ea5e9" />
        <KPI icon={CheckCircle2} label="OTIF %" value={`${kpis.otif}%`} color="#16a34a" />
      </div>

      {/* Filtros y acciones masivas */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <div className="flex gap-2 items-center w-full md:w-auto">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
                <Input className="pl-9" placeholder="Buscar por ID o cliente" value={q} onChange={(e:any) => setQ(e.target.value)} />
              </div>
              <Select value={status} onChange={(e:any) => setStatus(e.target.value)}>
                  <option value="all">Todos los estados</option>
                  <option value="pending">Pendiente</option>
                  <option value="picking">Picking</option>
                  <option value="ready_to_ship">Validado</option>
                  <option value="shipped">Enviado</option>
              </Select>
               <Select value={channel} onChange={(e:any) => setChannel(e.target.value)}>
                  <option value="all">Todos los canales</option>
                  <option value="shopify">Online (Shopify)</option>
                  <option value="muestra">Muestras (0€)</option>
                  <option value="distribuidor">Distribuidor</option>
              </Select>
            </div>
            <div className="flex gap-2">
              <SBButton variant="secondary" disabled={selected.length === 0} onClick={() => bulkSetStatus("ready_to_ship")}><BadgeCheck className="w-4 h-4 mr-2"/>Validar</SBButton>
              <SBButton variant="secondary" disabled={selected.length === 0} onClick={() => bulkSetStatus("shipped")}><Truck className="w-4 h-4 mr-2"/>Marcar enviado</SBButton>
              <SBButton variant="secondary"><FileDown className="w-4 h-4 mr-2"/>Exportar CSV</SBButton>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla principal */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-500">Pedidos</CardTitle></CardHeader>
        <CardContent>
            <DataTableSB rows={tableRows} cols={cols} />
        </CardContent>
      </Card>

      {/* Paneles secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Escaneo y utilidades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Escanea ID de pedido / lote / SKU" />
              <SBButton variant="secondary"><Clipboard className="w-4 h-4 mr-2"/>Escanear</SBButton>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Incidencias y devoluciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <SBButton variant="secondary"><AlertTriangle className="w-4 h-4 mr-2"/>Nueva incidencia</SBButton>
              <SBButton variant="secondary"><PackageOpen className="w-4 h-4 mr-2"/>Abrir devolución</SBButton>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Auditoría y trazabilidad</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li>10:02 — SH-240915-001 importado de <span className="font-medium">Shopify</span> (unfulfilled).</li>
              <li>10:15 — SM-240915-002 validado <span className="font-medium">Muestra</span>, Visual OK, srv Standard.</li>
              <li>10:22 — SO-240915-003 etiqueta Sendcloud creada. Tracking SC-TRACK-9988.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de validación */}
      <ValidateDialog open={openValidate} onOpenChange={setOpenValidate} order={currentOrder} onSave={handleSaveValidation} />
    </div>
  );
}
