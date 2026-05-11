// scripts/mark-legacy.mjs
// Marca como LEGACY (obsoleto) todos los archivos fuera de la allowlist.
// Modos:
//  - por defecto: sólo reporte (no escribe).
//  - --write: inserta cabecera @deprecated en archivos legacy.
//  - --report: fuerza escribir reportes (json y md).

import fs from 'fs';
import path from 'path';
import { globby } from 'globby';

const ROOT = process.cwd();
const LEGACY_DIR = path.join(ROOT, 'legacy');
const ALLOWLIST_PATH = path.join(LEGACY_DIR, 'allowlist.json');

const args = new Set(process.argv.slice(2));
const WRITE = args.has('--write');
const REPORT = WRITE || args.has('--report');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) {
    throw new Error(`No se encontró ${ALLOWLIST_PATH}. Crea primero legacy/allowlist.json`);
  }
  const raw = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
  const keep = Array.isArray(raw.keep) ? raw.keep : [];
  const exclude = Array.isArray(raw.exclude) ? raw.exclude : [];
  return { keep, exclude };
}

function hasLegacyHeader(source) {
  return /@deprecated\s+LEGACY\s+MODULE/.test(source);
}

function isUseDirective(line) {
  const s = line.trim();
  return s === '"use client";' || s === '\'use client\';' || s === '"use server";' || s === '\'use server\';' || s === '"use client"' || s === '\'use client\'' || s === '"use server"' || s === '\'use server\'';
}

function insertHeaderPreservingUseDirectives(source) {
  const header = [
    '/**',
    ' * @deprecated LEGACY MODULE',
    ' * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md',
    ' */',
    ''
  ].join('\n');

  const lines = source.split('\n');
  // saltar BOM si existiera
  let i = 0;
  if (lines[0] && lines[0].charCodeAt(0) === 0xFEFF) {
    lines[0] = lines[0].slice(1);
  }
  // mantener directivas 'use client/server' al principio
  let insertAt = 0;
  while (insertAt < lines.length && isUseDirective(lines[insertAt])) {
    insertAt++;
  }
  lines.splice(insertAt, 0, header);
  return lines.join('\n');
}

async function main() {
  const { keep, exclude } = loadAllowlist();

  // recolecta todos los archivos TS/TSX bajo src
  const all = await globby(['src/**/*.{ts,tsx}'], {
    gitignore: true,
    ignore: exclude,
  });

  // expande allowlist a archivos concretos
  const keepExpanded = await globby(keep, { gitignore: true });
  const keepSet = new Set(keepExpanded.map(p => path.normalize(p)));

  const legacy = all.filter(p => !keepSet.has(path.normalize(p)));

  // reporte base
  const perDir = new Map();
  for (const f of legacy) {
    const dir = path.dirname(f);
    perDir.set(dir, (perDir.get(dir) || 0) + 1);
  }

  const summary = {
    totalFiles: all.length,
    allowlisted: keepSet.size,
    legacyCount: legacy.length,
    topLegacyDirs: Array.from(perDir.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([dir, count]) => ({ dir, count })),
    generatedAt: new Date().toISOString(),
    writeMode: WRITE,
  };

  if (REPORT) {
    ensureDir(LEGACY_DIR);
    fs.writeFileSync(path.join(LEGACY_DIR, 'legacy-report.json'), JSON.stringify({ summary, legacy }, null, 2));
    const md = [
      '# Legacy Report',
      '',
      `Total archivos: ${summary.totalFiles}`,
      `Allowlisted: ${summary.allowlisted}`,
      `Legacy (candidatos): ${summary.legacyCount}`,
      '',
      '## Directorios con más legacy',
      ...summary.topLegacyDirs.map(({ dir, count }) => `- ${dir} — ${count}`),
      '',
      '_Generado por scripts/mark-legacy.mjs_'
    ].join('\n');
    fs.writeFileSync(path.join(LEGACY_DIR, 'legacy-report.md'), md);
  }

  if (!WRITE) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  // Modo escritura: insertar cabecera @deprecated en archivos legacy que no la tengan
  let updated = 0;
  for (const file of legacy) {
    // evitar marcar archivos de tipos especiales (por si se coló)
    if (file.endsWith('.d.ts')) continue;

    const src = fs.readFileSync(file, 'utf8');
    if (hasLegacyHeader(src)) continue;

    const next = insertHeaderPreservingUseDirectives(src);
    fs.writeFileSync(file, next, 'utf8');
    updated++;
  }

  console.log(`Archivos legacy actualizados con cabecera: ${updated}`);
}

main().catch(err => {
  console.error('[mark-legacy] Error:', err);
  process.exit(1);
});

