/**
 * Widgets — Customizable dashboard widget system.
 */
const Widgets = (() => {
  const KEY = 'shelflife_widgets';

  const WIDGET_DEFS = {
    stats: { name: 'Stats Overview', icon: '📊', render: renderStatsWidget },
    expiring: { name: 'Expiring Soon', icon: '⏰', render: renderExpiringWidget },
    value: { name: 'Inventory Value', icon: '💰', render: renderValueWidget },
    health: { name: 'Health Score', icon: '❤️', render: renderHealthWidget },
    recent: { name: 'Recent Activity', icon: '🕒', render: renderRecentWidget },
    shopping: { name: 'Shopping Preview', icon: '🛒', render: renderShoppingWidget },
    achievements: { name: 'Recent Achievements', icon: '🏆', render: renderAchievementsWidget },
    carbon: { name: 'Carbon Footprint', icon: '🌍', render: renderCarbonWidget },
    challenges: { name: 'Active Challenges', icon: '🎯', render: renderChallengesWidget },
    frequent: { name: 'Frequent Items', icon: '⭐', render: renderFrequentWidget },
    seasonal: { name: 'Seasonal Suggestions', icon: '🍂', render: renderSeasonalWidget },
    budget: { name: 'Budget Tracker', icon: '💵', render: renderBudgetWidget },
  };

  const DEFAULT_LAYOUT = ['stats', 'expiring', 'health', 'shopping'];

  function loadLayout() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || DEFAULT_LAYOUT;
    } catch { return DEFAULT_LAYOUT; }
  }

  function saveLayout(layout) {
    localStorage.setItem(KEY, JSON.stringify(layout));
  }

  function addWidget(id) {
    const layout = loadLayout();
    if (!layout.includes(id)) {
      layout.push(id);
      saveLayout(layout);
    }
  }

  function removeWidget(id) {
    const layout = loadLayout().filter(w => w !== id);
    saveLayout(layout);
  }

  function moveWidget(id, direction) {
    const layout = loadLayout();
    const idx = layout.indexOf(id);
    if (idx === -1) return;
    if (direction === 'up' && idx > 0) {
      [layout[idx], layout[idx - 1]] = [layout[idx - 1], layout[idx]];
    } else if (direction === 'down' && idx < layout.length - 1) {
      [layout[idx], layout[idx + 1]] = [layout[idx + 1], layout[idx]];
    }
    saveLayout(layout);
  }

  function renderAll() {
    const layout = loadLayout();
    return layout.map(id => {
      const def = WIDGET_DEFS[id];
      if (!def) return '';
      try {
        return `<div class="widget" data-widget="${id}">
          <div class="widget-header">
            <span class="widget-title">${def.icon} ${def.name}</span>
            <button class="widget-remove" data-widget-id="${id}" title="Remove">×</button>
          </div>
          <div class="widget-body">${def.render()}</div>
        </div>`;
      } catch (e) { return ''; }
    }).join('');
  }

  function renderStatsWidget() {
    const s = Store.getStats();
    return `<div class="widget-stats">
      <div class="ws-row"><span>Total</span><strong>${s.total}</strong></div>
      <div class="ws-row"><span class="status-fresh">Fresh</span><strong>${s.fresh}</strong></div>
      <div class="ws-row"><span class="status-warning">Use Soon</span><strong>${s.warning}</strong></div>
      <div class="ws-row"><span class="status-danger">Expiring</span><strong>${s.danger}</strong></div>
      <div class="ws-row"><span class="status-expired">Expired</span><strong>${s.expired}</strong></div>
    </div>`;
  }

  function renderExpiringWidget() {
    const items = Store.getExpiringWithin(3).slice(0, 5);
    if (items.length === 0) return '<p class="widget-empty">Nothing expiring soon ✨</p>';
    return items.map(item => {
      const days = Store.daysUntilExpiration(item.expirationDate);
      const label = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `${days}d`;
      return `<div class="widget-row"><span>${escapeHtml(item.name)}</span><span class="widget-tag">${label}</span></div>`;
    }).join('');
  }

  function renderValueWidget() {
    const value = Store.getTotalValue();
    return `<div class="widget-big">$${value.toFixed(2)}</div><div class="widget-sub">Total Inventory Value</div>`;
  }

  function renderHealthWidget() {
    const score = Achievements.getInventoryHealthScore();
    const color = score >= 75 ? 'var(--color-fresh)' : score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';
    return `<div class="widget-score" style="--score:${score}; --score-color:${color}">
      <div class="score-ring">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-border)" stroke-width="8"/>
          <circle cx="50" cy="50" r="45" fill="none" stroke="${color}" stroke-width="8"
            stroke-dasharray="${(score / 100) * 283} 283" stroke-dashoffset="0"
            transform="rotate(-90 50 50)" stroke-linecap="round"/>
        </svg>
        <div class="score-text">${score}</div>
      </div>
      <div class="widget-sub">Pantry Health</div>
    </div>`;
  }

  function renderRecentWidget() {
    const items = Store.getAll().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    if (items.length === 0) return '<p class="widget-empty">No recent activity</p>';
    return items.map(item => `<div class="widget-row"><span>${escapeHtml(item.name)}</span><span class="widget-tag">${escapeHtml(item.category)}</span></div>`).join('');
  }

  function renderShoppingWidget() {
    const items = Shopping.getAll().filter(i => !i.checked).slice(0, 5);
    if (items.length === 0) return '<p class="widget-empty">Shopping list empty</p>';
    return items.map(item => `<div class="widget-row"><span>${escapeHtml(item.name)}</span><span class="widget-tag">${item.quantity} ${escapeHtml(item.unit)}</span></div>`).join('');
  }

  function renderAchievementsWidget() {
    const unlocked = Achievements.getUnlocked().sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt)).slice(0, 3);
    if (unlocked.length === 0) return '<p class="widget-empty">No achievements yet</p>';
    return unlocked.map(a => `<div class="widget-row"><span>${a.icon} ${escapeHtml(a.name)}</span><span class="widget-tag">+${a.xp} XP</span></div>`).join('');
  }

  function renderCarbonWidget() {
    const carbon = Sustainability.getTotalCarbonFootprint();
    const eco = Sustainability.getEcoScore();
    return `<div class="widget-big">${carbon.toFixed(1)} <small>kg CO₂</small></div>
      <div class="widget-sub">Eco Grade: <strong>${eco.grade}</strong> (${eco.score}/100)</div>`;
  }

  function renderChallengesWidget() {
    const data = Achievements.getActiveChallenges();
    const active = data.challenges.filter(c => !c.completed).slice(0, 3);
    if (active.length === 0) return '<p class="widget-empty">All challenges completed! 🎉</p>';
    return active.map(c => {
      const pct = (c.progress / c.target) * 100;
      return `<div class="widget-challenge">
        <div class="widget-row"><span>${c.icon} ${escapeHtml(c.name)}</span><span class="widget-tag">${c.progress}/${c.target}</span></div>
        <div class="widget-progress"><div class="widget-progress-fill" style="width: ${pct}%"></div></div>
      </div>`;
    }).join('');
  }

  function renderFrequentWidget() {
    const items = ShelfLifeDB.getFrequentItems(5);
    if (items.length === 0) return '<p class="widget-empty">Add items to see frequent ones</p>';
    return items.map(item => `<button class="widget-quick-btn" data-frequent="${escapeAttr(item.name)}">+ ${escapeHtml(item.name)}</button>`).join('');
  }

  function renderSeasonalWidget() {
    const seasonal = Sustainability.getSuggestedSeasonalItems().slice(0, 5);
    if (seasonal.length === 0) return '<p class="widget-empty">All seasonal items in stock!</p>';
    return seasonal.map(s => `<div class="widget-row"><span>🌿 ${escapeHtml(s)}</span></div>`).join('');
  }

  function renderBudgetWidget() {
    const status = Budget.getBudgetStatus();
    if (!status) return '<p class="widget-empty">Set monthly budget in settings</p>';
    return `<div class="widget-big">$${status.spent.toFixed(2)} / $${status.budget.toFixed(2)}</div>
      <div class="widget-progress"><div class="widget-progress-fill widget-progress-${status.alertLevel}" style="width: ${status.pct}%"></div></div>
      <div class="widget-sub">${status.overBudget ? 'Over budget!' : '$' + status.remaining.toFixed(2) + ' remaining'}</div>`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function getAvailableWidgets() {
    const layout = loadLayout();
    return Object.entries(WIDGET_DEFS)
      .filter(([id]) => !layout.includes(id))
      .map(([id, def]) => ({ id, ...def }));
  }

  return {
    WIDGET_DEFS, loadLayout, saveLayout,
    addWidget, removeWidget, moveWidget,
    renderAll, getAvailableWidgets,
  };
})();
