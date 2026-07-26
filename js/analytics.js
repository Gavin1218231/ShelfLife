/**
 * Analytics — Waste tracking, consumption history, and statistics.
 */
const Analytics = (() => {
  const WASTE_KEY = 'shelflife_waste_log';
  const CONSUMPTION_KEY = 'shelflife_consumption';
  const HISTORY_KEY = 'shelflife_history';

  function loadWasteLog() {
    try { return JSON.parse(localStorage.getItem(WASTE_KEY)) || []; }
    catch { return []; }
  }

  function saveWasteLog(log) { localStorage.setItem(WASTE_KEY, JSON.stringify(log)); }

  function loadConsumption() {
    try { return JSON.parse(localStorage.getItem(CONSUMPTION_KEY)) || []; }
    catch { return []; }
  }

  function saveConsumption(log) { localStorage.setItem(CONSUMPTION_KEY, JSON.stringify(log)); }

  function logDisposal(item, type) {
    const log = loadWasteLog();
    const wasExpired = Store.daysUntilExpiration(item.expirationDate) < 0;
    log.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      itemName: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      disposalType: type,
      disposedAt: new Date().toISOString(),
      originalExpirationDate: item.expirationDate,
      wasExpired,
    });
    saveWasteLog(log);
    if (type === 'used') logConsumption(item);
  }

  function logConsumption(item) {
    const log = loadConsumption();
    log.push({
      itemName: item.name,
      category: item.category,
      consumedAt: new Date().toISOString(),
      quantity: item.quantity,
      unit: item.unit,
    });
    saveConsumption(log);
  }

  function getWasteLog(startDate, endDate) {
    const log = loadWasteLog();
    if (!startDate && !endDate) return log;
    return log.filter(entry => {
      const d = new Date(entry.disposedAt);
      if (startDate && d < new Date(startDate)) return false;
      if (endDate && d > new Date(endDate)) return false;
      return true;
    });
  }

  function getWasteByCategory(period = 'month') {
    const log = filterByPeriod(loadWasteLog(), period, 'disposedAt');
    const result = {};
    log.filter(e => e.disposalType === 'wasted' || (e.disposalType === 'expired' && e.wasExpired))
       .forEach(e => {
      result[e.category] = (result[e.category] || 0) + 1;
    });
    return result;
  }

  function getWasteOverTime(period = 'month') {
    const log = filterByPeriod(loadWasteLog(), period, 'disposedAt');
    const result = {};
    log.forEach(e => {
      const dateKey = e.disposedAt.split('T')[0];
      if (!result[dateKey]) result[dateKey] = { used: 0, wasted: 0, expired: 0 };
      result[dateKey][e.disposalType] = (result[dateKey][e.disposalType] || 0) + 1;
    });
    return result;
  }

  function getWasteReductionScore() {
    const log = loadWasteLog();
    if (log.length === 0) return 100;
    const used = log.filter(e => e.disposalType === 'used').length;
    const total = log.length;
    return Math.round((used / total) * 100);
  }

  function getMoneySaved(period = 'all') {
    const log = filterByPeriod(loadWasteLog(), period, 'disposedAt');
    return log.filter(e => e.disposalType === 'used' && e.price)
      .reduce((sum, e) => sum + (e.price * (e.quantity || 1)), 0);
  }

  function getMoneyWasted(period = 'all') {
    const log = filterByPeriod(loadWasteLog(), period, 'disposedAt');
    return log.filter(e => (e.disposalType === 'wasted' || (e.disposalType === 'expired' && e.wasExpired)) && e.price)
      .reduce((sum, e) => sum + (e.price * (e.quantity || 1)), 0);
  }

  function getMostWastedCategories(limit = 5) {
    const byCategory = getWasteByCategory('all');
    return Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  function getConsumptionPatterns() {
    const log = loadConsumption();
    const patterns = {};
    log.forEach(c => {
      if (!patterns[c.itemName]) patterns[c.itemName] = { count: 0, dates: [] };
      patterns[c.itemName].count++;
      patterns[c.itemName].dates.push(c.consumedAt);
    });
    return patterns;
  }

  function getUsageRate(itemName) {
    const patterns = getConsumptionPatterns();
    const data = patterns[itemName.toLowerCase()] || patterns[itemName];
    if (!data || data.count < 2) return null;
    const dates = data.dates.map(d => new Date(d)).sort((a, b) => a - b);
    const span = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
    if (span === 0) return null;
    return data.count / (span / 7);
  }

  function getBuyAgainSuggestions() {
    const patterns = getConsumptionPatterns();
    const inventory = new Set(Store.getAll().map(i => i.name.toLowerCase()));
    return Object.entries(patterns)
      .filter(([name]) => !inventory.has(name.toLowerCase()))
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([name, data]) => ({ name, count: data.count }));
  }

  function filterByPeriod(log, period, dateField) {
    if (period === 'all') return log;
    const now = new Date();
    const cutoff = new Date();
    if (period === 'week') cutoff.setDate(now.getDate() - 7);
    else if (period === 'month') cutoff.setMonth(now.getMonth() - 1);
    else if (period === 'year') cutoff.setFullYear(now.getFullYear() - 1);
    return log.filter(e => new Date(e[dateField]) >= cutoff);
  }

  // One snapshot per calendar day: init() runs on every page load, so appending
  // unconditionally would stack duplicate same-date entries and skew trends.
  function saveSnapshot() {
    const history = loadHistory();
    const today = new Date().toISOString().split('T')[0];
    const snapshot = { date: today, ...Store.getStats(), value: Store.getTotalValue() };
    const idx = history.findIndex(h => h.date === today);
    if (idx >= 0) history[idx] = snapshot;
    else history.push(snapshot);
    if (history.length > 365) history.splice(0, history.length - 365);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch { return []; }
  }

  function clearWasteLog() { localStorage.removeItem(WASTE_KEY); }
  function clearConsumption() { localStorage.removeItem(CONSUMPTION_KEY); }

  return {
    logDisposal, logConsumption,
    getWasteLog, getWasteByCategory, getWasteOverTime,
    getWasteReductionScore, getMoneySaved, getMoneyWasted,
    getMostWastedCategories, getConsumptionPatterns,
    getUsageRate, getBuyAgainSuggestions,
    saveSnapshot, loadHistory,
    clearWasteLog, clearConsumption,
  };
})();
