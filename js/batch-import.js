/**
 * BatchImport — Bulk add items from text, templates, or receipts.
 */
const BatchImport = (() => {
  const TEMPLATES_KEY = 'shelflife_templates';

  const BUILT_IN_TEMPLATES = {
    'weekly-essentials': {
      name: 'Weekly Essentials',
      icon: '🛒',
      items: [
        { name: 'Milk', category: 'dairy', location: 'fridge', unit: 'gallons' },
        { name: 'Eggs', category: 'eggs', location: 'fridge', unit: 'dozen' },
        { name: 'Bread', category: 'bread', location: 'pantry', unit: 'pieces' },
        { name: 'Butter', category: 'dairy', location: 'fridge', unit: 'pieces' },
        { name: 'Bananas', category: 'fruits', location: 'countertop', unit: 'pieces' },
      ],
    },
    'breakfast-pack': {
      name: 'Breakfast Pack',
      icon: '🥞',
      items: [
        { name: 'Cereal', category: 'cereal', location: 'pantry', unit: 'boxes' },
        { name: 'Oats', category: 'cereal', location: 'pantry', unit: 'lbs' },
        { name: 'Greek Yogurt', category: 'dairy', location: 'fridge', unit: 'containers' },
        { name: 'Berries', category: 'fruits', location: 'fridge', unit: 'containers' },
        { name: 'Coffee', category: 'coffee', location: 'pantry', unit: 'bags' },
      ],
    },
    'pantry-staples': {
      name: 'Pantry Staples',
      icon: '🏪',
      items: [
        { name: 'Rice', category: 'grains', location: 'pantry', unit: 'lbs' },
        { name: 'Pasta', category: 'grains', location: 'pantry', unit: 'boxes' },
        { name: 'Olive Oil', category: 'oils', location: 'pantry', unit: 'bottles' },
        { name: 'Salt', category: 'spices', location: 'spiceRack', unit: 'containers' },
        { name: 'Pepper', category: 'spices', location: 'spiceRack', unit: 'containers' },
        { name: 'Canned Tomatoes', category: 'canned', location: 'pantry', unit: 'cans' },
        { name: 'Canned Beans', category: 'canned', location: 'pantry', unit: 'cans' },
      ],
    },
    'veggie-haul': {
      name: 'Veggie Haul',
      icon: '🥦',
      items: [
        { name: 'Spinach', category: 'vegetables', location: 'fridge', unit: 'bunches' },
        { name: 'Carrots', category: 'vegetables', location: 'fridge', unit: 'lbs' },
        { name: 'Broccoli', category: 'vegetables', location: 'fridge', unit: 'pieces' },
        { name: 'Bell Pepper', category: 'vegetables', location: 'fridge', unit: 'pieces' },
        { name: 'Onions', category: 'vegetables', location: 'pantry', unit: 'pieces' },
        { name: 'Garlic', category: 'vegetables', location: 'pantry', unit: 'pieces' },
      ],
    },
  };

  function getBuiltInTemplates() { return BUILT_IN_TEMPLATES; }

  function loadCustomTemplates() {
    try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY)) || {}; }
    catch { return {}; }
  }

  function saveTemplate(id, template) {
    const data = loadCustomTemplates();
    data[id] = template;
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(data));
  }

  function deleteTemplate(id) {
    const data = loadCustomTemplates();
    delete data[id];
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(data));
  }

  function applyTemplate(templateId) {
    const builtIn = BUILT_IN_TEMPLATES[templateId];
    const custom = loadCustomTemplates()[templateId];
    const template = builtIn || custom;
    if (!template) return 0;
    let added = 0;
    template.items.forEach(item => {
      const exp = ShelfLifeDB.autoFillExpiration(item.name, item.category);
      Store.addItem({
        ...item,
        quantity: item.quantity || 1,
        expirationDate: exp,
        purchaseDate: new Date().toISOString().split('T')[0],
      });
      added++;
    });
    return added;
  }

  /**
   * Parse pasted text like:
   *   Milk $3.99
   *   Eggs $4.50
   *   Bread $2.99
   * Or:
   *   2x Milk
   *   Eggs - 12
   *   Bread
   */
  function parseText(text) {
    if (!text) return [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const items = [];
    lines.forEach(line => {
      // Strip price first
      let priceMatch = line.match(/\$?(\d+\.\d{2})\s*$/);
      let price = null;
      if (priceMatch) {
        price = parseFloat(priceMatch[1]);
        line = line.slice(0, priceMatch.index).trim();
      }

      // Strip quantity prefix (e.g., "2x", "2 ")
      let quantity = 1;
      let qtyMatch = line.match(/^(\d+)\s*x?\s+/i);
      if (qtyMatch) {
        quantity = parseInt(qtyMatch[1]);
        line = line.slice(qtyMatch[0].length).trim();
      }

      // Or trailing quantity (e.g., "Eggs - 12")
      let trailMatch = line.match(/\s*[-–]\s*(\d+)\s*$/);
      if (trailMatch && quantity === 1) {
        quantity = parseInt(trailMatch[1]);
        line = line.slice(0, trailMatch.index).trim();
      }

      if (line) {
        const dbEntry = ShelfLifeDB.lookup(line);
        items.push({
          name: line,
          quantity,
          price,
          category: dbEntry ? dbEntry.category : 'other',
          location: dbEntry ? dbEntry.location : 'pantry',
          unit: dbEntry ? dbEntry.unit : 'pieces',
        });
      }
    });
    return items;
  }

  function importItems(items) {
    let added = 0;
    items.forEach(item => {
      if (!item.name) return;
      const exp = item.expirationDate || ShelfLifeDB.autoFillExpiration(item.name, item.category);
      Store.addItem({
        ...item,
        expirationDate: exp,
        purchaseDate: new Date().toISOString().split('T')[0],
      });
      added++;
    });
    return added;
  }

  return {
    BUILT_IN_TEMPLATES,
    getBuiltInTemplates, loadCustomTemplates,
    saveTemplate, deleteTemplate, applyTemplate,
    parseText, importItems,
  };
})();
