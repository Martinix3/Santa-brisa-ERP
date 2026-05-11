// scripts/legacy-guard.mjs
// Escanea imports y reporta dependencias hacia módulos marcados como legacy
// Uso:
//  - node scripts/legacy-guard.mjs         (reporte y exit 0)
//  - node scripts/legacy-guard.mjs --fail-on-legacy (exit 1 si hay usos)

import fs from 'fs';
import path from 'path';
import { globby } from 'globby';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const LEGACY_DIR = path.join(ROOT, 'legacy');
const ALLOWLIST_PATH = path.join(LEGACY_DIR, 'allowlist.json');
const FAIL = process.argv.includes('--fail-on-legacy');

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function loadAllowlist() {
  const raw = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
  const keepExpanded = new Set();
  // expand globs using globby synchronously-ish (we're in ESM; use async wrapper)
  return globby(raw.keep, { gitignore: true }).then((matches) => {
    for (const m of matches) keepExpanded.add(path.normalize(m));
    return { keep: keepExpanded, exclude: raw.exclude || [] };
  });
}

function isRelative(spec) { return spec.startsWith('./') || spec.startsWith('../'); }
function isAlias(spec) { return spec.startsWith('@/'); }

function resolveSpecifier(fromFile, spec) {
  if (!spec) return null;
  if (isRelative(spec)) {
    const abs = path.resolve(path.dirname(fromFile), spec);
    return resolveFile(abs);
  }
  if (isAlias(spec)) {
    const rel = spec.replace(/^@\//, '');
    const abs = path.join(SRC, rel);
    return resolveFile(abs);
  }
  return null; // paquete externo u otro alias, ignorar
}

const EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx'];
function resolveFile(absNoExt) {
  // si apunta a directorio, busca index
  try {
    const st = fs.existsSync(absNoExt) ? fs.statSync(absNoExt) : null;
    if (st && st.isDirectory()) {
      for (const ext of EXTENSIONS) {
        const cand = path.join(absNoExt, 'index' + ext);
        if (fs.existsSync(cand)) return cand;
      }
    }
  } catch {}
  for (const ext of EXTENSIONS) {
    const cand = absNoExt.endsWith(ext) ? absNoExt : absNoExt + ext;
    if (fs.existsSync(cand)) return cand;
  }
  return null;
}

function hasLegacyHeader(p) {
  try {
    const src = fs.readFileSync(p, 'utf8');
    return /@deprecated\s+LEGACY\s+MODULE/.test(src);
  } catch {
    return false;
  }
}

async function main() {
  const { keep, exclude } = await loadAllowlist();
  const files = await globby(['src/**/*.{ts,tsx}'], { gitignore: true, ignore: exclude });
  const importRe = /(?:(?:import|export)\s+[^'";]*?from\s*['"]([^'"\n]+)['"])|(?:require\(\s*['"]([^'"\n]+)['"]\s*\))/g;

  const findings = [];
  for (const f of files) {
    const code = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = importRe.exec(code))) {
      const spec = m[1] || m[2];
      const resolved = resolveSpecifier(f, spec);
      if (!resolved) continue;
      const rel = path.relative(ROOT, resolved);
      const norm = path.normalize(rel);
      const isKept = keep.has(norm);
      const isLegacy = !isKept && hasLegacyHeader(resolved);
      if (isLegacy) {
        findings.push({ from: path.relative(ROOT, f), to: norm, spec });
      }
    }
  }

  ensureDir(LEGACY_DIR);
  fs.writeFileSync(path.join(LEGACY_DIR, 'legacy-usage.json'), JSON.stringify({ count: findings.length, findings }, null, 2));
  const md = [
    '# Legacy Usage Report',
    `Total usos detectados: ${findings.length}`,
    '',
    ...findings.slice(0, 200).map(x => `- ${x.from} → ${x.spec} (${x.to})`),
    findings.length > 200 ? `... y ${findings.length - 200} más` : ''
  ].join('\n');
  fs.writeFileSync(path.join(LEGACY_DIR, 'legacy-usage.md'), md);

  console.log(`Usos legacy detectados: ${findings.length}`);
  if (FAIL && findings.length > 0) process.exit(1);
}

main().catch(err => { console.error('[legacy-guard] Error:', err); process.exit(1); });

