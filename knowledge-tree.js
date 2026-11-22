/* KhangFlash Knowledge Tree · 20261122-v2 · read-only, zero-lag cached integration */
(() => {
  'use strict';
  if (window.KFKnowledgeTree) return;

  const STYLE = 'kf-knowledge-tree-style';
  if (!document.getElementById(STYLE)) {
    const st = document.createElement('style');
    st.id = STYLE;
    st.textContent = [
      '.kf-tree-wrap{position:relative;min-width:0}',
      '.kf-tree-wrap>a{height:100%}',
      '.kf-tree-launch{position:absolute;z-index:8;top:10px;right:10px;width:34px;height:34px;display:grid;place-items:center;border:1px solid #dce2d6;border-radius:9px;background:#fafbf7;color:#263b34;cursor:pointer;color-scheme:light only}',
      '.kf-tree-launch:hover{background:#e8eedf;border-color:#b8c7ad}',
      '.kf-tree-launch:focus-visible{outline:3px solid #718b66;outline-offset:3px}',
      '.kf-tree-dialog{position:fixed;inset:14px;width:calc(100% - 28px);height:calc(100dvh - 28px);max-width:none;max-height:none;padding:0;border:1px solid #dce2d6;border-radius:13px;background:#f5f5f0;color:#263b34;overflow:hidden;color-scheme:light only}',
      '.kf-tree-dialog::backdrop{background:rgba(23,40,28,0.42)}',
      '.kf-tree-dialog iframe{display:block;border:0;width:100%;height:100%;background:#f5f5f0;color-scheme:light only}',
      '.kf-tree-loading{padding:30px;font:14px system-ui,sans-serif;background:#f5f5f0;color:#263b34;height:100%}',
      '.kf-tree-loading button{padding:8px 14px;margin-left:10px;border:1px solid #dce2d6;border-radius:7px;background:#fafbf7;color:#263b34;cursor:pointer}',
      '.kf-tree-loading button:hover{background:#e8eedf}',
      '@media(max-width:600px){.kf-tree-dialog{inset:0;width:100%;height:100dvh;border-radius:0}}'
    ].join('');
    document.head.append(st);
  }

  let dialog = null, frame = null, previousFocus = null, current = null, request = 0, observer = null;
  let cachedRawPromise = null;
  let cachedDailyGroupsPromise = null;
  const builtCache = new Map();

  const icon = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21V10m0 7-5-4m5 0 5-4M12 10C5 10 4 5 4 3c6 0 8 3 8 7Zm0 5c0-7 4-10 8-10 0 5-2 9-8 10Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function close() {
    request++;
    if (dialog?.open) dialog.close();
    frame?.remove();
    frame = null;
    current = null;
    previousFocus?.focus?.();
    try { window.speechSynthesis?.cancel(); } catch {}
  }

  function normalizeCard(c) {
    const v = c.variants?.find(x => x && x.example) || c.variants?.[0] || {};
    return {
      id: String(c.id),
      t: String(c.term || ''),
      d: String(v.definition || c.definition || ''),
      e: String(v.example || c.example || ''),
      p: String(v.partOfSpeechLabel || v.partOfSpeech || c.partOfSpeechLabel || c.partOfSpeech || ''),
      ipa: String(c.ipa || c.phonetic || v.ipa || ''),
      s: v.synonyms || '',
      a: v.antonyms || ''
    };
  }

  // Fetch & index /data.json ONCE per session (prevents 2-5s lag freeze on every tree open)
  function getIndexedData() {
    if (!cachedRawPromise) {
      cachedRawPromise = fetch('/data.json?v=293-compact-pos', { cache: 'default', credentials: 'same-origin' })
        .then(r => {
          if (!r.ok) throw Error('Không tải được bộ từ (' + r.status + ').');
          return r.json();
        })
        .then(raw => {
          const sourceCategory = new Map((raw.sources || []).map(s => [s.id, s.category]));
          const byTopic = new Map();
          const allCards = raw.cards || [];
          for (let i = 0; i < allCards.length; i++) {
            const c = allCards[i];
            if (!c || c.studyKind === 'grammar' || c.hidden || c.archived || c.mergedInto) continue;
            const topicSet = new Set();
            if (Array.isArray(c.topics)) {
              for (let j = 0; j < c.topics.length; j++) if (c.topics[j]) topicSet.add(c.topics[j]);
            }
            if (c.sourceTopics && typeof c.sourceTopics === 'object') {
              const vals = Object.values(c.sourceTopics);
              for (let j = 0; j < vals.length; j++) {
                const ts = vals[j];
                if (Array.isArray(ts)) {
                  for (let k = 0; k < ts.length; k++) if (ts[k]) topicSet.add(ts[k]);
                }
              }
            }
            for (const tid of topicSet) {
              let bucket = byTopic.get(tid);
              if (!bucket) { bucket = []; byTopic.set(tid, bucket); }
              bucket.push(c);
            }
          }
          return { sourceCategory, byTopic };
        })
        .catch(err => {
          cachedRawPromise = null;
          throw err;
        });
    }
    return cachedRawPromise;
  }

  function getDailyGroups() {
    if (!cachedDailyGroupsPromise) {
      cachedDailyGroupsPromise = fetch('/knowledge-tree-daily.json', { cache: 'default', credentials: 'same-origin' })
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null);
    }
    return cachedDailyGroupsPromise;
  }

  function build(cards, groups) {
    const nodes = [{ id: 0, k: 'root', l: 'Bộ từ', ch: [], ci: -1, p: -1, lm: -1 }];
    const used = new Set();
    function add(k, l, p, lm, ci = -1) {
      const id = nodes.length;
      nodes.push({ id, k, l, p, lm, ci, ch: [], w: 0 });
      nodes[p].ch.push(id);
      return id;
    }
    const byId = new Map(cards.map((c, i) => [c.id, i]));
    function limb(name, items) {
      if (!items.length) return;
      const lid = add('limb', name, 0, nodes[0].ch.length);
      for (const group of items) {
        const ix = group.ids.map(id => byId.get(id)).filter(i => i !== undefined && !used.has(i));
        if (!ix.length) continue;
        ix.forEach(i => used.add(i));
        const h = add('hub', group.name, lid, nodes[lid].lm, ix[0]);
        ix.slice(1).forEach(i => add('leaf', cards[i].t, h, nodes[lid].lm, i));
      }
      if (!nodes[lid].ch.length) nodes[0].ch.pop();
    }
    if (groups) groups.forEach(g => limb(g.name, g.groups));
    const buckets = new Map();
    cards.forEach((c, i) => {
      if (used.has(i)) return;
      const p = c.p.toLowerCase();
      const key = /idiom|thành ngữ/.test(p) ? 'Thành ngữ'
        : /phrasal/.test(p) ? 'Cụm động từ'
        : /verb|động từ/.test(p) ? 'Động từ & cụm động từ'
        : /noun|danh từ/.test(p) ? 'Danh từ & cụm danh từ'
        : /adjective|tính từ/.test(p) ? 'Tính từ'
        : /adverb|trạng từ/.test(p) ? 'Trạng từ'
        : 'Từ & cụm từ khác';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(c.id);
    });
    for (const [name, ids] of buckets) {
      const sorted = ids.sort((a, b) => cards[byId.get(a)].t.localeCompare(cards[byId.get(b)].t));
      const chunks = [];
      for (let i = 0; i < sorted.length; i += 24) {
        chunks.push({
          name: 'Nhóm ' + (Math.floor(i / 24) + 1) + ' · ' + cards[byId.get(sorted[i])].t,
          ids: sorted.slice(i, i + 24)
        });
      }
      limb(name, chunks);
    }
    return { cards, nodes };
  }

  async function open(topic, title, filters = {}) {
    close();
    const token = ++request;
    previousFocus = document.activeElement;
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'kf-tree-dialog';
      dialog.setAttribute('aria-label', 'Cây kiến thức');
      document.body.append(dialog);
      dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
      dialog.addEventListener('click', e => {
        if (e.target === dialog) {
          const r = dialog.getBoundingClientRect();
          if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
        }
      });
    }
    dialog.replaceChildren();
    const loading = document.createElement('div');
    loading.className = 'kf-tree-loading';
    loading.textContent = 'Đang tải cây kiến thức…';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Đóng';
    cancel.onclick = close;
    loading.append(cancel);
    dialog.append(loading);
    dialog.showModal();

    try {
      const source = filters.source || 'all';
      const category = filters.category || 'all';
      const cacheKey = `${topic}|${source}|${category}`;

      let built = builtCache.get(cacheKey);
      if (!built) {
        const [{ sourceCategory, byTopic }, groups] = await Promise.all([
          getIndexedData(),
          topic === 'speaking-daily-routine-time-management' ? getDailyGroups() : Promise.resolve(null)
        ]);
        if (token !== request) return;

        const topicCards = byTopic.get(topic) || [];
        const seen = new Set();
        const cards = [];
        for (let i = 0; i < topicCards.length; i++) {
          const c = topicCards[i];
          if (source !== 'all' && !c.variants?.some(v => v.source === source)) continue;
          if (category !== 'all') {
            const ok = category === 'idioms'
              ? c.label === 'Idiom · Speaking'
              : (c.learningCategory
                ? c.learningCategory === category
                : c.variants?.some(v => (source === 'all' || v.source === source) && sourceCategory.get(v.source) === category));
            if (!ok) continue;
          }
          const nc = normalizeCard(c);
          if (!nc.id || !nc.t || seen.has(nc.id)) continue;
          seen.add(nc.id);
          cards.push(nc);
        }
        if (!cards.length) throw Error('Bộ này chưa có từ để hiển thị.');
        built = build(cards, groups);
        builtCache.set(cacheKey, built);
      }

      if (token !== request) return;
      current = { type: 'kf-tree-data', title, data: built };
      frame = document.createElement('iframe');
      frame.title = 'Cây kiến thức · ' + title;
      frame.src = '/knowledge-tree.html?v=20261122-v2';
      dialog.replaceChildren(frame);
    } catch (error) {
      if (token !== request) return;
      loading.firstChild.textContent = error.message + ' ';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Thử lại';
      retry.onclick = () => open(topic, title, filters);
      loading.append(retry);
    }
  }

  window.addEventListener('message', e => {
    if (e.origin !== location.origin || e.source !== frame?.contentWindow || !dialog?.open) return;
    if (e.data?.type === 'kf-tree-ready' && current) {
      frame.contentWindow.postMessage(current, location.origin);
    }
    if (e.data?.type === 'kf-tree-close') close();
    if (e.data?.type === 'kf-tree-speak' && typeof e.data.text === 'string') {
      const text = e.data.text.slice(0, 10000);
      if (window.KVoice?.speak) KVoice.speak(text);
      else if (window.speechSynthesis) {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-GB';
        speechSynthesis.speak(u);
      }
    }
  });

  // Pause MutationObserver while wrapping cards so scan() NEVER triggers recursive observer loops!
  function scan() {
    const links = document.querySelectorAll('a.tid-deck[href],.deck-grid a.deck[href]');
    const todo = [];
    for (let i = 0; i < links.length; i++) {
      const a = links[i];
      if (a.parentElement && a.parentElement.classList.contains('kf-tree-wrap')) continue;
      todo.push(a);
    }
    if (!todo.length) return;

    const host = document.getElementById('hub-content');
    if (observer) observer.disconnect();
    try {
      for (let i = 0; i < todo.length; i++) {
        const a = todo[i];
        let params;
        try { params = new URL(a.href, location.href).searchParams; } catch { continue; }
        const topic = params.get('topic');
        if (!topic || topic === 'all') continue;
        const title = a.querySelector('h3,h2')?.textContent?.trim() || topic;
        const wrapper = document.createElement('div');
        wrapper.className = 'kf-tree-wrap';
        a.before(wrapper);
        wrapper.append(a);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'kf-tree-launch';
        b.title = 'Cây kiến thức · ' + title;
        b.setAttribute('aria-label', b.title);
        b.innerHTML = icon;
        const srcParam = params.get('source');
        const catParam = params.get('category');
        b.onclick = e => {
          e.preventDefault();
          e.stopPropagation();
          open(topic, title, { source: srcParam, category: catParam });
        };
        wrapper.append(b);
      }
    } finally {
      if (observer && host) observer.observe(host, { childList: true, subtree: true });
    }
  }

  let scanTimer = 0;
  function schedule() {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = 0;
      scan();
    }, 90);
  }

  function init() {
    scan();
    const host = document.getElementById('hub-content');
    if (host) {
      observer = new MutationObserver(schedule);
      observer.observe(host, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.KFKnowledgeTree = { version: '20261122-v2', open, close };
})();
