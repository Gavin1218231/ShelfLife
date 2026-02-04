/**
 * App — Main application controller for Shelf Life.
 */
const App = (() => {
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

  // ===== Dashboard Rendering =====
  function renderDashboard() {
    const items = Store.getAll();
    const stats = Store.getStats();
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const filterCat = document.getElementById('filter-category').value;
    const sortBy = document.getElementById('sort-by').value;

    // Update stats
    document.querySelector('#stat-total .stat-num').textContent = stats.total;
    document.querySelector('#stat-fresh .stat-num').textContent = stats.fresh;
    document.querySelector('#stat-warning .stat-num').textContent = stats.warning;
    document.querySelector('#stat-danger .stat-num').textContent = stats.danger;
    document.querySelector('#stat-expired .stat-num').textContent = stats.expired;

    // Filter
    let filtered = items.filter(item => {
      const matchesSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm);
      const matchesCat = filterCat === 'all' || item.category === filterCat;
      return matchesSearch && matchesCat;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'expiration':
          return new Date(a.expirationDate) - new Date(b.expirationDate);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'added':
          return new Date(b.createdAt) - new Date(a.createdAt);
        default:
          return 0;
      }
    });

    const grid = document.getElementById('items-grid');

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
            <p>Try adjusting your search or category filter.</p>
          </div>`;
      }
      return;
    }

    grid.innerHTML = filtered.map(item => {
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

      const categoryLabels = {
        dairy: 'Dairy', meat: 'Meat & Poultry', seafood: 'Seafood',
        produce: 'Produce', grains: 'Grains & Bread', canned: 'Canned Goods',
        frozen: 'Frozen', condiments: 'Condiments', beverages: 'Beverages',
        snacks: 'Snacks', other: 'Other'
      };

      return `
        <div class="item-card status-${status}" onclick="App.openEditModal('${item.id}')">
          <div class="item-card-header">
            <span class="item-name">${escapeHtml(item.name)}</span>
            <span class="item-category-badge">${categoryLabels[item.category] || item.category}</span>
          </div>
          <div class="item-meta">
            <span>Expires: ${formatDate(item.expirationDate)}</span>
            ${item.purchaseDate ? `<span>Purchased: ${formatDate(item.purchaseDate)}</span>` : ''}
            ${item.notes ? `<span>${escapeHtml(item.notes)}</span>` : ''}
          </div>
          ${item.quantity > 1 ? `<span class="item-quantity">x${item.quantity}</span>` : ''}
          <div class="item-expiry-label">${expiryText}</div>
        </div>`;
    }).join('');
  }

  // ===== Add Item Form =====
  function initAddItemForm() {
    const form = document.getElementById('add-item-form');

    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('item-purchase-date').value = today;

    // Default expiration to 7 days from now
    const defaultExp = new Date();
    defaultExp.setDate(defaultExp.getDate() + 7);
    document.getElementById('item-expiration-date').value = defaultExp.toISOString().split('T')[0];

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('item-name').value;
      const category = document.getElementById('item-category').value;
      const quantity = document.getElementById('item-quantity').value;
      const purchaseDate = document.getElementById('item-purchase-date').value;
      const expirationDate = document.getElementById('item-expiration-date').value;
      const notes = document.getElementById('item-notes').value;

      if (!name.trim() || !expirationDate) {
        showToast('Please fill in the item name and expiration date.', 'error');
        return;
      }

      Store.addItem({ name, category, quantity, purchaseDate, expirationDate, notes });
      showToast(`"${name}" added to your pantry!`, 'success');

      // Reset form but keep defaults
      form.reset();
      document.getElementById('item-purchase-date').value = today;
      const newDefault = new Date();
      newDefault.setDate(newDefault.getDate() + 7);
      document.getElementById('item-expiration-date').value = newDefault.toISOString().split('T')[0];
      document.getElementById('item-quantity').value = '1';

      // Focus on name field for quick entry
      document.getElementById('item-name').focus();
    });
  }

  // ===== Edit Modal =====
  function openEditModal(id) {
    const item = Store.getById(id);
    if (!item) return;

    document.getElementById('edit-item-id').value = item.id;
    document.getElementById('edit-name').value = item.name;
    document.getElementById('edit-category').value = item.category;
    document.getElementById('edit-quantity').value = item.quantity;
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
        category: document.getElementById('edit-category').value,
        quantity: parseInt(document.getElementById('edit-quantity').value, 10),
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
          // Auto-populate form fields
          document.getElementById('item-name').value = result.name;
          if (result.category) {
            document.getElementById('item-category').value = result.category;
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
                  <span class="weekly-item-cat">${item.category}</span>
                </div>
                <span class="weekly-item-qty">${item.quantity > 1 ? 'x' + item.quantity : ''}</span>
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

    // Render ingredient chips
    if (activeIngredients.length === 0) {
      activeIngredients = [...ingredients];
    }

    chipsContainer.innerHTML = ingredients.map(ing => {
      const isActive = activeIngredients.includes(ing);
      const safeIng = escapeAttr(ing);
      return `<span class="ingredient-chip ${isActive ? 'active' : ''}"
                    data-ingredient="${safeIng}">${escapeHtml(ing)}</span>`;
    }).join('');

    // Bind chip click events via delegation
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

    // Show loading
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

    // Show top 12 results
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

  // ===== Keyboard Shortcuts =====
  function initKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeEditModal();
        closeRecipeModal();
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
    document.getElementById('sort-by').addEventListener('change', renderDashboard);
  }

  // ===== Initialize App =====
  function init() {
    initNavigation();
    initAddItemForm();
    initEditModal();
    initRecipeModal();
    initScanner();
    initKeyboard();
    initDashboardFilters();
    renderDashboard();
  }

  // Boot up
  document.addEventListener('DOMContentLoaded', init);

  // Public API
  return {
    switchTab,
    openEditModal,
    toggleIngredient,
    openRecipeDetail,
    showToast,
  };
})();
