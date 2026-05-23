/**
 * Onboarding — Tutorial walkthrough and sample data for new users.
 */
const Onboarding = (() => {
  const KEY = 'shelflife_onboarding';

  const STEPS = [
    { title: 'Welcome to Shelf Life! 🧊', body: 'Track your pantry, reduce food waste, and discover recipes. Let\'s take a quick tour.' },
    { title: 'Dashboard', body: 'See all your items at a glance with color-coded freshness: green (fresh), yellow (use soon), red (expiring), gray (expired).' },
    { title: 'Add Items Easily', body: 'Tap "Add Item" to manually add items, or use the barcode scanner to auto-populate product info.' },
    { title: 'Quick Actions', body: 'Hover any item to see Mark Used (✓) or Throw Away (🗑) buttons. This helps track your food waste.' },
    { title: 'Shopping List', body: 'Build your shopping list from low-stock items, expired items, or buy-again suggestions.' },
    { title: 'Analytics & Achievements', body: 'See your waste reduction score, earn achievements, and complete weekly challenges to stay motivated.' },
    { title: 'Ready to Start!', body: 'You can load sample data to explore the features, or start adding your own items right away.' },
  ];

  const SAMPLE_DATA = [
    { name: 'Whole Milk', category: 'dairy', location: 'fridge', quantity: 1, unit: 'gallons', daysFromNow: 5, price: 3.99 },
    { name: 'Eggs', category: 'eggs', location: 'fridge', quantity: 12, unit: 'pieces', daysFromNow: 14, price: 4.5 },
    { name: 'Bananas', category: 'fruits', location: 'countertop', quantity: 6, unit: 'pieces', daysFromNow: 3, price: 2 },
    { name: 'Chicken Breast', category: 'meat', location: 'fridge', quantity: 1.5, unit: 'lbs', daysFromNow: 1, price: 8.99 },
    { name: 'Greek Yogurt', category: 'dairy', location: 'fridge', quantity: 4, unit: 'containers', daysFromNow: 10, price: 5 },
    { name: 'Spinach', category: 'vegetables', location: 'fridge', quantity: 1, unit: 'bunches', daysFromNow: 4, price: 3.5 },
    { name: 'Bread', category: 'bread', location: 'pantry', quantity: 1, unit: 'pieces', daysFromNow: 6, price: 4.5 },
    { name: 'Tomatoes', category: 'vegetables', location: 'countertop', quantity: 4, unit: 'pieces', daysFromNow: 5, price: 3 },
    { name: 'Olive Oil', category: 'oils', location: 'pantry', quantity: 1, unit: 'bottles', daysFromNow: 365, price: 12 },
    { name: 'Pasta', category: 'grains', location: 'pantry', quantity: 2, unit: 'boxes', daysFromNow: 730, price: 3.5 },
  ];

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { completed: false, currentStep: 0, seenTips: [], sampleDataLoaded: false };
    } catch { return { completed: false, currentStep: 0, seenTips: [], sampleDataLoaded: false }; }
  }

  function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

  function shouldShow() {
    const state = load();
    return !state.completed && Store.getAll().length === 0;
  }

  function getCurrentStep() {
    const state = load();
    return { step: STEPS[state.currentStep], index: state.currentStep, total: STEPS.length };
  }

  function nextStep() {
    const state = load();
    state.currentStep++;
    if (state.currentStep >= STEPS.length) {
      state.completed = true;
    }
    save(state);
    return getCurrentStep();
  }

  function skip() {
    const state = load();
    state.completed = true;
    save(state);
  }

  function reset() {
    save({ completed: false, currentStep: 0, seenTips: [], sampleDataLoaded: false });
  }

  function loadSampleData() {
    SAMPLE_DATA.forEach(item => {
      const exp = new Date();
      exp.setDate(exp.getDate() + item.daysFromNow);
      Store.addItem({
        name: item.name,
        category: item.category,
        location: item.location,
        quantity: item.quantity,
        unit: item.unit,
        expirationDate: exp.toISOString().split('T')[0],
        purchaseDate: new Date().toISOString().split('T')[0],
        price: item.price,
      });
    });
    const state = load();
    state.sampleDataLoaded = true;
    save(state);
  }

  function hasSeenTip(tipId) { return load().seenTips.includes(tipId); }

  function markTipSeen(tipId) {
    const state = load();
    if (!state.seenTips.includes(tipId)) {
      state.seenTips.push(tipId);
      save(state);
    }
  }

  return {
    STEPS, shouldShow, getCurrentStep, nextStep, skip, reset,
    loadSampleData, hasSeenTip, markTipSeen,
  };
})();
