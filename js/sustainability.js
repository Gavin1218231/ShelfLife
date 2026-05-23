/**
 * Sustainability — Carbon footprint, seasonal produce, and eco scoring.
 */
const Sustainability = (() => {
  // kg CO2 equivalent per kg of food (approximate)
  const CARBON_PER_CATEGORY = {
    meat: 27.0, seafood: 6.0, deli: 15.0,
    dairy: 3.2, eggs: 4.2, cheese: 13.5,
    produce: 0.4, fruits: 0.4, vegetables: 0.4, herbs: 0.3,
    grains: 1.4, bread: 1.4, cereal: 1.4,
    canned: 1.6, dried: 1.2, oils: 3.3, spices: 2.0, baking: 1.2,
    frozen: 2.0, iceCream: 3.0,
    beverages: 0.8, coffee: 17.0, alcohol: 1.5,
    condiments: 1.8, spreads: 2.5,
    snacks: 2.3, candy: 2.0, nuts: 2.3,
    baby: 1.5, pet: 5.0, health: 1.0, other: 1.5,
  };

  // Northern hemisphere seasonal produce
  const SEASONAL_PRODUCE = {
    0: ['apples', 'oranges', 'pears', 'grapefruit', 'kale', 'cabbage', 'broccoli', 'potatoes'],  // Jan
    1: ['oranges', 'grapefruit', 'lemons', 'kale', 'leeks', 'cabbage', 'potatoes'],              // Feb
    2: ['lemons', 'rhubarb', 'asparagus', 'spinach', 'lettuce', 'mushrooms'],                    // Mar
    3: ['asparagus', 'spinach', 'lettuce', 'peas', 'strawberries', 'rhubarb'],                   // Apr
    4: ['strawberries', 'asparagus', 'peas', 'lettuce', 'spinach', 'rhubarb'],                   // May
    5: ['strawberries', 'cherries', 'blueberries', 'peaches', 'corn', 'cucumber', 'tomatoes'],   // Jun
    6: ['blueberries', 'raspberries', 'peaches', 'plums', 'tomatoes', 'cucumber', 'zucchini'],   // Jul
    7: ['peaches', 'plums', 'tomatoes', 'corn', 'zucchini', 'eggplant', 'bell pepper'],          // Aug
    8: ['apples', 'pears', 'grapes', 'tomatoes', 'corn', 'pumpkin', 'squash'],                   // Sep
    9: ['apples', 'pears', 'grapes', 'pumpkin', 'squash', 'sweet potatoes', 'broccoli'],         // Oct
    10: ['apples', 'pears', 'cranberries', 'pumpkin', 'squash', 'sweet potatoes', 'kale'],       // Nov
    11: ['oranges', 'grapefruit', 'pears', 'pomegranates', 'kale', 'cabbage', 'potatoes'],       // Dec
  };

  function getCarbonForItem(item) {
    const perKg = CARBON_PER_CATEGORY[item.category] || 1.5;
    // Estimate weight: if unit is weight, use directly; else estimate
    let weightKg = 0.5; // default
    if (item.unit === 'kg') weightKg = item.quantity;
    else if (item.unit === 'g') weightKg = item.quantity / 1000;
    else if (item.unit === 'lbs') weightKg = item.quantity * 0.453592;
    else if (item.unit === 'oz') weightKg = item.quantity * 0.0283495;
    else weightKg = item.quantity * 0.3; // rough estimate for count units

    let multiplier = 1.0;
    if (item.origin === 'imported') multiplier = 1.5;
    else if (item.origin === 'local') multiplier = 0.7;

    return perKg * weightKg * multiplier;
  }

  function getTotalCarbonFootprint() {
    return Store.getAll().reduce((sum, item) => sum + getCarbonForItem(item), 0);
  }

  function getCarbonByCategory() {
    const result = {};
    Store.getAll().forEach(item => {
      const cat = item.category || 'other';
      result[cat] = (result[cat] || 0) + getCarbonForItem(item);
    });
    return result;
  }

  function getCarbonSavedByUsing() {
    const log = Analytics.getWasteLog();
    return log.filter(e => e.disposalType === 'used')
      .reduce((sum, e) => {
        const perKg = CARBON_PER_CATEGORY[e.category] || 1.5;
        return sum + (perKg * 0.3 * (e.quantity || 1));
      }, 0);
  }

  function getEcoScore() {
    const items = Store.getAll();
    if (items.length === 0) return { score: 100, grade: 'A' };
    const localPct = items.filter(i => i.origin === 'local').length / items.length;
    const seasonalPct = items.filter(i => isInSeason(i.name)).length / items.length;
    const wasteScore = Analytics.getWasteReductionScore() / 100;
    const score = Math.round((localPct * 30) + (seasonalPct * 30) + (wasteScore * 40));
    let grade = 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 75) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 40) grade = 'D';
    else if (score >= 20) grade = 'E';
    return { score, grade, localPct: localPct * 100, seasonalPct: seasonalPct * 100 };
  }

  function getSeasonalProduce(month = null) {
    const m = month !== null ? month : new Date().getMonth();
    return SEASONAL_PRODUCE[m] || [];
  }

  function isInSeason(itemName) {
    if (!itemName) return false;
    const name = itemName.toLowerCase();
    const seasonal = getSeasonalProduce();
    return seasonal.some(s => name.includes(s) || s.includes(name));
  }

  function getSuggestedSeasonalItems() {
    const seasonal = getSeasonalProduce();
    const inventory = new Set(Store.getAll().map(i => i.name.toLowerCase()));
    return seasonal.filter(s => ![...inventory].some(inv => inv.includes(s) || s.includes(inv)));
  }

  return {
    CARBON_PER_CATEGORY, SEASONAL_PRODUCE,
    getCarbonForItem, getTotalCarbonFootprint, getCarbonByCategory,
    getCarbonSavedByUsing, getEcoScore, getSeasonalProduce,
    isInSeason, getSuggestedSeasonalItems,
  };
})();
