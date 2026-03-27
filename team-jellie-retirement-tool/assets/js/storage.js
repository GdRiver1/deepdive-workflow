(function (window) {
  'use strict';

  const STORAGE_KEY = 'team-jellie-command-center-v1';

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ updatedAt: new Date().toISOString(), data }));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.data || null;
    } catch (err) {
      console.error('Failed to load local data', err);
      return null;
    }
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function downloadJSON(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function readJSONFile(file) {
    const text = await file.text();
    return JSON.parse(text);
  }

  window.TeamJellieStorage = { save, load, clear, downloadJSON, readJSONFile };
})(window);
