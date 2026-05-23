/**
 * Profiles — Household profile management.
 */
const Profiles = (() => {
  const KEY = 'shelflife_profiles';

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      if (data && data.profiles && data.profiles.length > 0) return data;
    } catch {}
    return defaults();
  }

  function defaults() {
    return {
      activeProfile: 'default',
      profiles: [{
        id: 'default',
        name: 'My Pantry',
        avatar: '🏠',
        color: '#6c63ff',
        createdAt: new Date().toISOString(),
      }],
    };
  }

  function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

  function getActive() {
    const data = load();
    return data.profiles.find(p => p.id === data.activeProfile) || data.profiles[0];
  }

  function getAll() { return load().profiles; }

  function create(name, avatar, color) {
    const data = load();
    const newProfile = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name.trim(),
      avatar: avatar || '👤',
      color: color || '#6c63ff',
      createdAt: new Date().toISOString(),
    };
    data.profiles.push(newProfile);
    save(data);
    return newProfile;
  }

  function update(id, updates) {
    const data = load();
    const idx = data.profiles.findIndex(p => p.id === id);
    if (idx === -1) return null;
    data.profiles[idx] = { ...data.profiles[idx], ...updates };
    save(data);
    return data.profiles[idx];
  }

  function deleteProfile(id) {
    const data = load();
    if (data.profiles.length <= 1) return false;
    data.profiles = data.profiles.filter(p => p.id !== id);
    if (data.activeProfile === id) data.activeProfile = data.profiles[0].id;
    save(data);
    // Also clear that profile's items
    localStorage.removeItem(`shelflife_items_${id}`);
    return true;
  }

  function switchProfile(id) {
    const data = load();
    const profile = data.profiles.find(p => p.id === id);
    if (!profile) return false;
    data.activeProfile = id;
    save(data);
    applyProfile(id);
    return true;
  }

  function applyProfile(profileId) {
    const id = profileId || load().activeProfile;
    const storageKey = id === 'default' ? 'shelflife_items' : `shelflife_items_${id}`;
    Store.setStorageKey(storageKey);
  }

  function exportProfile(id) {
    const profile = load().profiles.find(p => p.id === id);
    if (!profile) return null;
    const storageKey = id === 'default' ? 'shelflife_items' : `shelflife_items_${id}`;
    let items = [];
    try { items = JSON.parse(localStorage.getItem(storageKey)) || []; } catch {}
    return JSON.stringify({ profile, items }, null, 2);
  }

  function importProfile(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.profile || !Array.isArray(data.items)) throw new Error('Invalid profile data');
      const created = create(data.profile.name + ' (imported)', data.profile.avatar, data.profile.color);
      const storageKey = `shelflife_items_${created.id}`;
      localStorage.setItem(storageKey, JSON.stringify(data.items));
      return created;
    } catch (e) {
      throw new Error('Invalid profile JSON: ' + e.message);
    }
  }

  return {
    getActive, getAll, create, update,
    deleteProfile, switchProfile, applyProfile,
    exportProfile, importProfile,
  };
})();
