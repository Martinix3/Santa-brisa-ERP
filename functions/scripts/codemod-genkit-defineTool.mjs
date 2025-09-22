import fs from 'node:fs';

const file = 'src/ai/tools.ts';
let src = fs.readFileSync(file, 'utf8');

function findMatchParen(s, openIdx) {
  let depth = 0, inStr = false, esc = false, quote = '';
  for (let i = openIdx; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === quote) { inStr = false; quote = ''; }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; quote = ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function findTopLevelFnProp(obj) {
  // devuelve {start, end, params, body} o null
  let i = 0, depth = 0, inStr = false, esc = false, quote = '';
  while (i < obj.length) {
    const ch = obj[i];
    if (inStr) {
      if (esc) { esc = false; i++; continue; }
      if (ch === '\\') { esc = true; i++; continue; }
      if (ch === quote) { inStr = false; quote=''; i++; continue; }
      i++; continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; quote = ch; i++; continue; }
    if (ch === '{' || ch === '[' || ch === '(') { depth++; i++; continue; }
    if (ch === '}' || ch === ']' || ch === ')') { depth--; i++; continue; }

    // solo al nivel superior del objeto
    if (depth === 0) {
      // busca "fn:"
      if (obj.slice(i).match(/^fn\s*:/)) {
        const propStart = i;
        i += obj.slice(i).indexOf(':') + 1;

        // espacios
        while (/\s/.test(obj[i])) i++;

        // debe empezar con 'async'
        if (!obj.slice(i).startsWith('async')) return null;
        i += 'async'.length;

        while (/\s/.test(obj[i])) i++;
        if (obj[i] !== '(') return null;

        // parámetros
        const paramsStart = i+1;
        const paramsEnd = obj.indexOf(')', paramsStart);
        if (paramsEnd === -1) return null;
        const params = obj.slice(paramsStart, paramsEnd).trim();

        // => o { directo
        let j = paramsEnd + 1;
        while (/\s/.test(obj[j])) j++;

        let bodyStart, bodyEnd;

        if (obj.slice(j, j+2) === '=>') {
          j += 2;
          while (/\s/.test(obj[j])) j++;
          if (obj[j] !== '{') return null;

          // cuerpo con llaves balanceadas
          let k = j, d = 0, inS = false, esc2 = false, q = '';
          for (; k < obj.length; k++) {
            const c = obj[k];
            if (inS) {
              if (esc2) { esc2 = false; continue; }
              if (c === '\\') { esc2 = true; continue; }
              if (c === q) inS = false;
              continue;
            }
            if (c === '"' || c === "'" || c === '`') { inS = true; q = c; continue; }
            if (c === '{') d++;
            if (c === '}') { d--; if (d === 0) { bodyStart = j+1; bodyEnd = k; break; } }
          }
          if (bodyEnd == null) return null;

          // la propiedad puede terminar con coma
          let propEnd = k + 1;
          // consume espacios y coma opcional
          while (/\s/.test(obj[propEnd])) propEnd++;
          if (obj[propEnd] === ',') propEnd++;
          return { start: propStart, end: propEnd, params, body: obj.slice(bodyStart, bodyEnd) };
        } else if (obj[j] === '{') {
          // async (..){ ... } (estilo clásico)
          let k = j, d = 0, inS = false, esc2 = false, q = '';
          for (; k < obj.length; k++) {
            const c = obj[k];
            if (inS) {
              if (esc2) { esc2 = false; continue; }
              if (c === '\\') { esc2 = true; continue; }
              if (c === q) inS = false;
              continue;
            }
            if (c === '"' || c === "'" || c === '`') { inS = true; q = c; continue; }
            if (c === '{') d++;
            if (c === '}') { d--; if (d === 0) { bodyStart = j+1; bodyEnd = k; break; } }
          }
          if (bodyEnd == null) return null;

          let propEnd = k + 1;
          while (/\s/.test(obj[propEnd])) propEnd++;
          if (obj[propEnd] === ',') propEnd++;
          return { start: propStart, end: propEnd, params, body: obj.slice(bodyStart, bodyEnd) };
        } else {
          return null;
        }
      }
    }
    i++;
  }
  return null;
}

let out = '';
let i = 0;
while (i < src.length) {
  const idx = src.indexOf('defineTool', i);
  if (idx === -1) { out += src.slice(i); break; }

  out += src.slice(i, idx);
  const parenStart = src.indexOf('(', idx);
  if (parenStart === -1) { out += src.slice(idx); break; }
  const parenEnd = findMatchParen(src, parenStart);
  if (parenEnd === -1) { out += src.slice(idx); break; }

  const callInside = src.slice(parenStart + 1, parenEnd).trim();

  // ya migrado?
  if (callInside.startsWith('ai,')) { out += src.slice(idx, parenEnd + 1); i = parenEnd + 1; continue; }

  // esperamos un único objeto config
  const config = callInside;
  const fnInfo = findTopLevelFnProp(config);

  if (!fnInfo) {
    // no encontramos fn: solo anteponemos ai
    out += 'defineTool(ai, ' + config + ')';
    i = parenEnd + 1;
    continue;
  }

  const newConfig = (config.slice(0, fnInfo.start) + config.slice(fnInfo.end)).trim().replace(/,\s*$/, '');
  const fnText = `async (${fnInfo.params}) => {${fnInfo.body}}`;

  out += `defineTool(ai, ${newConfig}, ${fnText})`;
  i = parenEnd + 1;
}

fs.writeFileSync(file, out, 'utf8');
console.log('[codemod] OK: defineTool(ai, config, fn) en', file);
