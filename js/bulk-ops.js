/**
 * BulkOps — Bulk selection and operations on items.
 */
const BulkOps = (() => {
  let selectedIds = new Set();
  let bulkMode = false;

  function isBulkMode() { return bulkMode; }
  function enable() { bulkMode = true; selectedIds.clear(); }
  function disable() { bulkMode = false; selectedIds.clear(); }
  function toggle() { bulkMode ? disable() : enable(); return bulkMode; }

  function toggleSelection(id) {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    return selectedIds.size;
  }

  function isSelected(id) { return selectedIds.has(id); }
  function getSelected() { return Array.from(selectedIds); }
  function getCount() { return selectedIds.size; }

  function selectAll(items) {
    items.forEach(item => selectedIds.add(item.id));
    return selectedIds.size;
  }

  function clearSelection() { selectedIds.clear(); }

  function bulkDelete() {
    const ids = getSelected();
    const count = Store.deleteMany(ids);
    clearSelection();
    return count;
  }

  function bulkMarkUsed() {
    const ids = getSelected();
    let count = 0;
    ids.forEach(id => {
      const item = Store.getById(id);
      if (item) {
        Analytics.logDisposal(item, 'used');
        Store.deleteItem(id);
        count++;
      }
    });
    Achievements.recordEvent('item_used', count);
    clearSelection();
    return count;
  }

  function bulkMarkWasted() {
    const ids = getSelected();
    let count = 0;
    ids.forEach(id => {
      const item = Store.getById(id);
      if (item) {
        Analytics.logDisposal(item, 'wasted');
        Store.deleteItem(id);
        count++;
      }
    });
    Achievements.recordEvent('item_wasted', count);
    clearSelection();
    return count;
  }

  function bulkMove(location) {
    const ids = getSelected();
    let count = 0;
    ids.forEach(id => {
      if (Store.updateItem(id, { location })) count++;
    });
    clearSelection();
    return count;
  }

  function bulkUpdateCategory(category) {
    const ids = getSelected();
    let count = 0;
    ids.forEach(id => {
      if (Store.updateItem(id, { category })) count++;
    });
    clearSelection();
    return count;
  }

  function bulkAddTag(tag) {
    const ids = getSelected();
    let count = 0;
    ids.forEach(id => {
      const item = Store.getById(id);
      if (item) {
        const tags = new Set(item.tags || []);
        tags.add(tag);
        Store.updateItem(id, { tags: Array.from(tags) });
        count++;
      }
    });
    clearSelection();
    return count;
  }

  function bulkAddToShopping() {
    const ids = getSelected();
    let count = 0;
    ids.forEach(id => {
      const item = Store.getById(id);
      if (item) {
        Shopping.addItem({
          name: item.name,
          category: item.category,
          unit: item.unit,
          source: 'manual',
        });
        count++;
      }
    });
    clearSelection();
    return count;
  }

  return {
    isBulkMode, enable, disable, toggle,
    toggleSelection, isSelected, getSelected, getCount,
    selectAll, clearSelection,
    bulkDelete, bulkMarkUsed, bulkMarkWasted,
    bulkMove, bulkUpdateCategory, bulkAddTag, bulkAddToShopping,
  };
})();
