// scripts/ssot-naming-audit.test.ts
import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

const TS_PATH = 'src/domain/ssot.ts';

// Sufijos que normalizamos para detectar familias (puedes ampliar)
const SUFFIXES = [
  'Id', 'ID', 'Number', 'At', 'Date', 'Qty', 'Quantity',
  'PartyId', 'ItemId', 'OrderId', 'AccountId',
];

function stemOf(field: string): string {
  let s = field;
  for (const suf of SUFFIXES) {
    if (s.endsWith(suf)) {
      s = s.slice(0, -suf.length);
      break; // Solo quitar el primer sufijo que coincida
    }
  }
  return s;
}

function extractFields(ts: string): string[] {
  // 1) Captura interfaces y types objeto
  const blocks = [
    ...ts.matchAll(/export\s+interface\s+\w+\s*{([\s\S]*?)}/g),
    ...ts.matchAll(/export\s+type\s+\w+\s*=\s*{([\s\S]*?)};?/g),
  ];
  const fields: string[] = [];
  const reLine = /(\w+)\??\s*:\s*[^;]+;/g;
  
  for (const m of blocks) {
    const body = m[1];
    for (const mm of body.matchAll(reLine)) {
      fields.push(mm[1]);
    }
  }
  return fields;
}

describe('SSOT naming audit', () => {
  const ts = readFileSync(TS_PATH, 'utf8');
  const fields = extractFields(ts);

  it('genera informe de familias con variantes', () => {
    const byStem: Record<string, Set<string>> = {};
    for (const f of fields) {
      const stem = stemOf(f);
      byStem[stem] ??= new Set();
      byStem[stem].add(f);
    }

    const families = Object.entries(byStem)
      .filter(([, set]) => set.size > 1)
      .map(([stem, set]) => ({ stem, variants: [...set].sort() }))
      .sort((a, b) => a.stem.localeCompare(b.stem));

    // Muestra el informe en consola del runner
    if (families.length > 0) {
      console.log('\n📊 FAMILIAS DE NOMBRES CON VARIANTES DETECTADAS:\n');
      families.slice(0, 30).forEach(f => {
        console.log(`  ${f.stem}: ${f.variants.join(', ')}`);
      });
      console.log('');
    }

    // Política: familias permitidas (conscientemente aceptadas)
    const ALLOW = new Set<string>([
      // Permitimos explícitamente pares id+number para documentos
      'order', 'shipment', 'receipt', 'deliveryNote',
      // Permitimos created/updated para auditoría
      'created', 'updated',
      // Permitimos start/end para eventos temporales
      'start', 'end',
    ]);

    const offenders = families.filter(f => !ALLOW.has(f.stem));

    // Reglas duras (nombres prohibidos o patrones no deseados)
    const HARD_RULES: Array<{ msg: string; banned: RegExp }> = [
      { 
        msg: 'Usa qty, no quantity (excepto targetQuantity deprecado)', 
        banned: /^(?!targetQuantity$)\w*quantity\w*$/i 
      },
      { 
        msg: 'Evita "date" genérico suelto: prefiere ...At o ...Date específico', 
        banned: /^date$/i 
      },
      { 
        msg: 'Evita objeto expandido junto a ...Id (usa solo Id en entidad): priceList, location', 
        banned: /^(priceList|location)$/
      },
      { 
        msg: 'Usa distributorPartyId, no distributorId (para FK a Party)', 
        banned: /^distributorId$/
      },
      { 
        msg: 'Usa ownerId, no salesRepId (deprecado)', 
        banned: /^salesRepId$/
      },
      { 
        msg: 'Usa itemId, no sku como FK (sku es código comercial)', 
        banned: /^sku$/ 
      },
      {
        msg: 'Usa vat, no taxId (deprecado)',
        banned: /^taxId$/
      },
    ];

    const hardHits = HARD_RULES.flatMap(rule => 
      fields
        .filter(f => rule.banned.test(f))
        .map(f => ({ rule: rule.msg, field: f }))
    );

    // Filtramos campos deprecados de hard hits (ya están marcados)
    const nonDeprecatedHits = hardHits.filter(hit => {
      const fieldContext = ts.split('\n').find(line => 
        line.includes(`${hit.field}?:`) || line.includes(`${hit.field}:`)
      );
      return !fieldContext?.includes('@deprecated');
    });

    // Expectativas
    if (nonDeprecatedHits.length > 0) {
      console.error('\n❌ REGLAS DURAS VIOLADAS:\n');
      nonDeprecatedHits.forEach(h => {
        console.error(`  ${h.field}: ${h.rule}`);
      });
      console.error('');
    }

    if (offenders.length > 0) {
      console.warn('\n⚠️  FAMILIAS DE NOMBRES A RESOLVER:\n');
      offenders.slice(0, 20).forEach(f => {
        console.warn(`  ${f.stem}: ${f.variants.join(', ')}`);
      });
      console.warn('\n💡 Añade a ALLOW si son variantes aceptables o unifica los nombres.\n');
    }

    expect(
      nonDeprecatedHits, 
      `Hard rules violated (non-deprecated fields): ${JSON.stringify(nonDeprecatedHits, null, 2)}`
    ).toHaveLength(0);

    expect(
      offenders, 
      `Naming families to resolve (add to ALLOW or unificar): ${JSON.stringify(offenders.map(o => o.stem), null, 2)}`
    ).toHaveLength(0);
  });

  it('detecta uso de campos deprecados sin @deprecated', () => {
    // Campos que sabemos están deprecados pero queremos verificar están marcados
    const KNOWN_DEPRECATED = [
      'Timestamp', 'taxId', 'salesRepId', 'accountType', 
      'accountStage', 'commercialFlow', 'mode', 'quantity',
      'outputSku', 'sku', 'warehouseId', 'items'
    ];

    const unmarkedDeprecated: string[] = [];

    KNOWN_DEPRECATED.forEach(field => {
      // Buscar si el campo existe en el archivo
      const fieldRegex = new RegExp(`\\b${field}\\??\\s*[:?]`, 'g');
      const matches = ts.match(fieldRegex);
      
      if (matches) {
        // Verificar si tiene @deprecated antes
        const lines = ts.split('\n');
        lines.forEach((line, idx) => {
          if (line.match(fieldRegex) && idx > 0) {
            const prevLine = lines[idx - 1];
            if (!prevLine.includes('@deprecated')) {
              // Verificar contexto de export type/interface
              let contextStart = idx;
              while (contextStart > 0 && !lines[contextStart].match(/^export\s+(interface|type)/)) {
                contextStart--;
              }
              const context = lines.slice(contextStart, idx + 1).join('\n');
              if (!context.includes('@deprecated')) {
                unmarkedDeprecated.push(`${field} at line ${idx + 1}`);
              }
            }
          }
        });
      }
    });

    if (unmarkedDeprecated.length > 0) {
      console.warn('\n⚠️  CAMPOS DEPRECADOS SIN MARCAR:\n');
      unmarkedDeprecated.forEach(f => console.warn(`  ${f}`));
      console.warn('');
    }

    // Este test es informativo, no falla el CI
    // expect(unmarkedDeprecated).toHaveLength(0);
  });

  it('verifica consistencia de patrones de ID', () => {
    // Patrones esperados
    const ID_PATTERNS = {
      // Entidades principales deben tener 'id' (PK)
      primaryKey: /^id$/,
      // FKs deben terminar en Id (sin Party/Item/etc en el medio)
      foreignKey: /^[a-z]+Id$/,
      // FKs a Party deben terminar en PartyId
      partyRef: /^[a-z]+PartyId$/,
      // FKs a Item deben terminar en ItemId
      itemRef: /^[a-z]+ItemId$/,
    };

    const idFields = fields.filter(f => 
      f.includes('Id') || f.includes('id') || f === 'id'
    );

    // Detectar violaciones
    const violations: string[] = [];

    idFields.forEach(field => {
      // Caso especial: campos que mezclan ambos (deprecated ok)
      if (field.match(/^(distributorId|warehouseId|toWarehouseId)$/)) {
        if (!ts.includes(`${field}?:`) || !ts.match(new RegExp(`@deprecated.*${field}`))) {
          violations.push(`${field}: debería ser PartyId o estar deprecado`);
        }
      }

      // Verificar consistencia: si referencia Party debe terminar en PartyId
      if (field.includes('Party') && !field.endsWith('PartyId')) {
        violations.push(`${field}: referencia a Party debe terminar en PartyId`);
      }

      // Verificar consistencia: si referencia Item debe terminar en ItemId
      if (field.includes('Item') && !field.endsWith('ItemId')) {
        violations.push(`${field}: referencia a Item debe terminar en ItemId`);
      }
    });

    if (violations.length > 0) {
      console.warn('\n⚠️  PATRONES DE ID INCONSISTENTES:\n');
      violations.forEach(v => console.warn(`  ${v}`));
      console.warn('');
    }

    // Informativo, no bloquea
    // expect(violations).toHaveLength(0);
  });

  it('estadísticas generales del SSOT', () => {
    const interfaces = (ts.match(/export\s+interface\s+\w+/g) || []).length;
    const types = (ts.match(/export\s+type\s+\w+\s*=/g) || []).length;
    const enums = (ts.match(/export\s+type\s+\w+\s*=\s*['"]/g) || []).length;
    const uniqueFields = new Set(fields).size;
    const deprecatedFields = (ts.match(/@deprecated/g) || []).length;

    console.log('\n📈 ESTADÍSTICAS DEL SSOT:\n');
    console.log(`  Interfaces:        ${interfaces}`);
    console.log(`  Types:             ${types}`);
    console.log(`  Enums (literales): ${enums}`);
    console.log(`  Campos únicos:     ${uniqueFields}`);
    console.log(`  Campos totales:    ${fields.length}`);
    console.log(`  Campos deprecated: ${deprecatedFields}`);
    console.log('');

    // Siempre pasa, solo informativo
    expect(true).toBe(true);
  });
});
