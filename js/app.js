/**
 * App — Main application controller for Shelf Life.
 */
const App = (() => {
  let viewMode = 'grid';
  let currentWeekStart = null;
  let activeIngredients = [];

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
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

  // Only allow http(s) URLs; strips javascript:, data:, vbscript:, etc.
  function safeUrl(u) {
    return (typeof u === 'string' && /^https?:\/\//i.test(u)) ? u : '';
  }

  function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    const tab = document.getElementById('tab-' + tabName);
    if (tab) tab.classList.add('active');
    const btn = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');
    if (tabName === 'dashboard') renderDashboard();
    if (tabName === 'shopping') renderShoppingList();
    if (tabName === 'meal-plan') renderMealPlan();
    if (tabName === 'weekly-summary') renderWeeklySummary();
    if (tabName === 'recipes') renderRecipes();
    if (tabName === 'analytics') renderAnalytics();
  }

  function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
  }

  function populateDropdowns() {
    const defaultLocation = Config.getSetting('defaultLocation');
    const defaultUnit = Config.getSetting('defaultUnit');
    document.getElementById('item-location').innerHTML = Config.getLocationOptions(defaultLocation);
    document.getElementById('item-category').innerHTML = Config.getCategoryOptions('dairy');
    document.getElementById('item-unit').innerHTML = Config.getUnitOptions(defaultUnit);
    document.getElementById('edit-location').innerHTML = Config.getLocationOptions();
    document.getElementById('edit-category').innerHTML = Config.getCategoryOptions();
    document.getElementById('edit-unit').innerHTML = Config.getUnitOptions();
    const filterLocation = document.getElementById('filter-location');
    filterLocation.innerHTML = '<option value="all">All Locations</option>' +
      Object.entries(Config.LOCATIONS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
    const filterCategory = document.getElementById('filter-category');
    filterCategory.innerHTML = '<option value="all">All Categories</option>' +
      Object.entries(Config.CATEGORIES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
    document.getElementById('setting-default-location').innerHTML = Config.getLocationOptions(defaultLocation);
    document.getElementById('setting-default-unit').innerHTML = Config.getUnitOptions(defaultUnit);
    renderTagSelectors();
  }

  function renderTagSelectors() {
    const html = Nutrition.DIETARY_TAGS.map(tag =>
      `<button type="button" class="tag-chip" data-tag="${tag}">${tag}</button>`).join('');
    const itemTags = document.getElementById('item-tags');
    const editTags = document.getElementById('edit-tags');
    if (itemTags) itemTags.innerHTML = html;
    if (editTags) editTags.innerHTML = html;
  }

  function renderDashboard() {
    const items = Store.getAll();
    const stats = Store.getStats();
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const filterCat = document.getElementById('filter-category').value;
    const filterLoc = document.getElementById('filter-location').value;
    const filterStatus = document.getElementById('filter-status').value;
    const sortBy = document.getElementById('sort-by').value;
    const showExpired = Config.getSetting('showExpiredItems');

    document.querySelector('#stat-total .stat-num').textContent = stats.total;
    document.querySelector('#stat-fresh .stat-num').textContent = stats.fresh;
    document.querySelector('#stat-warning .stat-num').textContent = stats.warning;
    document.querySelector('#stat-danger .stat-num').textContent = stats.danger;
    document.querySelector('#stat-expired .stat-num').textContent = stats.expired;

    renderWidgets();
    renderFrequentItemsBar();

    let filtered = items.filter(item => {
      if (!showExpired && Store.getStatus(item.expirationDate) === 'expired') return false;
      const matchesSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm) ||
        (item.notes && item.notes.toLowerCase().includes(searchTerm)) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(searchTerm)));
      const matchesCat = filterCat === 'all' || item.category === filterCat;
      const matchesLoc = filterLoc === 'all' || item.location === filterLoc;
      const matchesStatus = filterStatus === 'all' || Store.getStatus(item.expirationDate) === filterStatus;
      return matchesSearch && matchesCat && matchesLoc && matchesStatus;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'expiration': return new Date(a.expirationDate) - new Date(b.expirationDate);
        case 'name': return a.name.localeCompare(b.name);
        case 'category': return (a.category || '').localeCompare(b.category || '');
        case 'location': return (a.location || '').localeCompare(b.location || '');
        case 'added': return new Date(b.createdAt) - new Date(a.createdAt);
        case 'purchased': return new Date(b.purchaseDate || 0) - new Date(a.purchaseDate || 0);
        case 'quantity': return (b.quantity || 0) - (a.quantity || 0);
        case 'value': return ((b.price || 0) * (b.quantity || 1)) - ((a.price || 0) * (a.quantity || 1));
        default: return 0;
      }
    });

    const grid = document.getElementById('items-grid');
    grid.className = viewMode === 'list' ? 'items-list' : 'items-grid';

    if (filtered.length === 0) {
      if (items.length === 0) {
        grid.innerHTML = `<div class="empty-state">
          <div class="empty-icon">&#127858;</div>
          <h3>Your pantry is empty</h3>
          <p>Add items to start tracking expiration dates.</p>
          <button class="btn btn-primary" onclick="App.switchTab('add-item')">Add Your First Item</button>
          <button class="btn btn-secondary" id="btn-load-sample-inner">Load Sample Data</button>
        </div>`;
        const sampleBtn = document.getElementById('btn-load-sample-inner');
        if (sampleBtn) sampleBtn.addEventListener('click', loadSampleData);
      } else {
        grid.innerHTML = `<div class="empty-state">
          <div class="empty-icon">&#128269;</div>
          <h3>No items match your filters</h3>
          <p>Try adjusting your search or filters.</p>
        </div>`;
      }
      return;
    }

    grid.innerHTML = filtered.map(item => renderItemCard(item)).join('');
    attachItemEvents();
  }

  function renderWidgets() {
    const container = document.getElementById('dashboard-widgets');
    if (!container) return;
    if (!Config.getSetting('showWidgets')) { container.innerHTML = ''; return; }
    container.innerHTML = Widgets.renderAll();
    container.querySelectorAll('.widget-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Widgets.removeWidget(btn.dataset.widgetId);
        renderWidgets();
      });
    });
    container.querySelectorAll('[data-frequent]').forEach(btn => {
      btn.addEventListener('click', () => quickAddFrequent(btn.dataset.frequent));
    });
  }

  function renderFrequentItemsBar() {
    const bar = document.getElementById('frequent-items-bar');
    if (!bar) return;
    const items = ShelfLifeDB.getFrequentItems(6);
    if (items.length === 0) { bar.innerHTML = ''; return; }
    bar.innerHTML = '<span class="frequent-label">Quick add:</span>' +
      items.map(i => `<button class="frequent-chip" data-frequent="${escapeAttr(i.name)}">+ ${escapeHtml(i.name)}</button>`).join('');
    bar.querySelectorAll('[data-frequent]').forEach(btn => {
      btn.addEventListener('click', () => quickAddFrequent(btn.dataset.frequent));
    });
  }

  function quickAddFrequent(name) {
    const entry = ShelfLifeDB.lookup(name) || {};
    const exp = ShelfLifeDB.autoFillExpiration(name, entry.category);
    Store.addItem({
      name,
      category: entry.category || 'other',
      location: entry.location || 'fridge',
      unit: entry.unit || 'pieces',
      quantity: 1,
      expirationDate: exp,
      purchaseDate: new Date().toISOString().split('T')[0],
    });
    ShelfLifeDB.recordUsage(name, entry.category, entry.location, entry.unit);
    Achievements.recordEvent('item_added');
    showToast(`Added ${name}`, 'success');
    renderDashboard();
  }

  function renderItemCard(item) {
    const status = Store.getStatus(item.expirationDate);
    const days = Store.daysUntilExpiration(item.expirationDate);
    let expiryText = days < 0 ? `Expired ${Math.abs(days)}d ago` :
      days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `${days} days`;
    // Config label getters fall back to the raw key, and imported items may
    // carry arbitrary keys, so escape these before they reach innerHTML.
    const categoryLabel = escapeHtml(Config.getCategoryLabel(item.category));
    const locationLabel = escapeHtml(Config.getLocationLabel(item.location));
    const unitAbbr = escapeHtml(Config.getUnitAbbr(item.unit || 'pieces'));
    const itemId = escapeAttr(item.id);
    const qtyDisplay = item.quantity !== 1 ? `${escapeHtml(item.quantity)} ${unitAbbr}` : '';
    const isLowStock = item.lowStockThreshold && item.quantity <= item.lowStockThreshold;
    const isBulk = BulkOps.isBulkMode();
    const isSelected = isBulk && BulkOps.isSelected(item.id);
    const tagsHtml = (item.tags || []).slice(0, 3).map(t =>
      `<span class="item-mini-tag">${escapeHtml(t)}</span>`).join('');
    const checkbox = isBulk ?
      `<input type="checkbox" class="bulk-checkbox" data-id="${itemId}" ${isSelected ? 'checked' : ''}>` : '';
    const quickActions = !isBulk ? `<div class="item-quick-actions">
      <button class="quick-btn quick-use" data-action="use" data-id="${itemId}" title="Mark as Used">✓</button>
      <button class="quick-btn quick-waste" data-action="waste" data-id="${itemId}" title="Throw Away">🗑</button>
    </div>` : '';

    if (viewMode === 'list') {
      return `<div class="item-row status-${status} ${isSelected ? 'selected' : ''}" data-id="${itemId}">
        ${checkbox}
        <div class="item-row-name">${escapeHtml(item.name)} ${isLowStock ? '<span class="low-stock-badge">low</span>' : ''}</div>
        <div class="item-row-meta">
          <span class="item-location-badge">${locationLabel}</span>
          <span class="item-category-badge">${categoryLabel}</span>
          ${tagsHtml}
        </div>
        <div class="item-row-qty">${qtyDisplay}</div>
        <div class="item-row-expiry item-expiry-label">${expiryText}</div>
        ${quickActions}
      </div>`;
    }
    return `<div class="item-card status-${status} ${isSelected ? 'selected' : ''}" data-id="${itemId}">
      ${checkbox}
      <div class="item-card-header">
        <span class="item-name">${escapeHtml(item.name)} ${isLowStock ? '<span class="low-stock-badge">low</span>' : ''}</span>
        <span class="item-category-badge">${categoryLabel}</span>
      </div>
      <div class="item-meta">
        <span class="item-location-badge">${locationLabel}</span>
        <span>Expires: ${formatDate(item.expirationDate)}</span>
        ${item.openedDate ? `<span>Opened: ${formatDate(item.openedDate)}</span>` : ''}
        ${tagsHtml ? `<div class="item-tags-row">${tagsHtml}</div>` : ''}
        ${item.notes ? `<span class="item-notes">${escapeHtml(item.notes)}</span>` : ''}
      </div>
      ${qtyDisplay ? `<span class="item-quantity">${qtyDisplay}</span>` : ''}
      <div class="item-expiry-label">${expiryText}</div>
      ${quickActions}
    </div>`;
  }

  function attachItemEvents() {
    document.querySelectorAll('.item-card, .item-row').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.quick-btn') || e.target.closest('.bulk-checkbox')) return;
        if (BulkOps.isBulkMode()) {
          const id = el.dataset.id;
          BulkOps.toggleSelection(id);
          updateBulkBar();
          el.classList.toggle('selected');
          const cb = el.querySelector('.bulk-checkbox');
          if (cb) cb.checked = BulkOps.isSelected(id);
        } else {
          openEditModal(el.dataset.id);
        }
      });
    });
    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const item = Store.getById(id);
        if (!item) return;
        if (action === 'use') {
          Analytics.logDisposal(item, 'used');
          ShelfLifeDB.recordUsage(item.name, item.category, item.location, item.unit);
          Achievements.recordEvent('item_used');
          Achievements.updateChallenge('use_5');
          Store.deleteItem(id);
          showToast(`Marked "${item.name}" as used`, 'success');
        } else if (action === 'waste') {
          if (confirm(`Throw away "${item.name}"?`)) {
            Analytics.logDisposal(item, 'wasted');
            Achievements.recordEvent('item_wasted');
            Store.deleteItem(id);
            showToast(`Threw away "${item.name}"`, 'warning');
          }
        }
        renderDashboard();
        checkAndCelebrate();
      });
    });
    document.querySelectorAll('.bulk-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        BulkOps.toggleSelection(cb.dataset.id);
        updateBulkBar();
        const card = cb.closest('.item-card, .item-row');
        if (card) card.classList.toggle('selected', cb.checked);
      });
    });
  }

  function initViewToggle() {
    viewMode = Config.getSetting('viewMode');
    updateViewButtons();
    document.getElementById('btn-grid-view').addEventListener('click', () => setViewMode('grid'));
    document.getElementById('btn-list-view').addEventListener('click', () => setViewMode('list'));
  }

  function setViewMode(mode) {
    viewMode = mode;
    Config.setSetting('viewMode', mode);
    updateViewButtons();
    renderDashboard();
  }

  function updateViewButtons() {
    document.getElementById('btn-grid-view').classList.toggle('active', viewMode === 'grid');
    document.getElementById('btn-list-view').classList.toggle('active', viewMode === 'list');
  }

  function initAddItemForm() {
    function setDefaultDates() {
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('item-purchase-date').value = today;
      const defaultExp = new Date();
      defaultExp.setDate(defaultExp.getDate() + 7);
      document.getElementById('item-expiration-date').value = defaultExp.toISOString().split('T')[0];
    }
    setDefaultDates();
    const nameInput = document.getElementById('item-name');
    const suggestionsDiv = document.getElementById('name-suggestions');
    nameInput.addEventListener('input', () => {
      const suggestions = ShelfLifeDB.getSuggestions(nameInput.value);
      if (suggestions.length === 0) { suggestionsDiv.classList.add('hidden'); return; }
      suggestionsDiv.innerHTML = suggestions.map(s => `<div class="suggestion-item" data-name="${escapeAttr(s)}">${escapeHtml(s)}</div>`).join('');
      suggestionsDiv.classList.remove('hidden');
      suggestionsDiv.querySelectorAll('.suggestion-item').forEach(el => {
        el.addEventListener('click', () => {
          nameInput.value = el.dataset.name;
          applyAutoFill(el.dataset.name);
          suggestionsDiv.classList.add('hidden');
        });
      });
    });
    nameInput.addEventListener('blur', () => setTimeout(() => suggestionsDiv.classList.add('hidden'), 200));
    document.getElementById('btn-auto-expiration').addEventListener('click', () => applyAutoFill(nameInput.value));
    document.getElementById('item-tags').addEventListener('click', (e) => {
      if (e.target.classList.contains('tag-chip')) e.target.classList.toggle('active');
    });
    document.getElementById('btn-add-item').addEventListener('click', () => {
      const name = document.getElementById('item-name').value;
      const expirationDate = document.getElementById('item-expiration-date').value;
      if (!name.trim() || !expirationDate) {
        showToast('Please fill in name and expiration date.', 'error');
        return;
      }
      const tags = Array.from(document.querySelectorAll('#item-tags .tag-chip.active')).map(c => c.dataset.tag);
      const data = {
        name,
        category: document.getElementById('item-category').value,
        location: document.getElementById('item-location').value,
        quantity: document.getElementById('item-quantity').value,
        unit: document.getElementById('item-unit').value,
        price: document.getElementById('item-price').value,
        purchaseDate: document.getElementById('item-purchase-date').value,
        expirationDate,
        notes: document.getElementById('item-notes').value,
        openedDate: document.getElementById('item-opened-date').value || null,
        lowStockThreshold: document.getElementById('item-low-stock').value || null,
        origin: document.getElementById('item-origin').value || null,
        tags,
      };
      const item = Store.addItem(data);
      if (item.price) Budget.recordPrice(item.name, item.price);
      ShelfLifeDB.recordUsage(item.name, item.category, item.location, item.unit);
      Achievements.recordEvent('item_added');
      showToast(`"${name}" added!`, 'success');
      document.getElementById('add-item-form').reset();
      setDefaultDates();
      document.getElementById('item-quantity').value = '1';
      document.getElementById('item-location').value = Config.getSetting('defaultLocation');
      document.getElementById('item-unit').value = Config.getSetting('defaultUnit');
      switchTab('dashboard');
      checkAndCelebrate();
    });
  }

  function applyAutoFill(name) {
    const entry = ShelfLifeDB.lookup(name);
    if (entry) {
      document.getElementById('item-category').value = entry.category;
      document.getElementById('item-location').value = entry.location;
      document.getElementById('item-unit').value = entry.unit;
    }
    const purchaseDate = document.getElementById('item-purchase-date').value;
    const exp = ShelfLifeDB.autoFillExpiration(name, document.getElementById('item-category').value, purchaseDate);
    if (exp) document.getElementById('item-expiration-date').value = exp;
    showToast('Auto-filled from database', 'info');
  }

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
    document.getElementById('edit-opened-date').value = item.openedDate || '';
    document.getElementById('edit-notes').value = item.notes || '';
    document.querySelectorAll('#edit-tags .tag-chip').forEach(c => {
      c.classList.toggle('active', (item.tags || []).includes(c.dataset.tag));
    });
    document.getElementById('edit-modal').classList.remove('hidden');
  }

  function closeEditModal() { document.getElementById('edit-modal').classList.add('hidden'); }

  function initEditModal() {
    document.getElementById('modal-close').addEventListener('click', closeEditModal);
    document.querySelector('#edit-modal .modal-backdrop').addEventListener('click', closeEditModal);
    document.getElementById('edit-tags').addEventListener('click', (e) => {
      if (e.target.classList.contains('tag-chip')) e.target.classList.toggle('active');
    });
    document.getElementById('edit-item-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-item-id').value;
      const tags = Array.from(document.querySelectorAll('#edit-tags .tag-chip.active')).map(c => c.dataset.tag);
      Store.updateItem(id, {
        name: document.getElementById('edit-name').value,
        location: document.getElementById('edit-location').value,
        category: document.getElementById('edit-category').value,
        quantity: parseFloat(document.getElementById('edit-quantity').value) || 1,
        unit: document.getElementById('edit-unit').value,
        price: document.getElementById('edit-price').value || null,
        purchaseDate: document.getElementById('edit-purchase-date').value || null,
        expirationDate: document.getElementById('edit-expiration-date').value,
        openedDate: document.getElementById('edit-opened-date').value || null,
        notes: document.getElementById('edit-notes').value,
        tags,
      });
      showToast('Item updated!', 'success');
      closeEditModal();
      renderDashboard();
    });
    document.getElementById('btn-delete-item').addEventListener('click', () => {
      const id = document.getElementById('edit-item-id').value;
      const item = Store.getById(id);
      if (item && confirm(`Delete "${item.name}"?`)) {
        Store.deleteItem(id);
        showToast(`"${item.name}" removed.`, 'warning');
        closeEditModal();
        renderDashboard();
      }
    });
    document.getElementById('btn-mark-used').addEventListener('click', () => {
      const id = document.getElementById('edit-item-id').value;
      const item = Store.getById(id);
      if (item) {
        Analytics.logDisposal(item, 'used');
        ShelfLifeDB.recordUsage(item.name, item.category, item.location, item.unit);
        Achievements.recordEvent('item_used');
        Store.deleteItem(id);
        showToast(`Marked as used`, 'success');
        closeEditModal();
        renderDashboard();
        checkAndCelebrate();
      }
    });
    document.getElementById('btn-mark-wasted').addEventListener('click', () => {
      const id = document.getElementById('edit-item-id').value;
      const item = Store.getById(id);
      if (item && confirm(`Throw away "${item.name}"?`)) {
        Analytics.logDisposal(item, 'wasted');
        Achievements.recordEvent('item_wasted');
        Store.deleteItem(id);
        showToast(`Thrown away`, 'warning');
        closeEditModal();
        renderDashboard();
      }
    });
  }

  function initBulkMode() {
    document.getElementById('btn-bulk-mode').addEventListener('click', () => {
      BulkOps.toggle();
      updateBulkBar();
      renderDashboard();
    });
    document.getElementById('bulk-cancel').addEventListener('click', () => {
      BulkOps.disable();
      updateBulkBar();
      renderDashboard();
    });
    document.getElementById('bulk-select-all').addEventListener('change', (e) => {
      if (e.target.checked) BulkOps.selectAll(Store.getAll());
      else BulkOps.clearSelection();
      updateBulkBar();
      renderDashboard();
    });
    document.getElementById('bulk-mark-used').addEventListener('click', () => {
      const count = BulkOps.bulkMarkUsed();
      showToast(`${count} items marked as used`, 'success');
      renderDashboard(); updateBulkBar();
    });
    document.getElementById('bulk-mark-wasted').addEventListener('click', () => {
      if (confirm(`Throw away ${BulkOps.getCount()} items?`)) {
        const count = BulkOps.bulkMarkWasted();
        showToast(`${count} items thrown away`, 'warning');
        renderDashboard(); updateBulkBar();
      }
    });
    document.getElementById('bulk-to-shopping').addEventListener('click', () => {
      const count = BulkOps.bulkAddToShopping();
      showToast(`${count} added to shopping list`, 'success');
      updateBulkBar();
    });
    document.getElementById('bulk-delete').addEventListener('click', () => {
      if (confirm(`Delete ${BulkOps.getCount()} items?`)) {
        const count = BulkOps.bulkDelete();
        showToast(`${count} deleted`, 'warning');
        renderDashboard(); updateBulkBar();
      }
    });
  }

  function updateBulkBar() {
    const bar = document.getElementById('bulk-mode-bar');
    if (BulkOps.isBulkMode()) {
      bar.classList.remove('hidden');
      document.getElementById('bulk-count').textContent = `${BulkOps.getCount()} selected`;
    } else {
      bar.classList.add('hidden');
    }
  }

  function initScanner() {
    const btnStart = document.getElementById('btn-start-scan');
    const btnStop = document.getElementById('btn-stop-scan');
    const overlay = document.getElementById('scanner-overlay');
    const resultDiv = document.getElementById('scanner-result');
    btnStart.addEventListener('click', () => {
      if (!Scanner.isAvailable()) {
        showToast('Camera not available.', 'error');
        return;
      }
      resultDiv.classList.add('hidden');
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
          if (result.category) document.getElementById('item-category').value = result.category;
          if (result.location) document.getElementById('item-location').value = result.location;
          applyAutoFill(result.name);
          resultDiv.innerHTML = `<strong>Found:</strong> ${escapeHtml(result.name)}<br><small>Barcode: ${result.barcode}</small>`;
          resultDiv.classList.remove('hidden', 'error');
          Achievements.recordEvent('scan_used');
          Achievements.updateChallenge('scan_10');
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

  function renderShoppingList() {
    const items = Shopping.getAll();
    const container = document.getElementById('shopping-list-container');
    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🛒</div>
        <h3>Shopping list is empty</h3>
        <p>Add items manually or use the buttons above.</p>
      </div>`;
      return;
    }
    const grouped = Shopping.getGroupedByCategory();
    let html = '';
    Object.entries(grouped).forEach(([cat, catItems]) => {
      html += `<div class="shopping-group">
        <h3 class="shopping-group-header">${escapeHtml(Config.getCategoryLabel(cat))}</h3>
        <div class="shopping-items">`;
      catItems.forEach(item => {
        html += `<div class="shopping-item ${item.checked ? 'checked' : ''}" data-id="${escapeAttr(item.id)}">
          <input type="checkbox" class="shopping-check" ${item.checked ? 'checked' : ''}>
          <span class="shopping-name">${escapeHtml(item.name)}</span>
          <span class="shopping-qty">${item.quantity > 1 ? escapeHtml(item.quantity + ' ' + Config.getUnitAbbr(item.unit)) : ''}</span>
          <button class="shopping-purchase" title="Add to pantry">🥕</button>
          <button class="shopping-delete" title="Remove">×</button>
        </div>`;
      });
      html += '</div></div>';
    });
    container.innerHTML = html;
    container.querySelectorAll('.shopping-check').forEach(cb => {
      cb.addEventListener('change', () => {
        Shopping.toggleChecked(cb.closest('.shopping-item').dataset.id);
        renderShoppingList();
      });
    });
    container.querySelectorAll('.shopping-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        Shopping.deleteItem(btn.closest('.shopping-item').dataset.id);
        renderShoppingList();
      });
    });
    container.querySelectorAll('.shopping-purchase').forEach(btn => {
      btn.addEventListener('click', () => {
        Shopping.purchaseItem(btn.closest('.shopping-item').dataset.id);
        showToast('Added to pantry!', 'success');
        renderShoppingList();
      });
    });
  }

  function initShoppingList() {
    document.getElementById('btn-shopping-add').addEventListener('click', () => {
      const name = document.getElementById('shopping-input').value.trim();
      const qty = parseFloat(document.getElementById('shopping-qty').value) || 1;
      if (!name) return;
      const entry = ShelfLifeDB.lookup(name);
      Shopping.addItem({
        name, quantity: qty,
        category: entry ? entry.category : 'other',
        unit: entry ? entry.unit : 'pieces',
      });
      document.getElementById('shopping-input').value = '';
      document.getElementById('shopping-qty').value = '1';
      renderShoppingList();
    });
    document.getElementById('shopping-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-shopping-add').click();
    });
    document.getElementById('btn-add-low-stock').addEventListener('click', () => {
      const count = Shopping.addFromLowStock();
      showToast(`${count} low-stock items added`, count > 0 ? 'success' : 'info');
      renderShoppingList();
    });
    document.getElementById('btn-add-expired').addEventListener('click', () => {
      const count = Shopping.addFromExpired();
      showToast(`${count} expired items added`, count > 0 ? 'success' : 'info');
      renderShoppingList();
    });
    document.getElementById('btn-add-buy-again').addEventListener('click', () => {
      const count = Shopping.addFromBuyAgain();
      showToast(`${count} buy-again items added`, count > 0 ? 'success' : 'info');
      renderShoppingList();
    });
    document.getElementById('btn-clear-checked').addEventListener('click', () => {
      const count = Shopping.clearChecked();
      if (count > 0) {
        Achievements.recordEvent('shopping_completed');
        Achievements.updateChallenge('shop_smart');
      }
      showToast(`${count} cleared`, 'success');
      renderShoppingList();
      checkAndCelebrate();
    });
    document.getElementById('btn-share-list').addEventListener('click', () => {
      const text = Shopping.exportAsText();
      if (navigator.share) navigator.share({ title: 'Shopping List', text }).catch(() => {});
      else navigator.clipboard.writeText(text).then(() => showToast('Copied!', 'success'));
    });
  }

  function renderMealPlan() {
    if (!currentWeekStart) currentWeekStart = MealPlan.getWeekStart();
    const week = MealPlan.getWeek(currentWeekStart);
    const startDate = new Date(currentWeekStart);
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    document.getElementById('mealplan-week-label').textContent =
      `${monthNames[startDate.getMonth()]} ${startDate.getDate()} - ${monthNames[endDate.getMonth()]} ${endDate.getDate()}`;
    const suggestions = MealPlan.getSuggestedItems().slice(0, 8);
    const suggestHtml = suggestions.length === 0 ? '' :
      `<div class="suggestions-row">
        <span class="suggestions-label">🔥 Expiring soon (drag to plan):</span>
        ${suggestions.map(item => {
          const days = Store.daysUntilExpiration(item.expirationDate);
          return `<div class="suggestion-item-pill" draggable="true" data-item-id="${item.id}" data-item-name="${escapeAttr(item.name)}">
            ${escapeHtml(item.name)} <small>(${days}d)</small>
          </div>`;
        }).join('')}
      </div>`;
    document.getElementById('mealplan-suggestions').innerHTML = suggestHtml;
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let html = '<div class="mealplan-grid">';
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dayData = week[i] || { breakfast: [], lunch: [], dinner: [] };
      html += `<div class="mealplan-day">
        <div class="mealplan-day-header">${days[i]} ${date.getDate()}</div>
        ${['breakfast','lunch','dinner'].map(meal => `
          <div class="mealplan-slot" data-day="${i}" data-meal="${meal}">
            <div class="mealplan-meal-label">${meal[0].toUpperCase() + meal.slice(1)}</div>
            ${dayData[meal].map(s => `
              <div class="mealplan-item" data-slot-id="${s.id}">
                ${escapeHtml(s.name)}
                <button class="mealplan-item-remove" data-slot-id="${s.id}" data-day="${i}" data-meal="${meal}">×</button>
              </div>`).join('')}
            <button class="mealplan-add-btn" data-day="${i}" data-meal="${meal}">+ Add</button>
          </div>
        `).join('')}
      </div>`;
    }
    html += '</div>';
    document.getElementById('mealplan-calendar').innerHTML = html;
    attachMealPlanEvents();
  }

  function attachMealPlanEvents() {
    document.querySelectorAll('.suggestion-item-pill').forEach(el => {
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
          name: el.dataset.itemName, itemId: el.dataset.itemId,
        }));
      });
    });
    document.querySelectorAll('.mealplan-slot').forEach(slot => {
      slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('drag-over'); });
      slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        try {
          const data = JSON.parse(e.dataTransfer.getData('text/plain'));
          MealPlan.addMealSlot(currentWeekStart, parseInt(slot.dataset.day), slot.dataset.meal, {
            type: 'item', itemId: data.itemId, name: data.name,
          });
          Achievements.recordEvent('meal_planned');
          Achievements.updateChallenge('plan_7_meals');
          renderMealPlan();
        } catch {}
      });
    });
    document.querySelectorAll('.mealplan-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = prompt('What meal?');
        if (!name) return;
        MealPlan.addMealSlot(currentWeekStart, parseInt(btn.dataset.day), btn.dataset.meal, {
          type: 'custom', name,
        });
        Achievements.recordEvent('meal_planned');
        renderMealPlan();
      });
    });
    document.querySelectorAll('.mealplan-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        MealPlan.removeMealSlot(currentWeekStart, parseInt(btn.dataset.day), btn.dataset.meal, btn.dataset.slotId);
        renderMealPlan();
      });
    });
  }

  function initMealPlan() {
    document.getElementById('btn-prev-week').addEventListener('click', () => {
      currentWeekStart = MealPlan.getPrevWeekStart(currentWeekStart);
      renderMealPlan();
    });
    document.getElementById('btn-next-week').addEventListener('click', () => {
      currentWeekStart = MealPlan.getNextWeekStart(currentWeekStart);
      renderMealPlan();
    });
    document.getElementById('btn-mealplan-clear').addEventListener('click', () => {
      if (confirm('Clear this week?')) {
        MealPlan.clearWeek(currentWeekStart);
        renderMealPlan();
      }
    });
    document.getElementById('btn-mealplan-shopping').addEventListener('click', () => {
      const gaps = MealPlan.getShoppingListGaps(currentWeekStart);
      gaps.forEach(name => Shopping.addItem({ name, source: 'meal_plan' }));
      showToast(`${gaps.length} items added to shopping list`, 'success');
    });
  }

  function renderWeeklySummary() {
    const groups = Store.getGroupedByExpirationDate(7);
    const container = document.getElementById('weekly-content');
    if (groups.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">&#127881;</div>
        <h3>Nothing expiring this week!</h3>
      </div>`;
      return;
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let html = '<div class="weekly-timeline">';
    groups.forEach(([dateStr, items]) => {
      const date = new Date(dateStr + 'T00:00:00');
      const days = Store.daysUntilExpiration(dateStr);
      const isToday = dateStr === todayStr;
      const isOverdue = days < 0;
      let headerClass = '', dotClass = 'dot-ok', label = '';
      if (isOverdue) { headerClass = 'overdue'; dotClass = 'dot-overdue'; label = `Expired ${Math.abs(days)}d ago`; }
      else if (isToday) { headerClass = 'today'; dotClass = 'dot-today'; label = 'Today!'; }
      else if (days <= 2) { dotClass = 'dot-overdue'; label = days === 1 ? 'Tomorrow' : `${dayNames[date.getDay()]}`; }
      else if (days <= 5) { dotClass = 'dot-soon'; label = `${dayNames[date.getDay()]}`; }
      else { label = `${dayNames[date.getDay()]}`; }
      const dateLabel = `${monthNames[date.getMonth()]} ${date.getDate()}`;
      html += `<div class="weekly-day">
        <div class="weekly-day-header ${headerClass}">
          <span class="day-dot ${dotClass}"></span>
          ${dateLabel} — ${label} (${items.length})
        </div>
        <div class="weekly-day-items">
          ${items.map(item => `<div class="weekly-item" data-id="${escapeAttr(item.id)}">
            <div><span class="weekly-item-name">${escapeHtml(item.name)}</span>
              <span class="weekly-item-loc">${escapeHtml(Config.getLocationLabel(item.location))}</span></div>
            <span class="weekly-item-qty">${item.quantity > 1 ? escapeHtml(item.quantity + ' ' + Config.getUnitAbbr(item.unit)) : ''}</span>
          </div>`).join('')}
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
    container.querySelectorAll('.weekly-item').forEach(el => {
      el.addEventListener('click', () => openEditModal(el.dataset.id));
    });
  }

  function initWeeklyActions() {
    document.getElementById('btn-weekly-calendar').addEventListener('click', () => {
      if (CalendarExport.exportExpiringWeek()) showToast('Calendar downloaded', 'success');
      else showToast('No items to export', 'info');
    });
    document.getElementById('btn-weekly-print').addEventListener('click', () => {
      Reports.printReport(Reports.generateWeeklySummary());
    });
  }

  async function renderRecipes() {
    const ingredients = Store.getExpiringIngredients(7);
    const chipsContainer = document.getElementById('recipe-ingredients');
    const recipesContainer = document.getElementById('recipes-content');
    if (ingredients.length === 0) {
      chipsContainer.innerHTML = '';
      recipesContainer.innerHTML = `<div class="empty-state">
        <div class="empty-icon">&#127859;</div>
        <h3>No expiring items to cook with</h3>
      </div>`;
      return;
    }
    activeIngredients = activeIngredients.filter(ing => ingredients.includes(ing));
    if (activeIngredients.length === 0) activeIngredients = [...ingredients];
    chipsContainer.innerHTML = ingredients.map(ing => {
      const isActive = activeIngredients.includes(ing);
      return `<span class="ingredient-chip ${isActive ? 'active' : ''}" data-ingredient="${escapeAttr(ing)}">${escapeHtml(ing)}</span>`;
    }).join('');
    chipsContainer.querySelectorAll('.ingredient-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const ing = chip.dataset.ingredient;
        const idx = activeIngredients.indexOf(ing);
        if (idx >= 0) activeIngredients.splice(idx, 1);
        else activeIngredients.push(ing);
        renderRecipes();
      });
    });
    if (activeIngredients.length === 0) {
      recipesContainer.innerHTML = `<div class="empty-state"><div class="empty-icon">&#128073;</div><h3>Select ingredients</h3></div>`;
      return;
    }
    recipesContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    const meals = await Recipes.searchMultipleIngredients(activeIngredients);
    if (meals.length === 0) {
      recipesContainer.innerHTML = `<div class="empty-state"><div class="empty-icon">&#128533;</div><h3>No recipes found</h3></div>`;
      return;
    }
    recipesContainer.innerHTML = meals.slice(0, 12).map(meal => {
      const thumb = safeUrl(meal.thumb);
      const previewSrc = thumb ? escapeAttr(thumb + '/preview') : '';
      return `
      <div class="recipe-card" data-meal-id="${escapeAttr(meal.id)}">
        <img src="${previewSrc}" alt="${escapeHtml(meal.name)}" loading="lazy">
        <div class="recipe-card-body">
          <h4>${escapeHtml(meal.name)}</h4>
          <p>Uses: ${meal.matchedIngredients.map(i => escapeHtml(i)).join(', ')}</p>
        </div>
      </div>`;
    }).join('');
    document.querySelectorAll('.recipe-card').forEach(card => {
      card.addEventListener('click', () => openRecipeDetail(card.dataset.mealId));
    });
  }

  async function openRecipeDetail(mealId) {
    const modal = document.getElementById('recipe-modal');
    const title = document.getElementById('recipe-modal-title');
    const body = document.getElementById('recipe-modal-body');
    title.textContent = 'Loading...';
    body.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    modal.classList.remove('hidden');
    const detail = await Recipes.getRecipeDetail(mealId);
    if (!detail) { title.textContent = 'Error'; body.innerHTML = '<p>Could not load.</p>'; return; }
    Achievements.recordEvent('recipe_viewed');
    title.textContent = detail.name;
    const thumbSrc = safeUrl(detail.thumb);
    const ytUrl = safeUrl(detail.youtube);
    body.innerHTML = `<img class="recipe-detail-img" src="${escapeAttr(thumbSrc)}" alt="${escapeHtml(detail.name)}">
      <div class="recipe-detail-meta">
        ${detail.category ? `<span>&#127860; ${escapeHtml(detail.category)}</span>` : ''}
        ${detail.area ? `<span>&#127758; ${escapeHtml(detail.area)}</span>` : ''}
      </div>
      <div class="recipe-detail-ingredients"><h4>Ingredients</h4><ul>
        ${detail.ingredients.map(i => `<li>${escapeHtml(i.measure)} ${escapeHtml(i.ingredient)}</li>`).join('')}
      </ul></div>
      <div class="recipe-detail-instructions"><h4>Instructions</h4>
        <p>${escapeHtml(detail.instructions).replace(/\n/g, '<br>')}</p>
      </div>
      ${ytUrl ? `<a href="${escapeAttr(ytUrl)}" target="_blank" rel="noopener noreferrer" class="recipe-video-link">&#9654; Watch Video</a>` : ''}`;
  }

  function initRecipeModal() {
    document.getElementById('recipe-modal-close').addEventListener('click', () => {
      document.getElementById('recipe-modal').classList.add('hidden');
    });
    document.querySelector('#recipe-modal .modal-backdrop').addEventListener('click', () => {
      document.getElementById('recipe-modal').classList.add('hidden');
    });
  }

  function renderAnalytics() {
    const period = document.getElementById('analytics-period').value;
    const container = document.getElementById('analytics-content');
    const score = Achievements.getInventoryHealthScore();
    const wasteScore = Analytics.getWasteReductionScore();
    const moneySaved = Analytics.getMoneySaved(period);
    const moneyWasted = Analytics.getMoneyWasted(period);
    const mostWasted = Analytics.getMostWastedCategories(5);
    const buyAgain = Analytics.getBuyAgainSuggestions().slice(0, 5);
    const carbon = Sustainability.getTotalCarbonFootprint();
    const ecoScore = Sustainability.getEcoScore();
    const carbonSaved = Sustainability.getCarbonSavedByUsing();
    const budgetStatus = Budget.getBudgetStatus();
    const challenges = Achievements.getActiveChallenges();

    let html = `<div class="analytics-grid">
      <div class="analytics-card">
        <h3>Pantry Health</h3>
        <div class="score-big" style="color: ${score >= 75 ? 'var(--color-fresh)' : score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'}">${score}</div>
        <p>Inventory freshness score</p>
      </div>
      <div class="analytics-card">
        <h3>Waste Reduction</h3>
        <div class="score-big" style="color: ${wasteScore >= 75 ? 'var(--color-fresh)' : 'var(--color-warning)'}">${wasteScore}%</div>
        <p>${wasteScore >= 75 ? 'Great job!' : 'Room to improve'}</p>
      </div>
      <div class="analytics-card">
        <h3>💰 Money Saved</h3>
        <div class="score-big" style="color: var(--color-fresh)">$${moneySaved.toFixed(2)}</div>
        <p>By using before expiration</p>
      </div>
      <div class="analytics-card">
        <h3>💸 Money Wasted</h3>
        <div class="score-big" style="color: var(--color-danger)">$${moneyWasted.toFixed(2)}</div>
        <p>Lost to expiration</p>
      </div>
      <div class="analytics-card">
        <h3>🌍 Carbon Footprint</h3>
        <div class="score-big" style="color: var(--color-accent)">${carbon.toFixed(1)} <small>kg</small></div>
        <p>Grade: <strong>${ecoScore.grade}</strong> | Saved ${carbonSaved.toFixed(1)} kg</p>
      </div>`;
    if (budgetStatus) {
      html += `<div class="analytics-card">
        <h3>💵 Budget</h3>
        <div class="score-big">$${budgetStatus.spent.toFixed(2)}<small>/$${budgetStatus.budget.toFixed(2)}</small></div>
        <div class="widget-progress"><div class="widget-progress-fill widget-progress-${budgetStatus.alertLevel}" style="width: ${budgetStatus.pct}%"></div></div>
        <p>${budgetStatus.overBudget ? 'Over budget!' : '$' + budgetStatus.remaining.toFixed(2) + ' left'}</p>
      </div>`;
    }
    html += `</div>`;
    if (mostWasted.length > 0) {
      const max = Math.max(...mostWasted.map(([, c]) => c));
      html += `<div class="analytics-section">
        <h3>Most Wasted Categories</h3>
        <div class="bar-chart">
          ${mostWasted.map(([cat, count]) => `
            <div class="bar-chart-row">
              <span class="bar-chart-label">${escapeHtml(Config.getCategoryLabel(cat))}</span>
              <div class="bar-chart-bar" style="width: ${(count / max) * 100}%"></div>
              <span class="bar-chart-value">${count}</span>
            </div>`).join('')}
        </div>
      </div>`;
    }
    if (buyAgain.length > 0) {
      html += `<div class="analytics-section">
        <h3>🛒 Buy Again Suggestions</h3>
        <div class="buy-again-list">
          ${buyAgain.map(b => `<div class="buy-again-item">
            <span>${escapeHtml(b.name)}</span>
            <span class="buy-again-count">used ${b.count}×</span>
            <button class="btn btn-sm btn-secondary" data-add-shop="${escapeAttr(b.name)}">+ List</button>
          </div>`).join('')}
        </div>
      </div>`;
    }
    if (challenges.challenges && challenges.challenges.length > 0) {
      html += `<div class="analytics-section">
        <h3>🎯 Weekly Challenges</h3>
        <div class="challenges-grid">
          ${challenges.challenges.map(c => {
            const pct = (c.progress / c.target) * 100;
            return `<div class="challenge-card ${c.completed ? 'completed' : ''}">
              <div class="challenge-icon">${c.icon}</div>
              <div class="challenge-info">
                <h4>${escapeHtml(c.name)}</h4>
                <p>${escapeHtml(c.desc)}</p>
                <div class="widget-progress"><div class="widget-progress-fill" style="width: ${pct}%"></div></div>
                <small>${c.progress}/${c.target} ${c.completed ? '✓' : ''} +${c.xp} XP</small>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }
    if (Config.getSetting('seasonalSuggestions')) {
      const seasonal = Sustainability.getSuggestedSeasonalItems().slice(0, 8);
      if (seasonal.length > 0) {
        html += `<div class="analytics-section">
          <h3>🍂 In Season Now</h3>
          <p>These seasonal items would be great to add:</p>
          <div class="seasonal-chips">
            ${seasonal.map(s => `<span class="seasonal-chip">${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>`;
      }
    }
    container.innerHTML = html;
    container.querySelectorAll('[data-add-shop]').forEach(btn => {
      btn.addEventListener('click', () => {
        Shopping.addItem({ name: btn.dataset.addShop, source: 'restock' });
        showToast('Added', 'success');
      });
    });
  }

  function initAnalytics() {
    document.getElementById('analytics-period').addEventListener('change', renderAnalytics);
  }

  function initSettings() {
    const modal = document.getElementById('settings-modal');
    document.getElementById('btn-settings').addEventListener('click', () => {
      loadSettingsUI();
      modal.classList.remove('hidden');
    });
    document.getElementById('settings-modal-close').addEventListener('click', () => modal.classList.add('hidden'));
    modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.classList.add('hidden'));
    document.querySelectorAll('[data-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        setTheme(btn.dataset.theme);
        document.querySelectorAll('[data-theme]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    document.getElementById('setting-view-mode').addEventListener('change', e => {
      Config.setSetting('viewMode', e.target.value); viewMode = e.target.value;
      updateViewButtons(); renderDashboard();
    });
    document.getElementById('setting-compact-view').addEventListener('change', e => {
      Config.setSetting('compactView', e.target.checked);
      document.body.classList.toggle('compact-view', e.target.checked);
    });
    document.getElementById('setting-show-widgets').addEventListener('change', e => {
      Config.setSetting('showWidgets', e.target.checked); renderDashboard();
    });
    document.getElementById('setting-default-location').addEventListener('change', e =>
      Config.setSetting('defaultLocation', e.target.value));
    document.getElementById('setting-default-unit').addEventListener('change', e =>
      Config.setSetting('defaultUnit', e.target.value));
    document.getElementById('setting-auto-expiration').addEventListener('change', e =>
      Config.setSetting('autoFillExpiration', e.target.checked));
    document.getElementById('setting-notifications-enabled').addEventListener('change', async e => {
      if (e.target.checked) {
        const perm = await Notifications.requestPermission();
        if (perm !== 'granted') { e.target.checked = false; showToast('Permission denied', 'error'); return; }
        Notifications.scheduleDaily();
      } else Notifications.cancelSchedule();
      Config.setSetting('notificationsEnabled', e.target.checked);
    });
    document.getElementById('setting-notification-time').addEventListener('change', e => {
      Config.setSetting('notificationTime', e.target.value);
      if (Config.getSetting('notificationsEnabled')) Notifications.scheduleDaily();
    });
    document.getElementById('setting-notify-days').addEventListener('change', e =>
      Config.setSetting('notifyDaysBefore', parseInt(e.target.value, 10)));
    document.getElementById('setting-show-expired').addEventListener('change', e => {
      Config.setSetting('showExpiredItems', e.target.checked); renderDashboard();
    });
    document.getElementById('setting-monthly-budget').addEventListener('change', e => {
      Budget.setMonthlyBudget(e.target.value);
      Config.setSetting('monthlyBudget', parseFloat(e.target.value));
    });
    document.getElementById('setting-budget-alerts').addEventListener('change', e => {
      Config.setSetting('budgetAlerts', e.target.checked); Budget.setAlertsEnabled(e.target.checked);
    });
    document.getElementById('setting-show-carbon').addEventListener('change', e =>
      Config.setSetting('showCarbonFootprint', e.target.checked));
    document.getElementById('setting-seasonal').addEventListener('change', e =>
      Config.setSetting('seasonalSuggestions', e.target.checked));
    document.getElementById('setting-show-achievements').addEventListener('change', e =>
      Config.setSetting('showAchievements', e.target.checked));
    document.getElementById('setting-celebrations').addEventListener('change', e =>
      Config.setSetting('celebrationsEnabled', e.target.checked));
    document.getElementById('btn-print-inventory').addEventListener('click', () =>
      Reports.printReport(Reports.generateInventoryReport()));
    document.getElementById('btn-print-weekly').addEventListener('click', () =>
      Reports.printReport(Reports.generateWeeklySummary()));
    document.getElementById('btn-print-value').addEventListener('click', () =>
      Reports.printReport(Reports.generateValueReport()));
    document.getElementById('btn-export-ical-week').addEventListener('click', () => {
      if (CalendarExport.exportExpiringWeek()) showToast('Calendar exported', 'success');
      else showToast('No items', 'info');
    });
    document.getElementById('btn-export-ical-all').addEventListener('click', () => {
      if (CalendarExport.exportAll()) showToast('Calendar exported', 'success');
      else showToast('No items', 'info');
    });
    document.getElementById('btn-export-json').addEventListener('click', () => {
      downloadFile('shelflife-export.json', Store.exportJSON(), 'application/json');
      showToast('JSON exported', 'success');
    });
    document.getElementById('btn-export-csv').addEventListener('click', () => {
      downloadFile('shelflife-export.csv', Store.exportCSV(), 'text/csv');
      showToast('CSV exported', 'success');
    });
    const fileInput = document.getElementById('file-import');
    document.getElementById('btn-import').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const text = await file.text();
        let count = 0;
        if (file.name.endsWith('.json')) count = Store.importJSON(text);
        else if (file.name.endsWith('.csv')) count = Store.importCSV(text);
        else throw new Error('Unsupported');
        showToast(`Imported ${count}`, 'success');
        renderDashboard();
      } catch (err) { showToast('Import failed: ' + err.message, 'error'); }
      fileInput.value = '';
    });
    document.getElementById('btn-reset-tutorial').addEventListener('click', () => {
      Onboarding.reset();
      showToast('Reload to see tutorial', 'info');
    });
    document.getElementById('btn-clear-data').addEventListener('click', () => {
      if (confirm('Delete ALL items?')) {
        Store.deleteAll(); showToast('Cleared', 'warning'); renderDashboard();
      }
    });
  }

  function loadSettingsUI() {
    const s = Config.loadSettings();
    document.querySelectorAll('[data-theme]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === s.theme);
    });
    document.getElementById('setting-view-mode').value = s.viewMode;
    document.getElementById('setting-compact-view').checked = s.compactView;
    document.getElementById('setting-show-widgets').checked = s.showWidgets !== false;
    document.getElementById('setting-default-location').value = s.defaultLocation;
    document.getElementById('setting-default-unit').value = s.defaultUnit;
    document.getElementById('setting-auto-expiration').checked = s.autoFillExpiration !== false;
    document.getElementById('setting-notifications-enabled').checked = s.notificationsEnabled === true;
    document.getElementById('setting-notification-time').value = s.notificationTime || '09:00';
    document.getElementById('setting-notify-days').value = s.notifyDaysBefore;
    document.getElementById('setting-show-expired').checked = s.showExpiredItems;
    document.getElementById('setting-monthly-budget').value = s.monthlyBudget || 0;
    document.getElementById('setting-budget-alerts').checked = s.budgetAlerts === true;
    document.getElementById('setting-show-carbon').checked = s.showCarbonFootprint !== false;
    document.getElementById('setting-seasonal').checked = s.seasonalSuggestions !== false;
    document.getElementById('setting-show-achievements').checked = s.showAchievements !== false;
    document.getElementById('setting-celebrations').checked = s.celebrationsEnabled !== false;
  }

  function setTheme(theme) {
    Config.setSetting('theme', theme);
    document.body.className = 'theme-' + theme;
    if (Config.getSetting('compactView')) document.body.classList.add('compact-view');
  }

  function openAchievements() {
    const modal = document.getElementById('achievements-modal');
    const body = document.getElementById('achievements-body');
    const state = Achievements.loadState();
    const all = Achievements.getAll();
    const level = Achievements.getLevel();
    const xpToNext = Achievements.getXpToNextLevel();
    const challenges = Achievements.getActiveChallenges();
    let html = `<div class="achievements-summary">
      <div class="ach-summary-card">
        <div class="ach-summary-num">${state.currentStreak}</div>
        <div class="ach-summary-label">🔥 Streak</div>
      </div>
      <div class="ach-summary-card">
        <div class="ach-summary-num">${state.longestStreak}</div>
        <div class="ach-summary-label">🏅 Best</div>
      </div>
      <div class="ach-summary-card">
        <div class="ach-summary-num">Lv. ${level}</div>
        <div class="ach-summary-label">${state.totalXp} XP (${xpToNext} to next)</div>
      </div>
    </div>`;
    html += `<h4>🎯 This Week's Challenges</h4><div class="challenges-grid">`;
    challenges.challenges.forEach(c => {
      const pct = (c.progress / c.target) * 100;
      html += `<div class="challenge-card ${c.completed ? 'completed' : ''}">
        <div class="challenge-icon">${c.icon}</div>
        <div class="challenge-info">
          <h4>${escapeHtml(c.name)}</h4>
          <small>${escapeHtml(c.desc)}</small>
          <div class="widget-progress"><div class="widget-progress-fill" style="width: ${pct}%"></div></div>
          <small>${c.progress}/${c.target}</small>
        </div>
      </div>`;
    });
    html += `</div><h4>🏆 Achievements</h4><div class="achievements-grid">`;
    all.forEach(a => {
      html += `<div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon">${a.icon}</div>
        <div class="achievement-name">${escapeHtml(a.name)}</div>
        <div class="achievement-desc">${escapeHtml(a.desc)}</div>
        <div class="achievement-xp">+${a.xp} XP</div>
      </div>`;
    });
    html += '</div>';
    body.innerHTML = html;
    modal.classList.remove('hidden');
  }

  function initAchievements() {
    document.getElementById('btn-achievements').addEventListener('click', openAchievements);
    document.getElementById('achievements-modal-close').addEventListener('click', () =>
      document.getElementById('achievements-modal').classList.add('hidden'));
    document.querySelector('#achievements-modal .modal-backdrop').addEventListener('click', () =>
      document.getElementById('achievements-modal').classList.add('hidden'));
  }

  function checkAndCelebrate() {
    // Catch unlocks derived purely from store state, then drain everything
    // queued (including unlocks already detected inside recordEvent).
    Achievements.checkAchievements();
    const newly = Achievements.drainCelebrations();
    if (!Config.getSetting('celebrationsEnabled') || newly.length === 0) return;
    newly.forEach((a, i) => setTimeout(() => showCelebration(a), i * 3000));
  }

  function showCelebration(achievement) {
    const overlay = document.getElementById('celebration-overlay');
    document.getElementById('celebration-icon').textContent = achievement.icon;
    document.getElementById('celebration-title').textContent = achievement.name;
    document.getElementById('celebration-desc').textContent = achievement.desc;
    document.getElementById('celebration-xp').textContent = `+${achievement.xp} XP!`;
    overlay.classList.remove('hidden');
    createConfetti();
    setTimeout(() => overlay.classList.add('hidden'), 2500);
  }

  function createConfetti() {
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';
    const colors = ['#6c63ff', '#00c9a7', '#f59e0b', '#22c55e', '#ef4444'];
    for (let i = 0; i < 50; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = Math.random() * 0.5 + 's';
      piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
      container.appendChild(piece);
    }
  }

  function openProfiles() {
    const modal = document.getElementById('profile-modal');
    const body = document.getElementById('profile-body');
    const profiles = Profiles.getAll();
    const active = Profiles.getActive();
    document.getElementById('btn-profile').textContent = active.avatar;
    let html = '<div class="profiles-list">';
    profiles.forEach(p => {
      html += `<div class="profile-item ${p.id === active.id ? 'active' : ''}" data-id="${escapeAttr(p.id)}">
        <span class="profile-avatar" style="background: ${escapeAttr(p.color)}">${escapeHtml(p.avatar)}</span>
        <span class="profile-name">${escapeHtml(p.name)}</span>
        ${p.id === active.id ? '<span class="profile-active-tag">Active</span>' : '<button class="btn btn-sm btn-secondary profile-switch">Switch</button>'}
        ${profiles.length > 1 && p.id !== 'default' ? '<button class="btn btn-sm btn-danger profile-delete">×</button>' : ''}
      </div>`;
    });
    html += '</div><div class="profile-create"><h4>Create New Profile</h4>';
    html += `<input type="text" id="new-profile-name" placeholder="Profile name">
      <div class="profile-avatar-picker">
        ${['🏠','👤','👨','👩','👶','🐶','🐱','🌱'].map(a =>
          `<button class="avatar-option" data-avatar="${a}">${a}</button>`).join('')}
      </div>
      <button class="btn btn-primary" id="btn-create-profile">Create</button></div>`;
    body.innerHTML = html;
    modal.classList.remove('hidden');
    let selectedAvatar = '🏠';
    document.querySelectorAll('.avatar-option').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedAvatar = btn.dataset.avatar;
        document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    document.getElementById('btn-create-profile').addEventListener('click', () => {
      const name = document.getElementById('new-profile-name').value.trim();
      if (!name) { showToast('Name required', 'error'); return; }
      Profiles.create(name, selectedAvatar);
      showToast('Profile created!', 'success');
      openProfiles();
    });
    document.querySelectorAll('.profile-switch').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.profile-item').dataset.id;
        Profiles.switchProfile(id);
        showToast('Switched', 'success');
        modal.classList.add('hidden');
        renderDashboard();
        document.getElementById('btn-profile').textContent = Profiles.getActive().avatar;
      });
    });
    document.querySelectorAll('.profile-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.profile-item').dataset.id;
        if (confirm('Delete this profile and all items?')) {
          Profiles.deleteProfile(id);
          openProfiles();
        }
      });
    });
  }

  function initProfiles() {
    document.getElementById('btn-profile').addEventListener('click', openProfiles);
    document.getElementById('profile-modal-close').addEventListener('click', () =>
      document.getElementById('profile-modal').classList.add('hidden'));
    document.querySelector('#profile-modal .modal-backdrop').addEventListener('click', () =>
      document.getElementById('profile-modal').classList.add('hidden'));
  }

  function openVoiceModal() {
    if (!Voice.isSupported()) { showToast('Voice not supported', 'error'); return; }
    document.getElementById('voice-modal').classList.remove('hidden');
    document.getElementById('voice-transcript').textContent = '';
    document.getElementById('voice-status').textContent = 'Click the microphone to start';
  }

  function startVoiceListening() {
    const status = document.getElementById('voice-status');
    const btn = document.getElementById('btn-voice-listen');
    btn.classList.add('listening');
    status.textContent = '🎤 Listening...';
    Voice.listen(
      (text) => {
        btn.classList.remove('listening');
        document.getElementById('voice-transcript').textContent = text;
        const parsed = Voice.parseCommand(text);
        if (parsed.error) { status.textContent = parsed.error; showToast(parsed.error, 'error'); return; }
        if (!parsed.name) { status.textContent = 'Could not understand name'; return; }
        const exp = parsed.expirationDate || ShelfLifeDB.autoFillExpiration(parsed.name, 'other');
        const entry = ShelfLifeDB.lookup(parsed.name);
        Store.addItem({
          name: parsed.name, quantity: parsed.quantity, unit: parsed.unit,
          location: parsed.location || (entry ? entry.location : 'fridge'),
          category: entry ? entry.category : 'other',
          expirationDate: exp,
          purchaseDate: new Date().toISOString().split('T')[0],
        });
        Achievements.recordEvent('item_added');
        ShelfLifeDB.recordUsage(parsed.name);
        Voice.speak(`Added ${parsed.name}`);
        status.textContent = `✓ Added: ${parsed.name}`;
        showToast(`Added ${parsed.name}`, 'success');
        setTimeout(() => {
          document.getElementById('voice-modal').classList.add('hidden');
          switchTab('dashboard');
        }, 1500);
      },
      (err) => {
        btn.classList.remove('listening');
        status.textContent = 'Error: ' + err;
        showToast('Voice error: ' + err, 'error');
      }
    );
  }

  function initVoice() {
    document.getElementById('btn-voice').addEventListener('click', openVoiceModal);
    document.getElementById('btn-voice-add').addEventListener('click', openVoiceModal);
    document.getElementById('voice-modal-close').addEventListener('click', () => {
      Voice.stop();
      document.getElementById('voice-modal').classList.add('hidden');
    });
    document.querySelector('#voice-modal .modal-backdrop').addEventListener('click', () => {
      Voice.stop();
      document.getElementById('voice-modal').classList.add('hidden');
    });
    document.getElementById('btn-voice-listen').addEventListener('click', startVoiceListening);
  }

  function openBatchModal() {
    document.getElementById('batch-modal').classList.remove('hidden');
    const templates = BatchImport.getBuiltInTemplates();
    let html = '<div class="batch-templates-grid">';
    Object.entries(templates).forEach(([id, t]) => {
      html += `<div class="batch-template-card" data-template-id="${id}">
        <div class="batch-template-icon">${t.icon}</div>
        <div class="batch-template-name">${escapeHtml(t.name)}</div>
        <div class="batch-template-count">${t.items.length} items</div>
        <button class="btn btn-sm btn-primary batch-apply">Apply</button>
      </div>`;
    });
    html += '</div>';
    document.getElementById('batch-templates').innerHTML = html;
    document.querySelectorAll('.batch-apply').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.batch-template-card').dataset.templateId;
        const count = BatchImport.applyTemplate(id);
        showToast(`Added ${count} items`, 'success');
        document.getElementById('batch-modal').classList.add('hidden');
        switchTab('dashboard');
      });
    });
  }

  function initBatch() {
    document.getElementById('btn-batch-import').addEventListener('click', openBatchModal);
    document.getElementById('batch-modal-close').addEventListener('click', () =>
      document.getElementById('batch-modal').classList.add('hidden'));
    document.querySelector('#batch-modal .modal-backdrop').addEventListener('click', () =>
      document.getElementById('batch-modal').classList.add('hidden'));
    document.querySelectorAll('.batch-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.batch-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.batch-section').forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('batch-' + tab.dataset.batchTab).classList.add('active');
      });
    });
    document.getElementById('btn-batch-parse').addEventListener('click', () => {
      const text = document.getElementById('batch-text').value;
      const items = BatchImport.parseText(text);
      if (items.length === 0) { showToast('No items found', 'error'); return; }
      const count = BatchImport.importItems(items);
      showToast(`Imported ${count}`, 'success');
      document.getElementById('batch-modal').classList.add('hidden');
      switchTab('dashboard');
    });
  }

  function initCommandPalette() {
    Keyboard.init();
    document.getElementById('palette-input').addEventListener('input', (e) => {
      Keyboard.onPaletteInput(e.target.value);
    });
    document.querySelector('#command-palette .modal-backdrop').addEventListener('click', () =>
      Keyboard.closePalette());
  }

  function showKeyboardHelp() {
    document.getElementById('keyboard-help-modal').classList.remove('hidden');
  }

  function initKeyboardHelp() {
    document.getElementById('keyboard-help-close').addEventListener('click', () =>
      document.getElementById('keyboard-help-modal').classList.add('hidden'));
    document.querySelector('#keyboard-help-modal .modal-backdrop').addEventListener('click', () =>
      document.getElementById('keyboard-help-modal').classList.add('hidden'));
  }

  function openWidgetConfig() {
    const body = document.getElementById('widget-body');
    const layout = Widgets.loadLayout();
    const available = Widgets.getAvailableWidgets();
    let html = '<h4>Active Widgets</h4><div class="widget-list">';
    layout.forEach(id => {
      const def = Widgets.WIDGET_DEFS[id];
      if (!def) return;
      html += `<div class="widget-config-row">
        <span>${def.icon} ${def.name}</span>
        <button class="btn btn-sm" data-move-up="${id}">↑</button>
        <button class="btn btn-sm" data-move-down="${id}">↓</button>
        <button class="btn btn-sm btn-danger" data-remove-widget="${id}">×</button>
      </div>`;
    });
    html += '</div>';
    if (available.length > 0) {
      html += '<h4>Available Widgets</h4><div class="widget-list">';
      available.forEach(w => {
        html += `<div class="widget-config-row">
          <span>${w.icon} ${w.name}</span>
          <button class="btn btn-sm btn-primary" data-add-widget="${w.id}">Add</button>
        </div>`;
      });
      html += '</div>';
    }
    body.innerHTML = html;
    document.getElementById('widget-modal').classList.remove('hidden');
    body.querySelectorAll('[data-add-widget]').forEach(b => b.addEventListener('click', () => {
      Widgets.addWidget(b.dataset.addWidget); openWidgetConfig(); renderDashboard();
    }));
    body.querySelectorAll('[data-remove-widget]').forEach(b => b.addEventListener('click', () => {
      Widgets.removeWidget(b.dataset.removeWidget); openWidgetConfig(); renderDashboard();
    }));
    body.querySelectorAll('[data-move-up]').forEach(b => b.addEventListener('click', () => {
      Widgets.moveWidget(b.dataset.moveUp, 'up'); openWidgetConfig(); renderDashboard();
    }));
    body.querySelectorAll('[data-move-down]').forEach(b => b.addEventListener('click', () => {
      Widgets.moveWidget(b.dataset.moveDown, 'down'); openWidgetConfig(); renderDashboard();
    }));
  }

  function initWidgetConfig() {
    document.getElementById('btn-widget-config').addEventListener('click', openWidgetConfig);
    document.getElementById('widget-modal-close').addEventListener('click', () =>
      document.getElementById('widget-modal').classList.add('hidden'));
    document.querySelector('#widget-modal .modal-backdrop').addEventListener('click', () =>
      document.getElementById('widget-modal').classList.add('hidden'));
  }

  function showOnboarding() {
    document.getElementById('onboarding-overlay').classList.remove('hidden');
    updateOnboardingDisplay();
  }

  function updateOnboardingDisplay() {
    const { step, index, total } = Onboarding.getCurrentStep();
    if (!step) return;
    document.getElementById('onboarding-step-num').textContent = index + 1;
    document.getElementById('onboarding-step-total').textContent = total;
    document.getElementById('onboarding-title').textContent = step.title;
    document.getElementById('onboarding-body').textContent = step.body;
  }

  function initOnboarding() {
    if (Onboarding.shouldShow()) showOnboarding();
    document.getElementById('onboarding-skip').addEventListener('click', () => {
      Onboarding.skip();
      document.getElementById('onboarding-overlay').classList.add('hidden');
    });
    document.getElementById('onboarding-next').addEventListener('click', () => {
      const next = Onboarding.nextStep();
      if (next.index >= next.total) {
        document.getElementById('onboarding-overlay').classList.add('hidden');
      } else {
        updateOnboardingDisplay();
      }
    });
  }

  function loadSampleData() {
    Onboarding.loadSampleData();
    showToast('Sample data loaded!', 'success');
    renderDashboard();
  }

  function initSampleData() {
    const btn = document.getElementById('btn-load-sample');
    if (btn) btn.addEventListener('click', loadSampleData);
  }

  function initNotificationBanner() {
    const banner = document.getElementById('notification-banner');
    if (Notifications.isSupported() && Notifications.getPermission() === 'default' &&
        !localStorage.getItem('shelflife_notif_dismissed')) {
      banner.classList.remove('hidden');
    }
    document.getElementById('btn-enable-notifications').addEventListener('click', async () => {
      const perm = await Notifications.requestPermission();
      if (perm === 'granted') {
        Config.setSetting('notificationsEnabled', true);
        Notifications.scheduleDaily();
        showToast('Notifications enabled', 'success');
      }
      banner.classList.add('hidden');
    });
    document.getElementById('btn-dismiss-notifications').addEventListener('click', () => {
      banner.classList.add('hidden');
      localStorage.setItem('shelflife_notif_dismissed', 'true');
    });
  }

  let deferredPrompt = null;
  function initPWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (!localStorage.getItem('shelflife_install_dismissed')) {
        document.getElementById('install-banner').classList.remove('hidden');
      }
    });
    document.getElementById('btn-install').addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
      }
      document.getElementById('install-banner').classList.add('hidden');
    });
    document.getElementById('btn-dismiss-install').addEventListener('click', () => {
      document.getElementById('install-banner').classList.add('hidden');
      localStorage.setItem('shelflife_install_dismissed', 'true');
    });
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      });
    }
  }

  function initDashboardFilters() {
    const searchInput = document.getElementById('search-input');
    let searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        if (searchInput.value.length >= 2) Search.addToHistory(searchInput.value);
        renderDashboard();
      }, 300);
    });
    document.getElementById('filter-category').addEventListener('change', renderDashboard);
    document.getElementById('filter-location').addEventListener('change', renderDashboard);
    document.getElementById('filter-status').addEventListener('change', renderDashboard);
    document.getElementById('sort-by').addEventListener('change', renderDashboard);
  }

  function exportData(format) {
    if (format === 'json') downloadFile('shelflife-export.json', Store.exportJSON(), 'application/json');
    else downloadFile('shelflife-export.csv', Store.exportCSV(), 'text/csv');
    showToast(`Exported as ${format.toUpperCase()}`, 'success');
  }

  function openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
    loadSettingsUI();
  }

  function refreshDashboard() { renderDashboard(); }
  function startVoiceInput() { openVoiceModal(); }

  function init() {
    Profiles.applyProfile();
    const theme = Config.getSetting('theme');
    document.body.className = 'theme-' + theme;
    if (Config.getSetting('compactView')) document.body.classList.add('compact-view');
    const active = Profiles.getActive();
    document.getElementById('btn-profile').textContent = active.avatar;
    populateDropdowns();
    initNavigation();
    initViewToggle();
    initBulkMode();
    initAddItemForm();
    initEditModal();
    initRecipeModal();
    initScanner();
    initShoppingList();
    initMealPlan();
    initWeeklyActions();
    initAnalytics();
    initSettings();
    initAchievements();
    initProfiles();
    initVoice();
    initBatch();
    initCommandPalette();
    initKeyboardHelp();
    initWidgetConfig();
    initOnboarding();
    initSampleData();
    initNotificationBanner();
    initPWA();
    initDashboardFilters();
    Achievements.recordCheckIn();
    Analytics.saveSnapshot();
    if (Config.getSetting('notificationsEnabled') && Notifications.isEnabled()) {
      Notifications.scheduleDaily();
    }
    renderDashboard();
    checkAndCelebrate();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    switchTab, setViewMode, setTheme,
    openEditModal, openRecipeDetail,
    openSettings, openAchievements, openProfiles,
    showToast, exportData, refreshDashboard,
    startVoiceInput, showKeyboardHelp,
  };
})();
