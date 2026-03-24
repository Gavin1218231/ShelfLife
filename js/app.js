/**
 * App — Main application controller for Shelf Life.
 */
const App = (() => {
  // ===== State =====
  let viewMode = 'grid';

  // ===== Tab Navigation =====
  function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

    const tab = document.getElementById('tab-' + tabName);
    if (tab) tab.classList.add('active');

    const btn = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');

    // Refresh tab content
    if (tabName === 'dashboard') renderDashboard();
    if (tabName === 'weekly-summary') renderWeeklySummary();
    if (tabName === 'recipes') renderRecipes();
  }

  function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
  }

  // ===== Toast Notifications =====
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ===== Populate Dropdowns =====
  function populateDropdowns() {
    const defaultLocation = Config.getSetting('defaultLocation');
    const defaultUnit = Config.getSetting('defaultUnit');

    // Add item form
    document.getElementById('item-location').innerHTML = Config.getLocationOptions(defaultLocation);
    document.getElementById('item-category').innerHTML = Config.getCategoryOptions('dairy');
    document.getElementById('item-unit').innerHTML = Config.getUnitOptions(defaultUnit);

    // Edit modal
    document.getElementById('edit-location').innerHTML = Config.getLocationOptions();
    document.getElementById('edit-category').innerHTML = Config.getCategoryOptions();
    document.getElementById('edit-unit').innerHTML = Config.getUnitOptions();

    // Filter dropdowns
    const filterLocation = document.getElementById('filter-location');
    filterLocation.innerHTML = '<option value="all">All Locations</option>' +
      Object.entries(Config.LOCATIONS).map(([k, v]) =>
        `<option value="${k}">${v.label}</option>`).join('');

    const filterCategory = document.getElementById('filter-category');
    filterCategory.innerHTML = '<option value="all">All Categories</option>' +
      Object.entries(Config.CATEGORIES).map(([k, v]) =>
        `<option value="${k}">${v.label}</option>`).join('');

    // Settings dropdowns
    document.getElementById('setting-default-location').innerHTML = Config.getLocationOptions(defaultLocation);
    document.getElementById('setting-default-unit').innerHTML = Config.getUnitOptions(defaultUnit);
  }

  // ===== Dashboard Rendering =====
  function renderDashboard() {
    const items = Store.getAll();
    const stats = Store.getStats();
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const filterCat = document.getElementById('filter-category').value;
    const filterLoc = document.getElementById('filter-location').value;
    const sortBy = document.getElementById('sort-by').value;
    const showExpired = Config.getSetting('showExpiredItems');

    // Update stats
    document.querySelector('#stat-total .stat-num').textContent = stats.total;
    document.querySelector('#stat-fresh .stat-num').textContent = stats.fresh;
    document.querySelector('#stat-warning .stat-num').textContent = stats.warning;
    document.querySelector('#stat-danger .stat-num').textContent = stats.danger;
    document.querySelector('#stat-expired .stat-num').textContent = stats.expired;

    // Filter
    let filtered = items.filter(item => {
      if (!showExpired && Store.getStatus(item.expirationDate) === 'expired') return false;
      const matchesSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm) ||
        (item.notes && item.notes.toLowerCase().includes(searchTerm));
      const matchesCat = filterCat === 'all' || item.category === filterCat;
      const matchesLoc = filterLoc === 'all' || item.location === filterLoc;
      return matchesSearch && matchesCat && matchesLoc;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'expiration':
          return new Date(a.expirationDate) - new Date(b.expirationDate);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'location':
          return (a.location || '').localeCompare(b.location || '');
        case 'added':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'purchased':
          return new Date(b.purchaseDate || 0) - new Date(a.purchaseDate || 0);
        case 'quantity':
          return (b.quantity || 0) - (a.quantity || 0);
        default:
          return 0;
      }
    });

    const grid = document.getElementById('items-grid');
    grid.className = viewMode === 'list' ? 'items-list' : 'items-grid';

    if (filtered.length === 0) {
      if (items.length === 0) {
        grid.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">&#127858;</div>
            <h3>Your pantry is empty</h3>
            <p>Add items to start tracking expiration dates.</p>
            <button class="btn btn-primary" onclick="App.switchTab('add-item')">Add Your First Item</button>
          </div>`;
      } else {
        grid.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">&#128269;</div>
            <h3>No items match your filters</h3>
            <p>Try adjusting your search or filters.</p>
          </div>`;
      }
      return;
    }

    grid.innerHTML = filtered.map(item => renderItemCard(item)).join('');
  }

  function renderItemCard(item) {
    const status = Store.getStatus(item.expirationDate);
    const days = Store.daysUntilExpiration(item.expirationDate);
    let expiryText;

    if (days < 0) {
      expiryText = `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`;
    } else if (days === 0) {
      expiryText = 'Expires today!';
    } else if (days === 1) {
      expiryText = 'Expires tomorrow';
    } else {
      expiryText = `${days} days left`;
    }

    const categoryLabel = Config.getCategoryLabel(item.category);
    const locationLabel = Config.getLocationLabel(item.location);
    const unitAbbr = Config.getUnitAbbr(item.unit || 'pieces');
    const qtyDisplay = item.quantity !== 1 ? `${item.quantity} ${unitAbbr}` : '';

    if (viewMode === 'list') {
      return `
        <div class="item-row status-${status}" onclick="App.openEditModal('${item.id}')">
          <div class="item-row-name">${escapeHtml(item.name)}</div>
          <div class="item-row-meta">
            <span class="item-location-badge">${locationLabel}</span>
            <span class="item-category-badge">${categoryLabel}</span>
          </div>
          <div class="item-row-qty">${qtyDisplay}</div>
          <div class="item-row-expiry item-expiry-label">${expiryText}</div>
        </div>`;
    }

    return `
      <div class="item-card status-${status}" onclick="App.openEditModal('${item.id}')">
        <div class="item-card-header">
          <span class="item-name">${escapeHtml(item.name)}</span>
          <span class="item-category-badge">${categoryLabel}</span>
        </div>
        <div class="item-meta">
          <span class="item-location-badge">${locationLabel}</span>
          <span>Expires: ${formatDate(item.expirationDate)}</span>
          ${item.purchaseDate ? `<span>Purchased: ${formatDate(item.purchaseDate)}</span>` : ''}
          ${item.notes ? `<span>${escapeHtml(item.notes)}</span>` : ''}
        </div>
        ${qtyDisplay ? `<span class="item-quantity">${qtyDisplay}</span>` : ''}
        <div class="item-expiry-label">${expiryText}</div>
      </div>`;
  }

  // ===== View Mode Toggle =====
  function initViewToggle() {
    viewMode = Config.getSetting('viewMode');
    updateViewButtons();

    document.getElementById('btn-grid-view').addEventListener('click', () => {
      viewMode = 'grid';
      Config.setSetting('viewMode', 'grid');
      updateViewButtons();
      renderDashboard();
    });

    document.getElementById('btn-list-view').addEventListener('click', () => {
      viewMode = 'list';
      Config.setSetting('viewMode', 'list');
      updateViewButtons();
      renderDashboard();
    });
  }

  function updateViewButtons() {
    document.getElementById('btn-grid-view').classList.toggle('active', viewMode === 'grid');
    document.getElementById('btn-list-view').classList.toggle('active', viewMode === 'list');
  }

  // ===== Add Item Form =====
  function initAddItemForm() {
    const form = document.getElementById('add-item-form');

    function setDefaultDates() {
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('item-purchase-date').value = today;

      const defaultExp = new Date();
      defaultExp.setDate(defaultExp.getDate() + 7);
      document.getElementById('item-expiration-date').value = defaultExp.toISOString().split('T')[0];
    }

    setDefaultDates();

    document.getElementById('btn-add-item').addEventListener('click', () => {
      const name = document.getElementById('item-name').value;
      const location = document.getElementById('item-location').value;
      const category = document.getElementById('item-category').value;
      const quantity = document.getElementById('item-quantity').value;
      const unit = document.getElementById('item-unit').value;
      const price = document.getElementById('item-price').value;
      const purchaseDate = document.getElementById('item-purchase-date').value;
      const expirationDate = document.getElementById('item-expiration-date').value;
      const notes = document.getElementById('item-notes').value;

      if (!name.trim() || !expirationDate) {
        showToast('Please fill in the item name and expiration date.', 'error');
        return;
      }

      Store.addItem({ name, location, category, quantity, unit, price, purchaseDate, expirationDate, notes });
      showToast(`"${name}" added to your pantry!`, 'success');

      form.reset();
      setDefaultDates();
      document.getElementById('item-quantity').value = '1';
      document.getElementById('item-location').value = Config.getSetting('defaultLocation');
      document.getElementById('item-unit').value = Config.getSetting('defaultUnit');

      switchTab('dashboard');
    });
  }

  // ===== Edit Modal =====
  function openEditModal(id) {
    const item = Store.getById(id);
    if (!item) return;

    document.getElementById('edit-item-id').value = item.id;
    document.getElementById('edit-name').value = item.name;
    document.getElementById('edit-location').value = item.location || 'fridge';
    document.getElementById('edit-category').value = item.category || 'other';
    document.getElementById('edit-quantity').value = item.quantity || 1;
    document.getElementById('edit-unit').value = item.unit || 'pieces';
    document.getElementById('edit-price').value = item.price || '';
    document.getElementById('edit-purchase-date').value = item.purchaseDate || '';
    document.getElementById('edit-expiration-date').value = item.expirationDate;
    document.getElementById('edit-notes').value = item.notes || '';

    document.getElementById('edit-modal').classList.remove('hidden');
  }

  function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
  }

  function initEditModal() {
    document.getElementById('modal-close').addEventListener('click', closeEditModal);
    document.querySelector('#edit-modal .modal-backdrop').addEventListener('click', closeEditModal);

    document.getElementById('edit-item-form').addEventListener('submit', (e) => {
      e.preventDefault();

      const id = document.getElementById('edit-item-id').value;
      const updates = {
        name: document.getElementById('edit-name').value,
        location: document.getElementById('edit-location').value,
        category: document.getElementById('edit-category').value,
        quantity: parseFloat(document.getElementById('edit-quantity').value) || 1,
        unit: document.getElementById('edit-unit').value,
        price: document.getElementById('edit-price').value || null,
        purchaseDate: document.getElementById('edit-purchase-date').value || null,
        expirationDate: document.getElementById('edit-expiration-date').value,
        notes: document.getElementById('edit-notes').value,
      };

      Store.updateItem(id, updates);
      showToast('Item updated!', 'success');
      closeEditModal();
      renderDashboard();
    });

    document.getElementById('btn-delete-item').addEventListener('click', () => {
      const id = document.getElementById('edit-item-id').value;
      const item = Store.getById(id);
      if (item && confirm(`Delete "${item.name}" from your pantry?`)) {
        Store.deleteItem(id);
        showToast(`"${item.name}" removed.`, 'warning');
        closeEditModal();
        renderDashboard();
      }
    });
  }

  // ===== Barcode Scanner =====
  function initScanner() {
    const btnStart = document.getElementById('btn-start-scan');
    const btnStop = document.getElementById('btn-stop-scan');
    const overlay = document.getElementById('scanner-overlay');
    const resultDiv = document.getElementById('scanner-result');

    btnStart.addEventListener('click', () => {
      if (!Scanner.isAvailable()) {
        showToast('Camera or barcode library not available on this device.', 'error');
        return;
      }

      resultDiv.classList.add('hidden');
      resultDiv.classList.remove('error');
      btnStart.classList.add('hidden');
      btnStop.classList.remove('hidden');
      overlay.classList.remove('hidden');

      Scanner.start('scanner-viewport', (result) => {
        btnStop.classList.add('hidden');
        btnStart.classList.remove('hidden');
        overlay.classList.add('hidden');

        if (result.error) {
          resultDiv.textContent = result.error;
          resultDiv.classList.remove('hidden');
          resultDiv.classList.add('error');
        } else {
          document.getElementById('item-name').value = result.name;
          if (result.category) {
            document.getElementById('item-category').value = result.category;
          }
          if (result.location) {
            document.getElementById('item-location').value = result.location;
          }

          resultDiv.innerHTML = `
            <strong>Found:</strong> ${escapeHtml(result.name)}
            ${result.brand ? `<br><small>Brand: ${escapeHtml(result.brand)}</small>` : ''}
            <br><small>Barcode: ${result.barcode}</small>
          `;
          resultDiv.classList.remove('hidden', 'error');
          showToast(`Scanned: ${result.name}`, 'success');
        }
      });
    });

    btnStop.addEventListener('click', () => {
      Scanner.stop();
      btnStop.classList.add('hidden');
      btnStart.classList.remove('hidden');
      overlay.classList.add('hidden');
    });
  }

  // ===== Weekly Summary =====
  function renderWeeklySummary() {
    const groups = Store.getGroupedByExpirationDate(7);
    const container = document.getElementById('weekly-content');

    if (groups.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">&#127881;</div>
          <h3>Nothing expiring this week!</h3>
          <p>All your items are fresh. Check back later.</p>
        </div>`;
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let html = '<div class="weekly-timeline">';

    groups.forEach(([dateStr, items]) => {
      const date = new Date(dateStr + 'T00:00:00');
      const days = Store.daysUntilExpiration(dateStr);
      const isToday = dateStr === todayStr;
      const isOverdue = days < 0;

      let headerClass = '';
      let dotClass = 'dot-ok';
      let label = '';

      if (isOverdue) {
        headerClass = 'overdue';
        dotClass = 'dot-overdue';
        label = `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`;
      } else if (isToday) {
        headerClass = 'today';
        dotClass = 'dot-today';
        label = 'Today — Use these now!';
      } else if (days <= 2) {
        dotClass = 'dot-overdue';
        label = days === 1 ? 'Tomorrow' : `${dayNames[date.getDay()]} — ${days} days`;
      } else if (days <= 5) {
        dotClass = 'dot-soon';
        label = `${dayNames[date.getDay()]} — ${days} days`;
      } else {
        dotClass = 'dot-ok';
        label = `${dayNames[date.getDay()]} — ${days} days`;
      }

      const dateLabel = `${monthNames[date.getMonth()]} ${date.getDate()}`;

      html += `
        <div class="weekly-day">
          <div class="weekly-day-header ${headerClass}">
            <span class="day-dot ${dotClass}"></span>
            ${dateLabel} — ${label} (${items.length} item${items.length !== 1 ? 's' : ''})
          </div>
          <div class="weekly-day-items">
            ${items.map(item => `
              <div class="weekly-item" onclick="App.openEditModal('${item.id}')">
                <div>
                  <span class="weekly-item-name">${escapeHtml(item.name)}</span>
                  <span class="weekly-item-loc">${Config.getLocationLabel(item.location)}</span>
                </div>
                <span class="weekly-item-qty">${item.quantity > 1 ? item.quantity + ' ' + Config.getUnitAbbr(item.unit) : ''}</span>
              </div>
            `).join('')}
          </div>
        </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  // ===== Recipes =====
  let activeIngredients = [];

  async function renderRecipes() {
    const ingredients = Store.getExpiringIngredients(7);
    const chipsContainer = document.getElementById('recipe-ingredients');
    const recipesContainer = document.getElementById('recipes-content');

    if (ingredients.length === 0) {
      chipsContainer.innerHTML = '';
      recipesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">&#127859;</div>
          <h3>No expiring items to cook with</h3>
          <p>Add items with expiration dates to get recipe suggestions.</p>
        </div>`;
      return;
    }

    activeIngredients = activeIngredients.filter(ing => ingredients.includes(ing));
    if (activeIngredients.length === 0) {
      activeIngredients = [...ingredients];
    }

    chipsContainer.innerHTML = ingredients.map(ing => {
      const isActive = activeIngredients.includes(ing);
      const safeIng = escapeAttr(ing);
      return `<span class="ingredient-chip ${isActive ? 'active' : ''}"
                    data-ingredient="${safeIng}">${escapeHtml(ing)}</span>`;
    }).join('');

    chipsContainer.querySelectorAll('.ingredient-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        toggleIngredient(chip.dataset.ingredient);
      });
    });

    if (activeIngredients.length === 0) {
      recipesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">&#128073;</div>
          <h3>Select ingredients above</h3>
          <p>Click on ingredient chips to search for recipes.</p>
        </div>`;
      return;
    }

    recipesContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    const meals = await Recipes.searchMultipleIngredients(activeIngredients);

    if (meals.length === 0) {
      recipesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">&#128533;</div>
          <h3>No recipes found</h3>
          <p>Try selecting different ingredients.</p>
        </div>`;
      return;
    }

    recipesContainer.innerHTML = meals.slice(0, 12).map(meal => `
      <div class="recipe-card" onclick="App.openRecipeDetail('${meal.id}')">
        <img src="${meal.thumb}/preview" alt="${escapeHtml(meal.name)}" loading="lazy">
        <div class="recipe-card-body">
          <h4>${escapeHtml(meal.name)}</h4>
          <p>Uses: ${meal.matchedIngredients.map(i => escapeHtml(i)).join(', ')}</p>
          ${meal.matchedIngredients.length > 1
            ? `<span class="recipe-tag">${meal.matchedIngredients.length} matching ingredients</span>`
            : ''}
        </div>
      </div>
    `).join('');
  }

  function toggleIngredient(ingredient) {
    const idx = activeIngredients.indexOf(ingredient);
    if (idx >= 0) {
      activeIngredients.splice(idx, 1);
    } else {
      activeIngredients.push(ingredient);
    }
    renderRecipes();
  }

  async function openRecipeDetail(mealId) {
    const modal = document.getElementById('recipe-modal');
    const title = document.getElementById('recipe-modal-title');
    const body = document.getElementById('recipe-modal-body');

    title.textContent = 'Loading...';
    body.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    modal.classList.remove('hidden');

    const detail = await Recipes.getRecipeDetail(mealId);

    if (!detail) {
      title.textContent = 'Error';
      body.innerHTML = '<p>Could not load recipe details.</p>';
      return;
    }

    title.textContent = detail.name;
    body.innerHTML = `
      <img class="recipe-detail-img" src="${detail.thumb}" alt="${escapeHtml(detail.name)}">
      <div class="recipe-detail-meta">
        ${detail.category ? `<span>&#127860; ${escapeHtml(detail.category)}</span>` : ''}
        ${detail.area ? `<span>&#127758; ${escapeHtml(detail.area)}</span>` : ''}
        ${detail.tags.length ? `<span>&#127991; ${detail.tags.map(t => escapeHtml(t)).join(', ')}</span>` : ''}
      </div>
      <div class="recipe-detail-ingredients">
        <h4>Ingredients</h4>
        <ul>
          ${detail.ingredients.map(i => `<li>${escapeHtml(i.measure)} ${escapeHtml(i.ingredient)}</li>`).join('')}
        </ul>
      </div>
      <div class="recipe-detail-instructions">
        <h4>Instructions</h4>
        <p>${escapeHtml(detail.instructions).replace(/\n/g, '<br>')}</p>
      </div>
      ${detail.youtube ? `
        <a href="${detail.youtube}" target="_blank" rel="noopener" class="recipe-video-link">
          &#9654; Watch Video Tutorial
        </a>` : ''}
    `;
  }

  function closeRecipeModal() {
    document.getElementById('recipe-modal').classList.add('hidden');
  }

  function initRecipeModal() {
    document.getElementById('recipe-modal-close').addEventListener('click', closeRecipeModal);
    document.querySelector('#recipe-modal .modal-backdrop').addEventListener('click', closeRecipeModal);
  }

  // ===== Settings Modal =====
  function initSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const closeBtn = document.getElementById('settings-modal-close');

    document.getElementById('btn-settings').addEventListener('click', () => {
      loadSettingsUI();
      modal.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.classList.add('hidden'));

    // Theme toggle
    document.querySelectorAll('[data-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        setTheme(theme);
        document.querySelectorAll('[data-theme]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Settings changes
    document.getElementById('setting-view-mode').addEventListener('change', e => {
      Config.setSetting('viewMode', e.target.value);
      viewMode = e.target.value;
      updateViewButtons();
      renderDashboard();
    });

    document.getElementById('setting-compact-view').addEventListener('change', e => {
      Config.setSetting('compactView', e.target.checked);
      document.body.classList.toggle('compact-view', e.target.checked);
    });

    document.getElementById('setting-default-location').addEventListener('change', e => {
      Config.setSetting('defaultLocation', e.target.value);
    });

    document.getElementById('setting-default-unit').addEventListener('change', e => {
      Config.setSetting('defaultUnit', e.target.value);
    });

    document.getElementById('setting-notify-days').addEventListener('change', e => {
      Config.setSetting('notifyDaysBefore', parseInt(e.target.value, 10));
    });

    document.getElementById('setting-show-expired').addEventListener('change', e => {
      Config.setSetting('showExpiredItems', e.target.checked);
      renderDashboard();
    });

    // Export buttons
    document.getElementById('btn-export-json').addEventListener('click', () => {
      downloadFile('shelflife-export.json', Store.exportJSON(), 'application/json');
      showToast('Data exported as JSON', 'success');
    });

    document.getElementById('btn-export-csv').addEventListener('click', () => {
      downloadFile('shelflife-export.csv', Store.exportCSV(), 'text/csv');
      showToast('Data exported as CSV', 'success');
    });

    // Import
    const fileInput = document.getElementById('file-import');
    document.getElementById('btn-import').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        let count = 0;
        if (file.name.endsWith('.json')) {
          count = Store.importJSON(text);
        } else if (file.name.endsWith('.csv')) {
          count = Store.importCSV(text);
        } else {
          throw new Error('Unsupported file type');
        }
        showToast(`Imported ${count} items`, 'success');
        renderDashboard();
      } catch (err) {
        showToast('Import failed: ' + err.message, 'error');
      }
      fileInput.value = '';
    });

    // Clear all data
    document.getElementById('btn-clear-data').addEventListener('click', () => {
      if (confirm('Delete ALL pantry items? This cannot be undone.')) {
        Store.deleteAll();
        showToast('All data cleared', 'warning');
        renderDashboard();
      }
    });
  }

  function loadSettingsUI() {
    const settings = Config.loadSettings();
    document.querySelectorAll('[data-theme]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === settings.theme);
    });
    document.getElementById('setting-view-mode').value = settings.viewMode;
    document.getElementById('setting-compact-view').checked = settings.compactView;
    document.getElementById('setting-default-location').value = settings.defaultLocation;
    document.getElementById('setting-default-unit').value = settings.defaultUnit;
    document.getElementById('setting-notify-days').value = settings.notifyDaysBefore;
    document.getElementById('setting-show-expired').checked = settings.showExpiredItems;
  }

  function setTheme(theme) {
    Config.setSetting('theme', theme);
    document.body.className = 'theme-' + theme;
    if (Config.getSetting('compactView')) {
      document.body.classList.add('compact-view');
    }
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ===== Keyboard Shortcuts =====
  function initKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeEditModal();
        closeRecipeModal();
        document.getElementById('settings-modal').classList.add('hidden');
      }
    });
  }

  // ===== Utility Functions =====
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  // ===== Dashboard filter listeners =====
  function initDashboardFilters() {
    document.getElementById('search-input').addEventListener('input', renderDashboard);
    document.getElementById('filter-category').addEventListener('change', renderDashboard);
    document.getElementById('filter-location').addEventListener('change', renderDashboard);
    document.getElementById('sort-by').addEventListener('change', renderDashboard);
  }

  // ===== Initialize App =====
  function init() {
    // Apply saved theme
    const theme = Config.getSetting('theme');
    document.body.className = 'theme-' + theme;
    if (Config.getSetting('compactView')) {
      document.body.classList.add('compact-view');
    }

    populateDropdowns();
    initNavigation();
    initViewToggle();
    initAddItemForm();
    initEditModal();
    initRecipeModal();
    initSettingsModal();
    initScanner();
    initKeyboard();
    initDashboardFilters();
    renderDashboard();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    switchTab,
    openEditModal,
    openRecipeDetail,
    showToast,
  };
})();
