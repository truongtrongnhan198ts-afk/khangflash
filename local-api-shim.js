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

  function addDaysIso(iso, days) {
    const parts = String(iso || todayIso()).split('-').map(Number);
    const d = new Date(parts[0], (parts[1] || 1) - 1, (parts[2] || 1) + Number(days || 0));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function diffDaysIso(fromIso, toIso) {
    const a = String(fromIso || todayIso()).split('-').map(Number);
    const b = String(toIso || todayIso()).split('-').map(Number);
    const t1 = Date.UTC(a[0], (a[1] || 1) - 1, a[2] || 1);
    const t2 = Date.UTC(b[0], (b[1] || 1) - 1, b[2] || 1);
    return Math.max(1, Math.round((t2 - t1) / 86400000));
  }

  function computeRatingPlans(prev, todayStr) {
    const t = todayStr || todayIso();
    const reps = prev && typeof prev.reps === 'number' ? prev.reps : 0;
    const interval = prev && typeof prev.interval === 'number' ? prev.interval : 0;
    const ease = prev && typeof prev.ease === 'number' ? prev.ease : 2.5;
    const isEarly = Boolean(prev && prev.status === 'known' && prev.due && prev.due > t);

    const p1 = { days: 1, due: addDaysIso(t, 1), retained: false };
    let d2, d3, d4;
    if (!prev || reps <= 0) {
      d2 = 2;
      d3 = 3;
      d4 = 7;
    } else {
      d2 = Math.max(1, Math.round(Math.max(1, interval || 1) * 1.2));
      d3 = reps === 1 ? 3 : reps === 2 ? 7 : Math.max(3, Math.round((interval || 3) * ease));
      d4 = reps === 1 ? 7 : reps === 2 ? 14 : Math.max(7, Math.round((interval || 3) * ease * 1.35));
    }

    return {
      1: p1,
      2: { days: d2, due: addDaysIso(t, d2), retained: false },
      3: isEarly ? { days: diffDaysIso(t, prev.due), due: prev.due, retained: true } : { days: d3, due: addDaysIso(t, d3), retained: false },
      4: isEarly ? { days: diffDaysIso(t, prev.due), due: prev.due, retained: true } : { days: d4, due: addDaysIso(t, d4), retained: false }
    };
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
    st.newCardPlans = computeRatingPlans(null, t);
    st.cards = st.cards.map(c => (c && typeof c === 'object' ? { ...c, ratingPlans: computeRatingPlans(c, t) } : c));
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
          const rawRate = typeof r.rating === 'number'
            ? r.rating
            : (typeof r.quality === 'number'
              ? (r.quality <= 1 ? 1 : r.quality === 2 ? 2 : r.quality >= 4 ? 4 : 3)
              : (r.ok === false || r.status === 'review' || r.status === 'again' ? 1 : 3));
          const rate = Math.max(1, Math.min(4, Math.round(rawRate)));
          const plans = computeRatingPlans(prev, t);
          const chosenPlan = plans[rate] || plans[3];

          let reps = prev.reps || 0;
          let interval = chosenPlan.days;
          let ease = prev.ease || 2.5;
          let lapses = prev.lapses || 0;

          if (rate === 1) {
            reps = 0;
            interval = 1;
            lapses += 1;
            ease = Math.max(1.3, +(ease - 0.2).toFixed(2));
          } else if (rate === 2) {
            reps = Math.max(1, reps);
            ease = Math.max(1.3, +(ease - 0.1).toFixed(2));
          } else if (rate === 3) {
            reps = chosenPlan.retained ? Math.max(1, reps) : reps + 1;
          } else {
            reps = chosenPlan.retained ? Math.max(1, reps) : (reps === 0 ? 2 : reps + 1);
            ease = Math.min(3.0, +(ease + 0.15).toFixed(2));
          }

          const nextStatus = rate === 1 ? 'review' : (r.status || 'known');
          const nextCard = {
            ...prev,
            card_id: cid,
            status: nextStatus,
            rating: rate,
            reps,
            interval,
            ease,
            lapses,
            due: r.due || chosenPlan.due,
            last_reviewed: t,
            updated_at: new Date().toISOString()
          };
          nextCard.ratingPlans = computeRatingPlans(nextCard, t);
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


  /* KF_VNEXPRESS_300_SYNC_HOOK + KF_GUARDIAN_400_SYNC_HOOK + KF_VNEXPRESS_400_SYNC_HOOK + KF_VNEXPRESS_500_SYNC_HOOK + KF_VNEXPRESS_700_SYNC_HOOK + KF_VNEXPRESS_1000_SYNC_HOOK: zero-race parallel loaders for /data.json and /example-explanations/* across all pages & games */
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
    if (window.KFVnExpressPhrases700 && window.KFVnExpressPhrases700.version === '2026.11.20-v700-band9-r3') {
      return Promise.resolve(window.KFVnExpressPhrases700);
    }
    if (!window.__KF_VNEXPRESS700_READY__) {
      window.__KF_VNEXPRESS700_READY__ = (async () => {
        try {
          const r = await origFetch('/vnexpress-phrases-700.js?v=20261120-v700-r3', { cache: 'no-cache', credentials: 'same-origin' });
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

  function ensureVnExpress1000() {
    if (window.KFVnExpressPhrases1000 && window.KFVnExpressPhrases1000.version === '2026.11.20-v1000-band9-r2') {
      return Promise.resolve(window.KFVnExpressPhrases1000);
    }
    if (!window.__KF_VNEXPRESS1000_READY__) {
      window.__KF_VNEXPRESS1000_READY__ = (async () => {
        try {
          const r = await origFetch('/vnexpress-phrases-1000.js?v=20261120-v1000-r2', { cache: 'no-cache', credentials: 'same-origin' });
          if (r && r.ok) {
            const code = await r.text();
            if (code && code.trim()) {
              new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-1000.js')();
            }
          }
        } catch (err) {
          console.warn('[KF Local Shim] VnExpress 1000 load failed:', err);
        }
        return window.KFVnExpressPhrases1000 || null;
      })();
    }
    return window.__KF_VNEXPRESS1000_READY__;
  }


  function ensureVnExpressW6() {
    if (window.KFVnExpressPhrasesW6 && window.KFVnExpressPhrasesW6.version === '2026.11.20-w6-band9-r1') {
      return Promise.resolve(window.KFVnExpressPhrasesW6);
    }
    if (!window.__KF_VNEXPRESSW6_READY__) {
      window.__KF_VNEXPRESSW6_READY__ = (async () => {
        try {
          const r = await origFetch('/vnexpress-phrases-w6.js?v=20261120-w6-r1', { cache: 'no-cache', credentials: 'same-origin' });
          if (r && r.ok) {
            const code = await r.text();
            if (code && code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w6.js')();
          }
        } catch (err) { console.warn('[KF Local Shim] VnExpress W6 load failed:', err); }
        return window.KFVnExpressPhrasesW6 || null;
      })();
    }
    return window.__KF_VNEXPRESSW6_READY__;
  }

  function ensureVnExpressW7() {
    if (window.KFVnExpressPhrasesW7 && window.KFVnExpressPhrasesW7.version === '2026.11.20-w7-band9-r1') {
      return Promise.resolve(window.KFVnExpressPhrasesW7);
    }
    if (!window.__KF_VNEXPRESSW7_READY__) {
      window.__KF_VNEXPRESSW7_READY__ = (async () => {
        try {
          const r = await origFetch('/vnexpress-phrases-w7.js?v=20261120-w7-r1', { cache: 'no-cache', credentials: 'same-origin' });
          if (r && r.ok) {
            const code = await r.text();
            if (code && code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w7.js')();
          }
        } catch (err) { console.warn('[KF Local Shim] VnExpress W7 load failed:', err); }
        return window.KFVnExpressPhrasesW7 || null;
      })();
    }
    return window.__KF_VNEXPRESSW7_READY__;
  }

  function ensureVnExpressW8() {
    if (window.KFVnExpressPhrasesW8 && window.KFVnExpressPhrasesW8.version === '2026.11.20-w8-band9-r1') {
      return Promise.resolve(window.KFVnExpressPhrasesW8);
    }
    if (!window.__KF_VNEXPRESSW8_READY__) {
      window.__KF_VNEXPRESSW8_READY__ = (async () => {
        try {
          const r = await origFetch('/vnexpress-phrases-w8.js?v=20261120-w8-r1', { cache: 'no-cache', credentials: 'same-origin' });
          if (r && r.ok) {
            const code = await r.text();
            if (code && code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w8.js')();
          }
        } catch (err) { console.warn('[KF Local Shim] VnExpress W8 load failed:', err); }
        return window.KFVnExpressPhrasesW8 || null;
      })();
    }
    return window.__KF_VNEXPRESSW8_READY__;
  }

  function ensureVnExpressW9() {
    if (window.KFVnExpressPhrasesW9 && window.KFVnExpressPhrasesW9.version === '2026.11.21-w9-band9-r1') {
      return Promise.resolve(window.KFVnExpressPhrasesW9);
    }
    if (!window.__KF_VNEXPRESSW9_READY__) {
      window.__KF_VNEXPRESSW9_READY__ = (async () => {
        try {
          const r = await origFetch('/vnexpress-phrases-w9.js?v=20261121-w9-r1', { cache: 'no-cache', credentials: 'same-origin' });
          if (r && r.ok) {
            const code = await r.text();
            if (code && code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w9.js')();
          }
        } catch (err) { console.warn('[KF Local Shim] VnExpress W9 load failed:', err); }
        return window.KFVnExpressPhrasesW9 || null;
      })();
    }
    return window.__KF_VNEXPRESSW9_READY__;
  }


  function ensureVnExpressW10() {
    if (window.KFVnExpressPhrasesW10 && window.KFVnExpressPhrasesW10.version === '2026.11.21-w10-band9-r1') {
      return Promise.resolve(window.KFVnExpressPhrasesW10);
    }
    if (!window.__KF_VNEXPRESSW10_READY__) {
      window.__KF_VNEXPRESSW10_READY__ = (async () => {
        try {
          const r = await origFetch('/vnexpress-phrases-w10.js?v=20261121-w10-r1', { cache: 'no-cache', credentials: 'same-origin' });
          if (r && r.ok) {
            const code = await r.text();
            if (code && code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w10.js')();
          }
        } catch (err) { console.warn('[KF Local Shim] VnExpress W10 load failed:', err); }
        return window.KFVnExpressPhrasesW10 || null;
      })();
    }
    return window.__KF_VNEXPRESSW10_READY__;
  }


  function ensureVnExpressW11() {
    if (window.KFVnExpressPhrasesW11 && window.KFVnExpressPhrasesW11.version === '2026.11.21-w11-band9-r1') {
      return Promise.resolve(window.KFVnExpressPhrasesW11);
    }
    if (!window.__KF_VNEXPRESSW11_READY__) {
      window.__KF_VNEXPRESSW11_READY__ = (async () => {
        try {
          const r = await origFetch('/vnexpress-phrases-w11.js?v=20261121-w11-r1', { cache: 'no-cache', credentials: 'same-origin' });
          if (r && r.ok) {
            const code = await r.text();
            if (code && code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w11.js')();
          }
        } catch (err) { console.warn('[KF Local Shim] VnExpress W11 load failed:', err); }
        return window.KFVnExpressPhrasesW11 || null;
      })();
    }
    return window.__KF_VNEXPRESSW11_READY__;
  }


  function ensureVnExpressW12() {
    if (window.KFVnExpressPhrasesW12 && window.KFVnExpressPhrasesW12.version === '2026.11.21-w12-band9-r1') {
      return Promise.resolve(window.KFVnExpressPhrasesW12);
    }
    if (!window.__KF_VNEXPRESSW12_READY__) {
      window.__KF_VNEXPRESSW12_READY__ = (async () => {
        try {
          const r = await origFetch('/vnexpress-phrases-w12.js?v=20261121-w12-r1', { cache: 'no-cache', credentials: 'same-origin' });
          if (r && r.ok) {
            const code = await r.text();
            if (code && code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w12.js')();
          }
        } catch (err) { console.warn('[KF Local Shim] VnExpress W12 load failed:', err); }
        return window.KFVnExpressPhrasesW12 || null;
      })();
    }
    return window.__KF_VNEXPRESSW12_READY__;
  }


  function ensureVnExpressW13() {
    if (window.KFVnExpressPhrasesW13 && window.KFVnExpressPhrasesW13.version === '2026.11.21-w13-band9-r1') {
      return Promise.resolve(window.KFVnExpressPhrasesW13);
    }
    if (!window.__KF_VNEXPRESSW13_READY__) {
      window.__KF_VNEXPRESSW13_READY__ = (async () => {
        try {
          const r = await origFetch('/vnexpress-phrases-w13.js?v=20261121-w13-r1', { cache: 'no-cache', credentials: 'same-origin' });
          if (r && r.ok) {
            const code = await r.text();
            if (code && code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w13.js')();
          }
        } catch (err) { console.warn('[KF Local Shim] VnExpress W13 load failed:', err); }
        return window.KFVnExpressPhrasesW13 || null;
      })();
    }
    return window.__KF_VNEXPRESSW13_READY__;
  }


  function ensureVnExpressW14() {
    if (window.KFVnExpressPhrasesW14 && window.KFVnExpressPhrasesW14.version === '2026.11.21-w14-band9-r1') {
      return Promise.resolve(window.KFVnExpressPhrasesW14);
    }
    if (!window.__KF_VNEXPRESSW14_READY__) {
      window.__KF_VNEXPRESSW14_READY__ = (async () => {
        try {
          const r = await origFetch('/vnexpress-phrases-w14.js?v=20261121-w14-r1', { cache: 'no-cache', credentials: 'same-origin' });
          if (r && r.ok) {
            const code = await r.text();
            if (code && code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w14.js')();
          }
        } catch (err) { console.warn('[KF Local Shim] VnExpress W14 load failed:', err); }
        return window.KFVnExpressPhrasesW14 || null;
      })();
    }
    return window.__KF_VNEXPRESSW14_READY__;
  }


  function ensureVnExpressW15() {
    if (window.KFVnExpressPhrasesW15 && window.KFVnExpressPhrasesW15.version === '2026.11.21-w15-band9-r1') {
      return Promise.resolve(window.KFVnExpressPhrasesW15);
    }
    if (!window.__KF_VNEXPRESSW15_READY__) {
      window.__KF_VNEXPRESSW15_READY__ = (async () => {
        try {
          const r = await origFetch('/vnexpress-phrases-w15.js?v=20261121-w15-r1', { cache: 'no-cache', credentials: 'same-origin' });
          if (r && r.ok) {
            const code = await r.text();
            if (code && code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w15.js')();
          }
        } catch (err) { console.warn('[KF Local Shim] VnExpress W15 load failed:', err); }
        return window.KFVnExpressPhrasesW15 || null;
      })();
    }
    return window.__KF_VNEXPRESSW15_READY__;
  }


  function consolidateVnExpressWaves(data) {
    if (!data || !Array.isArray(data.cards)) return data;
    const isVneId = id => /^vnexpress-/i.test(String(id || '')) && String(id || '').toLowerCase() !== 'vnexpress-all';
    const foundWaves = new Set();
    if (Array.isArray(data.topics)) {
      for (const t of data.topics) { if (t && isVneId(t.id)) foundWaves.add(t.id); }
    }
    if (Array.isArray(data.sources)) {
      for (const s of data.sources) { if (s && isVneId(s.id)) foundWaves.add(s.id); }
    }
    let vneCardCount = 0;
    for (const c of data.cards) {
      if (!c) continue;
      let isVneCard = false;
      if (Array.isArray(c.topics)) {
        const nextTopics = [];
        const seenT = new Set();
        for (const tid of c.topics) {
          const mapped = isVneId(tid) ? 'vnexpress-all' : tid;
          if (isVneId(tid) || mapped === 'vnexpress-all') isVneCard = true;
          if (mapped && !seenT.has(mapped)) { seenT.add(mapped); nextTopics.push(mapped); }
        }
        c.topics = nextTopics;
      }
      if (c.sourceTopics && typeof c.sourceTopics === 'object') {
        const mergedSt = new Set(Array.isArray(c.sourceTopics['vnexpress-all']) ? c.sourceTopics['vnexpress-all'] : []);
        let touchedSt = false;
        for (const k of Object.keys(c.sourceTopics)) {
          if (isVneId(k)) {
            foundWaves.add(k);
            isVneCard = true;
            touchedSt = true;
            const arr = Array.isArray(c.sourceTopics[k]) ? c.sourceTopics[k] : [];
            for (const tid of arr) mergedSt.add(isVneId(tid) ? 'vnexpress-all' : tid);
            delete c.sourceTopics[k];
          }
        }
        if (touchedSt) {
          mergedSt.add('vnexpress-all');
          c.sourceTopics['vnexpress-all'] = Array.from(mergedSt);
        }
      }
      if (Array.isArray(c.variants)) {
        for (const v of c.variants) {
          if (v && isVneId(v.source)) {
            foundWaves.add(v.source);
            v.source = 'vnexpress-all';
            isVneCard = true;
          } else if (v && v.source === 'vnexpress-all') {
            isVneCard = true;
          }
        }
      }
      if (isVneCard) vneCardCount++;
    }
    if (vneCardCount === 0) return data;
    const waveCount = Math.max(foundWaves.size, Number(data.__kfVneWaveCount || 0));
    if (waveCount > 0) data.__kfVneWaveCount = waveCount;
    const waveLabel = waveCount > 0 ? `${waveCount} đợt báo chí` : 'nhiều đợt báo chí';
    const unifiedTopic = {
      id: 'vnexpress-all',
      title: 'VnExpress International · Tổng hợp báo chí',
      description: `${vneCardCount.toLocaleString('vi-VN')} cụm từ IELTS Band 8.5–9.0 cân bằng loại từ tổng hợp từ ${waveLabel} VnExpress International, kèm giải thích 4 phần.`,
      accent: 'sky'
    };
    const unifiedSource = {
      id: 'vnexpress-all',
      title: `VnExpress International · Tổng hợp (${waveLabel})`,
      category: 'Academic vocabulary',
      originalCount: vneCardCount,
      supplements: 0
    };
    if (Array.isArray(data.topics)) {
      data.topics = data.topics.filter(t => t && !isVneId(t.id) && t.id !== 'vnexpress-all');
      data.topics.unshift(unifiedTopic);
    }
    if (Array.isArray(data.sources)) {
      data.sources = data.sources.filter(s => s && !isVneId(s.id) && s.id !== 'vnexpress-all');
      data.sources.push(unifiedSource);
    }
    if (typeof data.cardCount === 'number') data.cardCount = data.cards.length;
    return data;
  }

  if (!isAdminLive && needsVocabGate) {
    ensureVnExpress300();
    ensureGuardian400();
    ensureVnExpress400();
    ensureVnExpress500();
    ensureVnExpress700();
    ensureVnExpress1000();
    ensureVnExpressW6();
    ensureVnExpressW7();
    ensureVnExpressW8();
    ensureVnExpressW9();
    ensureVnExpressW10();
    ensureVnExpressW11();
    ensureVnExpressW12();
    ensureVnExpressW13();
    ensureVnExpressW14();
    ensureVnExpressW15();
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
          const [res, vne, gdn, vne400, vne500, vne700, vne1000, vnew6, vnew7, vnew8, vnew9, vnew10, vnew11, vnew12, vnew13, vnew14, vnew15] = await Promise.all([
            origFetch(input, init),
            ensureVnExpress300(),
            ensureGuardian400(),
            ensureVnExpress400(),
            ensureVnExpress500(),
            ensureVnExpress700(),
            ensureVnExpress1000(),
            ensureVnExpressW6(),
            ensureVnExpressW7(),
            ensureVnExpressW8(),
            ensureVnExpressW9(),
            ensureVnExpressW10(),
            ensureVnExpressW11(),
            ensureVnExpressW12(),
            ensureVnExpressW13(),
            ensureVnExpressW14(),
            ensureVnExpressW15()
          ]);
          const packs = [vne, gdn, vne400, vne500, vne700, vne1000, vnew6, vnew7, vnew8, vnew9, vnew10, vnew11, vnew12, vnew13, vnew14, vnew15].filter(p => p && typeof p.apply === 'function');
          if (res && res.ok && packs.length) {
            let data = await res.json();
            for (const pack of packs) data = pack.apply(data);
            data = consolidateVnExpressWaves(data);
            return jsonRes(data, res.status);
          }
          return res;
        }
        if (u.pathname === '/example-explanations/index.json') {
          const [res, vne, gdn, vne400, vne500, vne700, vne1000, vnew6, vnew7, vnew8, vnew9, vnew10, vnew11, vnew12, vnew13, vnew14, vnew15] = await Promise.all([
            origFetch(input, init),
            ensureVnExpress300(),
            ensureGuardian400(),
            ensureVnExpress400(),
            ensureVnExpress500(),
            ensureVnExpress700(),
            ensureVnExpress1000(),
            ensureVnExpressW6(),
            ensureVnExpressW7(),
            ensureVnExpressW8(),
            ensureVnExpressW9(),
            ensureVnExpressW10(),
            ensureVnExpressW11(),
            ensureVnExpressW12(),
            ensureVnExpressW13(),
            ensureVnExpressW14(),
            ensureVnExpressW15()
          ]);
          const baseIds = res && res.ok ? await res.json() : [];
          const merged = Array.isArray(baseIds) ? baseIds.slice() : [];
          const seen = new Set(merged);
          for (const pack of [vne, gdn, vne400, vne500, vne700, vne1000, vnew6, vnew7, vnew8, vnew9, vnew10, vnew11, vnew12, vnew13, vnew14, vnew15]) {
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
          const [res, vne, gdn, vne400, vne500, vne700, vne1000, vnew6, vnew7, vnew8, vnew9, vnew10, vnew11, vnew12, vnew13, vnew14, vnew15] = await Promise.all([
            origFetch(input, init).catch(() => null),
            ensureVnExpress300(),
            ensureGuardian400(),
            ensureVnExpress400(),
            ensureVnExpress500(),
            ensureVnExpress700(),
            ensureVnExpress1000(),
            ensureVnExpressW6(),
            ensureVnExpressW7(),
            ensureVnExpressW8(),
            ensureVnExpressW9(),
            ensureVnExpressW10(),
            ensureVnExpressW11(),
            ensureVnExpressW12(),
            ensureVnExpressW13(),
            ensureVnExpressW14(),
            ensureVnExpressW15()
          ]);
          const baseObj = res && res.ok ? await res.json() : {};
          const extraVne = vne && typeof vne.getShard === 'function' ? vne.getShard(shard) : null;
          const extraGdn = gdn && typeof gdn.getShard === 'function' ? gdn.getShard(shard) : null;
          const extraVne400 = vne400 && typeof vne400.getShard === 'function' ? vne400.getShard(shard) : null;
          const extraVne500 = vne500 && typeof vne500.getShard === 'function' ? vne500.getShard(shard) : null;
          const extraVne700 = vne700 && typeof vne700.getShard === 'function' ? vne700.getShard(shard) : null;
          const extraVne1000 = vne1000 && typeof vne1000.getShard === 'function' ? vne1000.getShard(shard) : null;
          const extraW6 = vnew6 && typeof vnew6.getShard === 'function' ? vnew6.getShard(shard) : null;
          const extraW7 = vnew7 && typeof vnew7.getShard === 'function' ? vnew7.getShard(shard) : null;
          const extraW8 = vnew8 && typeof vnew8.getShard === 'function' ? vnew8.getShard(shard) : null;
          const extraW9 = vnew9 && typeof vnew9.getShard === 'function' ? vnew9.getShard(shard) : null;
          const extraW10 = vnew10 && typeof vnew10.getShard === 'function' ? vnew10.getShard(shard) : null;
          const extraW11 = vnew11 && typeof vnew11.getShard === 'function' ? vnew11.getShard(shard) : null;
          const extraW12 = vnew12 && typeof vnew12.getShard === 'function' ? vnew12.getShard(shard) : null;
          const extraW13 = vnew13 && typeof vnew13.getShard === 'function' ? vnew13.getShard(shard) : null;
          const extraW14 = vnew14 && typeof vnew14.getShard === 'function' ? vnew14.getShard(shard) : null;
          const extraW15 = vnew15 && typeof vnew15.getShard === 'function' ? vnew15.getShard(shard) : null;
          const extras = [extraVne, extraGdn, extraVne400, extraVne500, extraVne700, extraVne1000, extraW6, extraW7, extraW8, extraW9, extraW10, extraW11, extraW12, extraW13, extraW14, extraW15].filter(x => x && typeof x === 'object');
          if (extras.length) {
            return jsonRes(Object.assign({}, baseObj, ...extras), 200);
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
