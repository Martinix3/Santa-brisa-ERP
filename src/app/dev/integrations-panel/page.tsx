

"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { SBCard, SB_COLORS } from '@/components/ui/ui-primitives';
import { KeyRound, Trash2, Zap, RefreshCw, Settings, PlugZap, LogOut, ChevronRight, Check, AlertTriangle, DownloadCloud } from 'lucide-react';
import ApiKeyConnect from "@/components/integrations/ApiKeyConnect";
import { auth } from '@/lib/firebase-config';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';


type Secrets = Record<string, any>;
type Notification = { message: string; type: 'success' | 'error' };


// Types from the settings page
type Provider = "holded"|"shopify"|"sendcloud"|"firebase"|"google";
type Status = "disconnected"|"connected"|"error"|"syncing";
type Integration = { id:string; provider:Provider; status:Status; lastSyncAt?:string; error?:string };

const PROVIDER_META: Record<Provider,{label:string; blurb:string}> = {
  holded:   { label:"Holded",   blurb:"Facturación, inventario y documentos." },
  shopify:  { label:"Shopify",  blurb:"Catálogo y pedidos e-commerce." },
  sendcloud:{ label:"Sendcloud",blurb:"Envíos, etiquetas y tracking." },
  firebase: { label:"Firebase", blurb:"Autenticación, base de datos y hosting." },
  google:   { label:"Google Cloud",   blurb:"Servicios en la nube y APIs." },
};

async function fetchIntegrations(user: User | null): Promise<Integration[]> {
  // This endpoint now needs to be created or use a mock
  // For now, we'll assume a placeholder.
  // In a real app, this would fetch from a DB like Firestore.
  // We can use the dev secrets endpoint as a proxy for status for now.
  try {
    const res = await fetch('/api/dev/integrations');
    if (!res.ok) throw new Error("Failed to fetch");
    const secrets = await res.json();
    const integrations: Integration[] = Object.keys(PROVIDER_META).map(p => {
        const provider = p as Provider;
        let status: Status = secrets[provider] ? 'connected' : 'disconnected';
        if ((provider === 'firebase' || provider === 'google') && user) {
            status = 'connected';
        }
        
        return {
            id: provider,
            provider: provider,
            status: status,
            lastSyncAt: secrets[provider]?.lastSyncAt,
        }
    });
    return integrations;
  } catch {
      return Object.keys(PROVIDER_META).map(p => ({ id: p, provider: p as Provider, status: 'disconnected' }));
  }
}


// --- Integration SBCard Component (from settings page) ---
function IntegrationCard({
  data, running, onConnect, onDisconnect, onConfigure, onSyncNow, onImportContacts
}: {
  data:Integration; running:boolean;
  onConnect:()=>void; onDisconnect:()=>void; onConfigure:()=>void; onSyncNow:()=>void; onImportContacts?: () => void;
}) {
  const meta = PROVIDER_META[data.provider];
  const badge = ({
    connected:  <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 flex items-center gap-1"><Check className="h-3 w-3" /> Conectado</span>,
    disconnected:<span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">Desconectado</span>,
    error:      <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Error</span>,
    syncing:    <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 animate-pulse">Sincronizando…</span>,
  } as any)[data.status];

  return (
    <div className="rounded-2xl border p-4 bg-white shadow-sm relative overflow-hidden" style={{ borderColor:"#E9E5D7" }}>
       <div className="absolute inset-x-0 -top-10 h-20"
           style={{ background:`radial-gradient(120px 20px at 20% 90%, #F7D15F33, transparent),
                             radial-gradient(120px 20px at 80% 90%, #A7D8D933, transparent)` }} />
      <div className="flex items-start justify-between relative">
        <div>
          <h3 className="text-lg font-semibold">{meta.label}</h3>
          <p className="text-xs text-slate-600 mt-0.5">{meta.blurb}</p>
        </div>
        <div className="mt-1">{badge}</div>
      </div>
      <div className="mt-3 text-xs text-slate-600">
        {data.lastSyncAt && <p>Última sync: <b>{new Date(data.lastSyncAt).toLocaleString()}</b></p>}
        {data.error && data.status==="error" && <p className="text-red-700">· {data.error}</p>}
      </div>
      <div className="mt-4 flex gap-2 flex-wrap">
        {data.status!=="connected" ? (
          <button onClick={onConnect} className="px-3 py-1.5 text-sm rounded-xl bg-black text-white flex items-center gap-2">
            <PlugZap className="h-4 w-4"/> Conectar
          </button>
        ) : (
          <>
            <button onClick={onConfigure} className="px-3 py-1.5 text-sm rounded-xl border flex items-center gap-2">
              <Settings className="h-4 w-4"/> Ajustes
            </button>
            <button disabled={running} onClick={onSyncNow}
              className="px-3 py-1.5 text-sm rounded-xl bg-black text-white flex items-center gap-2 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${running?'animate-spin':''}`}/> Sync Facturas
            </button>
            {onImportContacts && (
                 <button disabled={running} onClick={onImportContacts}
                    className="px-3 py-1.5 text-sm rounded-xl bg-black text-white flex items-center gap-2 disabled:opacity-50">
                    <DownloadCloud className={`h-4 w-4 ${running?'animate-spin':''}`}/> Importar Contactos
                </button>
            )}
            <button onClick={onDisconnect} className="px-3 py-1.5 text-sm rounded-xl border flex items-center gap-2">
              <LogOut className="h-4 w-4"/> Desconectar
            </button>
          </>
        )}
      </div>
    </div>
  );
}


export default function IntegrationsPanelPage() {
    const [secrets, setSecrets] = useState<Secrets | null>(null);
    const [loadingSecrets, setLoadingSecrets] = useState(true);
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const router = useRouter();

    const [items, setItems] = useState<Integration[]>([]);
    const [loadingIntegrations, setLoadingIntegrations] = useState(true);
    const [running, setRunning] = useState<string|null>(null);
    const [apiKeyModal, setApiKeyModal] = useState<{ open:boolean; provider?: "holded" | "sendcloud" }>({ open:false });
    const [notification, setNotification] = useState<Notification | null>(null);

    const reloadAll = useCallback((user: User | null = firebaseUser) => {
        const fetchSecrets = async () => {
            setLoadingSecrets(true);
            try {
                const res = await fetch('/api/dev/integrations');
                setSecrets(res.ok ? await res.json() : {});
            } catch (error) {
                console.error("Failed to fetch integration secrets:", error);
                setSecrets({});
            } finally {
                setLoadingSecrets(false);
            }
        };

        const fetchIntegrationsData = async (user: User | null) => {
            setLoadingIntegrations(true);
            setItems(await fetchIntegrations(user));
            setLoadingIntegrations(false);
        };
        fetchSecrets();
        fetchIntegrationsData(user);
    }, [firebaseUser]);

    useEffect(() => {
        if (notification) {
          const timer = setTimeout(() => setNotification(null), 5000);
          return () => clearTimeout(timer);
        }
    }, [notification]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            setFirebaseUser(user);
            reloadAll(user);
        });
        return () => unsubscribe();
    }, [reloadAll]);

    const handleGoogleConnect = async () => {
        if (firebaseUser) {
            setNotification({ message: 'Ya estás conectado con Google.', type: 'success' });
            return;
        }
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            setNotification({ message: 'Conectado con Google correctamente.', type: 'success' });
            reloadAll(auth.currentUser);
        } catch (error) {
            console.error("Error durante el inicio de sesión con Google:", error);
            setNotification({ message: 'Error al conectar con Google.', type: 'error' });
        }
    };

    const onConnect = async (prov:Provider) => {
        if (prov === "holded" || prov === "sendcloud") {
            setApiKeyModal({ open:true, provider:prov });
            return;
        }
        if (prov === 'firebase' || prov === 'google') {
            await handleGoogleConnect();
            return;
        }
        if (prov === 'shopify') {
            const res = await fetch(`/api/integrations/shopify/connect`, { method:"POST" });
            if (res.redirected) window.location.href = res.url;
            return;
        }
    };

    const onDisconnect = async (prov:Provider) => {
        if (prov === 'firebase' || prov === 'google') {
            if (auth.currentUser) {
                await auth.signOut();
                reloadAll(null);
            }
        } else {
            if (!confirm(`¿Seguro que quieres eliminar las credenciales para ${prov}?`)) return;
            await fetch(`/api/integrations/${prov}/disconnect`, { method:"POST" });
            reloadAll();
        }
    };

    const onConfigure = async (prov:Provider) => {
        setNotification({ message: `Aquí irían los ajustes de ${prov}, como el mapeo de impuestos, series de facturas, etc.`, type: 'success'});
    };

    const onSyncNow = async (prov:Provider) => {
        if (prov === 'holded') {
            setNotification({ message: "Iniciando sincronización con Holded...", type: 'success' });
            setRunning(prov);
            try {
                const res = await fetch('/api/integrations/holded/sync', { method: 'POST' });
                const result = await res.json();
                if (!res.ok) {
                    throw new Error(result.error || `Error en la sincronización: ${res.statusText}`);
                } else {
                    setNotification({ message: `Sincronización completada: ${result.message}`, type: 'success' });
                }
            } catch (e: any) {
                setNotification({ message: `Fallo en la petición de sync: ${e.message}`, type: 'error' });
            } finally {
                setRunning(null);
            }
            return;
        }
        setRunning(prov);
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
        } finally {
            setRunning(null);
            reloadAll();
        }
    };

    const handleImportContacts = async () => {
        setNotification({ message: "Iniciando análisis de contactos de Holded. Esto puede tardar un momento...", type: 'success' });
        setRunning('holded-contacts');
        try {
            const res = await fetch('/api/integrations/holded/import-contacts', { method: 'POST' });
            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.error || 'Error desconocido durante el análisis');
            }
            setNotification({ message: `Análisis completado: ${result.toCreate} contactos para crear, ${result.toUpdate} para actualizar. Redirigiendo...`, type: 'success' });
            router.push(result.reviewUrl);
        } catch (e: any) {
            setNotification({ message: `Error al analizar contactos: ${e.message}`, type: 'error' });
        } finally {
            setRunning(null);
        }
    };


    const handleDeleteSecrets = async (provider?: string) => {
        const url = provider ? `/api/dev/integrations?provider=${provider}` : '/api/dev/integrations';
        if (window.confirm(`¿Seguro que quieres eliminar ${provider || 'todas las'} credenciales en memoria?`)) {
            await fetch(url, { method: 'DELETE' });
            reloadAll();
        }
    };
    
    const getApiKeyFields = (provider?: "holded" | "sendcloud") => {
        switch (provider) {
            case 'holded':
                return [{ name:"apiKey", label:"Holded API Key", placeholder:"hl_xxx" }];
            case 'sendcloud':
                return [
                    { name:"apiKey", label:"Sendcloud Public Key", placeholder:"SC_PUBLIC_xxx" },
                    { name:"apiSecret", label:"Sendcloud Secret", placeholder:"SC_SECRET_xxx" },
                ];
            default:
                return [];
        }
    }

    return (
        <div className="space-y-6">
            {notification && (
                <div className={`fixed top-5 right-5 z-50 p-4 rounded-lg shadow-lg text-white ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {notification.message}
                </div>
            )}
            <div>
                <h1 className="text-2xl font-semibold text-zinc-800">Panel de Control de Integraciones</h1>
                <p className="text-zinc-600">
                    Gestiona conexiones y depura el estado de las integraciones.
                </p>
            </div>

            <SBCard title="Configuración de Integraciones">
                 <div className="p-4">
                     {loadingIntegrations ? <p>Cargando...</p> : (
                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {items.map((it) => (
                              <IntegrationCard key={it.id} data={it} running={running===it.id || running === `${it.id}-contacts`}
                                onConnect={()=>onConnect(it.provider)}
                                onDisconnect={()=>onDisconnect(it.provider)}
                                onConfigure={()=>onConfigure(it.provider)}
                                onSyncNow={()=>onSyncNow(it.provider)}
                                onImportContacts={it.provider === 'holded' ? handleImportContacts : undefined}
                              />
                            ))}
                        </div>
                     )}
                </div>
            </SBCard>
            
            <SBCard title="Estado del Almacén de Secretos en Memoria (Dev)">
                <div className="p-4 bg-zinc-800 text-white rounded-b-2xl">
                    {loadingSecrets ? (
                        <p>Cargando secretos...</p>
                    ) : secrets && Object.keys(secrets).length > 0 ? (
                        <pre className="text-xs whitespace-pre-wrap break-all">
                            {JSON.stringify(secrets, null, 2)}
                        </pre>
                    ) : (
                        <p className="text-zinc-400">El almacén de secretos en memoria está vacío.</p>
                    )}
                </div>
            </SBCard>

            <SBCard title="Acciones de Depuración">
                <div className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                         <h3 className="text-sm font-semibold w-full">Limpiar Credenciales en Memoria</h3>
                         <button onClick={() => handleDeleteSecrets('shopify')} className="flex items-center gap-2 text-sm bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-2 hover:bg-red-50 hover:border-red-200 hover:text-red-700">
                            <Trash2 size={14} /> Limpiar Shopify
                        </button>
                         <button onClick={() => handleDeleteSecrets('holded')} className="flex items-center gap-2 text-sm bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-2 hover:bg-red-50 hover:border-red-200 hover:text-red-700">
                            <Trash2 size={14} /> Limpiar Holded
                        </button>                         <button onClick={() => handleDeleteSecrets('sendcloud')} className="flex items-center gap-2 text-sm bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-2 hover:bg-red-50 hover:border-red-200 hover:text-red-700">
                            <Trash2 size={14} /> Limpiar Sendcloud
                        </button>
                        <button onClick={() => handleDeleteSecrets()} className="flex items-center gap-2 text-sm bg-red-100 border border-red-200 text-red-800 rounded-lg px-3 py-2 font-semibold hover:bg-red-200">
                            <Trash2 size={14} /> Limpiar TODO
                        </button>
                    </div>
                </div>
            </SBCard>

            {apiKeyModal.open && apiKeyModal.provider && (
                <ApiKeyConnect
                    open={apiKeyModal.open}
                    onClose={() => setApiKeyModal({ open:false })}
                    provider={apiKeyModal.provider}
                    fields={getApiKeyFields(apiKeyModal.provider)}
                />
            )}
        </div>
    );
}
