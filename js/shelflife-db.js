/**
 * ShelfLifeDB — Built-in shelf life database and smart defaults.
 */
const ShelfLifeDB = (() => {
  const FREQUENT_KEY = 'shelflife_frequent_items';

  // Built-in shelf life database: shelfLifeDays for unopened, openedShelfLifeDays after opening
  const DATABASE = {
    // Dairy
    'milk': { category: 'dairy', location: 'fridge', unit: 'gallons', shelfLifeDays: 7, openedShelfLifeDays: 5 },
    'whole milk': { category: 'dairy', location: 'fridge', unit: 'gallons', shelfLifeDays: 7, openedShelfLifeDays: 5 },
    'skim milk': { category: 'dairy', location: 'fridge', unit: 'gallons', shelfLifeDays: 7, openedShelfLifeDays: 5 },
    'almond milk': { category: 'dairy', location: 'fridge', unit: 'cups', shelfLifeDays: 14, openedShelfLifeDays: 7 },
    'oat milk': { category: 'dairy', location: 'fridge', unit: 'cups', shelfLifeDays: 14, openedShelfLifeDays: 7 },
    'butter': { category: 'dairy', location: 'fridge', unit: 'pieces', shelfLifeDays: 30, openedShelfLifeDays: 14 },
    'yogurt': { category: 'dairy', location: 'fridge', unit: 'containers', shelfLifeDays: 14, openedShelfLifeDays: 5 },
    'greek yogurt': { category: 'dairy', location: 'fridge', unit: 'containers', shelfLifeDays: 14, openedShelfLifeDays: 5 },
    'cream cheese': { category: 'dairy', location: 'fridge', unit: 'pieces', shelfLifeDays: 14, openedShelfLifeDays: 10 },
    'sour cream': { category: 'dairy', location: 'fridge', unit: 'containers', shelfLifeDays: 14, openedShelfLifeDays: 7 },
    'heavy cream': { category: 'dairy', location: 'fridge', unit: 'cups', shelfLifeDays: 10, openedShelfLifeDays: 5 },
    // Cheese
    'cheddar cheese': { category: 'cheese', location: 'fridge', unit: 'pieces', shelfLifeDays: 30, openedShelfLifeDays: 14 },
    'mozzarella': { category: 'cheese', location: 'fridge', unit: 'pieces', shelfLifeDays: 14, openedShelfLifeDays: 7 },
    'parmesan': { category: 'cheese', location: 'fridge', unit: 'pieces', shelfLifeDays: 60, openedShelfLifeDays: 30 },
    'feta': { category: 'cheese', location: 'fridge', unit: 'containers', shelfLifeDays: 30, openedShelfLifeDays: 14 },
    'cheese': { category: 'cheese', location: 'fridge', unit: 'pieces', shelfLifeDays: 21, openedShelfLifeDays: 10 },
    // Eggs
    'eggs': { category: 'eggs', location: 'fridge', unit: 'dozen', shelfLifeDays: 28, openedShelfLifeDays: null },
    // Meat
    'chicken breast': { category: 'meat', location: 'fridge', unit: 'lbs', shelfLifeDays: 2 },
    'chicken': { category: 'meat', location: 'fridge', unit: 'lbs', shelfLifeDays: 2 },
    'ground beef': { category: 'meat', location: 'fridge', unit: 'lbs', shelfLifeDays: 2 },
    'beef': { category: 'meat', location: 'fridge', unit: 'lbs', shelfLifeDays: 3 },
    'pork': { category: 'meat', location: 'fridge', unit: 'lbs', shelfLifeDays: 3 },
    'bacon': { category: 'meat', location: 'fridge', unit: 'pieces', shelfLifeDays: 7, openedShelfLifeDays: 7 },
    'sausage': { category: 'meat', location: 'fridge', unit: 'lbs', shelfLifeDays: 2 },
    'ham': { category: 'meat', location: 'fridge', unit: 'lbs', shelfLifeDays: 7, openedShelfLifeDays: 5 },
    'turkey': { category: 'meat', location: 'fridge', unit: 'lbs', shelfLifeDays: 2 },
    // Seafood
    'salmon': { category: 'seafood', location: 'fridge', unit: 'lbs', shelfLifeDays: 2 },
    'shrimp': { category: 'seafood', location: 'fridge', unit: 'lbs', shelfLifeDays: 2 },
    'tuna': { category: 'seafood', location: 'fridge', unit: 'lbs', shelfLifeDays: 2 },
    'fish': { category: 'seafood', location: 'fridge', unit: 'lbs', shelfLifeDays: 2 },
    // Produce
    'apples': { category: 'fruits', location: 'fridge', unit: 'pieces', shelfLifeDays: 30 },
    'bananas': { category: 'fruits', location: 'countertop', unit: 'pieces', shelfLifeDays: 5 },
    'oranges': { category: 'fruits', location: 'fridge', unit: 'pieces', shelfLifeDays: 21 },
    'grapes': { category: 'fruits', location: 'fridge', unit: 'bunches', shelfLifeDays: 7 },
    'strawberries': { category: 'fruits', location: 'fridge', unit: 'containers', shelfLifeDays: 5 },
    'blueberries': { category: 'fruits', location: 'fridge', unit: 'containers', shelfLifeDays: 7 },
    'avocado': { category: 'fruits', location: 'countertop', unit: 'pieces', shelfLifeDays: 4 },
    'lemons': { category: 'fruits', location: 'fridge', unit: 'pieces', shelfLifeDays: 21 },
    'limes': { category: 'fruits', location: 'fridge', unit: 'pieces', shelfLifeDays: 21 },
    'lettuce': { category: 'vegetables', location: 'fridge', unit: 'pieces', shelfLifeDays: 7 },
    'spinach': { category: 'vegetables', location: 'fridge', unit: 'bunches', shelfLifeDays: 5 },
    'kale': { category: 'vegetables', location: 'fridge', unit: 'bunches', shelfLifeDays: 7 },
    'tomatoes': { category: 'vegetables', location: 'countertop', unit: 'pieces', shelfLifeDays: 7 },
    'cucumber': { category: 'vegetables', location: 'fridge', unit: 'pieces', shelfLifeDays: 7 },
    'carrots': { category: 'vegetables', location: 'fridge', unit: 'lbs', shelfLifeDays: 21 },
    'celery': { category: 'vegetables', location: 'fridge', unit: 'bunches', shelfLifeDays: 14 },
    'broccoli': { category: 'vegetables', location: 'fridge', unit: 'pieces', shelfLifeDays: 7 },
    'bell pepper': { category: 'vegetables', location: 'fridge', unit: 'pieces', shelfLifeDays: 10 },
    'onions': { category: 'vegetables', location: 'pantry', unit: 'pieces', shelfLifeDays: 30 },
    'garlic': { category: 'vegetables', location: 'pantry', unit: 'pieces', shelfLifeDays: 90 },
    'potatoes': { category: 'vegetables', location: 'pantry', unit: 'lbs', shelfLifeDays: 30 },
    'mushrooms': { category: 'vegetables', location: 'fridge', unit: 'containers', shelfLifeDays: 7 },
    // Bread
    'bread': { category: 'bread', location: 'pantry', unit: 'pieces', shelfLifeDays: 7 },
    'sourdough': { category: 'bread', location: 'pantry', unit: 'pieces', shelfLifeDays: 5 },
    'bagels': { category: 'bread', location: 'pantry', unit: 'pieces', shelfLifeDays: 5 },
    'tortillas': { category: 'bread', location: 'fridge', unit: 'packs', shelfLifeDays: 21 },
    // Grains
    'rice': { category: 'grains', location: 'pantry', unit: 'lbs', shelfLifeDays: 730 },
    'pasta': { category: 'grains', location: 'pantry', unit: 'boxes', shelfLifeDays: 730 },
    'quinoa': { category: 'grains', location: 'pantry', unit: 'lbs', shelfLifeDays: 730 },
    'oats': { category: 'cereal', location: 'pantry', unit: 'lbs', shelfLifeDays: 365 },
    'cereal': { category: 'cereal', location: 'pantry', unit: 'boxes', shelfLifeDays: 180, openedShelfLifeDays: 60 },
    // Pantry staples
    'canned soup': { category: 'canned', location: 'pantry', unit: 'cans', shelfLifeDays: 730 },
    'canned beans': { category: 'canned', location: 'pantry', unit: 'cans', shelfLifeDays: 1095 },
    'olive oil': { category: 'oils', location: 'pantry', unit: 'bottles', shelfLifeDays: 730 },
    'vegetable oil': { category: 'oils', location: 'pantry', unit: 'bottles', shelfLifeDays: 365 },
    'vinegar': { category: 'oils', location: 'pantry', unit: 'bottles', shelfLifeDays: 1825 },
    'flour': { category: 'baking', location: 'pantry', unit: 'lbs', shelfLifeDays: 365 },
    'sugar': { category: 'baking', location: 'pantry', unit: 'lbs', shelfLifeDays: 730 },
    'salt': { category: 'spices', location: 'spiceRack', unit: 'containers', shelfLifeDays: 9999 },
    'pepper': { category: 'spices', location: 'spiceRack', unit: 'containers', shelfLifeDays: 1095 },
    // Beverages
    'orange juice': { category: 'beverages', location: 'fridge', unit: 'bottles', shelfLifeDays: 14, openedShelfLifeDays: 7 },
    'apple juice': { category: 'beverages', location: 'fridge', unit: 'bottles', shelfLifeDays: 14, openedShelfLifeDays: 7 },
    'coffee': { category: 'coffee', location: 'pantry', unit: 'bags', shelfLifeDays: 180, openedShelfLifeDays: 30 },
    'tea': { category: 'coffee', location: 'pantry', unit: 'boxes', shelfLifeDays: 730 },
    // Condiments
    'ketchup': { category: 'condiments', location: 'fridge', unit: 'bottles', shelfLifeDays: 365, openedShelfLifeDays: 180 },
    'mustard': { category: 'condiments', location: 'fridge', unit: 'bottles', shelfLifeDays: 365, openedShelfLifeDays: 180 },
    'mayonnaise': { category: 'condiments', location: 'fridge', unit: 'jars', shelfLifeDays: 180, openedShelfLifeDays: 60 },
    'soy sauce': { category: 'condiments', location: 'pantry', unit: 'bottles', shelfLifeDays: 730, openedShelfLifeDays: 365 },
    'hot sauce': { category: 'condiments', location: 'pantry', unit: 'bottles', shelfLifeDays: 730, openedShelfLifeDays: 365 },
    // Spreads
    'peanut butter': { category: 'spreads', location: 'pantry', unit: 'jars', shelfLifeDays: 730, openedShelfLifeDays: 90 },
    'jam': { category: 'spreads', location: 'fridge', unit: 'jars', shelfLifeDays: 365, openedShelfLifeDays: 180 },
    'jelly': { category: 'spreads', location: 'fridge', unit: 'jars', shelfLifeDays: 365, openedShelfLifeDays: 180 },
    'honey': { category: 'spreads', location: 'pantry', unit: 'jars', shelfLifeDays: 9999 },
    // Frozen
    'ice cream': { category: 'iceCream', location: 'freezer', unit: 'containers', shelfLifeDays: 60 },
    'frozen vegetables': { category: 'frozen', location: 'freezer', unit: 'bags', shelfLifeDays: 240 },
    'frozen pizza': { category: 'frozen', location: 'freezer', unit: 'pieces', shelfLifeDays: 180 },
  };

  function lookup(name) {
    if (!name) return null;
    const key = name.toLowerCase().trim();
    if (DATABASE[key]) return DATABASE[key];
    // Try partial matches
    for (const dbKey in DATABASE) {
      if (key.includes(dbKey) || dbKey.includes(key)) return DATABASE[dbKey];
    }
    return null;
  }

  function getSuggestions(partialName) {
    if (!partialName || partialName.length < 2) return [];
    const term = partialName.toLowerCase();
    return Object.keys(DATABASE)
      .filter(k => k.includes(term))
      .slice(0, 8);
  }

  function autoFillExpiration(name, category, purchaseDate) {
    const entry = lookup(name);
    if (entry) {
      const start = purchaseDate ? new Date(purchaseDate) : new Date();
      start.setDate(start.getDate() + entry.shelfLifeDays);
      return start.toISOString().split('T')[0];
    }
    // Category-based defaults
    const categoryDefaults = {
      dairy: 7, eggs: 21, cheese: 21, meat: 2, seafood: 2, deli: 5,
      produce: 5, fruits: 7, vegetables: 7, herbs: 5,
      grains: 365, bread: 7, cereal: 180,
      canned: 730, dried: 365, oils: 365, spices: 730, baking: 365,
      frozen: 90, iceCream: 60,
      beverages: 14, coffee: 180, alcohol: 1825,
      condiments: 180, spreads: 180,
      snacks: 90, candy: 365, nuts: 180,
      baby: 365, pet: 365, health: 730, other: 30,
    };
    const days = categoryDefaults[category] || 30;
    const start = purchaseDate ? new Date(purchaseDate) : new Date();
    start.setDate(start.getDate() + days);
    return start.toISOString().split('T')[0];
  }

  function loadFrequent() {
    try { return JSON.parse(localStorage.getItem(FREQUENT_KEY)) || { items: [] }; }
    catch { return { items: [] }; }
  }

  function saveFrequent(data) { localStorage.setItem(FREQUENT_KEY, JSON.stringify(data)); }

  function recordUsage(itemName, category, location, unit) {
    const data = loadFrequent();
    const key = itemName.toLowerCase().trim();
    let entry = data.items.find(i => i.name.toLowerCase() === key);
    if (entry) {
      entry.usageCount++;
      entry.lastUsed = new Date().toISOString();
    } else {
      data.items.push({
        name: itemName,
        category: category || 'other',
        location: location || 'fridge',
        unit: unit || 'pieces',
        usageCount: 1,
        lastUsed: new Date().toISOString(),
      });
    }
    data.items.sort((a, b) => b.usageCount - a.usageCount);
    if (data.items.length > 50) data.items = data.items.slice(0, 50);
    saveFrequent(data);
  }

  function getFrequentItems(limit = 8) {
    return loadFrequent().items.slice(0, limit);
  }

  return {
    DATABASE, lookup, getSuggestions, autoFillExpiration,
    recordUsage, getFrequentItems,
  };
})();
