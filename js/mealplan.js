/**
 * MealPlan — Weekly meal planning.
 */
const MealPlan = (() => {
  const KEY = 'shelflife_meal_plan';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch { return {}; }
  }

  function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

  function getWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  }

  function getWeek(weekStart) {
    weekStart = weekStart || getWeekStart();
    const data = load();
    return data[weekStart] || createEmptyWeek();
  }

  function createEmptyWeek() {
    const week = {};
    for (let i = 0; i < 7; i++) {
      week[i] = { breakfast: [], lunch: [], dinner: [] };
    }
    return week;
  }

  function generateSlotId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function addMealSlot(weekStart, day, mealType, slot) {
    const data = load();
    if (!data[weekStart]) data[weekStart] = createEmptyWeek();
    if (!data[weekStart][day]) data[weekStart][day] = { breakfast: [], lunch: [], dinner: [] };
    const newSlot = {
      id: generateSlotId(),
      type: slot.type || 'item',
      itemId: slot.itemId || null,
      recipeId: slot.recipeId || null,
      name: slot.name || '',
      note: slot.note || '',
    };
    data[weekStart][day][mealType].push(newSlot);
    save(data);
    return newSlot;
  }

  function removeMealSlot(weekStart, day, mealType, slotId) {
    const data = load();
    if (!data[weekStart] || !data[weekStart][day]) return;
    data[weekStart][day][mealType] = data[weekStart][day][mealType].filter(s => s.id !== slotId);
    save(data);
  }

  function clearWeek(weekStart) {
    const data = load();
    delete data[weekStart];
    save(data);
  }

  function clearDay(weekStart, day) {
    const data = load();
    if (data[weekStart]) {
      data[weekStart][day] = { breakfast: [], lunch: [], dinner: [] };
      save(data);
    }
  }

  function getNextWeekStart(weekStart) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }

  function getPrevWeekStart(weekStart) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }

  function getSuggestedItems() {
    const expiring = Store.getExpiringWithin(7);
    return expiring.sort((a, b) =>
      Store.daysUntilExpiration(a.expirationDate) - Store.daysUntilExpiration(b.expirationDate));
  }

  function getShoppingListGaps(weekStart) {
    const week = getWeek(weekStart);
    const usedItemIds = new Set();
    Object.values(week).forEach(day => {
      Object.values(day).forEach(slots => {
        slots.forEach(slot => {
          if (slot.itemId) usedItemIds.add(slot.itemId);
        });
      });
    });
    const inventory = new Set(Store.getAll().map(i => i.id));
    const missing = [];
    Object.values(week).forEach(day => {
      Object.values(day).forEach(slots => {
        slots.forEach(slot => {
          if (slot.type === 'item' && slot.itemId && !inventory.has(slot.itemId)) {
            missing.push(slot.name);
          }
        });
      });
    });
    return missing;
  }

  function getMealCount(weekStart) {
    const week = getWeek(weekStart);
    let count = 0;
    Object.values(week).forEach(day => {
      Object.values(day).forEach(slots => count += slots.length);
    });
    return count;
  }

  return {
    getWeekStart, getWeek, getNextWeekStart, getPrevWeekStart,
    addMealSlot, removeMealSlot, clearWeek, clearDay,
    getSuggestedItems, getShoppingListGaps, getMealCount,
  };
})();
