/**
 * Store — localStorage-backed data model for pantry items.
 */
const Store = (() => {
  let STORAGE_KEY = 'shelflife_items';

  function setStorageKey(key) {
    STORAGE_KEY = key;
  }

  function getStorageKey() {
    return STORAGE_KEY;
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function loadItems() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const items = data ? JSON.parse(data) : [];
      return migrateItems(items);
    } catch {
      return [];
    }
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function migrateItems(items) {
    let migrated = false;
    items.forEach(item => {
      if (item.tags === undefined) { item.tags = []; migrated = true; }
      if (item.openedDate === undefined) { item.openedDate = null; migrated = true; }
      if (item.openedShelfLife === undefined) { item.openedShelfLife = null; migrated = true; }
      if (item.photoUrl === undefined) { item.photoUrl = null; migrated = true; }
      if (item.lowStockThreshold === undefined) { item.lowStockThreshold = null; migrated = true; }
      if (item.disposalType === undefined) { item.disposalType = null; migrated = true; }
      if (item.disposedAt === undefined) { item.disposedAt = null; migrated = true; }
      if (item.origin === undefined) { item.origin = null; migrated = true; }
      if (item.calories === undefined) { item.calories = null; migrated = true; }
      if (item.protein === undefined) { item.protein = null; migrated = true; }
      if (item.carbs === undefined) { item.carbs = null; migrated = true; }
      if (item.fat === undefined) { item.fat = null; migrated = true; }
      if (item.addedBy === undefined) { item.addedBy = null; migrated = true; }
    });
    if (migrated) saveItems(items);
    return items;
  }

  function getAll() { return loadItems(); }

  function getById(id) { return loadItems().find(item => item.id === id) || null; }

  function addItem(data) {
    const items = loadItems();
    const newItem = {
      id: generateId(),
      name: (data.name || '').trim(),
      category: data.category || 'other',
      location: data.location || 'fridge',
      quantity: parseFloat(data.quantity) || 1,
      unit: data.unit || 'pieces',
      purchaseDate: data.purchaseDate || null,
      expirationDate: data.expirationDate,
      notes: data.notes ? data.notes.trim() : '',
      price: data.price ? parseFloat(data.price) : null,
      tags: Array.isArray(data.tags) ? data.tags : [],
      openedDate: data.openedDate || null,
      openedShelfLife: data.openedShelfLife || null,
      photoUrl: data.photoUrl || null,
      lowStockThreshold: data.lowStockThreshold ? parseFloat(data.lowStockThreshold) : null,
      disposalType: null,
      disposedAt: null,
      origin: data.origin || null,
      calories: data.calories ? parseFloat(data.calories) : null,
      protein: data.protein ? parseFloat(data.protein) : null,
      carbs: data.carbs ? parseFloat(data.carbs) : null,
      fat: data.fat ? parseFloat(data.fat) : null,
      addedBy: data.addedBy || null,
      createdAt: new Date().toISOString(),
    };
    items.push(newItem);
    saveItems(items);
    return newItem;
  }

  function updateItem(id, updates) {
    const items = loadItems();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    if (updates.quantity !== undefined) updates.quantity = parseFloat(updates.quantity) || 1;
    if (updates.price !== undefined) updates.price = updates.price ? parseFloat(updates.price) : null;
    items[index] = { ...items[index], ...updates };
    saveItems(items);
    return items[index];
  }

  function deleteItem(id) {
    const items = loadItems();
    const filtered = items.filter(item => item.id !== id);
    saveItems(filtered);
    return filtered.length < items.length;
  }

  function deleteMany(ids) {
    const items = loadItems();
    const idSet = new Set(ids);
    const filtered = items.filter(item => !idSet.has(item.id));
    saveItems(filtered);
    return items.length - filtered.length;
  }

  function deleteAll() { saveItems([]); }

  function deleteAllExpired() {
    const items = loadItems();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filtered = items.filter(item => {
      const exp = new Date(item.expirationDate);
      return exp >= today;
    });
    saveItems(filtered);
    return items.length - filtered.length;
  }

  function daysUntilExpiration(expirationDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expirationDate);
    exp.setHours(0, 0, 0, 0);
    return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  }

  function getStatus(expirationDate) {
    const days = daysUntilExpiration(expirationDate);
    if (days < 0) return 'expired';
    if (days <= 2) return 'danger';
    if (days <= 7) return 'warning';
    return 'fresh';
  }

  function getExpiringWithin(days) {
    return loadItems().filter(item => {
      const d = daysUntilExpiration(item.expirationDate);
      return d >= 0 && d <= days;
    });
  }

  function getExpired() {
    return loadItems().filter(item => daysUntilExpiration(item.expirationDate) < 0);
  }

  function getStats() {
    const items = loadItems();
    const stats = { total: items.length, fresh: 0, warning: 0, danger: 0, expired: 0 };
    items.forEach(item => { stats[getStatus(item.expirationDate)]++; });
    return stats;
  }

  function getGroupedByExpirationDate(daysAhead = 7) {
    const items = loadItems();
    const groups = {};
    items.forEach(item => {
      if (daysUntilExpiration(item.expirationDate) <= daysAhead) {
        const dateKey = item.expirationDate;
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(item);
      }
    });
    return Object.entries(groups).sort(([a], [b]) => new Date(a) - new Date(b));
  }

  function getGroupedByLocation() {
    const items = loadItems();
    const groups = {};
    items.forEach(item => {
      const loc = item.location || 'other';
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(item);
    });
    return groups;
  }

  function getGroupedByCategory() {
    const items = loadItems();
    const groups = {};
    items.forEach(item => {
      const cat = item.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }

  function getExpiringIngredients(daysAhead = 7) {
    const expiring = getExpiringWithin(daysAhead);
    const expired = getExpired();
    return [...new Set([...expired, ...expiring].map(item => item.name.toLowerCase()))];
  }

  function getTotalValue() {
    return loadItems().reduce((sum, item) =>
      item.price ? sum + (item.price * (item.quantity || 1)) : sum, 0);
  }

  function getValueByCategory() {
    const result = {};
    loadItems().forEach(item => {
      if (item.price) {
        const cat = item.category || 'other';
        result[cat] = (result[cat] || 0) + (item.price * (item.quantity || 1));
      }
    });
    return result;
  }

  function getLowStockItems() {
    return loadItems().filter(item =>
      item.lowStockThreshold !== null && item.quantity <= item.lowStockThreshold);
  }

  function exportJSON() { return JSON.stringify(loadItems(), null, 2); }

  function exportCSV() {
    const items = loadItems();
    if (items.length === 0) return '';
    const headers = ['name', 'category', 'location', 'quantity', 'unit', 'purchaseDate', 'expirationDate', 'notes', 'price', 'tags', 'openedDate', 'origin'];
    const rows = items.map(item =>
      headers.map(h => {
        let val = item[h] ?? '';
        if (Array.isArray(val)) val = val.join(';');
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  function importJSON(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (!Array.isArray(data)) throw new Error('Invalid format');
      const existing = loadItems();
      const existingIds = new Set(existing.map(i => i.id));
      let imported = 0;
      data.forEach(item => {
        if (item.name && item.expirationDate) {
          if (!item.id || existingIds.has(item.id)) item.id = generateId();
          if (!item.createdAt) item.createdAt = new Date().toISOString();
          existing.push(item);
          existingIds.add(item.id);
          imported++;
        }
      });
      saveItems(existing);
      return imported;
    } catch (e) {
      throw new Error('Failed to parse JSON: ' + e.message);
    }
  }

  function importCSV(csvStr) {
    const lines = csvStr.trim().split('\n');
    if (lines.length < 2) return 0;
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const expIdx = headers.indexOf('expirationdate');
    if (nameIdx === -1 || expIdx === -1) throw new Error('CSV must have "name" and "expirationDate" columns');
    const items = loadItems();
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < headers.length) continue;
      const item = { id: generateId(), createdAt: new Date().toISOString(), tags: [] };
      headers.forEach((h, idx) => {
        const val = values[idx]?.trim() || '';
        if (h === 'quantity') item[h] = parseFloat(val) || 1;
        else if (h === 'price') item[h] = val ? parseFloat(val) : null;
        else if (h === 'tags') item[h] = val ? val.split(';') : [];
        else item[h] = val || null;
      });
      if (item.name && item.expirationDate) { items.push(item); imported++; }
    }
    saveItems(items);
    return imported;
  }

  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) { result.push(current); current = ''; }
      else current += c;
    }
    result.push(current);
    return result;
  }

  return {
    setStorageKey, getStorageKey,
    getAll, getById, addItem, updateItem, deleteItem, deleteMany, deleteAll, deleteAllExpired,
    daysUntilExpiration, getStatus,
    getExpiringWithin, getExpired, getStats,
    getGroupedByExpirationDate, getGroupedByLocation, getGroupedByCategory,
    getExpiringIngredients, getTotalValue, getValueByCategory, getLowStockItems,
    exportJSON, exportCSV, importJSON, importCSV,
  };
})();
