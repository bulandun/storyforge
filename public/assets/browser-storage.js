// Keep the latest value in memory even if a write fails, so navigation in the
// current tab never reloads an older persisted draft. Accessing window's storage
// property itself can throw, so obtain it inside every guarded operation.
export function createSafeStorage(getStorage, onFailure = () => {}) {
  const memory = new Map();
  let failed = false;
  function report() {
    if (!failed) { failed = true; onFailure(); }
  }
  return {
    get failed() { return failed; },
    getItem(key) {
      if (memory.has(key)) return memory.get(key);
      try { const value = getStorage().getItem(key); memory.set(key, value); return value; }
      catch { report(); return null; }
    },
    setItem(key, value) {
      memory.set(key, String(value));
      try { getStorage().setItem(key, String(value)); return true; }
      catch { report(); return false; }
    },
    removeItem(key) {
      memory.set(key, null);
      try { getStorage().removeItem(key); return true; }
      catch { report(); return false; }
    },
  };
}
