import { promises as fs } from 'node:fs';
import { join } from 'node:path';

const LOGFILE = '/tmp/sb-client-logs.ndjson';
const REPORT_DIR = 'audit-report';

const HINTS = [
  {
    test: /Skipping auto-scroll behavior/,
    note: 'Overlay fijo detectado. Centraliza modales en un DialogHost único (portal) y evita `fixed inset-0` por página.',
  },
  {
    test: /Each child in a list should have a unique "key"/,
    note: 'Faltan claves únicas en listas. Usa `key={entity.id || index}` en el elemento raíz del `.map`.',
  },
  {
    test: /WebSocket is not open.*monospace-aida|extensionHostWorker\.esm\.js|vsda(_bg)?\./,
    ignore: true
  },
  {
    test: /Failed to load resource.*504|net::ERR_ABORTED 404/,
    note: 'Revisa endpoints de tu app (si el dominio es tuyo). Si es dominio externo de Firebase/IDX, ignorar.'
  }
];

function classify(line){
  for (const h of HINTS){
    if (h.test.test(line.message || '')) {
      return h.ignore ? { ignore: true } : { hint: h.note };
    }
  }
  return {};
}

async function run(){
  await fs.mkdir(REPORT_DIR, { recursive: true });

  let text = '';
  try { text = await fs.readFile(LOGFILE, 'utf8'); }
  catch { 
    const msg = `# Runtime findings\n\nNo se encontró \`${LOGFILE}\`.\nNavega la app con la captura activa (MonitoringBoot) y vuelve a correr \`npm run audit:runtime\`.\n`;
    await fs.writeFile(join(REPORT_DIR, 'runtime-findings.md'), msg, 'utf8');
    console.log('ℹ️ No hay logs. Abre la app, reproduce errores y re-ejecuta.');
    return;
  }

  const lines = text.trim().split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  // Agrupar por ruta
  const byPath = new Map();
  for (const l of lines){
    const { ignore, hint } = classify(l);
    if (ignore) continue;
    const key = l.path || '(sin ruta)';
    const arr = byPath.get(key) || [];
    arr.push({ ...l, hint });
    byPath.set(key, arr);
  }

  let out = `# Runtime findings\n\nLogs analizados: ${lines.length}\n\n`;
  for (const [path, arr] of byPath){
    out += `## ${path}  \nTotal issues: ${arr.length}\n`;
    const byType = arr.reduce((acc, i) => {
      acc[i.type] = (acc[i.type] || 0) + 1; return acc;
    }, {});
    out += `Tipos: ${Object.entries(byType).map(([t,c])=>`${t}: ${c}`).join(', ')}\n\n`;

    // Top 5 mensajes
    const freq = new Map();
    for (const i of arr){
      const m = (i.message || '').slice(0, 200);
      freq.set(m, (freq.get(m) || 0) + 1);
    }
    const top = [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
    for (const [msg, count] of top){
      const hint = (arr.find(a => (a.message||'').startsWith(msg))?.hint) || null;
      out += `- (${count}×) ${msg}${hint ? `\n  → Sugerencia: ${hint}` : ''}\n`;
    }
    out += '\n';
  }

  await fs.writeFile(join(REPORT_DIR, 'runtime-findings.md'), out, 'utf8');
  console.log('✅ runtime-findings.md generado');
}

run().catch(e => { console.error(e); process.exit(1); });
