"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from "react";
import { Play, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import {
  runAllIntegrationTests,
  runSendcloudTests,
  runHoldedTests,
  runShopifyTests,
  type IntegrationTestSuite,
  type TestResult,
} from "@/server/actions/integration-tests";
import { toast } from "sonner";
import { MasterSyncPanel } from "@/components/sync/MasterSyncPanel";

type Tab = 'tests' | 'sync';

export default function IntegrationsTestPage() {
  const [tab, setTab] = useState<Tab>('tests');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<{
    sendcloud?: IntegrationTestSuite;
    holded?: IntegrationTestSuite;
    shopify?: IntegrationTestSuite;
    totalDuration?: number;
  } | null>(null);

  const runTests = async (integration?: "sendcloud" | "holded" | "shopify") => {
    setRunning(true);
    setResults(null);

    try {
      if (integration === "sendcloud") {
        const result = await runSendcloudTests();
        setResults({ sendcloud: result });
      } else if (integration === "holded") {
        const result = await runHoldedTests();
        setResults({ holded: result });
      } else if (integration === "shopify") {
        const result = await runShopifyTests();
        setResults({ shopify: result });
      } else {
        const result = await runAllIntegrationTests();
        setResults(result);
      }

      toast.success("Tests completados");
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="sb-page">
      {/* Header con glassmorphism */}
      <div className="sb-header-glass mb-8 p-6">
        <h1 className="sb-page__title">
          Test de Integraciones
        </h1>
        <p className="sb-page__subtitle">
          Ejecuta tests automatizados y sincronización global
        </p>
      </div>

      {/* Tabs */}
      <div className="sb-tabs mb-6">
        <button
          onClick={() => setTab('tests')}
          className="sb-tab"
          aria-selected={tab === 'tests'}
        >
          🧪 Tests Automáticos
        </button>
        <button
          onClick={() => setTab('sync')}
          className="sb-tab"
          aria-selected={tab === 'sync'}
        >
          ⚡ Sincronización Global
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'sync' ? (
        <MasterSyncPanel />
      ) : (
        <>

      {/* Control Buttons con sb-btn */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => runTests()}
          disabled={running}
          className="sb-btn sb-btn--primary"
        >
          <Play className="h-4 w-4" />
          {running ? "Ejecutando..." : "Ejecutar Todos"}
        </button>

        <button
          onClick={() => runTests("sendcloud")}
          disabled={running}
          className="sb-btn sb-btn--secondary"
        >
          Solo Sendcloud
        </button>

        <button
          onClick={() => runTests("holded")}
          disabled={running}
          className="sb-btn sb-btn--secondary"
        >
          Solo Holded
        </button>

        <button
          onClick={() => runTests("shopify")}
          disabled={running}
          className="sb-btn sb-btn--secondary"
        >
          Solo Shopify
        </button>
      </div>

      {/* Loading State */}
      {running && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-2 text-sm font-medium text-blue-800">
            Ejecutando tests...
          </p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Summary con glassmorphism */}
          {results.totalDuration !== undefined && (
            <div className="sb-card-glass-light p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Resumen General
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="sb-card-glass-subtle p-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {(results.totalDuration / 1000).toFixed(2)}s
                  </div>
                  <div className="text-sm text-gray-500">Duración total</div>
                </div>
                <div className="sb-card-glass-subtle p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {(results.sendcloud?.passed || 0) +
                      (results.holded?.passed || 0) +
                      (results.shopify?.passed || 0)}
                  </div>
                  <div className="text-sm text-gray-500">Pasados</div>
                </div>
                <div className="sb-card-glass-subtle p-4">
                  <div className="text-2xl font-bold text-red-600">
                    {(results.sendcloud?.failed || 0) +
                      (results.holded?.failed || 0) +
                      (results.shopify?.failed || 0)}
                  </div>
                  <div className="text-sm text-gray-500">Fallados</div>
                </div>
                <div className="sb-card-glass-subtle p-4">
                  <div className="text-2xl font-bold text-amber-600">
                    {(results.sendcloud?.warnings || 0) +
                      (results.holded?.warnings || 0) +
                      (results.shopify?.warnings || 0)}
                  </div>
                  <div className="text-sm text-gray-500">Advertencias</div>
                </div>
              </div>
            </div>
          )}

          {/* Sendcloud Results */}
          {results.sendcloud && (
            <TestSuiteCard suite={results.sendcloud} color="green" />
          )}

          {/* Holded Results */}
          {results.holded && (
            <TestSuiteCard suite={results.holded} color="purple" />
          )}

          {/* Shopify Results */}
          {results.shopify && (
            <TestSuiteCard suite={results.shopify} color="amber" />
          )}
        </div>
      )}

      {/* Initial State */}
      {!running && !results && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Play className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            Sin resultados
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Ejecuta los tests para ver los resultados
          </p>
        </div>
      )}
        </>
      )}
    </div>
  );
}

// Component for Test Suite Card
function TestSuiteCard({
  suite,
  color,
}: {
  suite: IntegrationTestSuite;
  color: "green" | "purple" | "amber";
}) {
  const colorClasses = {
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-900",
      badge: "bg-green-100 text-green-800",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-900",
      badge: "bg-purple-100 text-purple-800",
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-900",
      badge: "bg-amber-100 text-amber-800",
    },
  };

  const classes = colorClasses[color];

  return (
    <div className={`sb-card-glass-light p-6 border ${classes.border}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-semibold capitalize ${classes.text}`}>
            {suite.integration}
          </h2>
          <p className="text-sm text-gray-600">
            {suite.totalDuration}ms • {suite.tests.length} tests
          </p>
        </div>
        <div className="flex gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes.badge}`}>
            {suite.passed} ✓
          </span>
          {suite.failed > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
              {suite.failed} ✗
            </span>
          )}
          {suite.warnings > 0 && (
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
              {suite.warnings} ⚠
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {suite.tests.map((test: any, idx: any) => (
          <TestResultRow key={idx} test={test} />
        ))}
      </div>
    </div>
  );
}

// Component for Test Result Row
function TestResultRow({ test }: { test: TestResult }) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    success: {
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    error: {
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    warning: {
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  };

  const config = statusConfig[test.status];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-lg border border-gray-200 ${config.bg} p-3 transition-all`}
    >
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${config.color}`} />
          <div>
            <div className="font-medium text-gray-900">{test.name}</div>
            <div className="text-sm text-gray-600">{test.message}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            {test.duration}ms
          </div>
        </div>
      </div>

      {expanded && test.details && (
        <div className="mt-3 rounded border border-gray-300 bg-white p-3">
          <pre className="text-xs text-gray-700">
            {JSON.stringify(test.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
