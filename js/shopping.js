/**
 * Shopping — Shopping list management.
 */
const Shopping = (() => {
  const KEY = 'shelflife_shopping';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }

  function save(items) { localStorage.setItem(KEY, JSON.stringify(items)); }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function getAll() { return load(); }

  function addItem(data) {
    const items = load();
    const newItem = {
      id: generateId(),
      name: (data.name || '').trim(),
      quantity: parseFloat(data.quantity) || 1,
      unit: data.unit || 'pieces',
      category: data.category || 'other',
      checked: false,
      addedAt: new Date().toISOString(),
      source: data.source || 'manual',
      linkedItemId: data.linkedItemId || null,
      notes: data.notes || '',
    };
    items.push(newItem);
    save(items);
    return newItem;
  }

  function updateItem(id, updates) {
    const items = load();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates };
    save(items);
    return items[idx];
  }

  function deleteItem(id) {
    const items = load();
    save(items.filter(i => i.id !== id));
  }

  function toggleChecked(id) {
    const items = load();
    const item = items.find(i => i.id === id);
    if (item) { item.checked = !item.checked; save(items); }
    return item;
  }

  function clearChecked() {
    const items = load();
    const remaining = items.filter(i => !i.checked);
    save(remaining);
    return items.length - remaining.length;
  }

  function clearAll() { save([]); }

  function addFromLowStock() {
    const lowStock = Store.getLowStockItems();
    const existing = load();
    const existingNames = new Set(existing.map(i => i.name.toLowerCase()));
    let added = 0;
    lowStock.forEach(item => {
      if (!existingNames.has(item.name.toLowerCase())) {
        addItem({
          name: item.name,
          quantity: 1,
          unit: item.unit,
          category: item.category,
          source: 'low_stock',
          linkedItemId: item.id,
        });
        added++;
      }
    });
    return added;
  }

  function addFromExpired() {
    const expired = Store.getExpired();
    const existing = load();
    const existingNames = new Set(existing.map(i => i.name.toLowerCase()));
    let added = 0;
    expired.forEach(item => {
      if (!existingNames.has(item.name.toLowerCase())) {
        addItem({
          name: item.name,
          quantity: 1,
          unit: item.unit,
          category: item.category,
          source: 'restock',
        });
        added++;
      }
    });
    return added;
  }

  function addFromBuyAgain() {
    const suggestions = Analytics.getBuyAgainSuggestions();
    const existing = load();
    const existingNames = new Set(existing.map(i => i.name.toLowerCase()));
    let added = 0;
    suggestions.slice(0, 5).forEach(s => {
      if (!existingNames.has(s.name.toLowerCase())) {
        addItem({ name: s.name, source: 'restock' });
        added++;
      }
    });
    return added;
  }

  function getGroupedByCategory() {
    const items = load();
    const groups = {};
    items.forEach(item => {
      const cat = item.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }

  function exportAsText() {
    const items = load();
    if (items.length === 0) return 'Empty shopping list';
    const grouped = getGroupedByCategory();
    let text = 'SHOPPING LIST\n=============\n\n';
    Object.entries(grouped).forEach(([cat, catItems]) => {
      text += `${cat.toUpperCase()}:\n`;
      catItems.forEach(item => {
        const check = item.checked ? '[x]' : '[ ]';
        const qty = item.quantity > 1 ? `${item.quantity} ${item.unit} ` : '';
        text += `  ${check} ${qty}${item.name}\n`;
      });
      text += '\n';
    });
    return text;
  }

  function purchaseItem(id, expirationDate) {
    const item = load().find(i => i.id === id);
    if (!item) return null;
    const newItem = Store.addItem({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      expirationDate: expirationDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      purchaseDate: new Date().toISOString().split('T')[0],
    });
    deleteItem(id);
    return newItem;
  }

  function getStats() {
    const items = load();
    return {
      total: items.length,
      checked: items.filter(i => i.checked).length,
      unchecked: items.filter(i => !i.checked).length,
    };
  }

  return {
    getAll, addItem, updateItem, deleteItem, toggleChecked,
    clearChecked, clearAll,
    addFromLowStock, addFromExpired, addFromBuyAgain,
    getGroupedByCategory, exportAsText, purchaseItem, getStats,
  };
})();
