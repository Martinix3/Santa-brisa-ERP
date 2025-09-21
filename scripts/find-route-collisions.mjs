// scripts/find-route-collisions.mjs
import { readdirSync, statSync } from "fs";
import { join, sep } from "path";

const APP_DIR = "src/app";

// quita segmentos entre paréntesis, y quita "page.tsx"/"layout.tsx"
const normalize = (parts) =>
  parts
    .filter(Boolean)
    .filter(p => !p.startsWith("(") || !p.endsWith(")"))
    .join("/");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.(tsx|mdx)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(APP_DIR);

// construye key de ruta ignorando los grupos
const routeKey = (p) => {
  const parts = p
    .slice(APP_DIR.length + 1)
    .split(sep)
    .filter(Boolean);

  // elimina archivos que no definen ruta (solo componentes sueltos)
  const isRouteFile = /(page|layout|route)\.(tsx|ts|mdx)$/.test(parts[parts.length - 1]);
  if (!isRouteFile) return null;

  // elimina el nombre del archivo (page/layout/route)
  parts.pop();

  return "/" + normalize(parts);
};

const map = new Map();
for (const f of files) {
  const key = routeKey(f);
  if (!key) continue;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(f);
}

let has = false;
for (const [k, arr] of map) {
  if (arr.length > 1) {
    has = true;
    console.log(`COLISIÓN: ${k}`);
    for (const f of arr) console.log("  -", f);
  }
}

if (!has) console.log("Sin colisiones 🎉");
