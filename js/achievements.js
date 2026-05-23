/**
 * Achievements — Gamification system with badges, streaks, and XP.
 */
const Achievements = (() => {
  const KEY = 'shelflife_achievements';
  const CHALLENGES_KEY = 'shelflife_challenges';

  const DEFINITIONS = [
    { id: 'first_item', name: 'Getting Started', desc: 'Add your first item', icon: '🌱', xp: 10, check: () => Store.getAll().length >= 1 },
    { id: 'ten_items', name: 'Stocking Up', desc: 'Track 10 items', icon: '📦', xp: 25, check: () => Store.getAll().length >= 10 },
    { id: 'fifty_items', name: 'Full Pantry', desc: 'Track 50 items', icon: '🏪', xp: 50, check: () => Store.getAll().length >= 50 },
    { id: 'hundred_items', name: 'Pantry Pro', desc: 'Track 100 items', icon: '🏆', xp: 100, check: () => Store.getAll().length >= 100 },
    { id: 'first_use', name: 'First Use', desc: 'Mark your first item as used', icon: '✅', xp: 15, check: (state) => state.totalItemsUsed >= 1 },
    { id: 'ten_used', name: 'Conscious Consumer', desc: 'Use 10 items', icon: '🥗', xp: 30, check: (state) => state.totalItemsUsed >= 10 },
    { id: 'fifty_used', name: 'Zero Waste Hero', desc: 'Use 50 items', icon: '🌍', xp: 75, check: (state) => state.totalItemsUsed >= 50 },
    { id: 'streak_3', name: 'Three Day Streak', desc: 'Check in 3 days in a row', icon: '🔥', xp: 20, check: (state) => state.currentStreak >= 3 },
    { id: 'streak_7', name: 'Week Warrior', desc: '7-day check-in streak', icon: '⚡', xp: 50, check: (state) => state.currentStreak >= 7 },
    { id: 'streak_30', name: 'Monthly Master', desc: '30-day check-in streak', icon: '👑', xp: 200, check: (state) => state.currentStreak >= 30 },
    { id: 'scanner_first', name: 'Tech Savvy', desc: 'Use the barcode scanner', icon: '📷', xp: 15, check: (state) => state.scannerUses >= 1 },
    { id: 'scanner_pro', name: 'Scan Master', desc: 'Scan 25 items', icon: '🤖', xp: 50, check: (state) => state.scannerUses >= 25 },
    { id: 'meal_planner', name: 'Chef Mode', desc: 'Plan your first meal', icon: '👨‍🍳', xp: 20, check: (state) => state.mealsPlanned >= 1 },
    { id: 'meal_master', name: 'Meal Master', desc: 'Plan 20 meals', icon: '🍽️', xp: 60, check: (state) => state.mealsPlanned >= 20 },
    { id: 'shopper', name: 'Smart Shopper', desc: 'Complete your first shopping list', icon: '🛒', xp: 20, check: (state) => state.shoppingListsCompleted >= 1 },
    { id: 'savings_10', name: 'Smart Saver', desc: 'Save $10 by using items', icon: '💰', xp: 30, check: () => Analytics.getMoneySaved('all') >= 10 },
    { id: 'savings_100', name: 'Thrifty Pro', desc: 'Save $100 total', icon: '💎', xp: 100, check: () => Analytics.getMoneySaved('all') >= 100 },
    { id: 'eco_warrior', name: 'Eco Warrior', desc: 'Track 10 local items', icon: '🌿', xp: 40, check: () => Store.getAll().filter(i => i.origin === 'local').length >= 10 },
    { id: 'all_categories', name: 'Diverse Pantry', desc: 'Have items in 10+ categories', icon: '🎨', xp: 40, check: () => new Set(Store.getAll().map(i => i.category)).size >= 10 },
    { id: 'recipe_explorer', name: 'Recipe Explorer', desc: 'View 10 recipes', icon: '📖', xp: 25, check: (state) => state.recipesViewed >= 10 },
  ];

  function loadState() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      return data || defaultState();
    } catch { return defaultState(); }
  }

  function defaultState() {
    return {
      unlockedAt: {},
      currentStreak: 0,
      longestStreak: 0,
      lastCheckIn: null,
      totalItemsTracked: 0,
      totalItemsUsed: 0,
      totalItemsWasted: 0,
      scannerUses: 0,
      mealsPlanned: 0,
      shoppingListsCompleted: 0,
      recipesViewed: 0,
      zeroWasteWeeks: 0,
      totalXp: 0,
    };
  }

  function saveState(state) { localStorage.setItem(KEY, JSON.stringify(state)); }

  function recordEvent(eventType, value = 1) {
    const state = loadState();
    if (eventType === 'item_added') state.totalItemsTracked++;
    else if (eventType === 'item_used') state.totalItemsUsed++;
    else if (eventType === 'item_wasted') state.totalItemsWasted++;
    else if (eventType === 'scan_used') state.scannerUses++;
    else if (eventType === 'meal_planned') state.mealsPlanned += value;
    else if (eventType === 'shopping_completed') state.shoppingListsCompleted++;
    else if (eventType === 'recipe_viewed') state.recipesViewed++;
    saveState(state);
    return checkAchievements();
  }

  function recordCheckIn() {
    const state = loadState();
    const today = new Date().toISOString().split('T')[0];
    if (state.lastCheckIn === today) return state;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (state.lastCheckIn === yesterday) state.currentStreak++;
    else state.currentStreak = 1;
    if (state.currentStreak > state.longestStreak) state.longestStreak = state.currentStreak;
    state.lastCheckIn = today;
    saveState(state);
    checkAchievements();
    return state;
  }

  function checkAchievements() {
    const state = loadState();
    const newlyUnlocked = [];
    DEFINITIONS.forEach(def => {
      if (!state.unlockedAt[def.id] && def.check(state)) {
        state.unlockedAt[def.id] = new Date().toISOString();
        state.totalXp += def.xp;
        newlyUnlocked.push(def);
      }
    });
    if (newlyUnlocked.length > 0) saveState(state);
    return newlyUnlocked;
  }

  function getAll() {
    const state = loadState();
    return DEFINITIONS.map(def => ({
      ...def,
      unlocked: !!state.unlockedAt[def.id],
      unlockedAt: state.unlockedAt[def.id] || null,
    }));
  }

  function getUnlocked() { return getAll().filter(a => a.unlocked); }
  function getLocked() { return getAll().filter(a => !a.unlocked); }

  function getInventoryHealthScore() {
    const stats = Store.getStats();
    if (stats.total === 0) return 100;
    const fresh = stats.fresh / stats.total;
    const warning = stats.warning / stats.total;
    const danger = stats.danger / stats.total;
    const expired = stats.expired / stats.total;
    const score = Math.round((fresh * 100) + (warning * 70) + (danger * 30) - (expired * 50));
    return Math.max(0, Math.min(100, score));
  }

  function getLevel() {
    const state = loadState();
    return Math.floor(Math.sqrt(state.totalXp / 50)) + 1;
  }

  function getXpToNextLevel() {
    const state = loadState();
    const currentLevel = getLevel();
    const nextLevelXp = Math.pow(currentLevel, 2) * 50;
    return nextLevelXp - state.totalXp;
  }

  // ===== Challenges =====
  const CHALLENGE_DEFINITIONS = [
    { id: 'zero_waste_week', name: 'Zero Waste Week', desc: 'No expired items for 7 days', target: 7, xp: 50, icon: '♻️' },
    { id: 'use_5', name: 'Use 5 Items', desc: 'Use 5 items this week', target: 5, xp: 30, icon: '✨' },
    { id: 'scan_10', name: 'Scanner Sprint', desc: 'Scan 10 items this week', target: 10, xp: 25, icon: '📱' },
    { id: 'plan_7_meals', name: 'Meal Prep Master', desc: 'Plan 7 meals this week', target: 7, xp: 40, icon: '🍴' },
    { id: 'shop_smart', name: 'Smart Shopping', desc: 'Complete a shopping list', target: 1, xp: 20, icon: '🛍️' },
  ];

  function getActiveChallenges() {
    try {
      const data = JSON.parse(localStorage.getItem(CHALLENGES_KEY));
      if (!data || isNewWeek(data.weekStart)) return resetChallenges();
      return data;
    } catch { return resetChallenges(); }
  }

  function isNewWeek(weekStart) {
    if (!weekStart) return true;
    return (Date.now() - new Date(weekStart).getTime()) > 7 * 86400000;
  }

  function resetChallenges() {
    const data = {
      weekStart: new Date().toISOString(),
      challenges: CHALLENGE_DEFINITIONS.map(c => ({ ...c, progress: 0, completed: false })),
    };
    localStorage.setItem(CHALLENGES_KEY, JSON.stringify(data));
    return data;
  }

  function updateChallenge(id, increment = 1) {
    const data = getActiveChallenges();
    const challenge = data.challenges.find(c => c.id === id);
    if (!challenge) return null;
    challenge.progress = Math.min(challenge.target, challenge.progress + increment);
    if (challenge.progress >= challenge.target && !challenge.completed) {
      challenge.completed = true;
      const state = loadState();
      state.totalXp += challenge.xp;
      saveState(state);
    }
    localStorage.setItem(CHALLENGES_KEY, JSON.stringify(data));
    return challenge;
  }

  return {
    DEFINITIONS,
    recordEvent, recordCheckIn,
    checkAchievements, getAll, getUnlocked, getLocked,
    getInventoryHealthScore, getLevel, getXpToNextLevel,
    loadState,
    getActiveChallenges, updateChallenge,
  };
})();
