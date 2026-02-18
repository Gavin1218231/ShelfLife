/**
 * Shelf Life — Stress Test Suite
 * Runs in Node.js. Shims localStorage and loads store.js directly.
 */
const vm  = require('vm');
const fs  = require('fs');

// ── localStorage shim ──────────────────────────────────────────────────────
const _storage = {};
global.localStorage = {
  getItem:    (k)    => _storage[k] ?? null,
  setItem:    (k, v) => { _storage[k] = String(v); },
  removeItem: (k)    => { delete _storage[k]; },
  clear:      ()     => { Object.keys(_storage).forEach(k => delete _storage[k]); },
};

// Load store.js into this context (mirrors a browser <script> tag)
vm.runInThisContext(fs.readFileSync('./js/store.js', 'utf8'));

// ── Test harness ───────────────────────────────────────────────────────────
let passed = 0, failed = 0, total = 0;

function assert(label, condition, detail = '') {
  total++;
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(` ${name}`);
  console.log('─'.repeat(60));
}

function reset() {
  localStorage.clear();
}

function dateOffset(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ── 1. CRUD ────────────────────────────────────────────────────────────────
section('1. Basic CRUD');
reset();

const item1 = Store.addItem({
  name: 'Whole Milk', category: 'dairy', quantity: 2,
  purchaseDate: dateOffset(-3), expirationDate: dateOffset(4), notes: 'Opened',
});
assert('addItem returns object with id',    typeof item1.id === 'string' && item1.id.length > 0);
assert('addItem trims name',               item1.name === 'Whole Milk');
assert('addItem sets quantity as int',     item1.quantity === 2);
assert('addItem sets category',            item1.category === 'dairy');
assert('addItem sets expirationDate',      item1.expirationDate === dateOffset(4));
assert('addItem creates createdAt',        typeof item1.createdAt === 'string');

const all = Store.getAll();
assert('getAll returns 1 item',            all.length === 1);

const found = Store.getById(item1.id);
assert('getById returns correct item',     found && found.id === item1.id);
assert('getById on bad id returns null',   Store.getById('nonexistent') === null);

const updated = Store.updateItem(item1.id, { name: 'Skimmed Milk', quantity: 1 });
assert('updateItem changes name',          updated.name === 'Skimmed Milk');
assert('updateItem changes quantity',      updated.quantity === 1);
assert('updateItem preserves category',    updated.category === 'dairy');
assert('updateItem on bad id returns null',Store.updateItem('bad', {}) === null);

const deleted = Store.deleteItem(item1.id);
assert('deleteItem returns true',          deleted === true);
assert('getAll empty after delete',        Store.getAll().length === 0);
assert('deleteItem on missing returns false', Store.deleteItem('ghost') === false);

// ── 2. Edge-case inputs ────────────────────────────────────────────────────
section('2. Edge-case inputs');
reset();

const whitespace = Store.addItem({ name: '  Eggs  ', category: 'other', quantity: '12',
  purchaseDate: '', expirationDate: dateOffset(10), notes: '  free range  ' });
assert('name is trimmed',                  whitespace.name === 'Eggs');
assert('notes are trimmed',               whitespace.notes === 'free range');
assert('empty purchaseDate stored as null',whitespace.purchaseDate === null);
assert('quantity parsed from string',      whitespace.quantity === 12);

const longName = 'A'.repeat(500);
const longItem = Store.addItem({ name: longName, category: 'other', quantity: 1,
  purchaseDate: null, expirationDate: dateOffset(5), notes: '' });
assert('500-char name stored intact',      longItem.name === longName);

const special = Store.addItem({ name: `It's "O'Brian" <test> & more`, category: 'other',
  quantity: 1, purchaseDate: null, expirationDate: dateOffset(5), notes: '' });
assert('special chars in name preserved',  special.name === `It's "O'Brian" <test> & more`);

const badQty = Store.addItem({ name: 'BadQty', category: 'other', quantity: 'abc',
  purchaseDate: null, expirationDate: dateOffset(5), notes: '' });
assert('non-numeric quantity defaults to 1', badQty.quantity === 1);

const zeroQty = Store.addItem({ name: 'ZeroQty', category: 'other', quantity: 0,
  purchaseDate: null, expirationDate: dateOffset(5), notes: '' });
assert('quantity 0 defaults to 1',         zeroQty.quantity === 1);

const noCategory = Store.addItem({ name: 'NoCat', category: '', quantity: 1,
  purchaseDate: null, expirationDate: dateOffset(5), notes: '' });
assert('empty category defaults to "other"', noCategory.category === 'other');

reset();

// ── 3. Date boundary & status logic ───────────────────────────────────────
section('3. Date boundaries & status');

const cases = [
  { days: -30,  expected: 'expired',  label: '30 days ago' },
  { days: -1,   expected: 'expired',  label: 'yesterday' },
  { days: 0,    expected: 'danger',   label: 'today' },
  { days: 1,    expected: 'danger',   label: 'tomorrow' },
  { days: 2,    expected: 'danger',   label: '2 days' },
  { days: 3,    expected: 'warning',  label: '3 days' },
  { days: 7,    expected: 'warning',  label: '7 days' },
  { days: 8,    expected: 'fresh',    label: '8 days' },
  { days: 365,  expected: 'fresh',    label: '1 year' },
];

cases.forEach(({ days, expected, label }) => {
  const status = Store.getStatus(dateOffset(days));
  assert(`getStatus(${label}) = "${expected}"`, status === expected,
    `got "${status}"`);
});

// daysUntilExpiration edge cases
assert('daysUntilExpiration today = 0',    Store.daysUntilExpiration(dateOffset(0)) === 0);
assert('daysUntilExpiration tomorrow = 1', Store.daysUntilExpiration(dateOffset(1)) === 1);
assert('daysUntilExpiration -1 = -1',      Store.daysUntilExpiration(dateOffset(-1)) === -1);

// ── 4. Stats & queries ─────────────────────────────────────────────────────
section('4. Stats & queries');
reset();

Store.addItem({ name: 'Fresh A', category: 'other', quantity: 1, purchaseDate: null, expirationDate: dateOffset(30),  notes: '' });
Store.addItem({ name: 'Fresh B', category: 'other', quantity: 1, purchaseDate: null, expirationDate: dateOffset(14),  notes: '' });
Store.addItem({ name: 'Warn A',  category: 'dairy', quantity: 1, purchaseDate: null, expirationDate: dateOffset(5),   notes: '' });
Store.addItem({ name: 'Warn B',  category: 'dairy', quantity: 1, purchaseDate: null, expirationDate: dateOffset(3),   notes: '' });
Store.addItem({ name: 'Danger A',category: 'meat',  quantity: 1, purchaseDate: null, expirationDate: dateOffset(1),   notes: '' });
Store.addItem({ name: 'Danger B',category: 'meat',  quantity: 1, purchaseDate: null, expirationDate: dateOffset(0),   notes: '' });
Store.addItem({ name: 'Exp A',   category: 'other', quantity: 1, purchaseDate: null, expirationDate: dateOffset(-1),  notes: '' });
Store.addItem({ name: 'Exp B',   category: 'other', quantity: 1, purchaseDate: null, expirationDate: dateOffset(-10), notes: '' });

const stats = Store.getStats();
assert('stats.total = 8',    stats.total   === 8);
assert('stats.fresh = 2',    stats.fresh   === 2);
assert('stats.warning = 2',  stats.warning === 2);
assert('stats.danger = 2',   stats.danger  === 2);
assert('stats.expired = 2',  stats.expired === 2);
assert('total = fresh+warning+danger+expired',
  stats.fresh + stats.warning + stats.danger + stats.expired === stats.total);

const expiring7 = Store.getExpiringWithin(7);
assert('getExpiringWithin(7) = 4 items', expiring7.length === 4);
assert('getExpiringWithin(0) = 1 item (today)', Store.getExpiringWithin(0).length === 1);
assert('getExpiringWithin(1) = 2 items',  Store.getExpiringWithin(1).length === 2);

const expired = Store.getExpired();
assert('getExpired = 2',     expired.length === 2);
assert('all expired have negative days',
  expired.every(i => Store.daysUntilExpiration(i.expirationDate) < 0));

const ingredients = Store.getExpiringIngredients(7);
assert('getExpiringIngredients includes expiring + expired', ingredients.length === 6);
assert('ingredients are lowercase', ingredients.every(i => i === i.toLowerCase()));
assert('ingredients are unique', ingredients.length === new Set(ingredients).size);

const groups = Store.getGroupedByExpirationDate(7);
assert('getGroupedByExpirationDate returns array', Array.isArray(groups));
assert('groups are sorted ascending',
  groups.every(([dateA], i) =>
    i === 0 || new Date(groups[i-1][0]) <= new Date(dateA)));

// ── 5. deleteAllExpired ────────────────────────────────────────────────────
section('5. deleteAllExpired');

const removedCount = Store.deleteAllExpired();
assert('deleteAllExpired removes 2 items', removedCount === 2);
assert('getExpired is now 0', Store.getExpired().length === 0);
assert('remaining count = 6', Store.getAll().length === 6);

// ── 6. Bulk / performance ──────────────────────────────────────────────────
section('6. Bulk operations (1000 items)');
reset();

const COUNT = 1000;
const t0 = Date.now();
const ids = [];
for (let i = 0; i < COUNT; i++) {
  const days = Math.floor(Math.random() * 60) - 10; // -10 to +50
  const item = Store.addItem({
    name: `Item ${i}`, category: 'other', quantity: Math.max(1, i % 20),
    purchaseDate: null, expirationDate: dateOffset(days), notes: `note ${i}`,
  });
  ids.push(item.id);
}
const insertMs = Date.now() - t0;
assert(`inserted ${COUNT} items`, Store.getAll().length === COUNT);
assert(`insert time < 10s`, insertMs < 10000, `took ${insertMs}ms`);
console.log(`     insert: ${insertMs}ms (${(COUNT / (insertMs || 1) * 1000).toFixed(0)} items/sec)`);

const t1 = Date.now();
const bulkStats = Store.getStats();
const statsMs = Date.now() - t1;
assert('bulk stats.total = 1000', bulkStats.total === COUNT);
assert('bulk stats sum = total',
  bulkStats.fresh + bulkStats.warning + bulkStats.danger + bulkStats.expired === COUNT);
assert(`getStats time < 2s`, statsMs < 2000, `took ${statsMs}ms`);
console.log(`     getStats: ${statsMs}ms`);

// Update all items
const t2 = Date.now();
ids.forEach((id, i) => Store.updateItem(id, { quantity: i + 1 }));
const updateMs = Date.now() - t2;
assert(`updated ${COUNT} items`, Store.getAll().every((item, i) => item.quantity > 0));
assert(`update time < 30s`, updateMs < 30000, `took ${updateMs}ms`);
console.log(`     update: ${updateMs}ms`);

// Delete all items
const t3 = Date.now();
ids.forEach(id => Store.deleteItem(id));
const deleteMs = Date.now() - t3;
assert('all deleted', Store.getAll().length === 0);
assert(`delete time < 30s`, deleteMs < 30000, `took ${deleteMs}ms`);
console.log(`     delete: ${deleteMs}ms`);

reset();

// ── 7. ID uniqueness ──────────────────────────────────────────────────────
section('7. ID uniqueness (500 rapid inserts)');

const generatedIds = new Set();
for (let i = 0; i < 500; i++) {
  const item = Store.addItem({ name: `U${i}`, category: 'other', quantity: 1,
    purchaseDate: null, expirationDate: dateOffset(10), notes: '' });
  generatedIds.add(item.id);
}
assert('500 unique IDs generated', generatedIds.size === 500);
reset();

// ── 8. Data persistence round-trip ────────────────────────────────────────
section('8. LocalStorage round-trip');

const original = Store.addItem({ name: 'Roundtrip', category: 'seafood', quantity: 3,
  purchaseDate: dateOffset(-1), expirationDate: dateOffset(5), notes: 'Keep cold' });

// Simulate page reload by reading storage fresh
const raw = localStorage.getItem('shelflife_items');
const parsed = JSON.parse(raw);
assert('data is valid JSON array',       Array.isArray(parsed));
assert('item survives serialisation',    parsed[0].name === 'Roundtrip');
assert('category survives',             parsed[0].category === 'seafood');
assert('quantity survives as number',   typeof parsed[0].quantity === 'number');
assert('purchaseDate survives',         parsed[0].purchaseDate === dateOffset(-1));
assert('expirationDate survives',       parsed[0].expirationDate === dateOffset(5));
assert('notes survive',                 parsed[0].notes === 'Keep cold');
assert('id survives',                   parsed[0].id === original.id);

// Corrupt storage and verify graceful recovery
localStorage.setItem('shelflife_items', 'NOT_JSON{{{{');
assert('corrupt storage returns []',     Store.getAll().length === 0);
reset();

// ── 9. Scanner category mapping ───────────────────────────────────────────
section('9. Scanner — guessCategory logic');

// We can't import Scanner directly (it references Quagga/navigator),
// so we replicate and test the guessCategory logic inline.
function guessCategory(product) {
  const cats = (product.categories_tags || []).join(' ').toLowerCase();
  const name = (product.product_name || '').toLowerCase();
  const combined = cats + ' ' + name;
  if (/milk|cheese|yogurt|butter|cream|dairy/.test(combined)) return 'dairy';
  if (/meat|chicken|beef|pork|turkey|sausage|ham/.test(combined)) return 'meat';
  if (/fish|seafood|shrimp|salmon|tuna/.test(combined)) return 'seafood';
  if (/canned|can |soup/.test(combined)) return 'canned';
  if (/fruit|vegetable|produce|salad|lettuce|tomato|apple|banana/.test(combined)) return 'produce';
  if (/bread|grain|pasta|rice|cereal|flour|wheat/.test(combined)) return 'grains';
  if (/frozen|ice cream/.test(combined)) return 'frozen';
  if (/sauce|condiment|ketchup|mustard|mayo|dressing|oil|vinegar/.test(combined)) return 'condiments';
  if (/beverage|drink|juice|soda|water|tea|coffee/.test(combined)) return 'beverages';
  if (/snack|chip|cookie|candy|chocolate|cracker/.test(combined)) return 'snacks';
  return 'other';
}

const categoryTests = [
  [{ product_name: 'Whole Milk',         categories_tags: [] },           'dairy'],
  [{ product_name: 'Cheddar Cheese',     categories_tags: [] },           'dairy'],
  [{ product_name: 'Chicken Breast',     categories_tags: [] },           'meat'],
  [{ product_name: 'Atlantic Salmon',    categories_tags: [] },           'seafood'],
  [{ product_name: 'Baby Spinach',       categories_tags: ['vegetable'] },'produce'],
  [{ product_name: 'Sourdough Bread',    categories_tags: [] },           'grains'],
  [{ product_name: 'Tomato Soup',        categories_tags: ['canned'] },   'canned'],
  [{ product_name: 'Frozen Peas',        categories_tags: [] },           'frozen'],
  [{ product_name: 'Sriracha Sauce',     categories_tags: [] },           'condiments'],
  [{ product_name: 'Orange Juice',       categories_tags: [] },           'beverages'],
  [{ product_name: 'Potato Chips',       categories_tags: [] },           'snacks'],
  [{ product_name: 'Unknown Widget',     categories_tags: [] },           'other'],
  [{ product_name: '',                   categories_tags: ['en:dairy'] }, 'dairy'],
];

categoryTests.forEach(([product, expected]) => {
  const got = guessCategory(product);
  assert(`"${product.product_name || '(empty)'}" → "${expected}"`, got === expected,
    `got "${got}"`);
});

// ── 10. Concurrent-style addItem (same-tick) ──────────────────────────────
section('10. Rapid simultaneous addItem (same tick)');
reset();

// Simulate multiple adds in the same synchronous tick
const tick = [];
for (let i = 0; i < 50; i++) {
  tick.push(Store.addItem({ name: `Tick${i}`, category: 'other', quantity: 1,
    purchaseDate: null, expirationDate: dateOffset(i % 30 - 5), notes: '' }));
}
const tickIds = tick.map(i => i.id);
assert('50 same-tick items all saved',       Store.getAll().length === 50);
assert('all same-tick IDs are unique',       new Set(tickIds).size === 50);
reset();

// ── Results ────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(60)}`);
console.log(` Results: ${passed}/${total} passed — ${failed} failed`);
console.log('═'.repeat(60));
if (failed > 0) process.exit(1);
