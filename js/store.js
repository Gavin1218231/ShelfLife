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

  function addItem({ name, category, quantity, purchaseDate, expirationDate, notes }) {
    const items = loadItems();
    const newItem = {
      id: generateId(),
      name: name.trim(),
      category: category || 'other',
      quantity: parseInt(quantity, 10) || 1,
      purchaseDate: purchaseDate || null,
      expirationDate: expirationDate,
      notes: notes ? notes.trim() : '',
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
   * Get unique item names that are expiring soon (for recipe suggestions).
   */
  function getExpiringIngredients(daysAhead = 7) {
    const expiring = getExpiringWithin(daysAhead);
    const expired = getExpired();
    const all = [...expired, ...expiring];
    const names = [...new Set(all.map(item => item.name.toLowerCase()))];
    return names;
  }

  return {
    getAll,
    getById,
    addItem,
    updateItem,
    deleteItem,
    deleteAllExpired,
    daysUntilExpiration,
    getStatus,
    getExpiringWithin,
    getExpired,
    getStats,
    getGroupedByExpirationDate,
    getExpiringIngredients,
  };
})();
