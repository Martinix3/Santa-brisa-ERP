// src/app/(app)/warehouse/logistics/page.tsx
"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { SBButton, Input, Select } from '@/components/ui/ui-primitives';
import { useData } from '@/lib/dataprovider';
import type { Shipment, OrderSellOut, Account } from '@/domain/ssot';
import { createManualShipment } from './actions';
import { toast } from 'sonner';

import { LogisticsKPIs } from "@/features/warehouse/components/LogisticsKPIs";
import { ShipmentsTable } from "@/features/warehouse/components/ShipmentsTable";
import { ValidateDialog } from "@/features/warehouse/components/ValidateDialog";
import { NewShipmentDialog } from "@/features/warehouse/components/NewShipmentDialog";


export default function LogisticsPage() {
  const router = useRouter();
  const { data: santaData } = useData();
  const [isPending, startTransition] = useTransition();

  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [channel, setChannel] = useState<string>("all");
  const [openValidate, setOpenValidate] = useState(false);
  const [openNewShipment, setOpenNewShipment] = useState(false);
  const [currentShipment, setCurrentShipment] = useState<Shipment | null>(null);

  const { shipments, orders, accounts } = useMemo(() => ({
      shipments: santaData?.shipments || [],
      orders: santaData?.ordersSellOut || [],
      accounts: santaData?.accounts || [],
      items: santaData?.items || []
  }), [santaData]);

  const orderMap = useMemo(() => {
    const map = new Map<string, OrderSellOut>();
    orders.forEach(o => map.set(o.id, o));
    return map;
  }, [orders]);
  
  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

  const filtered = useMemo(() => shipments.filter(s => {
    const order = orderMap.get(s.orderId);
    const account = order ? accountMap.get(order.accountId) : undefined;
    
    const accountType = account?.segment?.toLowerCase() ?? '';
    const st = (status === "all" || s.status === status);
    const ch = (channel === "all" || (account && accountType === channel.toLowerCase()));
    const query = (q.trim() === "" || s.id.includes(q) || (account?.name || "").toLowerCase().includes(q.toLowerCase()));
    
    return st && ch && query;
  }), [shipments, status, channel, q, orderMap, accountMap]);

  const openValidateFor = (row: Shipment) => { setCurrentShipment(row); setOpenValidate(true); };

  const handleSaveNewShipment = (shipmentData: Omit<Shipment, 'id'|'createdAt'|'updatedAt'>) => {
    startTransition(async () => {
      try {
        await createManualShipment(shipmentData);
        toast.success("Envío manual encolado para creación.");
        setOpenNewShipment(false);
        router.refresh();
      } catch(e: any) {
        toast.error(`Error al crear envío: ${e.message}`);
      }
    });
  };
  
  const flowParam = searchParams.get('flow')?.toUpperCase();
  if (flowParam === "PLACEMENT") {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Logística no disponible</h1>
        <p className="text-zinc-600 mt-2">La gestión de envíos y logística solo está disponible para el flujo de Ventas Directas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LogisticsKPIs shipments={shipments} />
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex gap-2 items-center w-full md:w-auto">
          <div className="relative flex-grow">
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
         <SBButton onClick={() => setOpenNewShipment(true)}>
            <Plus size={16} className="mr-2"/> Nuevo Envío
        </SBButton>
      </div>
      
      <ShipmentsTable 
        shipments={filtered}
        onValidateShipment={openValidateFor}
      />
      
      {/* Diálogos */}
      <ValidateDialog open={openValidate} onOpenChange={setOpenValidate} shipment={currentShipment} />
      
       <NewShipmentDialog 
            open={openNewShipment} 
            onClose={() => setOpenNewShipment(false)} 
            onSave={handleSaveNewShipment}
            accounts={santaData?.accounts || []}
            items={santaData?.items || []}
        />
    </div>
  );
}