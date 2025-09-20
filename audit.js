#!/usr/bin/env node
/**
 * Auditoría Santa Brisa (local, sin GitHub)
 *
 * 1. Escanea /src en busca de duplicación de UI (ModuleHeader, DataToolbar…).
 * 2. Detecta overlays "fixed inset-0" repetidos.
 * 3. Comprueba mal uso de "use server" en route handlers.
 * 4. Valida firebaseAdmin exportado correctamente.
 * 5. Busca useEffect con fetch sin cleanup.
 * 6. Cuenta pages/layouts por grupo en app router.
 * 7. Genera resumen en audit-summary.md + detalle en audit-report/audit-details.md.
 */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "audit-report");

const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|jsx)$/.test(f)) files.push(p);
  }
}
walk(SRC);

const result = {
  files: files.length,
  pages: 0,
  layouts: 0,
  clientFiles: 0,
  duplicatesUI: {},
  overlaysFixed: [],
  badServerExports: [],
  firebaseAdmin: [],
  effectNoCleanup: [],
  tokenViolations: [],
  routeGroups: {}
};

const UI_NAMES = ["ModuleHeader", "DataToolbar", "KPIGrid", "EmptyState", "Dialog", "TaskBoard"];

for (const f of files) {
  const src = fs.readFileSync(f, "utf8");

  // Count pages/layouts
  if (/app\/.*\/page\.(ts|tsx|js|jsx)$/.test(f)) result.pages++;
  if (/app\/.*\/layout\.(ts|tsx|js|jsx)$/.test(f)) result.layouts++;
  if (/^["']use client["']/.test(src)) result.clientFiles++;

  // UI duplicates
  UI_NAMES.forEach((name) => {
    if (new RegExp(`(function|const)\\s+${name}\\b`).test(src)) {
      result.duplicatesUI[name] = result.duplicatesUI[name] || [];
      result.duplicatesUI[name].push(path.relative(ROOT, f));
    }
  });

  // Overlays fixed
  if (/fixed\s+inset-0\s+z-\[/.test(src)) result.overlaysFixed.push(path.relative(ROOT, f));

  // "use server" misuse
  if (/app\/.*\/route\.(ts|tsx|js|jsx)$/.test(f)) {
    if (/["']use server["']/.test(src) && /export\s+(const|let|var)\s+/.test(src)) {
      result.badServerExports.push(path.relative(ROOT, f));
    }
  }

  // firebaseAdmin issues
  if (/firebaseAdmin/.test(f)) {
    if (/export\s+const\s+adminDb\s*=\s*\(\)/.test(src)) {
      result.firebaseAdmin.push(`${path.relative(ROOT, f)} → adminDb exportado como función`);
    }
  }

  // useEffect + fetch sin cleanup
  if (/useEffect\(/.test(src) && /fetch\(/.test(src) && !/abort/i.test(src)) {
    result.effectNoCleanup.push(path.relative(ROOT, f));
  }

  // primitives con bg- hardcode
  if (/\/ui\/primitives\//.test(f) && /bg-/.test(src) && !/cva\(/.test(src)) {
    result.tokenViolations.push(path.relative(ROOT, f));
  }
}

// Route groups
const appDir = path.join(SRC, "app");
function countRoutes(dir, group = "(root)") {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) countRoutes(p, f.startsWith("(") ? f : group);
    else if (/page\.(ts|tsx|js|jsx)$/.test(f)) {
      result.routeGroups[group] = result.routeGroups[group] || { pages: 0, layouts: 0 };
      result.routeGroups[group].pages++;
    } else if (/layout\.(ts|tsx|js|jsx)$/.test(f)) {
      result.routeGroups[group] = result.routeGroups[group] || { pages: 0, layouts: 0 };
      result.routeGroups[group].layouts++;
    }
  }
}
countRoutes(appDir);

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "audit.json"), JSON.stringify(result, null, 2));
fs.writeFileSync(
  path.join(OUT, "audit-summary.md"),
  `# Auditoría Santa Brisa\n\n` +
    `**Archivos escaneados:** ${result.files}\n` +
    `**Pages:** ${result.pages}, **Layouts:** ${result.layouts}, **Client comps:** ${result.clientFiles}\n\n` +
    `## UI duplicada\n${Object.entries(result.duplicatesUI)
      .map(([k, v]) => `- ${k}: ${v.length} definiciones`)
      .join("\n")}\n\n` +
    `## Otros hallazgos\n` +
    `- Overlays fixed: ${result.overlaysFixed.length}\n` +
    `- "use server" mal usado: ${result.badServerExports.length}\n` +
    `- Firebase admin sospechoso: ${result.firebaseAdmin.length}\n` +
    `- useEffect sin cleanup: ${result.effectNoCleanup.length}\n` +
    `- Token violations: ${result.tokenViolations.length}\n\n` +
    `## Rutas\n` +
    Object.entries(result.routeGroups)
      .map(([g, v]) => `- ${g}: ${v.pages} pages, ${v.layouts} layouts`)
      .join("\n")
);
console.log("✅ Auditoría completada. Mira audit-report/audit-summary.md");
