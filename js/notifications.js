/**
 * Notifications — Browser notification management.
 */
const Notifications = (() => {
  const SNOOZE_KEY = 'shelflife_snoozed';
  let scheduleInterval = null;

  function isSupported() {
    return 'Notification' in window;
  }

  function getPermission() {
    return isSupported() ? Notification.permission : 'denied';
  }

  async function requestPermission() {
    if (!isSupported()) return 'denied';
    try {
      const result = await Notification.requestPermission();
      return result;
    } catch { return 'denied'; }
  }

  function isEnabled() {
    return isSupported() && Notification.permission === 'granted'
      && Config.getSetting('notificationsEnabled') !== false;
  }

  function show(title, options = {}) {
    if (!isEnabled()) return null;
    try {
      return new Notification(title, {
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        ...options,
      });
    } catch { return null; }
  }

  function sendExpirationAlert(items) {
    if (!items || items.length === 0) return;
    const snoozed = loadSnoozed();
    const filtered = items.filter(i => !snoozed[i.id] || new Date(snoozed[i.id]) < new Date());
    if (filtered.length === 0) return;
    const title = `🧊 ${filtered.length} item${filtered.length !== 1 ? 's' : ''} expiring soon`;
    const body = filtered.slice(0, 3).map(i => i.name).join(', ') +
      (filtered.length > 3 ? `, +${filtered.length - 3} more` : '');
    show(title, { body, tag: 'expiration-alert' });
  }

  function showDigest() {
    const expiring = Store.getExpiringWithin(Config.getSetting('notifyDaysBefore') || 3);
    sendExpirationAlert(expiring);
  }

  function loadSnoozed() {
    try { return JSON.parse(localStorage.getItem(SNOOZE_KEY)) || {}; }
    catch { return {}; }
  }

  function saveSnoozed(snoozed) {
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(snoozed));
  }

  function snoozeItem(itemId, days = 1) {
    const snoozed = loadSnoozed();
    snoozed[itemId] = new Date(Date.now() + days * 86400000).toISOString();
    saveSnoozed(snoozed);
  }

  function unsnoozeItem(itemId) {
    const snoozed = loadSnoozed();
    delete snoozed[itemId];
    saveSnoozed(snoozed);
  }

  function getSnoozedItems() { return loadSnoozed(); }

  function scheduleDaily() {
    if (scheduleInterval) clearInterval(scheduleInterval);
    const checkInterval = 60000;
    let lastNotified = null;
    scheduleInterval = setInterval(() => {
      if (!isEnabled()) return;
      const now = new Date();
      const targetTime = Config.getSetting('notificationTime') || '09:00';
      const [hours, minutes] = targetTime.split(':').map(Number);
      const today = now.toISOString().split('T')[0];
      if (now.getHours() === hours && now.getMinutes() === minutes && lastNotified !== today) {
        showDigest();
        lastNotified = today;
      }
    }, checkInterval);
  }

  function cancelSchedule() {
    if (scheduleInterval) { clearInterval(scheduleInterval); scheduleInterval = null; }
  }

  return {
    isSupported, getPermission, requestPermission, isEnabled,
    show, sendExpirationAlert, showDigest,
    snoozeItem, unsnoozeItem, getSnoozedItems,
    scheduleDaily, cancelSchedule,
  };
})();
