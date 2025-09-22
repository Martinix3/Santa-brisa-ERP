const fs = require('fs');
const p = 'package.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
let changed = false;
if (j.overrides) {
  if (j.overrides['@types/react']) { delete j.overrides['@types/react']; changed = true; }
  if (j.overrides['@types/react-dom']) { delete j.overrides['@types/react-dom']; changed = true; }
  if (Object.keys(j.overrides).length === 0) { delete j.overrides; changed = true; }
}
if (changed) {
  fs.writeFileSync(p, JSON.stringify(j, null, 2));
  console.log('fix-overrides: limpiados overrides de @types/react*');
}
