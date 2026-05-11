"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useEffect } from "react";
import { getAnalyzerConfig, updateAnalyzerConfig, runAnalyzer } from "@/server/actions/analyzer-panel";

const ANALYZERS = [
  "sales",
  "marketing",
  "production",
  "quality",
  "stock",
  "warehouse",
  "bom",
  "code",
  "document",
  "email",
  "quicklog",
  "uiux",
];

export function AnalyzerControlPanelContent() {
  const [selectedAnalyzer, setSelectedAnalyzer] = useState<string>("");
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [entityId, setEntityId] = useState<string>("");

  useEffect(() => {
    if (selectedAnalyzer) {
      loadConfig();
    }
  }, [selectedAnalyzer]);

  const loadConfig = async () => {
    setLoading(true);
    const res = await getAnalyzerConfig(selectedAnalyzer);
    if (res.success) {
      setConfig(res.data);
    }
    setLoading(false);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    await updateAnalyzerConfig(selectedAnalyzer, config);
    setSaving(false);
  };

  const handleRunAnalyzer = async () => {
    setLoading(true);
    setRunError(null);
    setRunResult(null);

    try {
      const res = await runAnalyzer(selectedAnalyzer, entityId, config);
      if (res.success) {
        setRunResult(res.data);
      } else {
        setRunError(res.error || "An unknown error occurred.");
      }
    } catch (err: any) {
      setRunError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sb-card-glass-light p-5">
        <div className="space-y-2">
          <label className="sb-label">Select Analyzer</label>
          <select
            value={selectedAnalyzer}
            onChange={(e) => setSelectedAnalyzer(e.target.value)}
            className="sb-select"
          >
            <option value="">Select an analyzer</option>
            {ANALYZERS.map((analyzer) => (
              <option key={analyzer} value={analyzer}>
                {analyzer}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p>Loading config...</p>}

      {config && (
        <div className="sb-card-glass-light p-5 space-y-4">
          <h3 className="text-lg font-semibold">Configuration for {selectedAnalyzer}</h3>
          <div className="space-y-2">
            <label className="sb-label">Complexity</label>
            <select
              value={config.complexity}
              onChange={(e) => setConfig({ ...config, complexity: e.target.value })}
              className="sb-select"
            >
              <option value="simple">Simple</option>
              <option value="medium">Medium</option>
              <option value="complex">Complex</option>
            </select>
          </div>
          {config.prompt && (
            <div className="space-y-2">
              <label className="sb-label">Prompt</label>
              <textarea
                value={config.prompt}
                onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                className="sb-textarea h-64"
              />
            </div>
          )}
          <button onClick={handleSaveConfig} disabled={saving} className="sb-btn sb-btn--primary">
            {saving ? "Saving..." : "Save Config"}
          </button>
        </div>
      )}

      {selectedAnalyzer && (
        <div className="sb-card-glass-light p-5 space-y-4">
          <h3 className="text-lg font-semibold">Run Analyzer</h3>
          <div className="space-y-2">
            <label className="sb-label">Entity ID</label>
            <input
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="Enter the entity ID"
              className="sb-input"
            />
          </div>
          <button onClick={handleRunAnalyzer} disabled={loading} className="sb-btn sb-btn--secondary">
            {loading ? "Running..." : "Run Analyzer"}
          </button>
        </div>
      )}

      {runError && (
        <div className="sb-card-glass-light p-5">
          <h3 className="text-lg font-semibold text-destructive">Error</h3>
          <pre className="mt-2 p-4 bg-destructive/10 rounded-lg text-sm text-destructive-foreground">
            {runError}
          </pre>
        </div>
      )}

      {runResult && (
        <div className="sb-card-glass-light p-5">
          <h3 className="text-lg font-semibold">Result</h3>
          <pre className="mt-2 p-4 bg-secondary/30 rounded-lg text-sm">
            {JSON.stringify(runResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
