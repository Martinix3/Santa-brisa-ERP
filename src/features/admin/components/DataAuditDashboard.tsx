// src/features/admin/components/DataAuditDashboard.tsx
'use client';

import { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { AlertTriangle, CheckCircle, XCircle, Hash, Database, Code, ArrowRight, FileText, Calculator, PencilLine } from 'lucide-react';
import { PageShell } from '@/components/shared/PageShell';
import { UI_DATA_FLOW, COMPUTE_FUNCTIONS, auditDataFlow, generateDataFlowMap } from '@/lib/audit/data-flow-mapper';

interface AuditIssue {
  id: string;
  category: 'integrity' | 'schema' | 'hardcoded';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  count?: number;
  details?: string[];
  fix?: string;
}

export function DataAuditDashboard() {
  const { data } = useData();
  const [activeTab, setActiveTab] = useState<'integrity' | 'dataflow'>('integrity');

  const auditResults = useMemo(() => {
    if (!data) return { issues: [], summary: { total: 0, high: 0, medium: 0, low: 0 } };

    const issues: AuditIssue[] = [];

    // ============================================================
    // 1. AUDITORÍA DE INTEGRIDAD - Relaciones Rotas
    // ============================================================

    // Accounts sin party
    const accountsWithoutParty = data.accounts.filter(acc => 
      !data.parties.some(p => p.id === acc.partyId)
    );
    if (accountsWithoutParty.length > 0) {
      issues.push({
        id: 'accounts-no-party',
        category: 'integrity',
        severity: 'high',
        title: 'Accounts sin Party',
        description: `${accountsWithoutParty.length} cuentas no tienen party asociado`,
        count: accountsWithoutParty.length,
        details: accountsWithoutParty.slice(0, 5).map(a => `${a.name} (${a.id})`),
        fix: 'Crear parties para estas cuentas o eliminarlas'
      });
    }

    // Accounts sin owner
    const accountsWithoutOwner = data.accounts.filter(acc => 
      !acc.ownerId || !data.users.some(u => u.id === acc.ownerId)
    );
    if (accountsWithoutOwner.length > 0) {
      issues.push({
        id: 'accounts-no-owner',
        category: 'integrity',
        severity: 'high',
        title: 'Accounts sin Responsable',
        description: `${accountsWithoutOwner.length} cuentas sin usuario responsable válido`,
        count: accountsWithoutOwner.length,
        details: accountsWithoutOwner.slice(0, 5).map(a => `${a.name} (ownerId: ${a.ownerId})`),
        fix: 'Asignar un comercial responsable a cada cuenta'
      });
    }

    // Orders con accountId inválido
    const ordersWithInvalidAccount = data.ordersSellOut.filter(order => 
      order.accountId && !data.accounts.some(a => a.id === order.accountId)
    );
    if (ordersWithInvalidAccount.length > 0) {
      issues.push({
        id: 'orders-invalid-account',
        category: 'integrity',
        severity: 'high',
        title: 'Pedidos con Account Inválido',
        description: `${ordersWithInvalidAccount.length} pedidos referencian cuentas inexistentes`,
        count: ordersWithInvalidAccount.length,
        details: ordersWithInvalidAccount.slice(0, 5).map(o => `Order ${o.id} → Account ${o.accountId}`),
        fix: 'Corregir accountId o eliminar pedidos huérfanos'
      });
    }

    // Interactions sin userId
    const interactionsWithoutUser = data.interactions.filter(int => 
      !int.userId || !data.users.some(u => u.id === int.userId)
    );
    if (interactionsWithoutUser.length > 0) {
      issues.push({
        id: 'interactions-no-user',
        category: 'integrity',
        severity: 'medium',
        title: 'Interacciones sin Usuario',
        description: `${interactionsWithoutUser.length} interacciones sin usuario válido`,
        count: interactionsWithoutUser.length,
        details: interactionsWithoutUser.slice(0, 5).map(i => `${i.id} (userId: ${i.userId})`),
        fix: 'Asignar usuario a las interacciones'
      });
    }

    // Interactions sin accountId
    const interactionsWithoutAccount = data.interactions.filter(int => 
      !int.accountId || !data.accounts.some(a => a.id === int.accountId)
    );
    if (interactionsWithoutAccount.length > 0) {
      issues.push({
        id: 'interactions-no-account',
        category: 'integrity',
        severity: 'medium',
        title: 'Interacciones sin Cuenta',
        description: `${interactionsWithoutAccount.length} interacciones sin cuenta válida`,
        count: interactionsWithoutAccount.length,
        details: interactionsWithoutAccount.slice(0, 5).map(i => `${i.id} (accountId: ${i.accountId})`),
        fix: 'Vincular interacciones a cuentas existentes'
      });
    }

    // ============================================================
    // 2. AUDITORÍA DE SCHEMA - Campos Faltantes
    // ============================================================

    // Accounts sin 'source'
    const accountsWithoutSource = data.accounts.filter(acc => !acc.source);
    if (accountsWithoutSource.length > 0) {
      issues.push({
        id: 'accounts-no-source',
        category: 'schema',
        severity: 'low',
        title: 'Accounts sin Campo "source"',
        description: `${accountsWithoutSource.length} cuentas (${Math.round(accountsWithoutSource.length / data.accounts.length * 100)}%) no tienen campo source`,
        count: accountsWithoutSource.length,
        details: ['Campo source indica origen: CRM, IMPORT, SHOPIFY, etc.'],
        fix: 'Completar campo source basándose en createdAt y contexto'
      });
    }

    // Parties sin teléfono ni email
    const partiesWithoutContact = data.parties.filter(p => 
      (!p.phones || p.phones.length === 0) && 
      (!p.emails || p.emails.length === 0)
    );
    if (partiesWithoutContact.length > 0) {
      issues.push({
        id: 'parties-no-contact',
        category: 'schema',
        severity: 'medium',
        title: 'Parties sin Datos de Contacto',
        description: `${partiesWithoutContact.length} parties sin teléfono ni email`,
        count: partiesWithoutContact.length,
        details: partiesWithoutContact.slice(0, 5).map(p => p.name || p.id),
        fix: 'Completar información de contacto desde fuentes externas'
      });
    }

    // Orders sin totalAmount
    const ordersWithoutTotal = data.ordersSellOut.filter(o => !o.totalAmount || o.totalAmount === 0);
    if (ordersWithoutTotal.length > 0) {
      issues.push({
        id: 'orders-no-total',
        category: 'schema',
        severity: 'medium',
        title: 'Pedidos sin Total',
        description: `${ordersWithoutTotal.length} pedidos sin totalAmount`,
        count: ordersWithoutTotal.length,
        details: ordersWithoutTotal.slice(0, 5).map(o => `Order ${o.id}`),
        fix: 'Calcular totalAmount desde las líneas del pedido'
      });
    }

    // ============================================================
    // 3. VALORES HARDCODEADOS - Análisis Estático
    // ============================================================

    // Colores hardcodeados (sabemos que están en ssot.ts)
    issues.push({
      id: 'hardcoded-colors',
      category: 'hardcoded',
      severity: 'medium',
      title: 'Colores Hardcodeados',
      description: 'Aproximadamente 50+ colores hex en src/domain/ssot.ts',
      count: 50,
      details: [
        'colorValues = { sun: #fff5a9, agua: #99d9d9, ... }',
        'DEPT_META con colores por departamento',
        'SB_COLORS.brand, SB_COLORS.primary'
      ],
      fix: 'Migrar a systemConfig.theme.colors'
    });

    // Metadata objects
    issues.push({
      id: 'hardcoded-metadata',
      category: 'hardcoded',
      severity: 'high',
      title: 'Metadata Objects Hardcodeados',
      description: 'Múltiples objetos *_META hardcodeados en código',
      details: [
        'DEPT_META (departamentos con colores)',
        'ORDER_STATUS_META (estados de pedidos)',
        'SHIPMENT_STATUS_META (estados de envíos)',
        'PARTY_ROLE_META (roles de parties)',
        'LOT_QC_META (estados de calidad)'
      ],
      fix: 'Migrar a systemConfig.metadata'
    });

    // Reglas de alerta (probablemente en pipeline-helpers.ts)
    issues.push({
      id: 'hardcoded-alert-rules',
      category: 'hardcoded',
      severity: 'high',
      title: 'Reglas de Alertas Hardcodeadas',
      description: 'Thresholds de días sin contacto, seguimiento, etc.',
      details: [
        'Días sin contacto (probablemente 30)',
        'Días en stage sin acción (probablemente 15)',
        'Criterios de alertas en pipeline-helpers.ts'
      ],
      fix: 'Migrar a systemConfig.alertRules'
    });

    // Objetivos y targets
    if (data.users.some(u => u.kpiBaseline)) {
      issues.push({
        id: 'hardcoded-targets',
        category: 'hardcoded',
        severity: 'medium',
        title: 'Objetivos Parcialmente en BD',
        description: 'user.kpiBaseline existe pero las reglas están hardcodeadas',
        details: [
          'Targets por segmento no configurables',
          'Reglas de cálculo de cumplimiento en código',
          'Falta flexibilidad para ajustar objetivos'
        ],
        fix: 'Completar en systemConfig.salesTargets'
      });
    }

    // Calcular summary
    const summary = {
      total: issues.length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };

    return { issues, summary };
  }, [data]);

  if (!data) {
    return (
      <PageShell title="Auditoría de Datos">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Cargando datos...</p>
        </div>
      </PageShell>
    );
  }

  const { issues, summary } = auditResults;

  // Auditoría de flujo de datos
  const dataFlowIssues = useMemo(() => {
    if (!data) return [];
    return auditDataFlow(data);
  }, [data]);

  const dataFlowMap = useMemo(() => generateDataFlowMap(), []);

  if (!data) {
    return (
      <PageShell title="Auditoría de Datos">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Cargando datos...</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Auditoría del Sistema">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <SBButton 
          variant={activeTab === 'integrity' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('integrity')}
        >
          🔗 Integridad de Datos
        </SBButton>
        <SBButton 
          variant={activeTab === 'dataflow' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('dataflow')}
        >
          🔄 Flujo de Datos (UI→BD)
        </SBButton>
      </div>

      {activeTab === 'integrity' ? (
        <IntegrityAuditView issues={issues} summary={summary} data={data} />
      ) : (
        <DataFlowAuditView dataFlowIssues={dataFlowIssues} dataFlowMap={dataFlowMap} />
      )}
    </PageShell>
  );
}

function IntegrityAuditView({ issues, summary, data }: { issues: AuditIssue[], summary: any, data: any }) {
  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <SBCard title="">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Total Problemas</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{summary.total}</div>
          </div>
        </SBCard>

        <SBCard title="">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-gray-600">Alta Prioridad</span>
            </div>
            <div className="text-3xl font-bold text-red-600">{summary.high}</div>
          </div>
        </SBCard>

        <SBCard title="">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-gray-600">Media Prioridad</span>
            </div>
            <div className="text-3xl font-bold text-yellow-600">{summary.medium}</div>
          </div>
        </SBCard>

        <SBCard title="">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">Baja Prioridad</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">{summary.low}</div>
          </div>
        </SBCard>
      </div>

      {/* Issues by Category */}
      <div className="space-y-6">
        {/* Integrity Issues */}
        <IssuesSection 
          title="🔗 Integridad de Datos" 
          subtitle="Relaciones rotas y referencias inválidas"
          issues={issues.filter(i => i.category === 'integrity')} 
        />

        {/* Schema Issues */}
        <IssuesSection 
          title="📋 Calidad de Schema" 
          subtitle="Campos faltantes o incompletos"
          issues={issues.filter(i => i.category === 'schema')} 
        />

        {/* Hardcoded Values */}
        <IssuesSection 
          title="💾 Valores Hardcodeados" 
          subtitle="Configuración que debería estar en Base de Datos"
          issues={issues.filter(i => i.category === 'hardcoded')} 
        />
      </div>

      {/* Database Stats */}
      <SBCard title="📊 Estadísticas de Base de Datos" className="mt-6">
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <StatItem label="Parties" value={data.parties.length} />
            <StatItem label="Accounts" value={data.accounts.length} />
            <StatItem label="Users" value={data.users.length} />
            <StatItem label="Orders" value={data.ordersSellOut.length} />
            <StatItem label="Interactions" value={data.interactions.length} />
            <StatItem label="Items" value={data.items.length} />
            <StatItem label="Shipments" value={data.shipments.length} />
            <StatItem label="Lots" value={data.lots.length} />
          </div>
        </div>
      </SBCard>
    </>
  );
}

function DataFlowAuditView({ dataFlowIssues, dataFlowMap }: { dataFlowIssues: any[], dataFlowMap: any }) {
  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SBCard title="">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">Componentes UI</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">{dataFlowMap.ui.length}</div>
            <p className="text-xs text-gray-500 mt-1">Leen datos de BD</p>
          </div>
        </SBCard>

        <SBCard title="">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <PencilLine className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-600">Formularios</span>
            </div>
            <div className="text-3xl font-bold text-green-600">{dataFlowMap.write.length}</div>
            <p className="text-xs text-gray-500 mt-1">Escriben datos en BD</p>
          </div>
        </SBCard>

        <SBCard title="">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-600">Funciones Cálculo</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">{dataFlowMap.compute.length}</div>
            <p className="text-xs text-gray-500 mt-1">Procesan datos</p>
          </div>
        </SBCard>
      </div>

      {/* Issues */}
      {dataFlowIssues.length > 0 && (
        <SBCard title="⚠️ Problemas de Flujo de Datos" className="mb-6">
          <div className="p-6">
            <div className="space-y-3">
              {dataFlowIssues.map(issue => (
                <div key={issue.id} className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                  <h4 className="font-semibold text-red-900">{issue.title}</h4>
                  <p className="text-sm text-red-700 mt-1">{issue.description}</p>
                  <div className="mt-2 text-xs text-red-600">
                    <strong>Componente:</strong> {issue.component}
                  </div>
                  <div className="mt-2 text-xs bg-white rounded p-2">
                    <strong>Solución:</strong> {issue.fix}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SBCard>
      )}

      {/* Mapa de Flujo: UI Reads */}
      <SBCard title="📖 Componentes que LEEN datos" className="mb-6">
        <div className="p-6">
          <div className="space-y-4">
            {dataFlowMap.ui.map((node: any) => (
              <div key={node.id} className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-blue-900">{node.component}</h4>
                    <p className="text-sm text-blue-700">{node.description}</p>
                    {node.file && (
                      <p className="text-xs text-blue-600 font-mono mt-1">{node.file}</p>
                    )}
                  </div>
                  {node.verified && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      ✓ Verificado
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-xs font-medium text-blue-800 mb-1">Colecciones:</p>
                  <div className="flex flex-wrap gap-2">
                    {node.collections.map((col: string) => (
                      <span key={col} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-mono">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xs font-medium text-blue-800 mb-1">Campos usados:</p>
                  <div className="flex flex-wrap gap-1">
                    {node.fields.slice(0, 5).map((field: string) => (
                      <span key={field} className="px-1.5 py-0.5 bg-white text-blue-700 text-xs rounded font-mono">
                        {field}
                      </span>
                    ))}
                    {node.fields.length > 5 && (
                      <span className="px-1.5 py-0.5 text-blue-600 text-xs">
                        +{node.fields.length - 5} más
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SBCard>

      {/* Mapa de Flujo: Writes */}
      <SBCard title="✏️ Formularios que ESCRIBEN datos" className="mb-6">
        <div className="p-6">
          <div className="space-y-4">
            {dataFlowMap.write.map((node: any) => (
              <div key={node.id} className="border rounded-lg p-4 bg-green-50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-green-900">{node.component}</h4>
                    <p className="text-sm text-green-700">{node.description}</p>
                    {node.file && (
                      <p className="text-xs text-green-600 font-mono mt-1">{node.file}</p>
                    )}
                  </div>
                  {node.verified && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      ✓ Verificado
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-xs font-medium text-green-800 mb-1">Escribe en:</p>
                  <div className="flex flex-wrap gap-2">
                    {node.collections.map((col: string) => (
                      <span key={col} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-mono font-semibold">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xs font-medium text-green-800 mb-1">Campos escritos:</p>
                  <div className="flex flex-wrap gap-1">
                    {node.fields.slice(0, 8).map((field: string) => (
                      <span key={field} className="px-1.5 py-0.5 bg-white text-green-700 text-xs rounded font-mono">
                        {field}
                      </span>
                    ))}
                    {node.fields.length > 8 && (
                      <span className="px-1.5 py-0.5 text-green-600 text-xs">
                        +{node.fields.length - 8} más
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SBCard>

      {/* Mapa de Flujo: Compute */}
      <SBCard title="🧮 Funciones de CÁLCULO" className="mb-6">
        <div className="p-6">
          <div className="space-y-4">
            {dataFlowMap.compute.map((node: any) => (
              <div key={node.id} className="border rounded-lg p-4 bg-purple-50">
                <div>
                  <h4 className="font-semibold text-purple-900">{node.component}</h4>
                  <p className="text-sm text-purple-700">{node.description}</p>
                  {node.file && (
                    <p className="text-xs text-purple-600 font-mono mt-1">{node.file}</p>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-xs font-medium text-purple-800 mb-1">Usa datos de:</p>
                  <div className="flex flex-wrap gap-2">
                    {node.collections.map((col: string) => (
                      <span key={col} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded font-mono">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xs font-medium text-purple-800 mb-1">Campos procesados:</p>
                  <div className="flex flex-wrap gap-1">
                    {node.fields.map((field: string) => (
                      <span key={field} className="px-1.5 py-0.5 bg-white text-purple-700 text-xs rounded font-mono">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SBCard>
    </>
  );
}

function IssuesSection({ title, subtitle, issues }: { title: string; subtitle: string; issues: AuditIssue[] }) {
  if (issues.length === 0) {
    return (
      <SBCard title={title}>
        <div className="p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No se encontraron problemas en esta categoría</p>
        </div>
      </SBCard>
    );
  }

  return (
    <SBCard title={title}>
      <div className="p-6">
        <p className="text-sm text-gray-600 mb-4">{subtitle}</p>
        <div className="space-y-4">
          {issues.map(issue => (
            <div 
              key={issue.id} 
              className={`p-4 rounded-lg border-l-4 ${
                issue.severity === 'high' ? 'border-red-500 bg-red-50' :
                issue.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                'border-blue-500 bg-blue-50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {issue.severity === 'high' && <XCircle className="w-5 h-5 text-red-600" />}
                  {issue.severity === 'medium' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                  {issue.severity === 'low' && <Hash className="w-5 h-5 text-blue-600" />}
                  <h4 className="font-semibold text-gray-900">{issue.title}</h4>
                </div>
                {issue.count && (
                  <span className="px-2 py-1 bg-white rounded-full text-xs font-medium text-gray-700">
                    {issue.count} items
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-700 mb-2">{issue.description}</p>
              
              {issue.details && issue.details.length > 0 && (
                <div className="bg-white/50 rounded p-2 mb-2">
                  <p className="text-xs font-medium text-gray-600 mb-1">Ejemplos:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {issue.details.map((detail, idx) => (
                      <li key={idx} className="font-mono">• {detail}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {issue.fix && (
                <div className="flex items-start gap-2 text-xs text-gray-700 bg-white/50 rounded p-2">
                  <Code className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                  <p><strong>Solución:</strong> {issue.fix}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </SBCard>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
