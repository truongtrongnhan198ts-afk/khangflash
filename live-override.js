/* KhangFlash Modular Patch Loader (loads enabled modules from /patches/manifest.json in order) */
(() => {
  'use strict';
  if (window.TidianLiveOverrides || /^\/admin-live(?:\.html)?\/?$/.test(location.pathname) || new URLSearchParams(location.search).get('tidianLive') === 'off') return;

  let loaded = false;
  async function loadModules() {
    if (loaded) return;
    loaded = true;
    try {
      const res = await fetch('/patches/manifest.json', { cache: 'default', credentials: 'same-origin' });
      if (!res.ok) return;
      const manifest = await res.json();
      const list = Array.isArray(manifest.modules) ? manifest.modules : [];
      const enabled = list.filter(m => m && m.enabled !== false && m.file);
      // Fetch all enabled modules in parallel, then execute strictly in manifest order
      const texts = await Promise.all(enabled.map(async m => {
        const r = await fetch('/patches/' + m.file, { cache: 'default', credentials: 'same-origin' });
        if (!r.ok) throw Error('Không tải được module ' + m.file + ' (HTTP ' + r.status + ')');
        return { file: m.file, code: await r.text() };
      }));
      for (const item of texts) {
        if (!item.code.trim()) continue;
        try {
          new Function('"use strict";\n' + item.code + '\n//# sourceURL=patches/' + item.file)();
        } catch (err) {
          console.warn('[KhangFlash Patch] Lỗi khi chạy', item.file, err);
        }
      }
    } catch (err) {
      console.warn('[KhangFlash Patch] Không nạp được manifest:', err);
    }
  }

  window.TidianLiveOverrides = { refresh: loadModules };
  if (document.readyState === 'complete') loadModules();
  else window.addEventListener('load', loadModules, { once: true });
})();
