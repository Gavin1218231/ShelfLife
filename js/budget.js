/**
 * Budget — Spending tracking and price history.
 */
const Budget = (() => {
  const KEY = 'shelflife_budget';

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {
        monthlyBudget: 0,
        priceHistory: {},
        alertsEnabled: false,
      };
    } catch { return { monthlyBudget: 0, priceHistory: {}, alertsEnabled: false }; }
  }

  function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

  function setMonthlyBudget(amount) {
    const data = load();
    data.monthlyBudget = parseFloat(amount) || 0;
    save(data);
  }

  function getMonthlyBudget() { return load().monthlyBudget; }

  function setAlertsEnabled(enabled) {
    const data = load();
    data.alertsEnabled = !!enabled;
    save(data);
  }

  function recordPrice(itemName, price) {
    if (!itemName || !price) return;
    const data = load();
    const key = itemName.toLowerCase().trim();
    if (!data.priceHistory[key]) data.priceHistory[key] = [];
    data.priceHistory[key].push({
      price: parseFloat(price),
      date: new Date().toISOString(),
    });
    if (data.priceHistory[key].length > 20) {
      data.priceHistory[key] = data.priceHistory[key].slice(-20);
    }
    save(data);
  }

  function getPriceHistory(itemName) {
    const data = load();
    return data.priceHistory[itemName.toLowerCase().trim()] || [];
  }

  function comparePrice(itemName, currentPrice) {
    const history = getPriceHistory(itemName);
    if (history.length < 2) return null;
    const prevPrices = history.slice(0, -1).map(h => h.price);
    const avgPrev = prevPrices.reduce((a, b) => a + b, 0) / prevPrices.length;
    const diff = currentPrice - avgPrev;
    const pct = (diff / avgPrev) * 100;
    return {
      trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same',
      diff: Math.abs(diff),
      pct: Math.abs(pct),
      avgPrev,
    };
  }

  function getSpendingByPeriod(period = 'month') {
    const items = Store.getAll();
    const now = new Date();
    const cutoff = new Date();
    if (period === 'week') cutoff.setDate(now.getDate() - 7);
    else if (period === 'month') cutoff.setMonth(now.getMonth() - 1);
    else if (period === 'year') cutoff.setFullYear(now.getFullYear() - 1);

    const filtered = items.filter(item => {
      if (!item.purchaseDate || !item.price) return false;
      return new Date(item.purchaseDate) >= cutoff;
    });
    return filtered.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  }

  function getSpendingByCategory(period = 'month') {
    const items = Store.getAll();
    const now = new Date();
    const cutoff = new Date();
    if (period === 'week') cutoff.setDate(now.getDate() - 7);
    else if (period === 'month') cutoff.setMonth(now.getMonth() - 1);
    else if (period === 'year') cutoff.setFullYear(now.getFullYear() - 1);

    const result = {};
    items.forEach(item => {
      if (!item.purchaseDate || !item.price) return;
      if (new Date(item.purchaseDate) < cutoff) return;
      const cat = item.category || 'other';
      result[cat] = (result[cat] || 0) + (item.price * (item.quantity || 1));
    });
    return result;
  }

  function getSpendingByMonth() {
    const items = Store.getAll();
    const result = {};
    items.forEach(item => {
      if (!item.purchaseDate || !item.price) return;
      const month = item.purchaseDate.substring(0, 7);
      result[month] = (result[month] || 0) + (item.price * (item.quantity || 1));
    });
    return result;
  }

  function getBudgetStatus() {
    const data = load();
    if (data.monthlyBudget <= 0) return null;
    const spent = getSpendingByPeriod('month');
    const pct = (spent / data.monthlyBudget) * 100;
    const remaining = data.monthlyBudget - spent;
    return {
      budget: data.monthlyBudget,
      spent,
      remaining,
      pct: Math.min(100, pct),
      overBudget: spent > data.monthlyBudget,
      alertLevel: pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'fresh',
    };
  }

  function getCostPerUnit(item) {
    if (!item.price || !item.quantity) return null;
    return item.price / item.quantity;
  }

  return {
    setMonthlyBudget, getMonthlyBudget, setAlertsEnabled,
    recordPrice, getPriceHistory, comparePrice,
    getSpendingByPeriod, getSpendingByCategory, getSpendingByMonth,
    getBudgetStatus, getCostPerUnit,
  };
})();
