#!/usr/bin/env tsx
// scripts/codemods/warehouse-to-location.ts
// Transform warehouseId -> fromLocationId, toWarehouseId -> toLocationId

import { API, FileInfo, JSCodeshift } from 'jscodeshift';

export default function transform(file: FileInfo, api: API) {
  const j: JSCodeshift = api.jscodeshift;
  const r = j(file.source);

  const rename = (from: string, to: string) => {
    // { warehouseId: x } -> { fromLocationId: x }
    r.find(j.Property, { key: { type: 'Identifier', name: from }}).forEach(p => { (p.value.key as any).name = to; });
    // obj.warehouseId -> obj.fromLocationId
    r.find(j.MemberExpression, { property: { type: 'Identifier', name: from }}).forEach(p => { (p.value.property as any).name = to; });
    // destructuring
    r.find(j.ObjectPattern).forEach(p => {
      p.value.properties.forEach(pr => {
        if (pr.type==='Property' && pr.key.type==='Identifier' && pr.key.name===from) pr.key.name = to;
      });
    });
  };

  rename('warehouseId','fromLocationId');
  rename('toWarehouseId','toLocationId');

  return r.toSource();
}
