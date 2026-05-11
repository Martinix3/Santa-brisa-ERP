"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from "react";
import { runAnalyzer } from "@/server/actions/analyzer-panel";

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

export function AnalyzerPanelContent() {
  const [selectedAnalyzer, setSelectedAnalyzer] = useState<string>("");
  const [entityId, setEntityId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunAnalyzer = async () => {
    if (!selectedAnalyzer || !entityId) {
      setError("Please select an analyzer and provide an entity ID.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await runAnalyzer(selectedAnalyzer, entityId);
      if (res.success) {
        setResult(res.data);
      } else {
        setError(res.error || "An unknown error occurred.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sb-card-glass-light p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="sb-label">Analyzer</label>
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
        </div>
        <div className="mt-4">
          <button onClick={handleRunAnalyzer} disabled={loading} className="sb-btn sb-btn--primary">
            {loading ? "Running..." : "Run Analyzer"}
          </button>
        </div>
      </div>

      {error && (
        <div className="sb-card-glass-light p-5">
          <h3 className="text-lg font-semibold text-destructive">Error</h3>
          <pre className="mt-2 p-4 bg-destructive/10 rounded-lg text-sm text-destructive-foreground">
            {error}
          </pre>
        </div>
      )}

      {result && (
        <div className="sb-card-glass-light p-5">
          <h3 className="text-lg font-semibold">Result</h3>
          <pre className="mt-2 p-4 bg-secondary/30 rounded-lg text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
