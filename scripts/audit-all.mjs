import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

const REPORT_DIR = 'audit-report';

function run(cmd, args){
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit' });
    p.on('exit', code => code === 0 ? resolve(0) : reject(new Error(`${cmd} ${args.join(' ')} -> ${code}`)));
  });
}

async function runAll(){
  await fs.mkdir(REPORT_DIR, { recursive: true });
  await run('node', ['scripts/audit-static.mjs']);
  await run('node', ['scripts/audit-runtime.mjs']);

  const summary = await fs.readFile(join(REPORT_DIR, 'audit-summary.md'), 'utf8').catch(()=> '');
  const runtime = await fs.readFile(join(REPORT_DIR, 'runtime-findings.md'), 'utf8').catch(()=> '');

  const index =
`# Informe de Auditoría — Santa Brisa

- 📄 **Resumen estático**: [audit-summary.md](./audit-summary.md)
- 🧭 **Hallazgos en runtime**: [runtime-findings.md](./runtime-findings.md)

---

${summary}

---

${runtime}
`;
  await fs.writeFile(join(REPORT_DIR, 'INDEX.md'), index, 'utf8');
  console.log('✅ audit-report/INDEX.md listo');
}

runAll().catch(e => { console.error(e); process.exit(1); });
