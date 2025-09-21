
"use client";
import React, { useMemo, useState, useEffect } from "react";
import { Printer, PackageCheck, Truck, CheckCircle2, Search, Plus, FileText, ClipboardList, Boxes, PackageOpen, BadgeCheck, AlertTriangle, Settings, Clipboard, Ruler, Weight, MoreHorizontal, Check as CheckIcon, FileDown, Package, Info, X } from "lucide-react";
import { SBButton, SBCard, Input, Select, STATUS_STYLES } from '@/components/ui/ui-primitives';
import { useData } from '@/lib/dataprovider';
import type { Shipment, OrderSellOut, Account, ShipmentStatus, ShipmentLine, AccountType, Party } from '@/domain/ssot';
import { SBDialog, SBDialogContent } from "@/components/ui/SBDialog";
import { generatePackingSlip } from './actions';
import { canGenerateDeliveryNote, canGenerateLabel, canMarkShipped } from "@/lib/logistics.helpers";
import { NewShipmentDialog } from "@/features/warehouse/components/NewShipmentDialog";
import { upsertMany } from "@/lib/dataprovider/server";

// ===============================
// UI Components (Re-localizados para simplicidad)
// ===============================

const Button = ({variant, className, ...props}: any) => <button className={`${variant} ${className}`} {...props}/>;
const Card = ({children, className}: any) => <div className={`border rounded-xl bg-white shadow-sm ${className}`}>{children}</div>
const CardHeader = ({children, className}: any) => <div className={`p-6 pb-2 ${className}`}>{children}</div>
const CardTitle = ({children, className}: any) => <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
const CardDescription = ({children, className}: any) => <p className={`text-sm text-zinc-500 ${className}`}>{children}</p>
const CardContent = ({children, className}: any) => <div className={`p-6 pt-0 ${className}`}>{children}</div>

const Badge = ({variant, className, ...props}: any) => <span className={`${variant} ${className}`} {...props} />;
const Checkbox = ({checked, onCheckedChange, ...props}: any) => <input type="checkbox" checked={checked} onChange={e => onCheckedChange(e.target.checked)} {...props} />;

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
    if (!account) return { label: "N/A", className: "bg-zinc-100 text-zinc-900 border-zinc-200" };

    if (account.type === 'ONLINE') return { label: "Online", className: "bg-emerald-100 text-emerald-900 border-emerald-200" };
    if (order?.totalAmount === 0) return { label: "Muestras (0€)", className: "bg-purple-100 text-purple-900 border-purple-200" };
    if ((account as any).type === 'DISTRIBUIDOR') return { label: "Distribuidor", className: "bg-sky-100 text-sky-900 border-sky-200" };
    return { label: account.type, className: "bg-zinc-100 text-zinc-900 border-zinc-200" };
}

// ===============================
// Diálogo Validar Pedido (lotes + visual + dims/weight + servicio)
// ===============================
const ValidateDialog: React.FC<{ open: boolean; onOpenChange: (v: boolean) => void; shipment: Shipment | null; onSave: (payload: any) => void; }> = ({ open, onOpenChange, shipment: shipment, onSave }) => {
  const [visualOk, setVisualOk] = React.useState(false);
  const [lotMap, setLotMap] = React.useState<Record<string, { lotId: string; qty: number }[]>>({});
  const [weight, setWeight] = React.useState<number | "">(0);
  const [dims, setDims] = React.useState<{ l: number | ""; w: number | ""; h: number | "" }>({ l: "", w: "", h: "" });
  const [picker, setPicker] = React.useState<string>("");
  const [packer, setPacker] = React.useState<string>("");
  const [carrier, setCarrier] = React.useState<string>("");

  useEffect(() => {
    if(shipment) {
        setVisualOk(Boolean(shipment.checks?.visualOk));
        setPicker(shipment.packedById || "");
        setPacker(shipment.packedById || "");
        setCarrier(shipment.carrier || "");
        // Simplified lotMap initialization
        const initialLotMap: Record<string, { lotId: string; qty: number }[]> = {};
        shipment.lines.forEach((line: ShipmentLine) => {
            if(!initialLotMap[line.sku]) initialLotMap[line.sku] = [];
            if (line.lotNumber) {
                initialLotMap[line.sku].push({lotId: line.lotNumber, qty: line.qty});
            }
        })
        setLotMap(initialLotMap);
    }
  }, [shipment]);


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

  const handleSave = () => {
    const logistics = {
        weightKg: weight || 0,
        dimsCm: { l: Number(dims.l || 0), w: Number(dims.w || 0), h: Number(dims.h || 0) }
    };
    onSave({ visualOk, lotMap: removeEmpty(lotMap), logistics, picker: picker || "", packer: packer || "", carrier: carrier || undefined });
  };

  return (
    <SBDialog open={open} onOpenChange={onOpenChange}>
      <SBDialogContent
        title={`Validar envío — ${shipment?.id}`}
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
                {shipment?.lines?.map((it: any) => (
                  <div key={it.sku} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{it.name || it.sku}</p>
                        <p className="text-xs text-zinc-500">SKU {it.sku} · Cantidad solicitada: {it.qty} {it.uom}</p>
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
  const { data: santaData, setData, saveCollection } = useData();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [channel, setChannel] = useState<string>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [openValidate, setOpenValidate] = useState(false);
  const [openNewShipment, setOpenNewShipment] = useState(false);
  const [currentShipment, setCurrentShipment] = useState<Shipment | null>(null);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);
  
  const [generatingSlip, setGeneratingSlip] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const { shipments, orders, accounts, parties } = useMemo(() => ({
      shipments: santaData?.shipments || [],
      orders: santaData?.ordersSellOut || [],
      accounts: santaData?.accounts || [],
      parties: santaData?.parties || [],
  }), [santaData]);

  const orderMap = useMemo(() => {
    const map = new Map<string, OrderSellOut>();
    orders.forEach(o => map.set(o.id, o));
    return map;
  }, [orders]);
  
  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const partyMap = useMemo(() => new Map(parties.map(p => [p.id, p])), [parties]);

  const filtered = useMemo(() => shipments.filter(s => {
    const order = orderMap.get(s.orderId);
    const account = order ? accountMap.get(order.accountId) : undefined;

    const st = (status === "all" || s.status === status);
    const ch = (channel === "all" || (account && account.type.toLowerCase() === channel.toLowerCase()));
    const query = (q.trim() === "" || s.id.includes(q) || (account?.name || "").toLowerCase().includes(q.toLowerCase()));
    
    return st && ch && query;
  }), [shipments, status, channel, q, orderMap, accountMap]);

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

  const openValidateFor = (row: Shipment) => { setCurrentShipment(row); setOpenValidate(true); };

  const handleSaveValidation = (payload: any) => {
    if (!santaData || !currentShipment) return;
    const updatedShipments: Shipment[] = santaData.shipments.map(s => s.id === currentShipment.id ? {
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
  
  const generateDeliveryNote = (shipment: Shipment) => {
     if (!canGenerateDeliveryNote(shipment)) { 
        setNotification({ type: 'error', message: 'Primero marca "Visual OK" en la validación del pedido.' });
        return; 
     }
     if(!santaData) return;
     const updatedShipments = santaData.shipments.map(s => s.id === shipment.id ? { ...s, holdedDeliveryId: s.holdedDeliveryId || `ALB-${Math.floor(Math.random()*90000+10000)}` } : s);
     setData({ ...santaData, shipments: updatedShipments });
     setNotification({ type: 'success', message: `Albarán ${updatedShipments.find(s=>s.id === shipment.id)?.holdedDeliveryId} generado.`});
  };

  const handleGeneratePackingSlip = async (shipmentId: string) => {
    setGeneratingSlip(shipmentId);
    setNotification(null);
    try {
      const result = await generatePackingSlip(shipmentId);
      if (result.error) {
        setNotification({type: 'error', message: `Error: ${result.error}`});
        return;
      }
      if (result.pdfDataUri) {
          const link = document.createElement('a');
          link.href = result.pdfDataUri;
          link.download = `packing-slip-${shipmentId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setNotification({type: 'success', message: 'Hoja de pedido generada y descargada.'});
      }
    } catch (e: any) {
      setNotification({type: 'error', message: e.message || 'Error al generar la hoja de pedido.'});
      console.error(e);
    } finally {
        setGeneratingSlip(null);
    }
  };
  
  const handleSaveNewShipment = async (shipment: Omit<Shipment, 'id' | 'createdAt'>) => {
    const newShipment = {
        ...shipment,
        id: `shp_${Date.now()}`,
        createdAt: new Date().toISOString(),
    };
    await saveCollection('shipments', [...shipments, newShipment]);
    setOpenNewShipment(false);
    setNotification({ type: 'success', message: `Envío ${newShipment.id} creado con éxito.` });
  };

  const generateLabel = (shipment: Shipment) => {
    if (!canGenerateLabel(shipment)) { 
      setNotification({ type: 'error', message: 'Para la etiqueta necesitas: Albarán + Servicio + Peso y Dimensiones.' });
      return; 
    }
    if(!santaData) return;
    const updatedShipments: Shipment[] = santaData.shipments.map(r => r.id === shipment.id ? { ...r, labelUrl: "https://label.example/mock.pdf", tracking: `SC-TRACK-9988` } : r);
    setData({ ...santaData, shipments: updatedShipments });
    setNotification({ type: 'success', message: 'Etiqueta de envío generada.' });
  };

  const markShipped = (shipment: Shipment) => {
    if(!santaData) return;
    const updatedShipments: Shipment[] = santaData.shipments.map(r => r.id === shipment.id ? { ...r, status: "shipped" } : r);
    setData({ ...santaData, shipments: updatedShipments });
    setNotification({ type: 'success', message: `Envío ${shipment.id} marcado como "Enviado".`});
  };

  type RowAction = { id: string; label: string; icon: React.ReactNode; onClick: () => void; available: boolean; pendingReason?: string };
  const buildRowActions = (shipment: Shipment): RowAction[] => {
    const actions: RowAction[] = [
      { id: "packing_slip", label: "Imprimir hoja de pedido (IA)", icon: <Printer className="w-4 h-4"/>, onClick: () => handleGeneratePackingSlip(shipment.id), available: true },
      { id: "validate", label: "Validar (lotes + visual)", icon: <BadgeCheck className="w-4 h-4"/>, onClick: () => openValidateFor(shipment), available: true },
      { id: "delivery", label: "Generar albarán", icon: <FileText className="w-4 h-4"/>, onClick: () => generateDeliveryNote(shipment), available: canGenerateDeliveryNote(shipment), pendingReason: "Requiere Visual OK" },
      { id: "label", label: "Generar etiqueta", icon: <Truck className="w-4 h-4"/>, onClick: () => generateLabel(shipment), available: canGenerateLabel(shipment), pendingReason: "Requiere Albarán + Servicio" },
      { id: "ship", label: "Marcar enviado", icon: <PackageCheck className="w-4 h-4"/>, onClick: () => markShipped(shipment), available: canMarkShipped(shipment), pendingReason: "Requiere Etiqueta" },
    ];
    return showOnlyAvailable ? actions.filter(a => a.available) : actions;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Logística de Salidas</h1>
          <p className="text-sm text-zinc-500">Confirmado → picking → validación → albarán → etiqueta → envío. Con trazabilidad por lote.</p>
        </div>
        <SBButton onClick={() => setOpenNewShipment(true)}>
            <Plus size={16} className="mr-2"/> Nuevo Envío
        </SBButton>
      </div>
      
      {notification && (
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <Info size={16}/>
          <p className="text-sm font-medium">{notification.message}</p>
          <button onClick={() => setNotification(null)} className="ml-auto p-1 rounded-full hover:bg-black/10">
            <X size={14}/>
          </button>
        </div>
      )}

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
         <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-600">
              <tr>
                <th className="p-3 w-10"><Checkbox onCheckedChange={(checked: boolean) => setSelected(checked ? filtered.map(s => s.id) : [])}/></th>
                <th className="p-3 w-32 font-semibold">ID Envío</th>
                <th className="p-3 font-semibold">Fecha</th>
                <th className="p-3 font-semibold">Canal</th>
                <th className="p-3 font-semibold">Cliente</th>
                <th className="p-3 font-semibold">Artículos</th>
                <th className="p-3 font-semibold">Estado</th>
                <th className="p-3 w-16 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map(shipment => {
                const order = orderMap.get(shipment.orderId || '');
                const account = accountMap.get(order?.accountId || '');
                const channelInfo = getChannelInfo(order, account);
                const style = STATUS_STYLES[shipment.status as keyof typeof STATUS_STYLES] || STATUS_STYLES['pending'];
                
                return (
                  <tr key={shipment.id} className="hover:bg-zinc-50">
                    <td className="p-3"><Checkbox checked={selected.includes(shipment.id)} onCheckedChange={(checked: boolean) => setSelected(p => checked ? [...p, shipment.id] : p.filter(id => id !== shipment.id))} /></td>
                    <td className="p-3 font-medium font-mono">{shipment.id.substring(0,8)}...</td>
                    <td className="p-3">{new Date(shipment.createdAt).toLocaleDateString('es-ES')}</td>
                    <td className="p-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs ${channelInfo.className}`}>{channelInfo.label}</span></td>
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{shipment?.customerName || 'N/A'}</p>
                        <p className="text-xs text-zinc-500">{shipment?.city}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <ul className="text-sm space-y-1">
                        {shipment.lines.map((it: any) => (
                          <li key={it.sku} className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100">{it.sku}</span>
                            <span>{it.name}</span>
                            <span className="text-zinc-500">×{it.qty}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="p-3"><span className={`inline-flex items-center px-2 py-1 rounded-md border text-xs ${style.bg} ${style.color}`}>{style.label}</span></td>
                    <td className="p-3 text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger>
                              <SBButton variant="secondary" disabled={generatingSlip === shipment.id}>
                                {generatingSlip === shipment.id ? <div className="h-4 w-4 border-2 border-zinc-400 border-t-zinc-700 rounded-full animate-spin"/> : <MoreHorizontal className="w-4 h-4"/>}
                              </SBButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {buildRowActions(shipment).map((a) => (
                              <DropdownMenuItem key={a.id} onClick={a.onClick} disabled={!a.available} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">{a.icon}<span>{a.label}</span></div>
                                {!a.available && !showOnlyAvailable && a.pendingReason && (
                                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">{a.pendingReason}</span>
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
      <ValidateDialog open={openValidate} onOpenChange={setOpenValidate} shipment={currentShipment} onSave={handleSaveValidation} />
      
      {/* Diálogo de nuevo envío */}
       <NewShipmentDialog 
            open={openNewShipment} 
            onClose={() => setOpenNewShipment(false)} 
            onSave={handleSaveNewShipment}
            accounts={accounts || []}
            products={santaData?.products || []}
        />
    </div>
  );
}
