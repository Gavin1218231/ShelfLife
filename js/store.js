/**
 * Store — localStorage-backed data model for pantry items.
 */
const Store = (() => {
  const STORAGE_KEY = 'shelflife_items';

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function loadItems() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function getAll() {
    return loadItems();
  }

  function getById(id) {
    return loadItems().find(item => item.id === id) || null;
  }

  function addItem({ name, category, location, quantity, unit, purchaseDate, expirationDate, notes, price }) {
    const items = loadItems();
    const newItem = {
      id: generateId(),
      name: name.trim(),
      category: category || 'other',
      location: location || 'fridge',
      quantity: parseFloat(quantity) || 1,
      unit: unit || 'pieces',
      purchaseDate: purchaseDate || null,
      expirationDate: expirationDate,
      notes: notes ? notes.trim() : '',
      price: price ? parseFloat(price) : null,
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
    // Ensure numeric fields are parsed
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

  function deleteAll() {
    saveItems([]);
  }

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

  /**
   * Calculate days until expiration. Negative means already expired.
   */
  function daysUntilExpiration(expirationDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expirationDate);
    exp.setHours(0, 0, 0, 0);
    const diff = exp - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Get freshness status: 'fresh' (>7 days), 'warning' (3-7), 'danger' (0-2), 'expired' (<0)
   */
  function getStatus(expirationDate) {
    const days = daysUntilExpiration(expirationDate);
    if (days < 0) return 'expired';
    if (days <= 2) return 'danger';
    if (days <= 7) return 'warning';
    return 'fresh';
  }

  /**
   * Get items expiring within the next N days (includes today).
   */
  function getExpiringWithin(days) {
    const items = loadItems();
    return items.filter(item => {
      const d = daysUntilExpiration(item.expirationDate);
      return d >= 0 && d <= days;
    });
  }

  /**
   * Get already expired items.
   */
  function getExpired() {
    const items = loadItems();
    return items.filter(item => daysUntilExpiration(item.expirationDate) < 0);
  }

  /**
   * Get counts by status.
   */
  function getStats() {
    const items = loadItems();
    const stats = { total: items.length, fresh: 0, warning: 0, danger: 0, expired: 0 };
    items.forEach(item => {
      const status = getStatus(item.expirationDate);
      stats[status]++;
    });
    return stats;
  }

  /**
   * Get items grouped by expiration date (for weekly view).
   */
  function getGroupedByExpirationDate(daysAhead = 7) {
    const items = loadItems();
    const groups = {};

    // Include overdue items
    items.forEach(item => {
      const days = daysUntilExpiration(item.expirationDate);
      if (days <= daysAhead) {
        const dateKey = item.expirationDate;
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(item);
      }
    });

    // Sort by date
    const sorted = Object.entries(groups).sort(([a], [b]) => new Date(a) - new Date(b));
    return sorted;
  }

  /**
   * Get items grouped by location.
   */
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

  /**
   * Get unique item names that are expiring soon (for recipe suggestions).
   */
  function getExpiringIngredients(daysAhead = 7) {
    const expiring = getExpiringWithin(daysAhead);
    const expired = getExpired();
    const all = [...expired, ...expiring];
    const names = [...new Set(all.map(item => item.name.toLowerCase()))];
    return names;
  }

  /**
   * Calculate total value of inventory.
   */
  function getTotalValue() {
    const items = loadItems();
    return items.reduce((sum, item) => {
      if (item.price) {
        return sum + (item.price * (item.quantity || 1));
      }
      return sum;
    }, 0);
  }

  /**
   * Export all data as JSON string.
   */
  function exportJSON() {
    return JSON.stringify(loadItems(), null, 2);
  }

  /**
   * Export all data as CSV string.
   */
  function exportCSV() {
    const items = loadItems();
    if (items.length === 0) return '';

    const headers = ['name', 'category', 'location', 'quantity', 'unit', 'purchaseDate', 'expirationDate', 'notes', 'price'];
    const rows = items.map(item =>
      headers.map(h => {
        const val = item[h] ?? '';
        // Escape quotes and wrap in quotes if contains comma
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Import items from JSON array.
   */
  function importJSON(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (!Array.isArray(data)) throw new Error('Invalid format');
      const existing = loadItems();
      const existingIds = new Set(existing.map(i => i.id));

      let imported = 0;
      data.forEach(item => {
        if (item.name && item.expirationDate) {
          // Generate new ID if collision or missing
          if (!item.id || existingIds.has(item.id)) {
            item.id = generateId();
          }
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

  /**
   * Import items from CSV string.
   */
  function importCSV(csvStr) {
    const lines = csvStr.trim().split('\n');
    if (lines.length < 2) return 0;

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const expIdx = headers.indexOf('expirationdate');

    if (nameIdx === -1 || expIdx === -1) {
      throw new Error('CSV must have "name" and "expirationDate" columns');
    }

    const items = loadItems();
    let imported = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < headers.length) continue;

      const item = {
        id: generateId(),
        createdAt: new Date().toISOString(),
      };

      headers.forEach((h, idx) => {
        const val = values[idx]?.trim() || '';
        if (h === 'quantity') item[h] = parseFloat(val) || 1;
        else if (h === 'price') item[h] = val ? parseFloat(val) : null;
        else item[h] = val || null;
      });

      if (item.name && item.expirationDate) {
        items.push(item);
        imported++;
      }
    }

    saveItems(items);
    return imported;
  }

  // Simple CSV line parser (handles quoted fields)
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += c;
      }
    }
    result.push(current);
    return result;
  }

  return {
    getAll,
    getById,
    addItem,
    updateItem,
    deleteItem,
    deleteAll,
    deleteAllExpired,
    daysUntilExpiration,
    getStatus,
    getExpiringWithin,
    getExpired,
    getStats,
    getGroupedByExpirationDate,
    getGroupedByLocation,
    getExpiringIngredients,
    getTotalValue,
    exportJSON,
    exportCSV,
    importJSON,
    importCSV,
  };
})();
