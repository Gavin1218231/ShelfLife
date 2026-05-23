/**
 * Keyboard — Command palette and global keyboard shortcuts.
 */
const Keyboard = (() => {
  const COMMANDS = [
    { id: 'tab-dashboard', name: 'Go to Dashboard', icon: '📊', shortcut: 'd', action: () => App.switchTab('dashboard') },
    { id: 'tab-add', name: 'Add New Item', icon: '➕', shortcut: 'a', action: () => App.switchTab('add-item') },
    { id: 'tab-weekly', name: 'Weekly Summary', icon: '📅', shortcut: 'w', action: () => App.switchTab('weekly-summary') },
    { id: 'tab-recipes', name: 'Recipes', icon: '🍝', shortcut: 'r', action: () => App.switchTab('recipes') },
    { id: 'tab-shopping', name: 'Shopping List', icon: '🛒', shortcut: 's', action: () => App.switchTab('shopping') },
    { id: 'tab-mealplan', name: 'Meal Plan', icon: '🍴', shortcut: 'm', action: () => App.switchTab('meal-plan') },
    { id: 'tab-analytics', name: 'Analytics', icon: '📈', shortcut: 'n', action: () => App.switchTab('analytics') },
    { id: 'view-grid', name: 'Switch to Grid View', icon: '▦', action: () => App.setViewMode('grid') },
    { id: 'view-list', name: 'Switch to List View', icon: '☰', action: () => App.setViewMode('list') },
    { id: 'theme-dark', name: 'Switch to Dark Theme', icon: '🌙', action: () => App.setTheme('dark') },
    { id: 'theme-light', name: 'Switch to Light Theme', icon: '☀️', action: () => App.setTheme('light') },
    { id: 'open-settings', name: 'Open Settings', icon: '⚙️', action: () => App.openSettings() },
    { id: 'open-achievements', name: 'View Achievements', icon: '🏆', action: () => App.openAchievements() },
    { id: 'export-json', name: 'Export Data as JSON', icon: '💾', action: () => App.exportData('json') },
    { id: 'export-csv', name: 'Export Data as CSV', icon: '📄', action: () => App.exportData('csv') },
    { id: 'print-inventory', name: 'Print Inventory Report', icon: '🖨️', action: () => Reports.printReport(Reports.generateInventoryReport()) },
    { id: 'print-weekly', name: 'Print Weekly Summary', icon: '🖨️', action: () => Reports.printReport(Reports.generateWeeklySummary()) },
    { id: 'voice-add', name: 'Add Item by Voice', icon: '🎤', action: () => App.startVoiceInput() },
    { id: 'show-help', name: 'Show Keyboard Shortcuts', icon: '❓', action: () => App.showKeyboardHelp() },
    { id: 'focus-search', name: 'Focus Search', icon: '🔍', action: () => { App.switchTab('dashboard'); setTimeout(() => document.getElementById('search-input')?.focus(), 100); } },
  ];

  let paletteOpen = false;
  let filteredCommands = [];
  let selectedIndex = 0;

  function init() {
    document.addEventListener('keydown', handleGlobalKeydown);
  }

  function handleGlobalKeydown(e) {
    // Don't trigger when typing in inputs
    const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

    // Ctrl+K / Cmd+K opens command palette (works even in inputs)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openPalette();
      return;
    }

    if (paletteOpen) {
      handlePaletteKeydown(e);
      return;
    }

    if (inInput) return;

    // Escape closes modals
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
      if (BulkOps.isBulkMode()) { BulkOps.disable(); App.refreshDashboard(); }
      return;
    }

    // Question mark shows help
    if (e.key === '?') {
      e.preventDefault();
      App.showKeyboardHelp();
      return;
    }

    // Single key shortcuts
    if (e.key === '/') {
      e.preventDefault();
      App.switchTab('dashboard');
      setTimeout(() => document.getElementById('search-input')?.focus(), 100);
      return;
    }

    // Tab navigation shortcuts (single keys)
    const shortcutMap = {
      'd': 'dashboard', 'a': 'add-item', 'w': 'weekly-summary',
      'r': 'recipes', 's': 'shopping', 'm': 'meal-plan', 'n': 'analytics',
    };
    if (!e.ctrlKey && !e.metaKey && !e.altKey && shortcutMap[e.key]) {
      App.switchTab(shortcutMap[e.key]);
    }
  }

  function openPalette() {
    const palette = document.getElementById('command-palette');
    if (!palette) return;
    paletteOpen = true;
    palette.classList.remove('hidden');
    const input = document.getElementById('palette-input');
    if (input) { input.value = ''; input.focus(); }
    filteredCommands = COMMANDS;
    selectedIndex = 0;
    renderPaletteResults();
  }

  function closePalette() {
    paletteOpen = false;
    const palette = document.getElementById('command-palette');
    if (palette) palette.classList.add('hidden');
  }

  function handlePaletteKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); closePalette(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % filteredCommands.length;
      renderPaletteResults();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
      renderPaletteResults();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filteredCommands[selectedIndex];
      if (cmd) { closePalette(); setTimeout(() => cmd.action(), 50); }
    }
  }

  function filterCommands(query) {
    if (!query) return COMMANDS;
    const q = query.toLowerCase();
    return COMMANDS.filter(cmd => cmd.name.toLowerCase().includes(q));
  }

  function onPaletteInput(query) {
    filteredCommands = filterCommands(query);
    selectedIndex = 0;
    renderPaletteResults();
  }

  function renderPaletteResults() {
    const results = document.getElementById('palette-results');
    if (!results) return;
    if (filteredCommands.length === 0) {
      results.innerHTML = '<div class="palette-empty">No commands found</div>';
      return;
    }
    results.innerHTML = filteredCommands.map((cmd, i) => `
      <div class="palette-item ${i === selectedIndex ? 'selected' : ''}" data-index="${i}">
        <span class="palette-icon">${cmd.icon}</span>
        <span class="palette-name">${cmd.name}</span>
        ${cmd.shortcut ? `<kbd class="palette-shortcut">${cmd.shortcut}</kbd>` : ''}
      </div>`).join('');
    results.querySelectorAll('.palette-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index);
        const cmd = filteredCommands[idx];
        if (cmd) { closePalette(); setTimeout(() => cmd.action(), 50); }
      });
    });
  }

  return {
    init, openPalette, closePalette, onPaletteInput,
    COMMANDS,
  };
})();
