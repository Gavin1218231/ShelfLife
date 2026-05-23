/**
 * Search — Advanced search, saved filters, and history.
 */
const Search = (() => {
  const KEY = 'shelflife_filters';

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { savedFilters: [], recentSearches: [] };
    } catch { return { savedFilters: [], recentSearches: [] }; }
  }

  function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

  function fullTextSearch(query) {
    if (!query) return Store.getAll();
    const q = query.toLowerCase();
    return Store.getAll().filter(item => {
      if (item.name.toLowerCase().includes(q)) return true;
      if (item.notes && item.notes.toLowerCase().includes(q)) return true;
      if (item.category && item.category.toLowerCase().includes(q)) return true;
      if (item.location && item.location.toLowerCase().includes(q)) return true;
      if (item.tags && item.tags.some(t => t.toLowerCase().includes(q))) return true;
      return false;
    });
  }

  function saveFilter(name, criteria) {
    const data = load();
    const filter = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      criteria,
      createdAt: new Date().toISOString(),
    };
    data.savedFilters.push(filter);
    save(data);
    return filter;
  }

  function deleteFilter(id) {
    const data = load();
    data.savedFilters = data.savedFilters.filter(f => f.id !== id);
    save(data);
  }

  function getSavedFilters() { return load().savedFilters; }

  function addToHistory(query) {
    if (!query || query.length < 2) return;
    const data = load();
    data.recentSearches = data.recentSearches.filter(q => q !== query);
    data.recentSearches.unshift(query);
    if (data.recentSearches.length > 10) data.recentSearches = data.recentSearches.slice(0, 10);
    save(data);
  }

  function getHistory() { return load().recentSearches; }

  function clearHistory() {
    const data = load();
    data.recentSearches = [];
    save(data);
  }

  function filterCookable() {
    const expiring = Store.getExpiringIngredients(7);
    return Store.getAll().filter(item =>
      expiring.some(ing => item.name.toLowerCase().includes(ing) || ing.includes(item.name.toLowerCase())));
  }

  return {
    fullTextSearch, saveFilter, deleteFilter, getSavedFilters,
    addToHistory, getHistory, clearHistory, filterCookable,
  };
})();
