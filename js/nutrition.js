/**
 * Nutrition — Built-in nutritional database and dietary filters.
 */
const Nutrition = (() => {
  // Calories per 100g, plus protein/carbs/fat in grams
  const DATABASE = {
    'milk': { calories: 42, protein: 3.4, carbs: 5, fat: 1, tags: ['vegetarian'] },
    'eggs': { calories: 155, protein: 13, carbs: 1.1, fat: 11, tags: ['vegetarian'] },
    'chicken': { calories: 165, protein: 31, carbs: 0, fat: 3.6, tags: [] },
    'beef': { calories: 250, protein: 26, carbs: 0, fat: 17, tags: [] },
    'salmon': { calories: 208, protein: 20, carbs: 0, fat: 13, tags: ['pescatarian'] },
    'bread': { calories: 265, protein: 9, carbs: 49, fat: 3.2, tags: ['vegetarian', 'vegan'] },
    'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, tags: ['vegan', 'vegetarian', 'gluten-free'] },
    'pasta': { calories: 131, protein: 5, carbs: 25, fat: 1.1, tags: ['vegetarian'] },
    'apples': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, tags: ['vegan', 'vegetarian', 'gluten-free'] },
    'bananas': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, tags: ['vegan', 'vegetarian', 'gluten-free'] },
    'oranges': { calories: 47, protein: 0.9, carbs: 12, fat: 0.1, tags: ['vegan', 'vegetarian', 'gluten-free'] },
    'spinach': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, tags: ['vegan', 'vegetarian', 'gluten-free', 'keto'] },
    'broccoli': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, tags: ['vegan', 'vegetarian', 'gluten-free', 'keto'] },
    'tomatoes': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, tags: ['vegan', 'vegetarian', 'gluten-free', 'keto'] },
    'carrots': { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, tags: ['vegan', 'vegetarian', 'gluten-free'] },
    'cheese': { calories: 402, protein: 25, carbs: 1.3, fat: 33, tags: ['vegetarian', 'keto'] },
    'yogurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, tags: ['vegetarian'] },
    'butter': { calories: 717, protein: 0.9, carbs: 0.1, fat: 81, tags: ['vegetarian', 'keto'] },
    'olive oil': { calories: 884, protein: 0, carbs: 0, fat: 100, tags: ['vegan', 'vegetarian', 'gluten-free', 'keto'] },
    'peanut butter': { calories: 588, protein: 25, carbs: 20, fat: 50, tags: ['vegan', 'vegetarian', 'keto'] },
    'avocado': { calories: 160, protein: 2, carbs: 9, fat: 15, tags: ['vegan', 'vegetarian', 'gluten-free', 'keto'] },
    'oats': { calories: 389, protein: 17, carbs: 66, fat: 7, tags: ['vegetarian', 'vegan'] },
  };

  const DIETARY_TAGS = ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'keto', 'pescatarian', 'low-carb', 'organic'];
  const ALLERGEN_TAGS = ['nuts', 'peanuts', 'dairy', 'eggs', 'soy', 'wheat', 'fish', 'shellfish'];

  function lookup(name) {
    if (!name) return null;
    const key = name.toLowerCase().trim();
    if (DATABASE[key]) return DATABASE[key];
    for (const dbKey in DATABASE) {
      if (key.includes(dbKey) || dbKey.includes(key)) return DATABASE[dbKey];
    }
    return null;
  }

  function getNutritionInfo(item) {
    if (item.calories) {
      return {
        calories: item.calories,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
      };
    }
    return lookup(item.name);
  }

  function calculateTotalNutrition(items) {
    const total = { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
    items.forEach(item => {
      const info = getNutritionInfo(item);
      if (info) {
        total.calories += info.calories;
        total.protein += info.protein;
        total.carbs += info.carbs;
        total.fat += info.fat;
        total.count++;
      }
    });
    return total;
  }

  function getInventoryNutrition() {
    return calculateTotalNutrition(Store.getAll());
  }

  function filterByDiet(diet, items) {
    items = items || Store.getAll();
    return items.filter(item => {
      const info = lookup(item.name);
      if (info && info.tags && info.tags.includes(diet)) return true;
      if (item.tags && item.tags.includes(diet)) return true;
      return false;
    });
  }

  function getDietaryBreakdown() {
    const items = Store.getAll();
    if (items.length === 0) return {};
    const result = {};
    DIETARY_TAGS.forEach(tag => {
      const matched = filterByDiet(tag, items);
      result[tag] = {
        count: matched.length,
        pct: (matched.length / items.length) * 100,
      };
    });
    return result;
  }

  function hasAllergen(item, allergen) {
    if (item.tags && item.tags.includes(allergen)) return true;
    const name = (item.name || '').toLowerCase();
    if (allergen === 'nuts' && /almond|cashew|walnut|pecan|hazelnut|brazil nut/.test(name)) return true;
    if (allergen === 'peanuts' && /peanut/.test(name)) return true;
    if (allergen === 'dairy' && /milk|cheese|yogurt|butter|cream/.test(name)) return true;
    if (allergen === 'eggs' && /egg/.test(name)) return true;
    if (allergen === 'wheat' && /wheat|bread|pasta|flour/.test(name)) return true;
    return false;
  }

  return {
    DATABASE, DIETARY_TAGS, ALLERGEN_TAGS,
    lookup, getNutritionInfo, calculateTotalNutrition,
    getInventoryNutrition, filterByDiet, getDietaryBreakdown,
    hasAllergen,
  };
})();
