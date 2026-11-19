/* KhangFlash Direct Loader (Zero-Subfolder: loads /custom-theme.css + /live-override-custom.js directly) */
(() => {
  'use strict';
  if (window.TidianLiveOverrides || /^\/admin-live(?:\.html)?\/?$/.test(location.pathname) || new URLSearchParams(location.search).get('tidianLive') === 'off') return;

  if (!document.getElementById('kf-custom-theme-link')) {
    const link = document.createElement('link');
    link.id = 'kf-custom-theme-link';
    link.rel = 'stylesheet';
    link.href = '/custom-theme.css';
    (document.head || document.documentElement).appendChild(link);
  }

  let loaded = false;
  async function loadAll() {
    if (loaded) return;
    loaded = true;
    try {
      const r = await fetch('/live-override-custom.js', { cache: 'default', credentials: 'same-origin' });
      if (!r.ok) {
        console.warn('[KhangFlash] Không tải được /live-override-custom.js (HTTP ' + r.status + ')');
        return;
      }
      const code = await r.text();
      if (!code.trim()) return;
      new Function('"use strict";\n' + code + '\n//# sourceURL=live-override-custom.js')();
    } catch (err) {
      console.warn('[KhangFlash] Lỗi khi chạy /live-override-custom.js:', err);
    }
  }

  window.TidianLiveOverrides = { refresh: loadAll };
  if (document.readyState === 'complete') loadAll();
  else window.addEventListener('load', loadAll, { once: true });
})();
