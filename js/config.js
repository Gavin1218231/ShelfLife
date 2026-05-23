/**
 * Config — Centralized configuration for categories, locations, units, and settings.
 */
const Config = (() => {
  // ===== Storage Locations =====
  const LOCATIONS = {
    fridge: { label: 'Refrigerator', icon: '&#129482;' },
    freezer: { label: 'Freezer', icon: '&#10052;' },
    pantry: { label: 'Pantry', icon: '&#127869;' },
    cabinet: { label: 'Cabinet', icon: '&#128452;' },
    countertop: { label: 'Countertop', icon: '&#127834;' },
    spiceRack: { label: 'Spice Rack', icon: '&#127798;' },
    wineCellar: { label: 'Wine Cellar', icon: '&#127863;' },
    garage: { label: 'Garage/Bulk', icon: '&#128230;' },
    other: { label: 'Other', icon: '&#128230;' },
  };

  // ===== Food Categories (Expanded) =====
  const CATEGORIES = {
    // Dairy & Eggs
    dairy: { label: 'Dairy', icon: '&#129371;' },
    eggs: { label: 'Eggs', icon: '&#129370;' },
    cheese: { label: 'Cheese', icon: '&#129472;' },
    // Proteins
    meat: { label: 'Meat & Poultry', icon: '&#129385;' },
    seafood: { label: 'Seafood', icon: '&#129424;' },
    deli: { label: 'Deli & Prepared', icon: '&#129386;' },
    // Produce
    produce: { label: 'Fresh Produce', icon: '&#129382;' },
    fruits: { label: 'Fruits', icon: '&#127822;' },
    vegetables: { label: 'Vegetables', icon: '&#129365;' },
    herbs: { label: 'Herbs & Aromatics', icon: '&#127807;' },
    // Grains & Bakery
    grains: { label: 'Grains & Pasta', icon: '&#127838;' },
    bread: { label: 'Bread & Bakery', icon: '&#129366;' },
    cereal: { label: 'Cereals & Breakfast', icon: '&#129378;' },
    // Pantry Staples
    canned: { label: 'Canned Goods', icon: '&#129387;' },
    dried: { label: 'Dried & Legumes', icon: '&#127813;' },
    oils: { label: 'Oils & Vinegars', icon: '&#129383;' },
    spices: { label: 'Spices & Seasonings', icon: '&#127798;' },
    baking: { label: 'Baking Supplies', icon: '&#127856;' },
    // Frozen
    frozen: { label: 'Frozen Foods', icon: '&#10052;' },
    iceCream: { label: 'Ice Cream & Desserts', icon: '&#127846;' },
    // Beverages
    beverages: { label: 'Beverages', icon: '&#127864;' },
    coffee: { label: 'Coffee & Tea', icon: '&#9749;' },
    alcohol: { label: 'Alcohol & Wine', icon: '&#127863;' },
    // Condiments & Sauces
    condiments: { label: 'Condiments & Sauces', icon: '&#129381;' },
    spreads: { label: 'Spreads & Jams', icon: '&#127855;' },
    // Snacks & Sweets
    snacks: { label: 'Snacks', icon: '&#127871;' },
    candy: { label: 'Candy & Sweets', icon: '&#127852;' },
    nuts: { label: 'Nuts & Seeds', icon: '&#129372;' },
    // Other
    baby: { label: 'Baby Food', icon: '&#127868;' },
    pet: { label: 'Pet Food', icon: '&#128054;' },
    health: { label: 'Vitamins & Supplements', icon: '&#128138;' },
    other: { label: 'Other', icon: '&#127869;' },
  };

  // ===== Quantity Units =====
  const UNITS = {
    // Count
    pieces: { label: 'pieces', abbr: 'pcs', type: 'count' },
    units: { label: 'units', abbr: 'units', type: 'count' },
    items: { label: 'items', abbr: 'items', type: 'count' },
    packs: { label: 'packs', abbr: 'pk', type: 'count' },
    boxes: { label: 'boxes', abbr: 'box', type: 'count' },
    bags: { label: 'bags', abbr: 'bag', type: 'count' },
    cans: { label: 'cans', abbr: 'can', type: 'count' },
    bottles: { label: 'bottles', abbr: 'btl', type: 'count' },
    jars: { label: 'jars', abbr: 'jar', type: 'count' },
    containers: { label: 'containers', abbr: 'cnt', type: 'count' },
    bunches: { label: 'bunches', abbr: 'bunch', type: 'count' },
    dozen: { label: 'dozen', abbr: 'doz', type: 'count' },
    // Weight - Imperial
    oz: { label: 'ounces', abbr: 'oz', type: 'weight' },
    lbs: { label: 'pounds', abbr: 'lbs', type: 'weight' },
    // Weight - Metric
    g: { label: 'grams', abbr: 'g', type: 'weight' },
    kg: { label: 'kilograms', abbr: 'kg', type: 'weight' },
    // Volume - Imperial
    floz: { label: 'fluid ounces', abbr: 'fl oz', type: 'volume' },
    cups: { label: 'cups', abbr: 'cup', type: 'volume' },
    pints: { label: 'pints', abbr: 'pt', type: 'volume' },
    quarts: { label: 'quarts', abbr: 'qt', type: 'volume' },
    gallons: { label: 'gallons', abbr: 'gal', type: 'volume' },
    // Volume - Metric
    ml: { label: 'milliliters', abbr: 'ml', type: 'volume' },
    liters: { label: 'liters', abbr: 'L', type: 'volume' },
    // Cooking
    tbsp: { label: 'tablespoons', abbr: 'tbsp', type: 'cooking' },
    tsp: { label: 'teaspoons', abbr: 'tsp', type: 'cooking' },
  };

  // ===== Default App Settings =====
  const DEFAULT_SETTINGS = {
    theme: 'dark',
    viewMode: 'grid',
    sortBy: 'expiration',
    notifyDaysBefore: 3,
    defaultLocation: 'fridge',
    defaultUnit: 'pieces',
    showExpiredItems: true,
    groupByLocation: false,
    compactView: false,
    // New settings for expanded features
    notificationsEnabled: false,
    notificationTime: '09:00',
    autoFillExpiration: true,
    showAchievements: true,
    celebrationsEnabled: true,
    voiceEnabled: true,
    showWidgets: true,
    monthlyBudget: 0,
    budgetAlerts: false,
    showCarbonFootprint: true,
    seasonalSuggestions: true,
    autoBackup: false,
  };

  // ===== Settings persistence =====
  const SETTINGS_KEY = 'shelflife_settings';

  function loadSettings() {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function getSetting(key) {
    const settings = loadSettings();
    return settings[key] ?? DEFAULT_SETTINGS[key];
  }

  function setSetting(key, value) {
    const settings = loadSettings();
    settings[key] = value;
    saveSettings(settings);
  }

  // ===== Utility: Get label for a category/location/unit =====
  function getCategoryLabel(key) {
    return CATEGORIES[key]?.label || key;
  }

  function getLocationLabel(key) {
    return LOCATIONS[key]?.label || key;
  }

  function getUnitLabel(key) {
    return UNITS[key]?.label || key;
  }

  function getUnitAbbr(key) {
    return UNITS[key]?.abbr || key;
  }

  // ===== Generate HTML options =====
  function getCategoryOptions(selected = '') {
    return Object.entries(CATEGORIES)
      .map(([key, val]) => `<option value="${key}" ${key === selected ? 'selected' : ''}>${val.label}</option>`)
      .join('');
  }

  function getLocationOptions(selected = '') {
    return Object.entries(LOCATIONS)
      .map(([key, val]) => `<option value="${key}" ${key === selected ? 'selected' : ''}>${val.label}</option>`)
      .join('');
  }

  function getUnitOptions(selected = '') {
    const grouped = { count: [], weight: [], volume: [], cooking: [] };
    Object.entries(UNITS).forEach(([key, val]) => {
      grouped[val.type].push({ key, ...val });
    });

    let html = '';
    const groupLabels = { count: 'Count', weight: 'Weight', volume: 'Volume', cooking: 'Cooking' };
    Object.entries(grouped).forEach(([type, units]) => {
      html += `<optgroup label="${groupLabels[type]}">`;
      units.forEach(u => {
        html += `<option value="${u.key}" ${u.key === selected ? 'selected' : ''}>${u.label}</option>`;
      });
      html += '</optgroup>';
    });
    return html;
  }

  return {
    LOCATIONS,
    CATEGORIES,
    UNITS,
    DEFAULT_SETTINGS,
    loadSettings,
    saveSettings,
    getSetting,
    setSetting,
    getCategoryLabel,
    getLocationLabel,
    getUnitLabel,
    getUnitAbbr,
    getCategoryOptions,
    getLocationOptions,
    getUnitOptions,
  };
})();
