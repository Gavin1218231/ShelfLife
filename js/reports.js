/**
 * Reports — Generate printable inventory reports and summaries.
 */
const Reports = (() => {
  function generateInventoryReport() {
    const items = Store.getAll();
    const date = new Date().toLocaleDateString();
    const value = Store.getTotalValue();
    const stats = Store.getStats();
    let html = `<!DOCTYPE html><html><head><title>Pantry Inventory Report</title>
<style>
  body { font-family: Arial, sans-serif; margin: 2rem; color: #333; }
  h1 { border-bottom: 3px solid #6c63ff; padding-bottom: 0.5rem; }
  .summary { background: #f5f5f7; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
  th, td { padding: 0.5rem; border-bottom: 1px solid #ddd; text-align: left; }
  th { background: #6c63ff; color: white; }
  .expired { color: #ef4444; font-weight: bold; }
  .danger { color: #f59e0b; font-weight: bold; }
  .fresh { color: #22c55e; }
  @media print { body { margin: 1rem; } }
</style></head><body>
<h1>🧊 Shelf Life Pantry Inventory</h1>
<p><strong>Generated:</strong> ${date}</p>
<div class="summary">
  <strong>Total Items:</strong> ${stats.total} |
  <strong>Total Value:</strong> $${value.toFixed(2)} |
  <strong>Fresh:</strong> ${stats.fresh} |
  <strong>Use Soon:</strong> ${stats.warning} |
  <strong>Expiring:</strong> ${stats.danger} |
  <strong>Expired:</strong> ${stats.expired}
</div>
<table>
<thead><tr><th>Name</th><th>Category</th><th>Location</th><th>Quantity</th><th>Expires</th><th>Status</th><th>Price</th></tr></thead><tbody>`;
    items.sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));
    items.forEach(item => {
      const status = Store.getStatus(item.expirationDate);
      const days = Store.daysUntilExpiration(item.expirationDate);
      const statusText = days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? 'Today' : `${days}d`;
      html += `<tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.location)}</td>
        <td>${item.quantity} ${escapeHtml(item.unit)}</td>
        <td>${item.expirationDate}</td>
        <td class="${status}">${statusText}</td>
        <td>${item.price ? '$' + (item.price * item.quantity).toFixed(2) : '-'}</td>
      </tr>`;
    });
    html += `</tbody></table></body></html>`;
    return html;
  }

  function generateWeeklySummary() {
    const groups = Store.getGroupedByExpirationDate(7);
    const date = new Date().toLocaleDateString();
    let html = `<!DOCTYPE html><html><head><title>Weekly Summary</title>
<style>
  body { font-family: Arial, sans-serif; margin: 2rem; }
  h1 { border-bottom: 3px solid #6c63ff; padding-bottom: 0.5rem; }
  .day { margin: 1rem 0; padding: 1rem; background: #f5f5f7; border-radius: 8px; }
  .day-header { font-weight: bold; margin-bottom: 0.5rem; }
  .item { padding: 0.25rem 0; }
  .overdue { background: #fee; }
</style></head><body>
<h1>🗓️ Weekly Use-It-or-Lose-It Summary</h1>
<p><strong>Generated:</strong> ${date}</p>`;
    if (groups.length === 0) {
      html += `<p>Nothing expiring this week! 🎉</p>`;
    } else {
      groups.forEach(([dateStr, items]) => {
        const days = Store.daysUntilExpiration(dateStr);
        const isOverdue = days < 0;
        html += `<div class="day ${isOverdue ? 'overdue' : ''}">
          <div class="day-header">${dateStr} (${days < 0 ? `${Math.abs(days)} days ago` : days === 0 ? 'Today' : `${days} days`})</div>`;
        items.forEach(item => {
          html += `<div class="item">• ${escapeHtml(item.name)} (${item.quantity} ${escapeHtml(item.unit)}) - ${escapeHtml(item.location)}</div>`;
        });
        html += `</div>`;
      });
    }
    html += `</body></html>`;
    return html;
  }

  function generateValueReport() {
    const byCategory = Store.getValueByCategory();
    const byLocation = {};
    Store.getAll().forEach(item => {
      if (item.price) {
        const loc = item.location || 'other';
        byLocation[loc] = (byLocation[loc] || 0) + (item.price * (item.quantity || 1));
      }
    });
    const total = Store.getTotalValue();
    let html = `<!DOCTYPE html><html><head><title>Inventory Value Report</title>
<style>
  body { font-family: Arial, sans-serif; margin: 2rem; }
  h1, h2 { border-bottom: 2px solid #6c63ff; padding-bottom: 0.25rem; }
  .total { font-size: 2rem; color: #6c63ff; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th, td { padding: 0.5rem; border-bottom: 1px solid #ddd; text-align: left; }
  th { background: #f5f5f7; }
</style></head><body>
<h1>💰 Inventory Value Report</h1>
<p class="total">Total: $${total.toFixed(2)}</p>
<h2>By Category</h2><table><thead><tr><th>Category</th><th>Value</th><th>% of Total</th></tr></thead><tbody>`;
    Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, val]) => {
      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
      html += `<tr><td>${escapeHtml(cat)}</td><td>$${val.toFixed(2)}</td><td>${pct}%</td></tr>`;
    });
    html += `</tbody></table><h2>By Location</h2><table><thead><tr><th>Location</th><th>Value</th><th>% of Total</th></tr></thead><tbody>`;
    Object.entries(byLocation).sort((a, b) => b[1] - a[1]).forEach(([loc, val]) => {
      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
      html += `<tr><td>${escapeHtml(loc)}</td><td>$${val.toFixed(2)}</td><td>${pct}%</td></tr>`;
    });
    html += `</tbody></table></body></html>`;
    return html;
  }

  function printReport(html) {
    const win = window.open('', '_blank');
    if (!win) { alert('Pop-up blocked. Please allow pop-ups to print reports.'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  return {
    generateInventoryReport, generateWeeklySummary, generateValueReport,
    printReport,
  };
})();
