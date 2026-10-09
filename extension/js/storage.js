// CloxOne storage. Everything stays on this device.
// Source of truth: chrome.storage.local. A synchronous localStorage mirror lets the
// first paint happen without waiting for an async read (keeps render < 50 ms).
(function () {
  const KEY = "cloxone.state.v1";
  let memory = null;
  const hasChrome = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

  function readSync() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage blocked: fall back to memory */ }
    return memory;
  }

  function write(state) {
    memory = state;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    if (hasChrome) {
      try { chrome.storage.local.set({ [KEY]: state }); } catch (e) { /* ignore */ }
    }
  }

  // Async read from chrome.storage.local (used when the localStorage mirror is empty,
  // e.g. after the user cleared site data).
  function readAsync() {
    return new Promise((resolve) => {
      if (!hasChrome) return resolve(readSync());
      try {
        chrome.storage.local.get(KEY, (res) => resolve((res && res[KEY]) || null));
      } catch (e) { resolve(readSync()); }
    });
  }

  window.CloxStore = { readSync, readAsync, write };
})();
