'use client';

const IGNORED = [
  /extensionHostWorker\.esm\.js/,
  /editorSimpleWorker\.esm\.js/,
  /vsda(_bg)?\./,
  /google\.monospace-aida/,
  /firebase-studio.*\.dev/,
  /Permissions policy violation/,
  /web worker extension host/,
];

const shouldIgnore = (msg: string) => IGNORED.some(r => r.test(msg));

function send(payload: any) {
  fetch('/api/dev/client-log', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ path: location.pathname, ...payload })
  }).catch(() => {});
}

export function installRuntimeCapture(){
  if ((window as any).__sb_rt_cap) return;
  (window as any).__sb_rt_cap = true;

  const origError = console.error.bind(console);
  console.error = (...args: any[]) => {
    const msg = args.map(a => (typeof a === 'string' ? a : (a?.message || JSON.stringify(a)))).join(' ');
    if (!shouldIgnore(msg)) send({ level:'error', type:'console.error', message: msg });
    origError(...args);
  };

  window.addEventListener('error', (e: any) => {
    const msg = e?.message || e?.error?.message || String(e);
    if (!shouldIgnore(msg)) send({ level:'error', type:'window.onerror', message: msg, stack: e?.error?.stack });
  });

  window.addEventListener('unhandledrejection', (e: any) => {
    const msg = e?.reason?.message || String(e?.reason || e);
    if (!shouldIgnore(msg)) send({ level:'error', type:'unhandledrejection', message: msg, stack: e?.reason?.stack });
  });
}
