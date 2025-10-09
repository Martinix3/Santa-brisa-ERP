// src/features/warehouse/components/ValidateDialog.tsx
"use client";
import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SBDialog, SBDialogContent } from "@/components/ui/SBDialog";
import { SBButton, Input, Select } from '@/components/ui/ui-primitives';
import type { Shipment, ShipmentLine } from '@/domain/ssot';
import { validateShipment } from '@/server/actions/logistics.actions';
import { useData } from '@/lib/dataprovider';

export function ValidateDialog({ open, onOpenChange, shipment }: { 
    open: boolean; 
    onOpenChange: (v: boolean) => void; 
    shipment: Shipment | null; 
}) {
    const { currentUser } = useData();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [visualOk, setVisualOk] = useState(false);
    const [lotMap, setLotMap] = useState<Record<string, { lotNumber: string; qty: number }[]>>({});
    const [carrier, setCarrier] = useState<string>("");

    useEffect(() => {
        if (shipment) {
            setVisualOk(Boolean(shipment.checks?.visualOk));
            setCarrier(shipment.carrier || "");
            const initialLotMap: Record<string, { lotNumber: string; qty: number }[]> = {};
            shipment.lines.forEach((line: ShipmentLine) => {
                const itemKey = line.itemId;
                if (!initialLotMap[itemKey]) initialLotMap[itemKey] = [];
                if (line.lotNumber) {
                    initialLotMap[itemKey].push({ lotNumber: line.lotNumber, qty: line.qty });
                }
            });
            setLotMap(initialLotMap);
        }
    }, [shipment]);

    const setLot = (sku: string, index: number, field: "lotNumber" | "qty", value: string) => {
        setLotMap((prev) => {
            const rows = prev[itemId] ? [...prev[itemId]] : [];
            while (rows.length <= index) rows.push({ lotNumber: "", qty: 0 });
            const nextRow = { ...rows[index], [field]: field === "qty" ? Number(value) : value } as any;
            const next = { ...prev, [itemId]: rows.map((r, i) => (i === index ? nextRow : r)) };
            return next;
        });
    };

    const handleSave = () => {
        if (!shipment) return;
        
        startTransition(async () => {
            try {
                await validateShipment({ 
                    shipmentId: shipment.id,
                    userId: currentUser?.id || 'system',
                    lots: Object.values(lotMap).flat().map(l => ({sku: Object.keys(lotMap).find(k => lotMap[k].includes(l))!, ...l}))
                });
                toast.success("Envío validado con éxito.");
                onOpenChange(false);
                router.refresh();
            } catch (e: any) {
                toast.error(`Error al validar: ${e.message}`);
            }
        });
    };

    return (
        <SBDialog open={open} onOpenChange={onOpenChange}>
            <SBDialogContent
                title={`Validar envío — ${shipment?.id}`}
                description="Asigna lotes, marca Visual OK, añade peso/dimensiones y elige servicio."
                onSubmit={(e: React.FormEvent) => { e.preventDefault(); handleSave(); }}
                primaryAction={{ label: isPending ? "Guardando..." : "Guardar validación", onClick: handleSave, disabled: isPending }}
                secondaryAction={{ label: "Cancelar", onClick: () => onOpenChange(false) }}
                maxWidth="40rem"
            >
                <div className="space-y-4">
                    {/* Form fields here, adapted from the original component */}
                    <div className="border rounded-xl p-3 mt-4">
                        <p className="font-medium mb-2">Asignación de lotes</p>
                        <div className="space-y-4">
                            {shipment?.lines?.map((it: any) => (
                                <div key={it.itemId} className="border rounded-lg p-3">
                                    <p className="font-medium">{it.name || it.itemId}</p>
                                    <div className="space-y-2 mt-2">
                                        {(lotMap[it.itemId] ?? [{ lotNumber: "", qty: 0 }]).map((row, idx) => (
                                            <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                                                <div className="col-span-3">
                                                    <Input placeholder="ID Lote" value={row.lotNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLot(it.itemId, idx, "lotNumber", e.target.value)} />
                                                </div>
                                                <div>
                                                    <Input placeholder="Qty" type="number" value={row.qty || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLot(it.itemId, idx, "qty", e.target.value)} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </SBDialogContent>
        </SBDialog>
    );
}
