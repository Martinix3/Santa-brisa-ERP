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
 * 7. Genera resumen en audit-summary.md + detalle en audit-report/audit.json.
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

const UI_NAMES = ["Dialog", "ModuleHeader", "EmptyState", "TaskBoard"];

for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const relPath = path.relative(ROOT, f);

  // Count pages/layouts
  if (/app\/.*\/page\.(ts|tsx|js|jsx)$/.test(f)) result.pages++;
  if (/app\/.*\/layout\.(ts|tsx|js|jsx)$/.test(f)) result.layouts++;
  if (/^["']use client["']/.test(src)) result.clientFiles++;

  // UI duplicates
  UI_NAMES.forEach((name) => {
    if (new RegExp(`(function|const)\\s+${name}\\b`).test(src) && !/node_modules/.test(f)) {
      result.duplicatesUI[name] = result.duplicatesUI[name] || [];
      result.duplicatesUI[name].push(relPath);
    }
  });

  // Overlays fixed
  if (/className=.*fixed\s+inset-0/.test(src) && !/node_modules/.test(f)) {
     if(!result.overlaysFixed.includes(relPath)) result.overlaysFixed.push(relPath);
  }

  // "use server" misuse
  if (/app\/.*\/route\.(ts|tsx|js|jsx)$/.test(f) && !/node_modules/.test(f)) {
    if (/["']use server["']/.test(src) && /export\s+(const|let|var)\s+/.test(src)) {
      if(!result.badServerExports.includes(relPath)) result.badServerExports.push(relPath);
    }
  }

  // firebaseAdmin issues
  if (/firebaseAdmin/.test(f) && !/node_modules/.test(f)) {
    if (/export\s+const\s+adminDb\s*=\s*\(\)/.test(src)) {
      const msg = `${relPath} → adminDb exportado como función`;
      if(!result.firebaseAdmin.includes(msg)) result.firebaseAdmin.push(msg);
    }
  }

  // useEffect + fetch sin cleanup
  if (/useEffect\(/.test(src) && /fetch\(/.test(src) && !/abort/i.test(src) && !/node_modules/.test(f)) {
    if(!result.effectNoCleanup.includes(relPath)) result.effectNoCleanup.push(relPath);
  }

  // primitives con bg- hardcode
  if (/\/ui\//.test(f) && /bg-/.test(src) && !/cva\(/.test(src) && !/node_modules/.test(f)) {
     if(!result.tokenViolations.includes(relPath)) result.tokenViolations.push(relPath);
  }
}

// Route groups
const appDir = path.join(SRC, "app");
function countRoutes(dir, group = "(root)") {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory() && !f.startsWith('api')) countRoutes(p, f.startsWith("(") ? f : group);
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

let summaryMd = `# Auditoría Santa Brisa\n\n`;
summaryMd += `**Archivos escaneados:** ${result.files}\n`;
summaryMd += `**Pages:** ${result.pages}, **Layouts:** ${result.layouts}, **Client comps:** ${result.clientFiles}\n\n`;
summaryMd += `## UI duplicada (por nombre de archivo)\n`;
const dupes = Object.entries(result.duplicatesUI).filter(([k,v]) => v.length > 1);
if (dupes.length) {
    summaryMd += dupes.map(([k, v]) => `- ${k}: ${v.length} defs\n  - ${v.join('\n  - ')}`).join("\n") + '\n\n';
} else {
    summaryMd += `- Sin duplicados detectados\n\n`;
}

summaryMd += `## Otros hallazgos\n`;
const otherFindings = [
    { label: "Overlays fixed", items: result.overlaysFixed },
    { label: "useEffect sin cleanup", items: result.effectNoCleanup },
];
otherFindings.forEach(f => {
    summaryMd += `- ${f.label}: ${f.items.length}\n`;
    if (f.items.length) {
        summaryMd += f.items.map(i => `  - ${i}`).join('\n') + '\n';
    }
});
summaryMd += `\n`;

summaryMd += `## Rutas (conteo aproximado)\n`;
summaryMd += Object.entries(result.routeGroups).map(([g, v]) => `- ${g}: ${v.pages} pages, ${v.layouts} layouts`).join("\n");


fs.writeFileSync(path.join(OUT, "audit-summary.md"), summaryMd);
fs.copyFileSync(path.join(OUT, "audit-summary.md"), path.join(OUT, "INDEX.md"));

console.log("✅ Auditoría completada. Mira audit-report/audit-summary.md");
