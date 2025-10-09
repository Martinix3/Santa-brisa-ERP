"use client";
import React, { useState } from 'react';
import { PageShell } from '@/components/shared/PageShell';
import { useData } from '@/lib/dataprovider';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { firestoreDb } from '@/lib/firebaseClient';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

type ViewMode = 'diagnostico' | 'accounts' | 'orders' | 'users' | 'parties';

export default function DbCheckPage() {
  const { data } = useData();
  const [viewMode, setViewMode] = useState<ViewMode>('diagnostico');
  const [editingData, setEditingData] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const loadCollection = async (collectionName: string) => {
    if (!firestoreDb) return [];
    const snapshot = await getDocs(collection(firestoreDb, collectionName));
    return snapshot.docs.map(d => ({ ...d.data(), _docId: d.id }));
  };

  const handleViewCollection = async (mode: ViewMode) => {
    if (mode === 'diagnostico') {
      setViewMode('diagnostico');
      return;
    }

    addLog(`Cargando ${mode}...`);
    setViewMode(mode);
    
    const collectionMap: Record<string, string> = {
      accounts: 'accounts',
      orders: 'ordersSellOut',
      users: 'users',
      parties: 'parties'
    };

    const docs = await loadCollection(collectionMap[mode]);
    setEditingData(docs);
    addLog(`✅ ${docs.length} documentos cargados`);
  };

  const handleCellEdit = (rowIndex: number, field: string, value: any) => {
    const updated = [...editingData];
    updated[rowIndex][field] = value;
    setEditingData(updated);
  };

  const handleSaveChanges = async () => {
    if (!firestoreDb) return;
    
    setSaving(true);
    addLog('💾 Guardando cambios...');

    try {
      const collectionMap: Record<string, string> = {
        accounts: 'accounts',
        orders: 'ordersSellOut',
        users: 'users',
        parties: 'parties'
      };

      const collName = collectionMap[viewMode];
      let saved = 0;

      for (const item of editingData) {
        const { _docId, ...dataToSave } = item;
        await updateDoc(doc(firestoreDb, collName, _docId), dataToSave);
        saved++;
      }

      addLog(`✅ ${saved} documentos guardados`);
      addLog('🔄 Recarga la página para ver los cambios');
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }

    setSaving(false);
  };

  if (!data) {
    return (
      <PageShell title="Diagnóstico de Base de Datos" module="admin">
        <div>Cargando...</div>
      </PageShell>
    );
  }

  // Análisis de datos
  const users = data.teamMembers || [];
  const parties = data.accounts || [];
  const accounts = data.accounts || [];
  const orders = data.ordersSellOut || [];
  const comerciales = users.filter(u => u.role?.toLowerCase() === 'comercial');
  const ordersDirect = orders.filter(o => o.flow === 'DIRECTA');
  const ordersPlacement = orders.filter(o => o.flow === 'COLOCACION');
  const accountsConDistribuidor = accounts.filter(a => !!a.distributorId);
  const accountsSinDistribuidor = accounts.filter(a => !a.distributorId);
  const distributorIds = new Set(accounts.map(a => a.distributorId).filter(Boolean));
  const distribuidores = parties.filter(p => distributorIds.has(p.id));
  const ordersShopify = orders.filter(o => o.source === 'SHOPIFY');

  const checks = [
    {
      name: 'Usuarios importados',
      status: users.length > 0 ? 'ok' : 'error',
      message: `${users.length} usuarios encontrados`,
      detail: `${comerciales.length} comerciales`
    },
    {
      name: 'Parties (contactos)',
      status: parties.length > 0 ? 'ok' : 'error',
      message: `${parties.length} parties encontradas`,
      detail: `${distribuidores.length} son distribuidores activos`
    },
    {
      name: 'Cuentas importadas',
      status: accounts.length > 0 ? 'ok' : 'error',
      message: `${accounts.length} cuentas encontradas`,
      detail: `${accountsConDistribuidor.length} con distribuidor, ${accountsSinDistribuidor.length} sin distribuidor`
    },
    {
      name: 'Pedidos importados',
      status: orders.length > 0 ? 'ok' : 'error',
      message: `${orders.length} pedidos encontrados`,
      detail: `${ordersPlacement.length} PLACEMENT (colocación), ${ordersDirect.length} DIRECT (ventas directas)`
    },
    {
      name: 'Ventas Online (Shopify)',
      status: ordersShopify.length > 0 ? 'ok' : 'warning',
      message: `${ordersShopify.length} pedidos de Shopify`,
      detail: ordersShopify.length === 0 ? 'No hay pedidos marcados como SHOPIFY' : 'OK'
    },
    {
      name: 'Distribuidores configurados',
      status: distribuidores.length > 0 ? 'ok' : 'warning',
      message: `${distribuidores.length} distribuidores activos`,
      detail: distribuidores.length === 0 ? 'No hay distribuidores - Dashboard Sell-Out estará vacío' : 'OK'
    },
  ];

  return (
    <PageShell title="Diagnóstico de Base de Datos" module="admin">
      <div className="space-y-6">
        {/* Pestañas */}
        <div className="flex gap-2 border-b pb-2 overflow-x-auto">
          <button
            onClick={() => handleViewCollection('diagnostico')}
            className={`px-4 py-2 rounded-t transition-colors whitespace-nowrap ${
              viewMode === 'diagnostico'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            📊 Diagnóstico
          </button>
          <button
            onClick={() => handleViewCollection('accounts')}
            className={`px-4 py-2 rounded-t transition-colors whitespace-nowrap ${
              viewMode === 'accounts'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            🏢 Cuentas ({accounts.length})
          </button>
          <button
            onClick={() => handleViewCollection('orders')}
            className={`px-4 py-2 rounded-t transition-colors whitespace-nowrap ${
              viewMode === 'orders'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            📦 Pedidos ({orders.length})
          </button>
          <button
            onClick={() => handleViewCollection('users')}
            className={`px-4 py-2 rounded-t transition-colors whitespace-nowrap ${
              viewMode === 'users'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            👥 Usuarios ({users.length})
          </button>
          <button
            onClick={() => handleViewCollection('parties')}
            className={`px-4 py-2 rounded-t transition-colors whitespace-nowrap ${
              viewMode === 'parties'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            👨‍💼 Parties ({parties.length})
          </button>
        </div>

        {/* Editor */}
        {viewMode !== 'diagnostico' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Editor de {viewMode} ({editingData.length} registros)
              </h2>
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? '💾 Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>

            <div className="bg-card border rounded-lg overflow-auto max-h-[600px]">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-secondary z-10">
                  <tr>
                    {editingData.length > 0 && Object.keys(editingData[0])
                      .filter(key => key !== '_docId')
                      .sort()
                      .map(key => (
                        <th key={key} className="p-2 text-left font-semibold border-b border-r whitespace-nowrap bg-secondary">
                          {key}
                        </th>
                      ))
                    }
                  </tr>
                </thead>
                <tbody>
                  {editingData.map((row, rowIndex) => {
                    const sortedKeys = Object.keys(row).filter(key => key !== '_docId').sort();
                    return (
                      <tr key={rowIndex} className="border-b hover:bg-secondary/50">
                        {sortedKeys.map((key) => {
                          const value = row[key];
                          const displayValue = typeof value === 'object' && value !== null 
                            ? JSON.stringify(value) 
                            : (value?.toString() || '');
                          
                          return (
                            <td key={key} className="p-1 border-r">
                              <input
                                type="text"
                                value={displayValue}
                                onChange={(e) => handleCellEdit(rowIndex, key, e.target.value)}
                                className="w-full p-1 border rounded text-xs min-w-[120px]"
                                title={`${key}: ${displayValue}`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {log.length > 0 && (
              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Log:</h3>
                <div className="font-mono text-xs space-y-1 max-h-48 overflow-y-auto bg-gray-50 p-3 rounded">
                  {log.map((msg, i) => (
                    <div key={i}>{msg}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Diagnóstico */}
        {viewMode === 'diagnostico' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-2">Estado General</h2>
              <p className="text-muted-foreground mb-4">Verificación automática de integridad</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Usuarios</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{accounts.length}</p>
                  <p className="text-sm text-muted-foreground">Cuentas</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-orange-600">{orders.length}</p>
                  <p className="text-sm text-muted-foreground">Pedidos</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-purple-600">{distribuidores.length}</p>
                  <p className="text-sm text-muted-foreground">Distribuidores</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Verificaciones</h2>
              <div className="space-y-3">
                {checks.map((check, i) => (
                  <div 
                    key={i}
                    className={`border rounded-lg p-4 flex items-start gap-4 ${
                      check.status === 'ok' ? 'bg-green-50 border-green-200' :
                      check.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {check.status === 'ok' && <CheckCircle className="text-green-600" size={24} />}
                      {check.status === 'warning' && <AlertTriangle className="text-yellow-600" size={24} />}
                      {check.status === 'error' && <XCircle className="text-red-600" size={24} />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{check.name}</h3>
                      <p className="text-sm">{check.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Info className="text-blue-600" />
                Recomendaciones
              </h2>
              <ul className="space-y-2 text-sm">
                {distribuidores.length === 0 && (
                  <li className="flex gap-2">
                    <span>⚠️</span>
                    <span>No hay distribuidores configurados</span>
                  </li>
                )}
                {ordersPlacement.length === 0 && (
                  <li className="flex gap-2">
                    <span>⚠️</span>
                    <span>No hay pedidos PLACEMENT</span>
                  </li>
                )}
                {accountsSinDistribuidor.length > 0 && (
                  <li className="flex gap-2">
                    <span>💡</span>
                    <span>{accountsSinDistribuidor.length} cuentas sin distribuidor</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
