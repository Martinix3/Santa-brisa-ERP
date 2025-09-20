
"use client";
import React, { useMemo, useState, useEffect } from "react";
import { Printer, PackageCheck, Truck, CheckCircle2, Search, Plus, FileText, ClipboardList, Boxes, PackageOpen, BadgeCheck, AlertTriangle, Settings, Clipboard, Ruler, Weight, MoreHorizontal, Check as CheckIcon, FileDown, Package } from "lucide-react";
import { SBButton, SBCard, Input, Select, DataTableSB, Col as SBCol, STATUS_STYLES } from '@/components/ui/ui-primitives';
import { useData } from '@/lib/dataprovider';
import type { Shipment, OrderSellOut, Account, ShipmentStatus, ShipmentLine, AccountType } from "@/domain/ssot";
import { SBDialog, SBDialogContent } from "@/components/ui/SBDialog";


// ===============================
// Mock data and types adapted to SSOT
// ===============================

const getChannelInfo = (order?: OrderSellOut, account?: Account) => {
    if (!account) return { label: "N/A", className: "bg-zinc-100 text-zinc-900 border-zinc-200" };
    
    if (account.type === 'ONLINE') return { label: "Online", className: "bg-emerald-100 text-emerald-900 border-emerald-200" };
    if (order?.totalAmount === 0) return { label: "Muestras (0€)", className: "bg-purple-100 text-purple-900 border-purple-200" };
    if (account.type === 'DISTRIBUIDOR') return { label: "Distribuidor", className: "bg-sky-100 text-sky-900 border-sky-200" };
    return { label: account.type, className: "bg-zinc-100 text-zinc-900 border-zinc-200" };
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
        order.lines.forEach((line: ShipmentLine) => {
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
    <SBDialog open={open} onOpenChange={onOpenChange}>
      <SBDialogContent
        title={`Validar pedido — ${order?.id}`}
        description="Asigna lotes, marca Visual OK, añade peso/dimensiones y elige servicio."
        onSubmit={e => { e.preventDefault(); handleSave(); }}
        primaryAction={{label: "Guardar validación", onClick: handleSave}}
        secondaryAction={{label: "Cancelar", onClick: () => onOpenChange(false)}}
        size="lg"
      >
        <div className="space-y-4">
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
                  <Input type="number" value={(weight as any) ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeight(e.target.value ? Number(e.target.value) : "")} />
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
                <Input placeholder="Nombre de quien hace picking" value={picker ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPicker(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Packer</label>
                <Input placeholder="Nombre de quien embala" value={packer ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPacker(e.target.value)} />
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
                            <Input placeholder="ID Lote (escanea o escribe)" value={row.lotId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLot(it.sku, idx, "lotId", e.target.value)} />
                          </div>
                          <div>
                            <Input placeholder="Qty" type="number" value={row.qty || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLot(it.sku, idx, "qty", e.target.value)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <input type="checkbox" id="visual-ok" checked={visualOk} onChange={(e:any) => setVisualOk(Boolean(e.target.checked))} />
              <label htmlFor="visual-ok" className="text-sm">Revisión visual completada — producto en perfectas condiciones</label>
            </div>
        </div>
      </SBDialogContent>
    </SBDialog>
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

  const orderMap = useMemo(() => {
    const map = new Map<string, OrderSellOut>();
    orders.forEach(o => map.set(o.id, o));
    return map;
  }, [orders]);
  
  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

  const filtered = useMemo(() => shipments.filter(s => {
    const order = orders.find(o => o.id === s.orderId);
    const account = order ? accounts.find(a => a.id === order.accountId) : undefined;

    const st = (status === "all" || s.status === status);
    const ch = (channel === "all" || account?.type.toLowerCase() === channel);
    const query = (q.trim() === "" || s.id.includes(q) || (account?.name || "").toLowerCase().includes(q.toLowerCase()));
    
    return st && ch && query;
  }), [shipments, status, channel, q, orders, accounts]);

  const kpis = useMemo(() => ({
    pending: shipments.filter(r => ["pending", "picking"].includes(r.status || '')).length,
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
     const order = orders.find(o => o.id === row.orderId);
     if(!order) return;

     const updatedOrders = santaData.ordersSellOut.map(o => o.id === order.id ? { ...o, invoiceId: o.invoiceId || `ALB-${Math.floor(Math.random()*90000+10000)}` } : o);
     setData({ ...santaData, ordersSellOut: updatedOrders });
     alert(`Albarán ${updatedOrders.find(o=>o.id === order.id)?.invoiceId} generado para envío ${row.id}`);
  };

  const generateLabel = (row: Shipment) => {
    const order = orders.find(o => o.id === row.orderId);
    if (!order || !canGenerateLabel(row, order)) { alert("Para la etiqueta necesitas: Albarán + Servicio + Peso y Dimensiones."); return; }
    if(!santaData) return;
    const updatedShipments: Shipment[] = santaData.shipments.map(r => r.id === row.id ? { ...r, labelUrl: "https://label.example/mock.pdf", tracking: `SC-TRACK-9988` } : r);
    setData({ ...santaData, shipments: updatedShipments });
  };

  const markShipped = (row: Shipment) => {
    if(!santaData) return;
    const updatedShipments: Shipment[] = santaData.shipments.map(r => r.id === row.id ? { ...r, status: "shipped" } : r);
    setData({ ...santaData, shipments: updatedShipments });
  };

  type RowAction = { id: string; label: string; icon: React.ReactNode; onClick: () => void; available: boolean; pendingReason?: string };
  const buildRowActions = (row: Shipment): RowAction[] => {
    const order = orders.find(o => o.id === row.orderId);
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
      { key: 'select', header: '', render: ({row}) => <input type="checkbox" checked={selected.includes(row.id)} onChange={(e:any) => setSelected((p) => e.target.checked ? [...p, row.id] : p.filter(id => id !== row.id))} />},
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
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100">{it.sku}</span>
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
            <SBButton variant="secondary"><MoreHorizontal className="w-4 h-4"/></SBButton>
            <div className="absolute right-0 mt-1 z-20 bg-white border rounded-md shadow-lg hidden group-hover:block w-64">
              <div className="px-4 py-2 text-xs font-semibold text-zinc-500">Acciones</div>
              <hr className="my-1"/>
              {buildRowActions(row).map((a) => (
                <button key={a.id} onClick={a.onClick} disabled={!a.available} className="w-full text-left flex items-center justify-between px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed">
                  <div className="flex items-center gap-2">{a.icon}<span>{a.label}</span></div>
                  {!a.available && !showOnlyAvailable && a.pendingReason && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">{a.pendingReason}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
      )},
  ];

  const tableRows = useMemo(() => filtered.map(row => ({
      id: row.id,
      row,
      order: orderMap.get(row.orderId || ''),
      account: accountMap.get(orderMap.get(row.orderId || '')?.accountId || '')
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

      <SBCard title="">
        <div className="p-4 pt-6 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <div className="flex gap-2 items-center w-full md:w-auto">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
                <Input className="pl-9" placeholder="Buscar por ID o cliente" value={q} onChange={(e:any) => setQ(e.target.value)} />
              </div>
              <Select value={status} onChange={(e:React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}>
                  <option value="all">Todos los estados</option>
                  <option value="pending">Pendiente</option>
                  <option value="picking">Picking</option>
                  <option value="ready_to_ship">Validado</option>
                  <option value="shipped">Enviado</option>
              </Select>
               <Select value={channel} onChange={(e:React.ChangeEvent<HTMLSelectElement>) => setChannel(e.target.value)}>
                  <option value="all">Todos los canales</option>
                  <option value="online">Online</option>
                  <option value="horeca">HORECA</option>
                  <option value="distribuidor">Distribuidor</option>
              </Select>
            </div>
            <div className="flex gap-2">
              <SBButton variant="secondary" disabled={selected.length === 0} onClick={() => bulkSetStatus("ready_to_ship")}><BadgeCheck className="w-4 h-4 mr-2"/>Validar</SBButton>
              <SBButton variant="secondary" disabled={selected.length === 0} onClick={() => bulkSetStatus("shipped")}><Truck className="w-4 h-4 mr-2"/>Marcar enviado</SBButton>
              <SBButton variant="secondary"><FileDown className="w-4 h-4 mr-2"/>Exportar CSV</SBButton>
            </div>
          </div>
        </div>
      </SBCard>

      {/* Tabla principal */}
      <SBCard title="Pedidos">
        <DataTableSB rows={tableRows} cols={cols} />
      </SBCard>

      {/* Paneles secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SBCard title="Escaneo y utilidades">
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Escanea ID de pedido / lote / SKU" />
              <SBButton variant="secondary"><Clipboard className="w-4 h-4 mr-2"/>Escanear</SBButton>
            </div>
          </div>
        </SBCard>

        <SBCard title="Incidencias y devoluciones">
          <div className="p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <SBButton variant="secondary"><AlertTriangle className="w-4 h-4 mr-2"/>Nueva incidencia</SBButton>
              <SBButton variant="secondary"><PackageOpen className="w-4 h-4 mr-2"/>Abrir devolución</SBButton>
            </div>
          </div>
        </SBCard>

        <SBCard title="Auditoría y trazabilidad">
          <ul className="p-4 text-sm space-y-2">
              <li>10:02 — SH-240915-001 importado de <span className="font-medium">Shopify</span> (unfulfilled).</li>
              <li>10:15 — SM-240915-002 validado <span className="font-medium">Muestra</span>, Visual OK, srv Standard.</li>
              <li>10:22 — SO-240915-003 etiqueta Sendcloud creada. Tracking SC-TRACK-9988.</li>
          </ul>
        </SBCard>
      </div>

      {/* Diálogo de validación */}
      <ValidateDialog open={openValidate} onOpenChange={setOpenValidate} order={currentOrder} onSave={handleSaveValidation} />
    </div>
  );
}
