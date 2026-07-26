const vm = require('vm'), fs = require('fs');
// localStorage shim
const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};
vm.runInThisContext(fs.readFileSync('./js/store.js', 'utf8'));

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  \x1b[32m✓\x1b[0m ' + m)) : (fail++, console.log('  \x1b[31m✗\x1b[0m ' + m)); };

console.log('\nXSS regression — importJSON sanitization');
const payload = '<img src=x onerror=alert(1)>';
Store.deleteAll();
Store.importJSON(JSON.stringify([{
  name: 'Milk', expirationDate: '2026-12-01',
  id: 'a" onmouseover="alert(1)',
  category: payload, location: payload, unit: payload,
  quantity: payload, price: payload,
}]));
let it = Store.getAll()[0];
ok(!/[<>"']/.test(it.id), 'imported id regenerated (no attribute-break chars)');
ok(it.category === 'other', 'malicious category -> "other"');
ok(it.location === 'fridge', 'malicious location -> "fridge"');
ok(it.unit === 'pieces', 'malicious unit -> "pieces"');
ok(typeof it.quantity === 'number' && it.quantity === 1, 'malicious quantity coerced to 1');
ok(it.price === null, 'malicious price coerced to null');

console.log('\nXSS regression — importCSV sanitization');
Store.deleteAll();
Store.importCSV('name,expirationDate,id,category,unit\nBread,2026-12-01,"evil"" onclick=""x","' + payload + '","' + payload + '"');
it = Store.getAll()[0];
ok(it, 'CSV row imported');
ok(it && !/[<>"']/.test(it.id), 'CSV id column ignored, id regenerated');
ok(it && it.category === 'other', 'CSV malicious category -> "other"');
ok(it && it.unit === 'pieces', 'CSV malicious unit -> "pieces"');

console.log('\nLegitimate data still round-trips');
Store.deleteAll();
Store.importJSON(JSON.stringify([{ name: 'Eggs', expirationDate: '2026-11-01',
  category: 'eggs', location: 'fridge', unit: 'dozen', quantity: 2, price: 4.5, notes: 'organic', tags: ['vegetarian'] }]));
it = Store.getAll()[0];
ok(it.category === 'eggs' && it.location === 'fridge' && it.unit === 'dozen', 'valid enums preserved');
ok(it.quantity === 2 && it.price === 4.5, 'valid numerics preserved');
ok(it.notes === 'organic' && it.tags[0] === 'vegetarian', 'notes and tags preserved');

console.log('\n' + (fail === 0 ? '\x1b[32m' : '\x1b[31m') + `Results: ${pass}/${pass+fail} passed\x1b[0m\n`);
process.exit(fail === 0 ? 0 : 1);
