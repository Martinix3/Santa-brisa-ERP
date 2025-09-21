"use client";
import React, { useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { BadgeCheck, FileJson, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import type { SantaData, Account, OrderSellOut, Interaction, Shipment, ProductionOrder, Lot } from '@/domain';
import { SANTA_DATA_COLLECTIONS } from '@/domain';

// =====================================================
// DEFINICIONES DEL ESQUEMA ESPERADO (SSOT)
// =====================================================

const EXPECTED_KEYS: Partial<Record<keyof SantaData, string[]>> = {
    accounts: ['id', 'partyId', 'name', 'type', 'stage', 'ownerId', 'createdAt'],
    ordersSellOut: ['id', 'accountId', 'lines', 'status', 'createdAt', 'currency'],
    interactions: ['id', 'userId', 'accountId', 'kind', 'note', 'createdAt', 'status'],
    shipments: ['id', 'orderId', 'accountId', 'status', 'createdAt', 'lines'],
    productionOrders: ['id', 'sku', 'bomId', 'targetQuantity', 'status', 'createdAt'],
    lots: ['id', 'sku', 'quantity', 'createdAt', 'quality'],
    users: ['id', 'name', 'email', 'role', 'active'],
    parties: ['id', 'name', 'kind', 'createdAt'],
    products: ['id', 'sku', 'name', 'category', 'active'],
    materials: ['id', 'sku', 'name', 'category'],
};

const ENUM_VALIDATIONS: Record<string, { collection: keyof SantaData, field: string, values: Set<string> }> = {
    accountStage: { collection: 'accounts', field: 'stage', values: new Set(['POTENCIAL', 'ACTIVA', 'SEGUIMIENTO', 'FALLIDA', 'CERRADA', 'BAJA']) },
    orderStatus: { collection: 'ordersSellOut', field: 'status', values: new Set(['open', 'confirmed', 'shipped', 'invoiced', 'paid', 'cancelled', 'lost']) },
    shipmentStatus: { collection: 'shipments', field: 'status', values: new Set(['pending', 'picking', 'ready_to_ship', 'shipped', 'delivered', 'cancelled']) },
    prodStatus: { collection: 'productionOrders', field: 'status', values: new Set(['planned', 'released', 'wip', 'done', 'cancelled']) },
    lotQuality: { collection: 'lots', field: 'quality.qcStatus', values: new Set(['hold', 'release', 'reject']) },
    userRole: { collection: 'users', field: 'role', values: new Set(['comercial', 'admin', 'ops', 'owner']) },
};

const KPI_TRACE = {
    'Avg. Ticket': {
        fields: ['totalAmount'],
        collections: ['ordersSellOut']
    },
    'Conversion Rate': {
        fields: ['accountId', 'createdAt'],
        collections: ['accounts', 'ordersSellOut']
    },
    'Production Yield': {
        fields: ['execution.goodBottles', 'targetQuantity'],
        collections: ['productionOrders', 'billOfMaterials']
    },
    'Stock Turnover': {
        fields: ['qty'],
        collections: ['stockMoves', 'inventory']
    },
};

type AuditResult = {
    collection: keyof SantaData;
    totalDocs: number;
    unknownKeys: { docId: string; keys: string[] }[];
    enumViolations: { docId: string; field: string; value: any }[];
};

type KpiReadiness = Record<string, { ready: boolean; missingFields: string[]; missingCollections: string[] }>;

// =====================================================
// COMPONENTES DE UI
// =====================================================

function ResultCard({ title, data, icon: Icon, color }: { title: string, data: any[], icon: React.ElementType, color: string }) {
    const hasIssues = data.length > 0;
    return (
        <SBCard title="">
             <div className={`p-4 border-b ${hasIssues ? `border-${color}-200 bg-${color}-50` : 'border-zinc-200 bg-zinc-50'}`}>
                <div className={`flex items-center gap-2 font-semibold ${hasIssues ? `text-${color}-800` : 'text-zinc-800'}`}>
                    <Icon size={18} />
                    {title}
                    <span className={`px-2 py-0.5 text-xs rounded-full ${hasIssues ? `bg-${color}-200` : 'bg-zinc-200'}`}>{data.length}</span>
                </div>
            </div>
            <div className="p-4 text-xs space-y-2 max-h-48 overflow-y-auto">
                {hasIssues ? data.map((item, i) => (
                    <div key={i} className="p-2 bg-white border rounded-md">
                        <p><span className="font-semibold">Doc:</span> <code className="text-xs">{item.docId}</code></p>
                        {item.keys && <p><span className="font-semibold">Claves desconocidas:</span> {item.keys.join(', ')}</p>}
                        {item.field && <p><span className="font-semibold">Campo:</span> {item.field} | <span className="font-semibold">Valor:</span> &quot;{item.value}&quot;</p>}
                    </div>
                )) : <p className="text-zinc-500 text-center py-4">¡Todo en orden!</p>}
            </div>
        </SBCard>
    );
}

function KpiCard({ name, readiness }: { name: string; readiness: KpiReadiness[string] }) {
    return (
        <div className={`p-4 border rounded-lg ${readiness.ready ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <h4 className="font-semibold flex items-center gap-2">
                {readiness.ready ? <CheckCircle size={16} className="text-green-600" /> : <ShieldAlert size={16} className="text-amber-600" />}
                {name}
            </h4>
            {!readiness.ready && (
                <div className="text-xs mt-2 space-y-1">
                    {readiness.missingCollections.length > 0 && <p><strong className="text-amber-800">Faltan colecciones:</strong> {readiness.missingCollections.join(', ')}</p>}
                    {readiness.missingFields.length > 0 && <p><strong className="text-amber-800">Faltan campos:</strong> {readiness.missingFields.join(', ')}</p>}
                </div>
            )}
        </div>
    );
}

// =====================================================
// PÁGINA PRINCIPAL
// =====================================================

export default function SchemaAuditPage() {
    const { data } = useData();

    const auditResults = useMemo((): AuditResult[] => {
        if (!data) return [];
        return SANTA_DATA_COLLECTIONS.map(collectionName => {
            const collectionData = data[collectionName] as any[] || [];
            const expected = EXPECTED_KEYS[collectionName];

            const result: AuditResult = {
                collection: collectionName,
                totalDocs: collectionData.length,
                unknownKeys: [],
                enumViolations: [],
            };

            if (!collectionData.length) return result;

            collectionData.forEach(doc => {
                // 1. Detección de claves desconocidas
                if (expected) {
                    const docKeys = Object.keys(doc);
                    const unknown = docKeys.filter(k => !expected.includes(k));
                    if (unknown.length > 0) {
                        result.unknownKeys.push({ docId: doc.id, keys: unknown });
                    }
                }
                
                // 2. Validación de Enums
                Object.values(ENUM_VALIDATIONS).forEach(val => {
                    if (val.collection === collectionName) {
                        const fieldValue = val.field.includes('.') 
                            ? val.field.split('.').reduce((o, i) => o?.[i], doc)
                            : doc[val.field];
                        
                        if (fieldValue !== undefined && !val.values.has(fieldValue)) {
                            result.enumViolations.push({ docId: doc.id, field: val.field, value: fieldValue });
                        }
                    }
                });
            });

            return result;
        }).filter(r => r.unknownKeys.length > 0 || r.enumViolations.length > 0);
    }, [data]);

    const kpiReadiness = useMemo((): KpiReadiness => {
        if (!data) return {};
        const readiness: KpiReadiness = {};
        for (const kpiName in KPI_TRACE) {
            const trace = KPI_TRACE[kpiName as keyof typeof KPI_TRACE];
            const missingCollections = trace.collections.filter(c => !data[c as keyof SantaData] || (data[c as keyof SantaData] as any[]).length === 0);
            
            const missingFields: string[] = [];
            if (missingCollections.length === 0) {
                trace.collections.forEach(collName => {
                    const collection = data[collName as keyof SantaData] as any[];
                    if (collection && collection.length > 0) {
                        const sampleDoc = collection[0];
                        trace.fields.forEach(field => {
                            const hasField = field.includes('.')
                                ? field.split('.').reduce((o, i) => o?.[i], sampleDoc) !== undefined
                                : sampleDoc[field] !== undefined;
                            if (!hasField) {
                                missingFields.push(`${collName}.${field}`);
                            }
                        });
                    }
                });
            }

            readiness[kpiName] = {
                ready: missingCollections.length === 0 && missingFields.length === 0,
                missingCollections,
                missingFields,
            };
        }
        return readiness;
    }, [data]);

    const handleExport = () => {
        const exportData = {
            auditTimestamp: new Date().toISOString(),
            schemaViolations: auditResults,
            kpiReadiness,
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `schema_audit_${new Date().toISOString()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    if (!data) return <div className="p-6">Cargando datos para auditoría...</div>;

    return (
        <>
            <ModuleHeader title="Auditoría de Esquema (SSOT)" icon={BadgeCheck} />
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-zinc-600">Detecta inconsistencias de datos contra el Single Source of Truth.</p>
                    </div>
                    <SBButton onClick={handleExport}>
                        <FileJson size={16} /> Exportar Resultados
                    </SBButton>
                </div>
                
                <SBCard title="Trazabilidad de KPIs">
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(kpiReadiness).map(([name, readiness]) => (
                           <KpiCard key={name} name={name} readiness={readiness} />
                        ))}
                    </div>
                </SBCard>

                {auditResults.length > 0 ? (
                    auditResults.map(res => (
                        <div key={res.collection} className="p-4 border rounded-xl bg-white">
                            <h3 className="font-bold text-lg mb-4 capitalize">{res.collection} <span className="text-sm font-normal text-zinc-500">({res.totalDocs} documentos)</span></h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <ResultCard title="Claves Desconocidas" data={res.unknownKeys} icon={ShieldAlert} color="red" />
                                <ResultCard title="Violaciones de Enum" data={res.enumViolations} icon={ShieldAlert} color="amber" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-12 text-center border-2 border-dashed rounded-2xl text-green-700 bg-green-50">
                        <CheckCircle size={48} className="mx-auto mb-4" />
                        <h3 className="text-xl font-bold">¡Todo correcto!</h3>
                        <p>No se encontraron violaciones de esquema en las colecciones de datos.</p>
                    </div>
                )}
            </div>
        </>
    );
}
