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
            value: async () => { let d = applyAntonymsToData(await prevJson()); if (window.KFVnExpressPhrases300 && typeof window.KFVnExpressPhrases300.apply === 'function') d = window.KFVnExpressPhrases300.apply(d); if (window.KFGuardianPhrases400 && typeof window.KFGuardianPhrases400.apply === 'function') d = window.KFGuardianPhrases400.apply(d); if (window.KFVnExpressPhrases400 && typeof window.KFVnExpressPhrases400.apply === 'function') d = window.KFVnExpressPhrases400.apply(d); if (window.KFVnExpressPhrases500 && typeof window.KFVnExpressPhrases500.apply === 'function') d = window.KFVnExpressPhrases500.apply(d); if (window.KFVnExpressPhrases700 && typeof window.KFVnExpressPhrases700.apply === 'function') d = window.KFVnExpressPhrases700.apply(d); if (window.KFVnExpressPhrases1000 && typeof window.KFVnExpressPhrases1000.apply === 'function') d = window.KFVnExpressPhrases1000.apply(d); if (window.KFVnExpressPhrasesW6 && typeof window.KFVnExpressPhrasesW6.apply === 'function') d = window.KFVnExpressPhrasesW6.apply(d); return d; }
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


  /* KF_LOAD_TASK1_200 */
  async function loadTask1Expansion200() {
    if (window.KFTask1Expansion200) return;
    try {
      const r = await fetch('/task1-expansion-200.js', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=task1-expansion-200.js')();
    } catch (err) {
      console.warn('[KhangFlash] Không nạp được task1-expansion-200.js:', err);
    }
  }



  /* KF_LOAD_VNEXPRESS_300 */
  async function loadVnExpressPhrases300() {
    if (window.KFVnExpressPhrases300) return;
    if (window.__KF_VNEXPRESS_READY__) { await window.__KF_VNEXPRESS_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-300.js?v=20261120-v300-r3', { cache: 'no-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-300.js')();
    } catch (err) {
      console.warn('[KhangFlash] Không nạp được vnexpress-phrases-300.js:', err);
    }
  }


  /* KF_LOAD_GUARDIAN_400 */
  async function loadGuardianPhrases400() {
    if (window.KFGuardianPhrases400 && window.KFGuardianPhrases400.version === '2026.11.20-g400-band9-r2') return;
    if (window.__KF_GUARDIAN_READY__) { await window.__KF_GUARDIAN_READY__; return; }
    try {
      const r = await fetch('/guardian-phrases-400.js?v=20261120-g2', { cache: 'no-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=guardian-phrases-400.js')();
    } catch (err) {
      console.warn('[KhangFlash] Không nạp được guardian-phrases-400.js:', err);
    }
  }


  /* KF_LOAD_VNEXPRESS_400 */
  async function loadVnExpressPhrases400() {
    if (window.KFVnExpressPhrases400 && window.KFVnExpressPhrases400.version === '2026.11.20-v400-band9-r2') return;
    if (window.__KF_VNEXPRESS400_READY__) { await window.__KF_VNEXPRESS400_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-400.js?v=20261120-v400-r2', { cache: 'no-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-400.js')();
    } catch (err) {
      console.warn('[KhangFlash] Không nạp được vnexpress-phrases-400.js:', err);
    }
  }


  /* KF_LOAD_VNEXPRESS_500 */
  async function loadVnExpressPhrases500() {
    if (window.KFVnExpressPhrases500 && window.KFVnExpressPhrases500.version === '2026.11.20-v500-band9-r2') return;
    if (window.__KF_VNEXPRESS500_READY__) { await window.__KF_VNEXPRESS500_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-500.js?v=20261120-v500-r2', { cache: 'no-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-500.js')();
    } catch (err) {
      console.warn('[KhangFlash] Không nạp được vnexpress-phrases-500.js:', err);
    }
  }


  /* KF_LOAD_VNEXPRESS_700 */
  async function loadVnExpressPhrases700() {
    if (window.KFVnExpressPhrases700 && window.KFVnExpressPhrases700.version === '2026.11.20-v700-band9-r2') return;
    if (window.__KF_VNEXPRESS700_READY__) { await window.__KF_VNEXPRESS700_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-700.js?v=20261120-v700-r2', { cache: 'no-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-700.js')();
    } catch (err) {
      console.warn('[KhangFlash] Không nạp được vnexpress-phrases-700.js:', err);
    }
  }


  /* KF_LOAD_VNEXPRESS_1000 */
  async function loadVnExpressPhrases1000() {
    if (window.KFVnExpressPhrases1000 && window.KFVnExpressPhrases1000.version === '2026.11.20-v1000-band9-r1') return;
    if (window.__KF_VNEXPRESS1000_READY__) { await window.__KF_VNEXPRESS1000_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-1000.js?v=20261120-v1000-r1', { cache: 'no-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-1000.js')();
    } catch (err) {
      console.warn('[KhangFlash] Không nạp được vnexpress-phrases-1000.js:', err);
    }
  }

  /* KF_LOAD_VNEXPRESS_W6 */
  async function loadVnExpressPhrasesW6() {
    if (window.KFVnExpressPhrasesW6 && window.KFVnExpressPhrasesW6.version === '2026.11.20-w6-band9-r1') return;
    if (window.__KF_VNEXPRESSW6_READY__) { await window.__KF_VNEXPRESSW6_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-w6.js?v=20261120-w6-r1', { cache: 'no-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w6.js')();
    } catch (err) {
      console.warn('[KhangFlash] Không nạp được vnexpress-phrases-w6.js:', err);
    }
  }

  /* KF_AUTO_REBALANCE_LOCAL_PLAN */
  (function clearLegacyUnbalancedPlan() {
    try {
      const rawLs = localStorage.getItem('kf_vercel_plan_v1');
      if (rawLs) {
        const parsed = JSON.parse(rawLs);
        if (parsed && parsed.plan && !parsed.plan.interleavedV2) {
          localStorage.removeItem('kf_vercel_plan_v1');
        }
      }
      if (typeof indexedDB !== 'undefined' && !localStorage.getItem('kf_idb_interleaved_v2_done')) {
        indexedDB.deleteDatabase('kf-device-learning-plan-v1');
        localStorage.setItem('kf_idb_interleaved_v2_done', '1');
      }
    } catch {}
  })();

  let loaded = false;
  async function loadAll() {
    if (loaded) return;
    loaded = true;
    hookRelationsShow();
    await loadTask1Expansion200();
    try {
      let code = '';
      if (window.__KF_LIVE_PREFETCH__) {
        code = await window.__KF_LIVE_PREFETCH__;
      }
      if (!code) {
        const r = await fetch('/live-override-custom.js', { cache: 'force-cache', credentials: 'same-origin' });
        if (!r.ok) {
          console.warn('[KhangFlash] Không tải được /live-override-custom.js (HTTP ' + r.status + ')');
          return;
        }
        code = await r.text();
      }
      if (!code.trim()) return;
      new Function('"use strict";\n' + code + '\n//# sourceURL=live-override-custom.js')();
      if (window.KFExpandedBaseReady && typeof window.KFExpandedBaseReady.then === 'function') {
        await window.KFExpandedBaseReady;
      }
      await Promise.all([loadVnExpressPhrases300(), loadGuardianPhrases400(), loadVnExpressPhrases400(), loadVnExpressPhrases500(), loadVnExpressPhrases700(), loadVnExpressPhrases1000(), loadVnExpressPhrasesW6()]);
      hookFetchForAntonyms();
      hookRelationsShow();
      window.KFIdiomAntonyms = { pairs: IDIOM_ANTONYM_PAIRS, enrichCard: enrichCardAntonyms, apply: applyAntonymsToData };
    } catch (err) {
      console.warn('[KhangFlash] Lỗi khi chạy /live-override-custom.js:', err);
    } finally {
      if (typeof window.__KF_RESOLVE_BASE_MERGE__ === 'function') window.__KF_RESOLVE_BASE_MERGE__();
    }
  }

  if (/^\/writing\/?$/.test(location.pathname)) loadTask1Expansion200();
  window.TidianLiveOverrides = { refresh: loadAll };
  const isVocabPage = /^\/(flashcard|flashcards|library|games|due|dashboard)(?:\.html)?\/?$/.test(location.pathname);
  if (isVocabPage) {
    loadAll();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(loadAll), { once: true });
  } else {
    requestAnimationFrame(loadAll);
  }
})();