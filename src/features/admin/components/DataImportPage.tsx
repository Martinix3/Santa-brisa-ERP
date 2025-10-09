// src/features/admin/components/DataImportPage.tsx
"use client";

import React, { useState } from 'react';
import { Download, Upload, AlertCircle, CheckCircle, FileText, Users, Building2, ShoppingCart } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import { toast } from 'sonner';
import { SBButton } from '@/components/ui';

// Plantillas CSV con todos los campos (MODELO DE COLOCACIÓN COMPLETO)
const TEMPLATES = {
  users: {
    name: 'Usuarios',
    category: 'Sistema',
    icon: Users,
    headers: [
      'id', 'name', 'email', 'role', 'active', 'createdAt', 'updatedAt'
    ],
    example: [
      'user_comercial_juan', 'Juan Pérez', 'juan.perez@santabrisa.com', 'comercial', 'true', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'
    ]
  },
  parties: {
    name: 'Entidades (Parties)',
    category: 'Ventas',
    icon: Users,
    headers: [
      'id', 'name', 'kind', 'roles', 'legalName', 'tradeName', 'vat', 'taxId',
      'billingAddress_street', 'billingAddress_city', 'billingAddress_zip', 'billingAddress_province', 'billingAddress_country',
      'shippingAddress_street', 'shippingAddress_city', 'shippingAddress_zip', 'shippingAddress_province', 'shippingAddress_country',
      'email_1', 'email_1_isPrimary', 'phone_1', 'phone_1_isPrimary',
      'contactPerson_name', 'contactPerson_role', 'contactPerson_email', 'contactPerson_phone',
      'createdAt', 'updatedAt'
    ],
    example: [
      'party_dist_mahou', 'Distribuidora Mahou', 'ORG', 'DISTRIBUTOR,CUSTOMER', 'Mahou San Miguel SA', 'Mahou', 'B12345678', 'B12345678',
      'Calle Alovera 1', 'Alovera', '19208', 'Guadalajara', 'España',
      'Calle Alovera 1', 'Alovera', '19208', 'Guadalajara', 'España',
      'comercial@mahou.es', 'true', '912345678', 'true',
      'Pedro López', 'Comercial', 'pedro@mahou.es', '912345679',
      '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'
    ]
  },
  partyRoles: {
    name: 'Relaciones Comercial-Distribuidor',
    category: 'Ventas',
    icon: Users,
    headers: [
      'id', 'partyId', 'userId', 'role', 'isActive', 'createdAt'
    ],
    example: [
      'role_001', 'party_dist_mahou', 'user_comercial_juan', 'SALESPERSON', 'true', '2025-01-01T00:00:00.000Z'
    ]
  },
  accounts: {
    name: 'Cuentas',
    category: 'Ventas',
    icon: Building2,
    headers: [
      'id', 'name', 'partyId', 'segment', 'stage', 'flow', 'ownerId', 'distributorPartyId', 
      'aliases', 'source', 'createdAt', 'updatedAt', 'isTarget',
      'location_lat', 'location_lng', 'location_address'
    ],
    example: [
      'acc_bar_central', 'Bar Central', 'party_bar_central', 'HORECA', 'ACTIVA', 'COLOCACION', 'user_comercial_juan', 'party_dist_mahou',
      'central;bar centro;el central', 'CRM', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z', 'true',
      '40.4168', '-3.7038', 'Calle Mayor 23, Madrid'
    ]
  },
  orders: {
    name: 'Pedidos',
    category: 'Ventas',
    icon: ShoppingCart,
    headers: [
      'id', 'accountId', 'orderDate', 'totalAmount', 'status', 'flow',
      'itemSKU', 'itemName', 'qty', 'uom', 'unitPrice'
    ],
    example: [
      'ord_001', 'acc_001', '2025-01-07', '450', 'open', 'DIRECTA',
      'MARG-MIX-001', 'Margarita Mix', '10', 'UNIT', '45'
    ]
  },
  items: {
    name: 'Productos/Items',
    category: 'Logística',
    icon: ShoppingCart,
    headers: [
      'id', 'sku', 'name', 'category', 'uom', 'active', 'isActive', 'unitsPerCase',
      'priceBase', 'priceUnit', 'priceList_HORECA', 'priceList_RETAIL', 'priceList_DISTRIBUTOR', 
      'priceList_ONLINE', 'priceList_PRIVADA', 'costUnit', 'weightPerUnit', 'volumePerUnit',
      'casesPerPallet', 'stdCost', 'bottleMl', 'caseUnits'
    ],
    example: [
      'item_santabrisa_750', 'SB-750', 'Santa Brisa 750ml', 'fg', 'bottle', 'true', 'true', '6',
      '15.00', '15.00', '12.50', '14.00', '10.00', '13.50', '13.00', '8.00', '0.75', '0.75',
      '80', '8.00', '750', '6'
    ]
  },
  lots: {
    name: 'Lotes',
    category: 'Logística',
    icon: FileText,
    headers: [
      'id', 'lotNumber', 'itemId', 'qty', 'uom', 'manufactureDate', 'expiryDate',
      'locationId', 'status', 'notes'
    ],
    example: [
      'lot_001', 'LOT-2025-001', 'item_001', '100', 'L', '2025-01-01', '2026-01-01',
      'WH/MAIN', 'AVAILABLE', 'Primera producción del año'
    ]
  },
  shipments: {
    name: 'Envíos',
    category: 'Logística',
    icon: Upload,
    headers: [
      'id', 'orderId', 'shipmentDate', 'carrier', 'trackingNumber',
      'origin', 'destination', 'status', 'notes'
    ],
    example: [
      'ship_001', 'ord_001', '2025-01-08', 'MRW', 'TRK12345',
      'Almacén Central', 'Madrid', 'DELIVERED', 'Entregado en 24h'
    ]
  },
  boms: {
    name: 'Recetas (BOMs)',
    category: 'Producción',
    icon: FileText,
    headers: [
      'id', 'name', 'outputItemId', 'baseUnit', 'batchSize', 'stage',
      'ingredient1_id', 'ingredient1_qty', 'ingredient1_uom',
      'ingredient2_id', 'ingredient2_qty', 'ingredient2_uom'
    ],
    example: [
      'bom_001', 'Margarita Mix V1', 'item_001', 'L', '100', 'PRODUCCION',
      'item_raw_001', '50', 'L',
      'item_raw_002', '30', 'L'
    ]
  },
  productionOrders: {
    name: 'Órdenes de Producción',
    category: 'Producción',
    icon: CheckCircle,
    headers: [
      'id', 'bomId', 'targetQuantity', 'baseUnit', 'scheduledFor',
      'responsibleId', 'stage', 'status', 'notes'
    ],
    example: [
      'prod_001', 'bom_001', '500', 'L', '2025-01-10',
      'u_production', 'PRODUCCION', 'PENDING', 'Producción semanal'
    ]
  },
  qcTests: {
    name: 'Tests de Calidad',
    category: 'Calidad',
    icon: CheckCircle,
    headers: [
      'id', 'lotNumber', 'testDate', 'testType', 'parameter',
      'expectedValue', 'actualValue', 'result', 'testedBy', 'notes'
    ],
    example: [
      'qc_001', 'LOT-2025-001', '2025-01-05', 'FISICO', 'pH',
      '3.5', '3.4', 'PASS', 'u_quality', 'Dentro de rango'
    ]
  },
  qcReleases: {
    name: 'Liberaciones de Calidad',
    category: 'Calidad',
    icon: CheckCircle,
    headers: [
      'id', 'lotNumber', 'releaseDate', 'releasedBy', 'status',
      'expiryDate', 'notes'
    ],
    example: [
      'rel_001', 'LOT-2025-001', '2025-01-06', 'u_quality', 'APPROVED',
      '2026-01-01', 'Todos los tests superados'
    ]
  },
  campaigns: {
    name: 'Campañas de Marketing',
    category: 'Marketing',
    icon: FileText,
    headers: [
      'id', 'name', 'startDate', 'endDate', 'budget', 'channel',
      'targetSegment', 'responsibleId', 'status', 'notes'
    ],
    example: [
      'camp_001', 'Lanzamiento Verano 2025', '2025-06-01', '2025-08-31', '15000', 'SOCIAL_MEDIA',
      'HORECA', 'u_marketing', 'PLANNED', 'Campaña de lanzamiento estacional'
    ]
  },
  posTactics: {
    name: 'Tácticas POS',
    category: 'Marketing',
    icon: FileText,
    headers: [
      'id', 'accountId', 'tacticType', 'deploymentDate', 'cost',
      'status', 'responsibleId', 'notes'
    ],
    example: [
      'pos_001', 'acc_001', 'DISPLAY', '2025-01-15', '250', 
      'DEPLOYED', 'u_marketing', 'Display de marca en barra'
    ]
  }
};

function generateCSV(template: typeof TEMPLATES[keyof typeof TEMPLATES]) {
  const headers = template.headers.join(',');
  const example = template.example.join(',');
  return `${headers}\n${example}\n`;
}

function downloadTemplate(key: keyof typeof TEMPLATES) {
  const template = TEMPLATES[key];
  const csv = generateCSV(template);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `plantilla_${key}.csv`;
  link.click();
  toast.success(`Plantilla ${template.name} descargada`);
}

function parseCSV(text: string): any[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

export function DataImportPage() {
  const [selectedType, setSelectedType] = useState<keyof typeof TEMPLATES | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [enrichedData, setEnrichedData] = useState<any[]>([]);
  const [enriching, setEnriching] = useState(false);
  const [enrichmentResult, setEnrichmentResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const { saveAllCollections } = useData();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setFile(file);
    setEnrichedData([]);
    setEnrichmentResult(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const data = parseCSV(text);
      setPreview(data.slice(0, 5)); // Primeras 5 filas para preview
      toast.success(`${data.length} registros cargados para revisión`);
    };
    reader.readAsText(file);
  };

  const handleEnrich = async () => {
    if (!file || !selectedType) return;
    
    setEnriching(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const data = parseCSV(text);
        
        const response = await fetch('/api/enrich-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data,
            sheet: selectedType,
            context: {} // TODO: Pasar contexto de entidades existentes
          })
        });
        
        if (!response.ok) {
          throw new Error('Error al enriquecer datos');
        }
        
        const result = await response.json();
        setEnrichedData(result.enrichedData);
        setEnrichmentResult(result);
        
        const errorCount = result.warnings?.filter((w: any) => w.severity === 'error').length || 0;
        const warningCount = result.warnings?.filter((w: any) => w.severity === 'warning').length || 0;
        
        if (errorCount > 0) {
          toast.error(`${errorCount} errores encontrados. Revisa los datos.`);
        } else if (warningCount > 0) {
          toast.warning(`${warningCount} advertencias. Revisa antes de importar.`);
        } else {
          toast.success('Datos enriquecidos correctamente ✨');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error(error);
      toast.error('Error al procesar datos con IA');
    } finally {
      setEnriching(false);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedType || preview.length === 0) return;
    
    setImporting(true);
    try {
      // Usar datos enriquecidos si existen, si no, parsear el archivo original
      const dataToImport = enrichedData.length > 0 ? enrichedData : await new Promise<any[]>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          resolve(parseCSV(text));
        };
        reader.readAsText(file);
      });
        
      const collections: any = {};
      
      if (selectedType === 'users') {
        collections.users = dataToImport.map(row => ({
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            active: row.active === 'true',
            createdAt: row.createdAt || new Date().toISOString(),
            updatedAt: row.updatedAt || new Date().toISOString()
        }));
      } else if (selectedType === 'parties') {
        collections.parties = dataToImport.map(row => ({
            id: row.id,
            name: row.name,
            kind: row.kind,
            roles: row.roles ? row.roles.split(',').map((r: string) => r.trim()) : [],
            legalName: row.legalName,
            tradeName: row.tradeName || undefined,
            vat: row.vat,
            taxId: row.taxId || row.vat,
            billingAddress: {
              street: row.billingAddress_street || '',
              city: row.billingAddress_city || '',
              zip: row.billingAddress_zip || '',
              province: row.billingAddress_province || '',
              country: row.billingAddress_country || 'España'
            },
            shippingAddress: row.shippingAddress_street ? {
              street: row.shippingAddress_street,
              city: row.shippingAddress_city || '',
              zip: row.shippingAddress_zip || '',
              province: row.shippingAddress_province || '',
              country: row.shippingAddress_country || 'España'
            } : undefined,
            emails: row.email_1 ? [{ value: row.email_1, isPrimary: row.email_1_isPrimary === 'true' }] : [],
            phones: row.phone_1 ? [{ value: row.phone_1, isPrimary: row.phone_1_isPrimary === 'true' }] : [],
            people: row.contactPerson_name ? [{
              name: row.contactPerson_name,
              role: row.contactPerson_role || undefined,
              email: row.contactPerson_email || undefined,
              phone: row.contactPerson_phone || undefined
            }] : [],
            createdAt: row.createdAt || new Date().toISOString(),
            updatedAt: row.updatedAt || new Date().toISOString()
        }));
      } else if (selectedType === 'partyRoles') {
        collections.partyRoles = dataToImport.map(row => ({
            id: row.id,
            partyId: row.partyId,
            userId: row.userId,
            role: row.role,
            isActive: row.isActive === 'true',
            createdAt: row.createdAt || new Date().toISOString()
        }));
      } else if (selectedType === 'accounts') {
        collections.accounts = dataToImport.map(row => ({
            id: row.id,
            name: row.name,
            partyId: row.partyId,
            segment: row.accountType,
            stage: row.stage,
            flow: row.flow,
            ownerId: row.salesRepId,
            distributorPartyId: row.distributorId || undefined,
            aliases: row.aliases ? row.aliases.split(';').map((a: string) => a.trim()).filter(Boolean) : undefined,
            source: row.source || 'MANUAL',
            isTarget: row.isTarget === 'true',
            location: (row.location_lat && row.location_lng) ? {
              lat: Number(row.location_lat),
              lng: Number(row.location_lng),
              address: row.location_address || undefined
            } : undefined,
            createdAt: row.createdAt || new Date().toISOString(),
            updatedAt: row.updatedAt || new Date().toISOString()
        }));
      } else if (selectedType === 'items') {
        collections.items = dataToImport.map(row => ({
            id: row.id,
            sku: row.sku,
            name: row.name,
            category: row.category,
            uom: row.uom,
            active: row.active === 'true',
            isActive: row.isActive === 'true',
            unitsPerCase: row.unitsPerCase ? Number(row.unitsPerCase) : undefined,
            priceBase: row.priceBase ? Number(row.priceBase) : undefined,
            priceUnit: row.priceUnit ? Number(row.priceUnit) : undefined,
            priceList: {
              HORECA: row.priceList_HORECA ? Number(row.priceList_HORECA) : undefined,
              RETAIL: row.priceList_RETAIL ? Number(row.priceList_RETAIL) : undefined,
              DISTRIBUTOR: row.priceList_DISTRIBUTOR ? Number(row.priceList_DISTRIBUTOR) : undefined,
              ONLINE: row.priceList_ONLINE ? Number(row.priceList_ONLINE) : undefined,
              PRIVADA: row.priceList_PRIVADA ? Number(row.priceList_PRIVADA) : undefined
            },
            costUnit: row.costUnit ? Number(row.costUnit) : undefined,
            weightPerUnit: row.weightPerUnit ? Number(row.weightPerUnit) : undefined,
            volumePerUnit: row.volumePerUnit ? Number(row.volumePerUnit) : undefined,
            casesPerPallet: row.casesPerPallet ? Number(row.casesPerPallet) : undefined,
            stdCost: row.stdCost ? Number(row.stdCost) : undefined,
            bottleMl: row.bottleMl ? Number(row.bottleMl) : undefined,
            caseUnits: row.caseUnits ? Number(row.caseUnits) : undefined
        }));
      } else if (selectedType === 'orders') {
        collections.ordersSellOut = dataToImport.map(row => ({
            id: row.id,
            accountId: row.accountId,
            orderDate: row.orderDate,
            totalAmount: Number(row.totalAmount) || 0,
            status: row.status || 'open',
            flow: row.flow || 'DIRECTA',
            lines: [{
              sku: row.itemSKU,
              name: row.itemName,
              qty: Number(row.qty) || 0,
              uom: row.uom || 'UNIT',
              priceUnit: Number(row.unitPrice) || 0
            }],
            createdAt: row.orderDate || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }));
      }
      
      await saveAllCollections(collections);
      toast.success(`${dataToImport.length} registros importados correctamente ${enrichedData.length > 0 ? '✨' : ''}`);
      
      // Limpiar
      setFile(null);
      setPreview([]);
      setEnrichedData([]);
      setEnrichmentResult(null);
      setSelectedType(null);
      
      // Forzar recarga
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error(error);
      toast.error('Error al importar los datos');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Importación Masiva de Datos</h1>
          <p className="text-zinc-600">Descarga plantillas, rellena los datos y súbelos al sistema</p>
        </div>

        {/* Paso 1: Descargar Plantillas */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold">1</div>
            <h2 className="text-xl font-semibold">Descargar Plantillas</h2>
          </div>
          
          {/* Agrupar por categoría */}
          {['Sistema', 'Ventas', 'Logística', 'Producción', 'Calidad', 'Marketing'].map(category => {
            const templatesInCategory = Object.entries(TEMPLATES).filter(([_, t]) => t.category === category);
            if (templatesInCategory.length === 0) return null;
            
            return (
              <div key={category} className="mb-6 last:mb-0">
                <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-3">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {templatesInCategory.map(([key, template]) => {
                    const Icon = template.icon;
                    return (
                      <div key={key} className="border rounded-lg p-4 hover:border-blue-500 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <Icon className="h-6 w-6 text-blue-600" />
                          <h3 className="font-semibold text-sm">{template.name}</h3>
                        </div>
                        <p className="text-xs text-zinc-600 mb-3">{template.headers.length} campos</p>
                        <SBButton 
                          size="sm" 
                          variant="secondary"
                          onClick={() => downloadTemplate(key as keyof typeof TEMPLATES)}
                          className="w-full"
                        >
                          <Download className="h-4 w-4" />
                          Descargar
                        </SBButton>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Paso 2: Seleccionar Tipo */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold">2</div>
            <h2 className="text-xl font-semibold">Seleccionar Tipo de Datos</h2>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {Object.entries(TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                onClick={() => setSelectedType(key as keyof typeof TEMPLATES)}
                className={`px-3 py-2 rounded-lg border transition-colors text-sm ${
                  selectedType === key
                    ? 'bg-blue-100 border-blue-500 text-blue-700 font-medium'
                    : 'bg-white border-zinc-200 hover:border-blue-300'
                }`}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        {/* Paso 3: Subir Archivo */}
        {selectedType && (
          <div className="bg-white rounded-xl border p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold">3</div>
              <h2 className="text-xl font-semibold">Subir Archivo CSV</h2>
            </div>
            
            <div className="border-2 border-dashed border-zinc-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
              <p className="text-zinc-600 mb-4">Arrastra tu archivo CSV aquí o haz click para seleccionar</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <SBButton size="md" variant="primary" className="cursor-pointer">
                  <FileText className="h-4 w-4" />
                  Seleccionar Archivo
                </SBButton>
              </label>
              {file && (
                <div className="mt-4 flex items-center justify-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Paso 4: Preview */}
        {preview.length > 0 && (
          <div className="bg-white rounded-xl border p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold">4</div>
              <h2 className="text-xl font-semibold">Vista Previa</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {Object.keys(preview[0] || {}).map(key => (
                      <th key={key} className="text-left p-2 font-semibold">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b">
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="p-2">{val || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-600">
                <AlertCircle className="h-5 w-5" />
                <span>Mostrando las primeras 5 filas de {preview.length} registros</span>
              </div>
              <div className="flex gap-2">
                <SBButton 
                  size="md" 
                  variant="secondary"
                  onClick={handleEnrich}
                  disabled={enriching || enrichedData.length > 0}
                >
                  {enriching ? 'Procesando con IA...' : '✨ Auto-completar con IA'}
                </SBButton>
                <SBButton 
                  size="md" 
                  variant="primary"
                  onClick={handleImport}
                  disabled={importing}
                >
                  {importing ? 'Importando...' : 'Importar Datos'}
                </SBButton>
              </div>
            </div>
          </div>
        )}

        {/* Paso 5: Datos Enriquecidos */}
        {enrichedData.length > 0 && enrichmentResult && (
          <div className="bg-white rounded-xl border p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-semibold">✨</div>
              <h2 className="text-xl font-semibold">Datos Enriquecidos por IA</h2>
            </div>

            {/* Warnings & Errores */}
            {enrichmentResult.warnings && enrichmentResult.warnings.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">⚠️ Avisos y Errores:</h3>
                <div className="space-y-2">
                  {enrichmentResult.warnings.map((warning: any, i: number) => (
                    <div key={i} className={`p-3 rounded-lg border ${
                      warning.severity === 'error' ? 'bg-red-50 border-red-200' :
                      warning.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        <AlertCircle className={`h-5 w-5 flex-shrink-0 ${
                          warning.severity === 'error' ? 'text-red-600' :
                          warning.severity === 'warning' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`} />
                        <div className="text-sm">
                          <span className="font-semibold">Fila {warning.row}, campo "{warning.field}":</span>{' '}
                          {warning.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {enrichmentResult.suggestions && enrichmentResult.suggestions.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">💡 Sugerencias de Cambios:</h3>
                <div className="space-y-2">
                  {enrichmentResult.suggestions.map((suggestion: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                      <div className="text-sm">
                        <div className="font-semibold mb-1">Fila {suggestion.row}, campo "{suggestion.field}"</div>
                        <div className="flex items-center gap-2 text-zinc-600">
                          <span className="line-through">{String(suggestion.original)}</span>
                          <span>→</span>
                          <span className="text-purple-700 font-medium">{String(suggestion.suggested)}</span>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">Razón: {suggestion.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campos Faltantes */}
            {enrichmentResult.missingRequired && enrichmentResult.missingRequired.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2 text-red-700">❌ Campos Requeridos Faltantes:</h3>
                <div className="space-y-2">
                  {enrichmentResult.missingRequired.map((missing: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm">
                      <span className="font-semibold">Fila {missing.row}:</span> Faltan campos requeridos:{' '}
                      <span className="text-red-700 font-medium">{missing.fields.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview de Datos Enriquecidos */}
            <div className="mt-4">
              <h3 className="font-semibold mb-2">📊 Vista Previa de Datos Completos:</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {Object.keys(enrichedData[0] || {}).map(key => (
                        <th key={key} className="text-left p-2 font-semibold text-xs">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {enrichedData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b">
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="p-2 text-xs">{val || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-sm text-zinc-600">
                Mostrando las primeras 5 filas de {enrichedData.length} registros enriquecidos
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <SBButton 
                size="md" 
                variant="secondary"
                onClick={() => {
                  setEnrichedData([]);
                  setEnrichmentResult(null);
                }}
              >
                Descartar Cambios
              </SBButton>
              <SBButton 
                size="md" 
                variant="primary"
                onClick={handleImport}
                disabled={importing || (enrichmentResult.warnings && enrichmentResult.warnings.some((w: any) => w.severity === 'error'))}
              >
                {importing ? 'Importando...' : 'Importar Datos Enriquecidos'}
              </SBButton>
            </div>
          </div>
        )}

        {/* Información */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-700 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-2">Notas importantes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Las plantillas incluyen un ejemplo en la primera fila</li>
                <li>Los IDs deben ser únicos para cada registro</li>
                <li>Los campos opcionales pueden dejarse vacíos</li>
                <li>Usa UTF-8 como encoding para caracteres especiales</li>
                <li>Los datos se actualizarán en todos los módulos del sistema</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
