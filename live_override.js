/* KhangFlash Direct Loader + Reciprocal Idiom Antonyms (v3) */
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

  /* KF_IDIOM_ANTONYMS_V1: reciprocal antonym links across active ForumFlash idioms (both cards stay active) */
  const IDIOM_ANTONYM_PAIRS = [["in the black", "in the red"], ["ahead of the curve", "behind the times"], ["fit as a fiddle", "under the weather"], ["fit as a fiddle", "run-down"], ["full of beans", "run out of steam"], ["beat about the bush", "get to the point"], ["mince one's words", "speak one's mind"], ["hold one's tongue", "speak one's mind"], ["go the distance", "throw in the towel"], ["add fuel to the fire", "clear the air"], ["on the right track", "go off the rails"], ["plain sailing", "in deep water"], ["money to burn", "on a shoestring"], ["money to burn", "from hand to mouth"], ["live beyond one's means", "tighten your belt"], ["live beyond one's means", "watch the pennies"], ["put down roots", "live out of a suitcase"], ["put down roots", "get itchy feet"], ["in the public eye", "under the radar"], ["toe the party line", "swim against the tide"], ["up and running", "out of action"], ["know something inside out", "out of one's depth"], ["know something inside out", "all at sea"], ["the lap of luxury", "the bare necessities"], ["on the same wavelength", "at cross purposes"], ["pull your weight", "pass the buck"], ["take at face value", "read between the lines"]];
  const norm = s => String(s || '').normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const antonymMap = new Map();
  for (const [a, b] of IDIOM_ANTONYM_PAIRS) {
    const na = norm(a), nb = norm(b);
    if (!antonymMap.has(na)) antonymMap.set(na, []);
    if (!antonymMap.has(nb)) antonymMap.set(nb, []);
    if (!antonymMap.get(na).includes(b)) antonymMap.get(na).push(b);
    if (!antonymMap.get(nb).includes(a)) antonymMap.get(nb).push(a);
  }

  function enrichCardAntonyms(card) {
    if (!card || !card.term) return card;
    const extras = antonymMap.get(norm(card.term));
    if (!extras || !extras.length) return card;
    const variants = Array.isArray(card.variants) ? card.variants : [];
    for (const v of variants) {
      const parts = String(v.antonyms || '').split(/\s*[·;\n]\s*/).map(x => x.trim()).filter(Boolean);
      const seen = new Set(parts.map(norm));
      let changed = false;
      for (const term of extras) {
        if (!seen.has(norm(term))) {
          parts.push(term);
          seen.add(norm(term));
          changed = true;
        }
      }
      if (changed) v.antonyms = parts.join(' · ');
    }
    return card;
  }

  function applyAntonymsToData(data) {
    if (data && Array.isArray(data.cards)) {
      for (const card of data.cards) enrichCardAntonyms(card);
    }
    return data;
  }

  function hookFetchForAntonyms() {
    if (window.__KF_ANTONYM_FETCH_HOOKED__) return;
    window.__KF_ANTONYM_FETCH_HOOKED__ = true;
    const prevFetch = window.fetch;
    window.fetch = async function (input, init) {
      const response = await prevFetch.apply(this, arguments);
      try {
        const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
        if (url.origin === location.origin && url.pathname === '/data.json' && response.ok) {
          const prevJson = response.json.bind(response);
          Object.defineProperty(response, 'json', {
            configurable: true,
            value: async () => applyAntonymsToData(await prevJson())
          });
        }
      } catch {}
      return response;
    };
  }

  function hookRelationsShow() {
    if (window.KRelations && typeof window.KRelations.show === 'function' && !window.KRelations.__kfAntonymHooked) {
      const origShow = window.KRelations.show.bind(window.KRelations);
      window.KRelations.show = function (card, type) {
        enrichCardAntonyms(card);
        return origShow(card, type);
      };
      window.KRelations.__kfAntonymHooked = true;
    }
  }

  let loaded = false;
  async function loadAll() {
    if (loaded) return;
    loaded = true;
    hookRelationsShow();
    try {
      const r = await fetch('/live-override-custom.js', { cache: 'default', credentials: 'same-origin' });
      if (!r.ok) {
        console.warn('[KhangFlash] Không tải được /live-override-custom.js (HTTP ' + r.status + ')');
        return;
      }
      const code = await r.text();
      if (!code.trim()) return;
      new Function('"use strict";\n' + code + '\n//# sourceURL=live-override-custom.js')();
      if (window.KFExpandedBaseReady && typeof window.KFExpandedBaseReady.then === 'function') {
        await window.KFExpandedBaseReady;
      }
      hookFetchForAntonyms();
      hookRelationsShow();
      window.KFIdiomAntonyms = { pairs: IDIOM_ANTONYM_PAIRS, enrichCard: enrichCardAntonyms, apply: applyAntonymsToData };
    } catch (err) {
      console.warn('[KhangFlash] Lỗi khi chạy /live-override-custom.js:', err);
    }
  }

  window.TidianLiveOverrides = { refresh: loadAll };
  if (document.readyState === 'complete') loadAll();
  else window.addEventListener('load', loadAll, { once: true });
})();