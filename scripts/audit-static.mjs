import { promises as fs } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src';
const REPORT_DIR = 'audit-report';

const GLOB_DIRS = [
  'src/app',
  'src/components',
  'src/features',
  'src/server',
  'src/lib'
];

function isPage(file){ return /\/page\.(tsx|jsx)$/.test(file); }
function isLayout(file){ return /\/layout\.(tsx|jsx)$/.test(file); }
function isClientComp(src){ return /['"]use client['"]/.test(src); }
function hasFixedOverlay(src){ return /class(Name)?=.*(fixed[^'"]*inset-0|inset-0[^'"]*fixed)/s.test(src); }
function hasUseEffectNoCleanup(src){
  // heurística barata: useEffect(() => { ... setInterval/fetch ... }, [...]) sin return
  return /useEffect\s*\(\s*\(\s*=>\s*{[\s\S]*?}\s*,\s*\[.*?\]\s*\)/m.test(src) &&
         !/useEffect\s*\(\s*\(\s*=>\s*{[\s\S]*?return\s*\(\s*()=>/m.test(src);
}

async function walk(dir){
  const out = [];
  async function rec(d){
    let entries = [];
    try { entries = await fs.readdir(d, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries){
      const p = join(d, e.name);
      if (e.isDirectory()) await rec(p);
      else if (/\.(tsx|ts|jsx|js)$/.test(e.name)) out.push(p);
    }
  }
  await rec(dir);
  return out;
}

async function read(p){
  try { return await fs.readFile(p, 'utf8'); } catch { return ''; }
}

function baseNameNoExt(p){
  const n = p.split('/').pop() || '';
  return n.replace(/\.(tsx|ts|jsx|js)$/,'');
}

function dedupeCounts(files){
  // “duplicado” = mismo nombre de componente en diferentes raíces (features/*/components vs components/ui)
  const counts = new Map();
  for (const f of files){
    const bn = baseNameNoExt(f);
    const key = bn.toLowerCase();
    counts.set(key, (counts.get(key) || new Set()).add(f));
  }
  const result = [];
  for (const [name, set] of counts){
    if (set.size > 1) result.push({ name, paths: Array.from(set) });
  }
  return result;
}

async function run(){
  await fs.mkdir(REPORT_DIR, { recursive: true });

  const allFiles = (await Promise.all(GLOB_DIRS.map(walk))).flat();
  const filesSet = new Set(allFiles);

  // Métricas básicas
  let pages = 0, layouts = 0, clientComps = 0, overlays = 0, ueNoCleanup = 0;
  const overlayFiles = [];
  const ueFiles = [];

  for (const f of allFiles){
    const src = await read(f);
    if (isPage(f)) pages++;
    if (isLayout(f)) layouts++;
    if (isClientComp(src)) clientComps++;
    if (hasFixedOverlay(src)) { overlays++; overlayFiles.push(f); }
    if (hasUseEffectNoCleanup(src)) { ueNoCleanup++; ueFiles.push(f); }
  }

  // Duplicados por nombre de componente (simple)
  const uiCandidates = allFiles.filter(f => /components/.test(f) && /\.(tsx|jsx)$/.test(f));
  const duplicates = dedupeCounts(uiCandidates);

  // Resumen
  const summary =
`# Auditoría Santa Brisa

**Archivos escaneados:** ${allFiles.length}
**Pages:** ${pages}, **Layouts:** ${layouts}, **Client comps:** ${clientComps}

## UI duplicada (por nombre de archivo)
${duplicates.length === 0 ? '- Sin duplicados detectados' :
duplicates.map(d => `- ${d.name}: ${d.paths.length} usos\n  ${d.paths.map(p => `  - ${p}`).join('\n')}`).join('\n')}

## Otros hallazgos
- Overlays fixed: ${overlays}${overlayFiles.length ? `\n${overlayFiles.map(f=>`  - ${f}`).join('\n')}` : ''}
- "useEffect" sin cleanup: ${ueNoCleanup}${ueFiles.length ? `\n${ueFiles.map(f=>`  - ${f}`).join('\n')}` : ''}

## Rutas (conteo aproximado)
- (root): ${pages} pages, ${layouts} layouts
`;

  await fs.writeFile(join(REPORT_DIR, 'audit-summary.md'), summary, 'utf8');
  console.log('✅ audit-summary.md generado');
}

run().catch(e => { console.error(e); process.exit(1); });
