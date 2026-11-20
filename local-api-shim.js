/* KhangFlash Standalone Local API Shim (100% self-hosted on Vercel) */
(() => {
  'use strict';
  if (window.__KF_LOCAL_API_SHIM__) return;
  window.__KF_LOCAL_API_SHIM__ = true;

  const origFetch = window.fetch.bind(window);
  // Pre-inject custom-theme.css & pre-fetch live-override-custom.js early so Flashcard/Library/Games never flashes 3,099 base cards before jumping to 13,064 cards
  const isAdminLive = /^\/admin-live(?:\.html)?\/?$/.test(location.pathname) || new URLSearchParams(location.search).get('tidianLive') === 'off';
  const needsVocabGate = /^\/(flashcard|flashcards|library|games|due|dashboard)(?:\.html)?\/?$/.test(location.pathname);
  if (!isAdminLive) {
    if (!document.getElementById('kf-custom-theme-link')) {
      const link = document.createElement('link');
      link.id = 'kf-custom-theme-link';
      link.rel = 'stylesheet';
      link.href = '/custom-theme.css';
      (document.head || document.documentElement).appendChild(link);
    }
    if (!document.getElementById('kf-dashboard-clean-style')) {
      const st = document.createElement('style');
      st.id = 'kf-dashboard-clean-style';
      st.textContent = '#kf-today-sync-status{display:none!important;}';
      (document.head || document.documentElement).appendChild(st);
    }
    window.__KF_LIVE_PREFETCH__ = origFetch('/live-override-custom.js', { cache: 'force-cache', credentials: 'same-origin' })
      .then(r => (r.ok ? r.text() : ''))
      .catch(() => '');
    if (needsVocabGate) {
      window.__KF_BASE_MERGE_DONE__ = false;
      window.__KF_BASE_MERGE_READY__ = new Promise(resolve => {
        const done = () => {
          if (window.__KF_BASE_MERGE_DONE__) return;
          window.__KF_BASE_MERGE_DONE__ = true;
          resolve();
        };
        window.__KF_RESOLVE_BASE_MERGE__ = done;
        setTimeout(done, 3000);
      });
    } else {
      window.__KF_BASE_MERGE_DONE__ = true;
      window.__KF_BASE_MERGE_READY__ = Promise.resolve();
    }
  } else {
    window.__KF_BASE_MERGE_DONE__ = true;
    window.__KF_BASE_MERGE_READY__ = Promise.resolve();
  }
  const K = {
    study: 'kf_vercel_study_v1',
    practice: 'kf_vercel_practice_v1',
    notebook: 'kf_vercel_notebook_v1',
    plan: 'kf_vercel_plan_v1',
    knowledge: 'kf_vercel_knowledge_v1'
  };

  function todayIso() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('[KF Local Shim] storage write failed', key, e);
    }
  }

  function jsonRes(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  function getStudyState() {
    const t = todayIso();
    const def = {
      guest: false,
      accountKey: 'khangflash-local',
      today: t,
      cards: [],
      settings: { band: 9, daily_goal: 20, exam_date: '' },
      history: [],
      activity: [],
      learningActivity: []
    };
    const st = readJson(K.study, def);
    st.guest = false;
    st.accountKey = st.accountKey || 'khangflash-local';
    st.today = t;
    if (!Array.isArray(st.cards)) st.cards = [];
    if (!st.settings || typeof st.settings !== 'object') st.settings = { band: 9, daily_goal: 20, exam_date: '' };
    if (!Array.isArray(st.history)) st.history = [];
    if (!Array.isArray(st.activity)) st.activity = [];
    if (!Array.isArray(st.learningActivity)) st.learningActivity = [];
    return st;
  }

  function handleStudy(method, body) {
    const st = getStudyState();
    const t = todayIso();
    if (method === 'POST' && body && typeof body === 'object') {
      if (body.settings && typeof body.settings === 'object') {
        st.settings = { ...st.settings, ...body.settings };
      }
      if (body.action === 'settings') {
        if (body.band != null) st.settings.band = body.band;
        if (body.daily_goal != null) st.settings.daily_goal = body.daily_goal;
        if (body.exam_date != null) st.settings.exam_date = body.exam_date;
      }
      const reviews = Array.isArray(body.reviews)
        ? body.reviews
        : (body.card_id || body.id ? [body] : []);
      if (reviews.length) {
        const byId = new Map(st.cards.map(c => [c.card_id || c.id, c]));
        const updatedCards = [];
        for (const r of reviews) {
          const cid = r.card_id || r.id;
          if (!cid) continue;
          const prev = byId.get(cid) || { card_id: cid, reps: 0, interval: 0, ease: 2.5, lapses: 0 };
          const quality = typeof r.quality === 'number' ? r.quality : (r.ok === false || r.status === 'again' ? 1 : 4);
          let reps = prev.reps || 0;
          let interval = prev.interval || 0;
          let ease = prev.ease || 2.5;
          let lapses = prev.lapses || 0;
          if (quality < 3) {
            reps = 0;
            interval = 1;
            lapses += 1;
          } else {
            reps += 1;
            interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.max(1, Math.round(interval * ease));
          }
          ease = Math.max(1.3, +(ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))).toFixed(2));
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + interval);
          const dueIso = dueDate.toISOString().slice(0, 10);
          const nextCard = {
            ...prev,
            card_id: cid,
            status: r.status || (quality < 3 ? 'again' : 'known'),
            reps,
            interval,
            ease,
            lapses,
            due: r.due || dueIso,
            last_reviewed: t,
            updated_at: new Date().toISOString()
          };
          byId.set(cid, nextCard);
          updatedCards.push(nextCard);
        }
        st.cards = [...byId.values()];
        if (!st.activity.some(a => (typeof a === 'string' ? a : a.date) === t)) {
          st.activity.push({ date: t, count: updatedCards.length });
        } else {
          st.activity = st.activity.map(a => {
            if (typeof a === 'string' && a === t) return { date: t, count: 1 + updatedCards.length };
            if (a && a.date === t) return { ...a, count: (a.count || 0) + updatedCards.length };
            return a;
          });
        }
        writeJson(K.study, st);
        return jsonRes({ ok: true, duplicate: false, ...st, updatedCards, activityDate: t });
      }
      writeJson(K.study, st);
      return jsonRes({ ok: true, ...st });
    }
    return jsonRes(st);
  }

  function getPracticeState() {
    const t = todayIso();
    const def = {
      ok: true,
      guest: false,
      accountKey: 'khangflash-local',
      today: t,
      questions: [],
      errors: [],
      attempts: [],
      values: [],
      entries: [],
      articles: []
    };
    const st = readJson(K.practice, def);
    st.ok = true;
    st.guest = false;
    st.accountKey = st.accountKey || 'khangflash-local';
    st.today = t;
    if (!Array.isArray(st.questions)) st.questions = [];
    if (!Array.isArray(st.errors)) st.errors = [];
    if (!Array.isArray(st.attempts)) st.attempts = [];
    if (!Array.isArray(st.values)) st.values = [];
    if (!Array.isArray(st.entries)) st.entries = [];
    if (!Array.isArray(st.articles)) st.articles = [];
    return st;
  }

  function handlePractice(method, body) {
    const st = getPracticeState();
    const now = new Date().toISOString();
    if (method === 'POST' && body && typeof body === 'object') {
      if (body.action === 'value' && body.key) {
        const idx = st.values.findIndex(v => v.key === body.key);
        const rev = idx >= 0 ? (st.values[idx].revision || 0) + 1 : 1;
        const row = { key: body.key, value: body.value, revision: rev, updated_at: now };
        if (idx >= 0) st.values[idx] = row;
        else st.values.push(row);
        writeJson(K.practice, st);
        return jsonRes({ ok: true, ...st, row, revision: rev });
      }
      if (body.action === 'attempt' && body.value && typeof body.value === 'object') {
        const val = { ...body.value, occurred_at: body.occurred_at || now };
        if (!st.attempts.some(a => a.id && a.id === val.id)) {
          st.attempts.push(val);
          if (st.attempts.length > 2000) st.attempts = st.attempts.slice(-2000);
        }
        const qid = val.qid;
        if (qid) {
          const qIdx = st.questions.findIndex(q => q.qid === qid);
          const prev = qIdx >= 0 ? st.questions[qIdx] : { qid, kind: val.kind || 'grammar', reps: 0, lapses: 0, correct: 0, total: 0 };
          const nextQ = {
            ...prev,
            kind: val.kind || prev.kind,
            category: val.category || prev.category || '',
            question: val.question || prev.question || '',
            answer: val.answer || prev.answer || '',
            explanation: val.explanation || prev.explanation || '',
            total: (prev.total || 0) + 1,
            correct: (prev.correct || 0) + (val.ok ? 1 : 0),
            lapses: (prev.lapses || 0) + (val.ok ? 0 : 1),
            last_ok: !!val.ok,
            updated_at: now
          };
          if (qIdx >= 0) st.questions[qIdx] = nextQ;
          else st.questions.push(nextQ);
          if (!val.ok) {
            const eIdx = st.errors.findIndex(e => e.qid === qid);
            const errRow = { ...nextQ, actual: val.actual || '', occurred_at: val.occurred_at };
            if (eIdx >= 0) st.errors[eIdx] = errRow;
            else st.errors.push(errRow);
          }
        }
        writeJson(K.practice, st);
        return jsonRes({ ok: true, ...st, attempt: val });
      }
      writeJson(K.practice, st);
      return jsonRes({ ok: true, ...st });
    }
    return jsonRes(st);
  }

  function handleNotebook(method, body) {
    const st = readJson(K.notebook, { ok: true, guest: false, entries: [] });
    if (!Array.isArray(st.entries)) st.entries = [];
    if (method === 'POST' && body && typeof body === 'object') {
      const id = body.id || body.word || crypto.randomUUID();
      const idx = st.entries.findIndex(e => e.id === id);
      const entry = { ...body, id, updated_at: new Date().toISOString() };
      if (idx >= 0) st.entries[idx] = entry;
      else st.entries.push(entry);
      writeJson(K.notebook, st);
      return jsonRes({ ok: true, guest: false, entry, entries: st.entries });
    }
    return jsonRes({ ok: true, guest: false, entries: st.entries });
  }

  function handleLearningPlan(method, body) {
    const st = readJson(K.plan, { ok: true, guest: false, plan: null });
    if (method === 'POST' && body && typeof body === 'object') {
      st.ok = true;
      st.guest = false;
      if ('plan' in body) st.plan = body.plan;
      writeJson(K.plan, st);
      return jsonRes(st);
    }
    return jsonRes({ ok: true, guest: false, plan: st.plan || null });
  }

  function handleKnowledge(method, body) {
    const st = readJson(K.knowledge, { ok: true, guest: false, entries: [] });
    if (!Array.isArray(st.entries)) st.entries = [];
    if (method === 'POST' && body && typeof body === 'object' && body.id) {
      const idx = st.entries.findIndex(e => e.id === body.id);
      const rev = idx >= 0 ? (st.entries[idx].revision || 0) + 1 : 1;
      const entry = { id: body.id, revision: rev, value: body.value || {} };
      if (idx >= 0) st.entries[idx] = entry;
      else st.entries.push(entry);
      writeJson(K.knowledge, st);
      return jsonRes({ ok: true, guest: false, entry, entries: st.entries });
    }
    return jsonRes({ ok: true, guest: false, entries: st.entries });
  }


  /* KF_VNEXPRESS_300_SYNC_HOOK + KF_GUARDIAN_400_SYNC_HOOK + KF_VNEXPRESS_400_SYNC_HOOK + KF_VNEXPRESS_500_SYNC_HOOK + KF_VNEXPRESS_700_SYNC_HOOK: zero-race parallel loaders for /data.json and /example-explanations/* across all pages & games */
  function ensureVnExpress300() {
    if (window.KFVnExpressPhrases300 && window.KFVnExpressPhrases300.version === '2026.11.20-v300-band9-r3') {
      return Promise.resolve(window.KFVnExpressPhrases300);
    }
    if (!window.__KF_VNEXPRESS_READY__) {
      window.__KF_VNEXPRESS_READY__ = (async () => {
        try {
          const r = await origFetch('/vnexpress-phrases-300.js?v=20261120-v300-r3', { cache: 'no-cache', credentials: 'same-origin' });
          if (r && r.ok) {
            const code = await r.text();
            if (code && code.trim()) {
              new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-300.js')();
            }
          }
        } catch (err) {
          console.warn('[KF Local Shim] VnExpress 300 load failed:', err);
        }
        return window.KFVnExpressPhrases300 || null;
      })();
    }
    return window.__KF_VNEXPRESS_READY__;
  }

  function ensureGuardian400() {
    if (window.KFGuardianPhrases400 && window.KFGuardianPhrases400.version === '2026.11.20-g400-band9-r2') {
      return Promise.resolve(window.KFGuardianPhrases400);
    }
    if (!window.__KF_GUARDIAN_READY__) {
      window.__KF_GUARDIAN_READY__ = (async () => {
        try {
          const r = await origFetch('/guardian-phrases-400.js?v=20261120-g2', { cache: 'no-cache', credentials: 'same-origin' });
          if (r && r.ok) {
            const code = await r.text();
            if (code && code.trim()) {
              new Function('"use strict";\n' + code + '\n//# sourceURL=guardian-phrases-400.js')();
            }
          }
        } catch (err) {
          console.warn('[KF Local Shim] Guardian 400 load failed:', err);
        }
        return window.KFGuardianPhrases400 || null;
      })();
    }
    return window.__KF_GUARDIAN_READY__;
  }

  function ensureVnExpress400() {
    if (window.KFVnExpressPhrases400 && window.KFVnExpressPhrases400.version === '2026.11.20-v400-band9-r2') {
      return Promise.resolve(window.KFVnExpressPhrases400);
    }
    if (!window.__KF_VNEXPRESS400_READY__) {
      window.__KF_VNEXPRESS400_READY__ = (async () => {
        try {
          const r = await origFetch('/vnexpress-phrases-400.js?v=20261120-v400-r2', { cache: 'no-cache', credentials: 'same-origin' });
          if (r && r.ok) {
            const code = await r.text();
            if (code && code.trim()) {
              new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-400.js')();
            }
          }
        } catch (err) {
          console.warn('[KF Local Shim] VnExpress 400 load failed:', err);
        }
        return window.KFVnExpressPhrases400 || null;
      })();
    }
    return window.__KF_VNEXPRESS400_READY__;
  }

  function ensureVnExpress500() {
    if (window.KFVnExpressPhrases500 && window.KFVnExpressPhrases500.version === '2026.11.20-v500-band9-r2') {
      return Promise.resolve(window.KFVnExpressPhrases500);
    }
    if (!window.__KF_VNEXPRESS500_READY__) {
      window.__KF_VNEXPRESS500_READY__ = (async () => {
        try {
          const r = await origFetch('/vnexpress-phrases-500.js?v=20261120-v500-r2', { cache: 'no-cache', credentials: 'same-origin' });
          if (r && r.ok) {
            const code = await r.text();
            if (code && code.trim()) {
              new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-500.js')();
            }
          }
        } catch (err) {
          console.warn('[KF Local Shim] VnExpress 500 load failed:', err);
        }
        return window.KFVnExpressPhrases500 || null;
      })();
    }
    return window.__KF_VNEXPRESS500_READY__;
  }

  function ensureVnExpress700() {
    if (window.KFVnExpressPhrases700 && window.KFVnExpressPhrases700.version === '2026.11.20-v700-band9-r2') {
      return Promise.resolve(window.KFVnExpressPhrases700);
    }
    if (!window.__KF_VNEXPRESS700_READY__) {
      window.__KF_VNEXPRESS700_READY__ = (async () => {
        try {
          const r = await origFetch('/vnexpress-phrases-700.js?v=20261120-v700-r2', { cache: 'no-cache', credentials: 'same-origin' });
          if (r && r.ok) {
            const code = await r.text();
            if (code && code.trim()) {
              new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-700.js')();
            }
          }
        } catch (err) {
          console.warn('[KF Local Shim] VnExpress 700 load failed:', err);
        }
        return window.KFVnExpressPhrases700 || null;
      })();
    }
    return window.__KF_VNEXPRESS700_READY__;
  }

  if (!isAdminLive && needsVocabGate) {
    ensureVnExpress300();
    ensureGuardian400();
    ensureVnExpress400();
    ensureVnExpress500();
    ensureVnExpress700();
  }

  window.fetch = async function patchedFetch(input, init) {
    try {
      const urlStr = typeof input === 'string' ? input : (input && input.url) || '';
      const u = new URL(urlStr, location.origin);
      if (u.origin === location.origin) {
        if (u.pathname === '/data.json') {
          if (window.__KF_BASE_MERGE_READY__ && !window.__KF_BASE_MERGE_DONE__) {
            await window.__KF_BASE_MERGE_READY__;
          }
          const [res, vne, gdn, vne400, vne500, vne700] = await Promise.all([
            origFetch(input, init),
            ensureVnExpress300(),
            ensureGuardian400(),
            ensureVnExpress400(),
            ensureVnExpress500(),
            ensureVnExpress700()
          ]);
          const packs = [vne, gdn, vne400, vne500, vne700].filter(p => p && typeof p.apply === 'function');
          if (res && res.ok && packs.length) {
            let data = await res.json();
            for (const pack of packs) data = pack.apply(data);
            return jsonRes(data, res.status);
          }
          return res;
        }
        if (u.pathname === '/example-explanations/index.json') {
          const [res, vne, gdn, vne400, vne500, vne700] = await Promise.all([
            origFetch(input, init),
            ensureVnExpress300(),
            ensureGuardian400(),
            ensureVnExpress400(),
            ensureVnExpress500(),
            ensureVnExpress700()
          ]);
          const baseIds = res && res.ok ? await res.json() : [];
          const merged = Array.isArray(baseIds) ? baseIds.slice() : [];
          const seen = new Set(merged);
          for (const pack of [vne, gdn, vne400, vne500, vne700]) {
            if (pack && Array.isArray(pack.explanationIds)) {
              for (const id of pack.explanationIds) {
                if (!seen.has(id)) {
                  merged.push(id);
                  seen.add(id);
                }
              }
            }
          }
          return jsonRes(merged, 200);
        }
        const shardMatch = u.pathname.match(/^\/example-explanations\/([0-9a-f]{2})\.json$/i);
        if (shardMatch) {
          const shard = shardMatch[1].toLowerCase();
          const [res, vne, gdn, vne400, vne500, vne700] = await Promise.all([
            origFetch(input, init).catch(() => null),
            ensureVnExpress300(),
            ensureGuardian400(),
            ensureVnExpress400(),
            ensureVnExpress500(),
            ensureVnExpress700()
          ]);
          const baseObj = res && res.ok ? await res.json() : {};
          const extraVne = vne && typeof vne.getShard === 'function' ? vne.getShard(shard) : null;
          const extraGdn = gdn && typeof gdn.getShard === 'function' ? gdn.getShard(shard) : null;
          const extraVne400 = vne400 && typeof vne400.getShard === 'function' ? vne400.getShard(shard) : null;
          const extraVne500 = vne500 && typeof vne500.getShard === 'function' ? vne500.getShard(shard) : null;
          const extraVne700 = vne700 && typeof vne700.getShard === 'function' ? vne700.getShard(shard) : null;
          if ((extraVne && typeof extraVne === 'object') || (extraGdn && typeof extraGdn === 'object') || (extraVne400 && typeof extraVne400 === 'object') || (extraVne500 && typeof extraVne500 === 'object') || (extraVne700 && typeof extraVne700 === 'object')) {
            return jsonRes(Object.assign({}, baseObj, extraVne || {}, extraGdn || {}, extraVne400 || {}, extraVne500 || {}, extraVne700 || {}), 200);
          }
          if (res) return jsonRes(baseObj, res.status);
          return jsonRes({}, 200);
        }
      }
      if (u.origin === location.origin && u.pathname.startsWith('/api/')) {
        const method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        let body = null;
        if (init && init.body && typeof init.body === 'string') {
          try { body = JSON.parse(init.body); } catch { body = null; }
        }
        if (u.pathname === '/api/session') {
          return jsonRes({
            authenticated: true,
            guest: false,
            displayName: 'Khang',
            user: { name: 'Khang', id: 'owner' }
          });
        }
        if (u.pathname === '/api/study') return handleStudy(method, body);
        if (u.pathname === '/api/practice') return handlePractice(method, body);
        if (u.pathname === '/api/practice/notebook') return handleNotebook(method, body);
        if (u.pathname === '/api/learning-plan') return handleLearningPlan(method, body);
        if (u.pathname === '/api/knowledge') return handleKnowledge(method, body);
        if (u.pathname === '/api/backup') {
          return jsonRes({ ok: true, guest: false, backups: [], study: getStudyState(), practice: getPracticeState() });
        }
        if (u.pathname === '/api/tidians/live-override') {
          if (u.searchParams.get('asset')) return origFetch('/live-override-custom.js', { cache: 'default' });
          return origFetch('/live-override-data.json', { cache: 'default' });
        }
        if (u.pathname === '/api/ielts/source') {
          const id = u.searchParams.get('id');
          if (!id) return jsonRes({ error: 'Thiếu mã đề IELTS.' }, 400);
          return origFetch(`/ielts/sources/${encodeURIComponent(id)}.json`, { cache: 'default' });
        }
      }
    } catch (e) {
      console.warn('[KF Local Shim] fallback to network', e);
    }
    return origFetch(input, init);
  };
})();
