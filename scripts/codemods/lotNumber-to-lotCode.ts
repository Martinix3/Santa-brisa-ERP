// scripts/codemods/lotNumber-to-lotCode.ts
import { API, FileInfo, JSCodeshift } from 'jscodeshift';

const FIELD_ALIASES = ['lotNumber', 'lote', 'batch', 'lot_code', 'lotnumber', 'lotNo', 'lotno'];

/**
 * Transforma lotNumber → lotCode en todo el codebase
 * Ejecutar: npx jscodeshift -t scripts/codemods/lotNumber-to-lotCode.ts src --extensions=ts,tsx --parser=ts
 */
export default function transform(file: FileInfo, api: API) {
  const j: JSCodeshift = api.jscodeshift;
  const root = j(file.source);

  // 1. Renombra propiedades en objects: { lotNumber: x } -> { lotCode: x }
  root.find(j.Property, { 
    key: { 
      type: 'Identifier', 
      name: (n: string) => FIELD_ALIASES.includes(n) 
    }
  }).forEach(path => { 
    (path.value.key as any).name = 'lotCode'; 
  });

  // 2. Accessos de propiedades: obj.lotNumber -> obj.lotCode
  root.find(j.MemberExpression, { 
    property: { 
      type: 'Identifier', 
      name: (n: string) => FIELD_ALIASES.includes(n) 
    }
  }).forEach(p => { 
    (p.value.property as any).name = 'lotCode'; 
  });

  // 3. Destructuring: const { lotNumber } = x -> const { lotCode } = x
  root.find(j.ObjectPattern).forEach(p => {
    p.value.properties.forEach(prop => {
      if (prop.type === 'Property' && 
          prop.key.type === 'Identifier' && 
          FIELD_ALIASES.includes(prop.key.name)) {
        prop.key.name = 'lotCode';
        
        // Si hay renaming: { lotNumber: myLot } -> { lotCode: myLot }
        if (prop.value.type === 'Identifier' && 
            FIELD_ALIASES.includes(prop.value.name)) {
          prop.value.name = 'lotCode';
        }
      }
    });
  });

  // 4. Parámetros de función: function(lotNumber) -> function(lotCode)
  root.find(j.Identifier, {
    name: (n: string) => FIELD_ALIASES.includes(n)
  }).forEach(path => {
    // Solo renombrar si es parámetro de función o variable declaration
    const parent = path.parent?.value;
    if (parent && (
      parent.type === 'FunctionDeclaration' ||
      parent.type === 'ArrowFunctionExpression' ||
      parent.type === 'VariableDeclarator'
    )) {
      (path.value as any).name = 'lotCode';
    }
  });

  // 5. String literals en queries: .where('lotNumber', '==', x) -> .where('lotCode', '==', x)
  root.find(j.Literal, {
    value: (v: any) => typeof v === 'string' && FIELD_ALIASES.includes(v)
  }).forEach(path => {
    (path.value as any).value = 'lotCode';
  });

  return root.toSource();
}
