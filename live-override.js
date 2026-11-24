/* KhangFlash Direct Loader + Reciprocal Idiom Antonyms (v3) */
(() => {
  'use strict';
  if (window.__KF_LIVE_OVERRIDE_BOOTED__) return; window.__KF_LIVE_OVERRIDE_BOOTED__ = true;
  const isVocabPage = /^\/(flashcard|flashcards|library|games|due|dashboard)(?:\.html)?\/?$/.test(location.pathname); if (isVocabPage && typeof window.fetch === 'function' && !window.__KF_EARLY_FETCH_HOOKED__) { window.__KF_EARLY_FETCH_HOOKED__ = true; const earlyOrigFetch = window.fetch.bind(window); window.fetch = async function(input, init) { const urlStr = typeof input === 'string' ? input : (input && input.url) || ''; let u = null; try { u = new URL(urlStr, location.origin); } catch {} if (u && u.pathname === '/data.json') { const topicId = getSingleTopicId(); if (topicId) { try { const tc = await readTopicCache(topicId); if (tc && Array.isArray(tc.cards)) { window.__KF_BASE_MERGE_DONE__ = true; if (typeof window.__KF_RESOLVE_BASE_MERGE__ === 'function') window.__KF_RESOLVE_BASE_MERGE__(); return { ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }), json: async () => tc, text: async () => JSON.stringify(tc), clone() { return this; } }; } } catch {} } try { const cached = await readMergedCache(); if (cached && Array.isArray(cached.cards) && cached.cards.length >= 60005) { window.__KF_BASE_MERGE_DONE__ = true; if (typeof window.__KF_RESOLVE_BASE_MERGE__ === 'function') window.__KF_RESOLVE_BASE_MERGE__(); const out = topicId ? buildTopicSlice(cached, topicId) : cached; if (topicId) Promise.resolve(writeTopicCache(topicId, out)).catch(() => {}); return { ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }), json: async () => out, text: async () => JSON.stringify(out), clone() { return this; } }; } } catch {} } return earlyOrigFetch(input, init); }; }
  
  /* KF_LOAD_KNOWLEDGE_TREE_V1 */
  (function loadKnowledgeTreeModule() {
    if (typeof window === 'undefined' || window.__KF_KT_LOADER__) return;
    if (!/^\/(flashcards|flashcard|library)(?:\.html)?\/?$/i.test(location.pathname)) return;
    window.__KF_KT_LOADER__ = true;
    const s = document.createElement('script');
    s.src = '/knowledge-tree.js?v=20261122-v1';
    s.defer = true;
    (document.head || document.documentElement).appendChild(s);
  })();

/* KF_COMPACT_DECK_GRID_V1 */
  (function injectCompactDeckGridStyle() {
    if (typeof document === 'undefined' || document.getElementById('kf-compact-deck-grid')) return;
    const css = [
      '.deck-grid{grid-template-columns:repeat(auto-fill,minmax(230px,1fr))!important;gap:12px!important;}',
      '@media(max-width:640px){.deck-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;}}',
      '.deck-grid .deck{min-height:152px!important;border-radius:18px!important;padding:14px 14px 12px!important;justify-content:space-between!important;}',
      '.deck-grid .deck h2{font-size:18px!important;line-height:1.22!important;margin:0 0 5px!important;}',
      '.deck-grid .deck>p{font-size:12px!important;line-height:1.4!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important;}',
      '.deck-grid .deck .deck-meta{font-size:11px!important;margin:8px 0 2px!important;letter-spacing:.02em!important;}',
      '.deck-grid .deck .deck-art{display:none!important;}',
      '.deck-grid .deck .deck-link-label{font-size:11px!important;margin-top:8px!important;}',
      '.deck-grid .deck .deck-stat{font-size:28px!important;margin:6px 0 0!important;}',
      '.deck-grid .deck .deck-grid-lines{height:40%!important;opacity:.65!important;}'
    ].join('\n');
    const st = document.createElement('style');
    st.id = 'kf-compact-deck-grid';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  })();
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


  function consolidateVnExpressWaves(data) {
    if (!data || !Array.isArray(data.cards)) return data;
    const isVneId = id => /^vnexpress-/i.test(String(id || '')) && String(id || '').toLowerCase() !== 'vnexpress-all';
    const isNewsTopicId = id => /^(vnexpress|guardian)-/i.test(String(id || ''));
    const ALIAS = {
      business: 'economy',
      markets: 'economy',
      property: 'housing',
      traffic: 'transport',
      infrastructure: 'transport',
      travel: 'tourism',
      sports: 'sport',
      world: 'globalisation',
      globalization: 'globalisation',
      urbanization: 'cities',
      urbanisation: 'cities',
      tech: 'technology',
      wellness: 'health',
      medicine: 'health',
      law: 'crime',
      policy: 'government',
      politics: 'government',
      climate: 'environment',
      nature: 'environment',
      animals: 'wildlife',
      music: 'arts',
      lifestyle: 'culture',
      career: 'work',
      employment: 'work',
      jobs: 'work',
      money: 'finance',
      banking: 'finance',
      parenting: 'family',
      children: 'family',
      agriculture: 'food',
      cuisine: 'food',
      language: 'language-communication',
      oceans: 'oceans-water',
      ocean: 'oceans-water',
      water: 'oceans-water',
      population: 'population-migration',
      migration: 'population-migration',
    };
    const EXTRA_META = {
      society: { title: 'Society & Modern Life', description: 'Từ vựng về xu hướng xã hội, lối sống hiện đại và biến chuyển cộng đồng.', accent: 'violet' },
      perspectives: { title: 'Society & Modern Life', description: 'Từ vựng về xu hướng xã hội, lối sống hiện đại và biến chuyển cộng đồng.', accent: 'violet' },
      'language-communication': { title: 'Language & Communication', description: 'Từ vựng bổ sung theo chủ đề Language & Communication.', accent: 'mint' },
      'oceans-water': { title: 'Oceans & Water', description: 'Từ vựng bổ sung theo chủ đề Oceans & Water.', accent: 'blue' },
      'population-migration': { title: 'Population & Migration', description: 'Từ vựng bổ sung theo chủ đề Population & Migration.', accent: 'coral' },
      'general-academic': { title: 'Chủ đề học thuật khác', description: 'Các cụm từ IELTS Band 8.5–9.0 thuộc các lĩnh vực học thuật mở rộng khác.', accent: 'sky' },
    };
    const TITLE_PREFIX_MAP = new Map();
    if (Array.isArray(data.topics)) {
      for (const t of data.topics) {
        if (t && t.id && t.title && !t.id.startsWith('speaking-unit-') && !isNewsTopicId(t.id)) {
          const tl = String(t.title).toLowerCase();
          if (tl.includes('language')) { TITLE_PREFIX_MAP.set('language', t.id); TITLE_PREFIX_MAP.set('language-communication', t.id); }
          if (tl.includes('ocean') || tl.includes('water')) { TITLE_PREFIX_MAP.set('oceans', t.id); TITLE_PREFIX_MAP.set('oceans-water', t.id); }
          if (tl.includes('population') || tl.includes('migration')) { TITLE_PREFIX_MAP.set('population', t.id); TITLE_PREFIX_MAP.set('population-migration', t.id); }
        }
      }
    }

    const validTopicIds = new Set();
    if (Array.isArray(data.topics)) {
      for (const t of data.topics) {
        if (t && t.id && !t.id.startsWith('speaking-unit-') && !isNewsTopicId(t.id)) {
          validTopicIds.add(t.id);
        }
      }
    }

    const createdTopics = new Map();
    function ensureCustomTopic(rawId) {
      const cleanId = String(rawId || 'general-academic').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'general-academic';
      const rawFinal = cleanId === 'perspectives' ? 'society'
        : cleanId === 'language' ? 'language-communication'
        : (cleanId === 'oceans' || cleanId === 'ocean' || cleanId === 'water') ? 'oceans-water'
        : (cleanId === 'population' || cleanId === 'migration') ? 'population-migration'
        : cleanId;
      const finalId = TITLE_PREFIX_MAP.get(rawFinal) || rawFinal;
      if (validTopicIds.has(finalId)) return finalId;
      if (!createdTopics.has(finalId)) {
        const preset = EXTRA_META[finalId];
        const title = preset ? preset.title : finalId.split('-').map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ');
        const desc = preset ? preset.description : `Từ vựng IELTS Band 8.5–9.0 chuyên sâu về chủ đề ${title}.`;
        createdTopics.set(finalId, { id: finalId, title, description: desc, accent: preset ? preset.accent : 'sky' });
        validTopicIds.add(finalId);
      }
      return finalId;
    }

    function pickPrimaryTopic(card) {
      const rawList = [];
      if (Array.isArray(card.topics)) rawList.push(...card.topics);
      if (card.sourceTopics && typeof card.sourceTopics === 'object') {
        for (const arr of Object.values(card.sourceTopics)) {
          if (Array.isArray(arr)) rawList.push(...arr);
        }
      }
      let unmappedTag = '';
      for (const tid of rawList) {
        const s = String(tid || '').trim();
        if (!s || s.startsWith('speaking-unit-') || isNewsTopicId(s)) continue;
        if (validTopicIds.has(s)) return s;
        const mappedTitleId = TITLE_PREFIX_MAP.get(s.toLowerCase());
        if (mappedTitleId && validTopicIds.has(mappedTitleId)) return mappedTitleId;
        const aliased = ALIAS[s.toLowerCase()];
        if (aliased && validTopicIds.has(aliased)) return aliased;
        if (!unmappedTag) unmappedTag = s;
      }
      const ctx = String(card.variants && card.variants[0] && card.variants[0].context || '').toLowerCase();
      for (const [k, v] of Object.entries(ALIAS)) {
        if (ctx.includes(k) && validTopicIds.has(v)) return v;
      }
      const blob = (String(card.term || '') + ' ' + String(card.definition || '')).toLowerCase();
      if (/school|student|universit|learn|teach|curriculum|exam|tuition/.test(blob) && validTopicIds.has('education')) return 'education';
      if (/climate|carbon|emission|flood|typhoon|pollut|forest|waste|green|solar|wind/.test(blob) && validTopicIds.has('environment')) return 'environment';
      if (/hospital|patient|disease|health|medical|mental|vaccine|cancer|diet|sleep/.test(blob) && validTopicIds.has('health')) return 'health';
      if (/\bai\b|chip|semiconductor|cyber|digital|software|robot|data|startup|5g/.test(blob) && validTopicIds.has('technology')) return 'technology';
      if (/metro|airport|traffic|highway|expressway|rail|port|flight|commut/.test(blob) && validTopicIds.has('transport')) return 'transport';
      if (/crime|fraud|corrupt|police|court|prison|law|illegal|smuggl/.test(blob) && validTopicIds.has('crime')) return 'crime';
      if (/policy|government|ministry|reform|tax|regulat|public|parliament/.test(blob) && validTopicIds.has('government')) return 'government';
      if (/tourist|tourism|hotel|visa|heritage|island|destination|travel/.test(blob) && validTopicIds.has('tourism')) return 'tourism';
      if (/house|housing|apartment|rent|real estate|urban|city|cities/.test(blob) && validTopicIds.has('housing')) return 'housing';
      if (/worker|salary|job|employ|layoff|labor|labour|career|workplace/.test(blob) && validTopicIds.has('work')) return 'work';
      if (/food|rice|coffee|farm|agricult|seafood|crop|nutrition/.test(blob) && validTopicIds.has('food')) return 'food';
      if (/bank|inflation|interest rate|stock|bond|gold|mortgage|credit/.test(blob) && validTopicIds.has('finance')) return 'finance';
      if (/trade|tariff|export|import|diplomat|global|asean|geopolit/.test(blob) && validTopicIds.has('globalisation')) return 'globalisation';
      return ensureCustomTopic(unmappedTag || 'general-academic');
    }

    const foundVneWaves = new Set();
    let vneCardCount = 0;

    for (const c of data.cards) {
      if (!c) continue;
      const speakingUnits = Array.isArray(c.topics)
        ? c.topics.filter(t => String(t || '').startsWith('speaking-unit-'))
        : [];
      const primary = pickPrimaryTopic(c);
      c.topics = speakingUnits.length ? [primary, ...speakingUnits] : [primary];

      let isVneCard = false;
      if (Array.isArray(c.variants)) {
        for (const v of c.variants) {
          if (v && isVneId(v.source)) {
            foundVneWaves.add(v.source);
            v.source = 'vnexpress-all';
            isVneCard = true;
          } else if (v && v.source === 'vnexpress-all') {
            isVneCard = true;
          }
        }
      }
      if (c.sourceTopics && typeof c.sourceTopics === 'object') {
        const nextSt = {};
        for (const k of Object.keys(c.sourceTopics)) {
          const mappedKey = isVneId(k) ? 'vnexpress-all' : k;
          if (isVneId(k) || mappedKey === 'vnexpress-all') {
            if (isVneId(k)) foundVneWaves.add(k);
            isVneCard = true;
          }
          if (mappedKey === 'pdf-8' && speakingUnits.length) {
            nextSt[mappedKey] = speakingUnits.slice();
          } else {
            nextSt[mappedKey] = [primary];
          }
        }
        c.sourceTopics = nextSt;
      }
      if (isVneCard) vneCardCount++;
    }

    if (Array.isArray(data.topics)) {
      data.topics = data.topics.filter(t => t && t.id && !isNewsTopicId(t.id));
      for (const ct of createdTopics.values()) {
        if (!data.topics.some(t => t && t.id === ct.id)) data.topics.push(ct);
      }
      // Final title-dedup pass: merge any duplicate non-speaking-unit topic boxes sharing the same title or canonical group
      const canonByTitle = new Map();
      const idRemap = new Map();
      const dedupedTopics = [];
      const cardCountsByTopic = Object.create(null);
      for (const c of data.cards) {
        if (!c || !Array.isArray(c.topics)) continue;
        for (const tid of c.topics) {
          if (tid) cardCountsByTopic[tid] = (cardCountsByTopic[tid] || 0) + 1;
        }
      }
      const normTopicKey = (t) => {
        const raw = String(t.title || t.id).normalize('NFKC').toLowerCase().replace(/&amp;/g, '&').replace(/[\u00a0\s]+/g, ' ').trim();
        if (raw === 'language & communication' || raw === 'language and communication' || raw === 'languages & communication') return 'language & communication';
        if (raw === 'population & migration' || raw === 'population and migration') return 'population & migration';
        if (raw === 'oceans & water' || raw === 'oceans and water' || raw === 'ocean & water' || raw === 'ocean and water') return 'oceans & water';
        return raw;
      };
      // Sort so the box with MORE cards (or non-generic description) wins as canonical keepId
      const groupedByKey = new Map();
      for (const t of data.topics) {
        if (!t || !t.id) continue;
        if (String(t.id).startsWith('speaking-unit-')) continue;
        const tk = normTopicKey(t);
        if (!groupedByKey.has(tk)) groupedByKey.set(tk, []);
        groupedByKey.get(tk).push(t);
      }
      for (const [tk, list] of groupedByKey.entries()) {
        if (list.length > 1) {
          list.sort((a, b) => (cardCountsByTopic[b.id] || 0) - (cardCountsByTopic[a.id] || 0));
          const keepId = list[0].id;
          canonByTitle.set(tk, keepId);
          for (let i = 1; i < list.length; i++) {
            if (list[i].id !== keepId) idRemap.set(list[i].id, keepId);
          }
        } else {
          canonByTitle.set(tk, list[0].id);
        }
      }
      for (const t of data.topics) {
        if (!t || !t.id) continue;
        if (String(t.id).startsWith('speaking-unit-') || !idRemap.has(t.id)) {
          dedupedTopics.push(t);
        }
      }
      if (idRemap.size > 0) {
        data.topics = dedupedTopics;
        for (const c of data.cards) {
          if (!c) continue;
          if (Array.isArray(c.topics)) {
            c.topics = Array.from(new Set(c.topics.map(tid => idRemap.get(tid) || tid)));
          }
          if (c.sourceTopics && typeof c.sourceTopics === 'object') {
            for (const k of Object.keys(c.sourceTopics)) {
              if (Array.isArray(c.sourceTopics[k])) {
                c.sourceTopics[k] = Array.from(new Set(c.sourceTopics[k].map(tid => idRemap.get(tid) || tid)));
              }
            }
          }
        }
      }
      // Rebalance oversized topics (>1050 cards) into under-1000 thematic topics with strict donor floor >=1050 (strictly idempotent)
      if (Array.isArray(data.cards) && data.cards.length > 5000 && Array.isArray(data.topics)) {
        const topicIdByAlias = new Map();
        for (const t of data.topics) {
          if (!t || !t.id) continue;
          const id = String(t.id);
          const tk = String(t.title || id).normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
          topicIdByAlias.set(id, id);
          if (tk === 'oceans & water' || tk === 'ocean & water') { topicIdByAlias.set('oceans', id); topicIdByAlias.set('oceans-water', id); }
          if (tk === 'language & communication' || tk === 'languages & communication') { topicIdByAlias.set('language', id); topicIdByAlias.set('language-communication', id); }
          if (tk === 'population & migration') { topicIdByAlias.set('population', id); topicIdByAlias.set('population-migration', id); }
        }
        const RULES = [
          { alias: 'energy', rx: /\b(energy|solar|wind power|renewable|electricity|power grid|fossil fuel|coal|crude oil|natural gas|nuclear power|hydropower|power plant|battery|carbon emission|greenhouse gas|clean fuel|megawatt|kilowatt|decarboniz|geothermal|biofuel)\b/gi },
          { alias: 'oceans', rx: /\b(ocean|marine|sea level|coral|reef|coastal|maritime|fishery|fisheries|seafood|tide|wave|offshore|island|beach|waterway|river|aquatic|flood|water supply|watershed|estuary|mangrove|shipping lane|seaport|plastic waste)\b/gi },
          { alias: 'speaking-weather-seasons', rx: /\b(weather|season|monsoon|typhoon|storm|heatwave|drought|rainfall|temperature|forecast|humid|winter|summer|autumn|spring|cold snap|hot spell|cyclone|el nino|precipitation|extreme heat|landslide)\b/gi },
          { alias: 'housing', rx: /\b(housing|apartment|rent|rental|tenant|landlord|mortgage|real estate|homeowner|condo|property market|living space|residential|affordable home|home price|housing crisis|homebuyer|eviction|suburban home)\b/gi },
          { alias: 'cities', rx: /\b(city|cities|urban|metropolitan|municipal|downtown|suburb|skyline|urban infrastructure|sidewalk|public space|megacity|urbanization|district|street life|civic|smart city|zoning|commuter)\b/gi },
          { alias: 'media', rx: /\b(media|advertising|advertisement|journalis|press|broadcast|social media|influencer|viral|headline|newsroom|propaganda|misinformation|disinformation|marketing campaign|brand awareness|publicity|tabloid|podcast|streaming platform)\b/gi },
          { alias: 'science', rx: /\b(science|scientific|research|laboratory|experiment|scientist|breakthrough|discovery|hypothesis|quantum|genetic|biotech|space exploration|astronomy|physics|chemistry|clinical trial|peer-reviewed|researcher|genome)\b/gi },
          { alias: 'family', rx: /\b(family|parent|parenting|childcare|sibling|elderly care|intergenerational|marriage|divorce|upbringing|kinship|relatives|motherhood|fatherhood|childhood|juvenile|family bond|nuclear family|extended family)\b/gi },
          { alias: 'population', rx: /\b(population|demograph|aging|ageing|birth rate|fertility|migration|migrant|immigrant|emigrant|overpopulation|census|depopulation|elderly ratio|labor force|brain drain|refugee|resettlement)\b/gi },
          { alias: 'language', rx: /\b(language|linguist|bilingual|multilingual|dialect|accent|vocabulary|fluency|translation|interpret|communication skill|slang|mother tongue|literacy|rhetoric|proficiency|native speaker|english|phonetic)\b/gi },
          { alias: 'sport', rx: /\b(sport|exercise|workout|fitness|athlete|marathon|football|soccer|tennis|badminton|swim|gym|training|coach|tournament|championship|match|stadium|medal|olympic|athletic|endurance|league)\b/gi },
          { alias: 'speaking-daily-routine-time-management', rx: /\b(daily|routine|morning|schedule|time management|deadline|habit|productivity|workday|punctual|procrastinat|work-life balance|sleep|burnout|overwork|shift work|daily commute|time-saving|multitask)\b/gi },
          { alias: 'speaking-hobbies-free-time', rx: /\b(hobby|hobbies|leisure|free time|pastime|recreation|collect|gardening|craft|hiking|cycling|camping|weekend getaway|unwinding|outdoor activity|amateur|enthusiast|club|photography)\b/gi },
          { alias: 'speaking-gifts-celebrations', rx: /\b(gift|present|souvenir|festival|holiday|celebrat|tet|lunar new year|ceremony|anniversary|feast|firework|festive|tradition|hospitality|banquet|ritual|commemorat)\b/gi },
          { alias: 'wildlife', rx: /\b(wildlife|species|endangered|biodiversity|habitat|ecosystem|conservation|poaching|animal|fauna|flora|mammal|bird|reptile|sanctuary|national park|extinction|predator|forest)\b/gi },
          { alias: 'arts', rx: /\b(art|artist|music|concert|museum|gallery|exhibition|painting|sculpture|theater|theatre|opera|symphony|literature|poetry|cinema|aesthetic|artistic|masterpiece|craftsmanship)\b/gi },
          { alias: 'equality', rx: /\b(equality|inequality|gender|discrimination|diversity|inclusion|inclusive|minority|marginalized|equity|human rights|empowerment|glass ceiling|pay gap|social justice|accessibility|bias|stereotype)\b/gi }
        ];
        const resolvedRules = [];
        const targetIds = new Set();
        for (const r of RULES) {
          const realId = topicIdByAlias.get(r.alias);
          if (realId) { resolvedRules.push({ id: realId, rx: r.rx }); targetIds.add(realId); }
        }
        const DONOR_FLOOR = 1050;
        const TARGET_CAP = 1060;
        const counts = Object.create(null);
        for (const c of data.cards) {
          if (!c || !Array.isArray(c.topics)) continue;
          const tid = c.topics.find(t => t && !String(t).startsWith('speaking-unit-'));
          if (tid) counts[tid] = (counts[tid] || 0) + 1;
        }
        const candidates = [];
        for (const c of data.cards) {
          if (!c || !Array.isArray(c.topics)) continue;
          const tid = c.topics.find(t => t && !String(t).startsWith('speaking-unit-'));
          if (!tid || targetIds.has(tid) || (counts[tid] || 0) <= DONOR_FLOOR) continue;
          if (/^(grammar|lexical-patterns|phrasal|speaking-cum-|speaking-tranh-)/.test(tid)) continue;
          const v0 = (Array.isArray(c.variants) && c.variants[0]) || {};
          const titleText = String(v0.sourceTitle || '');
          const bodyText = String(c.term || '') + ' ' + String(v0.example || '');
          let bestTarget = null, bestScore = 0;
          for (const r of resolvedRules) {
            const tm = titleText.match(r.rx);
            const bm = bodyText.match(r.rx);
            const score = (tm ? tm.length * 2 : 0) + (bm ? bm.length : 0);
            if (score >= 2 && score > bestScore) { bestScore = score; bestTarget = r.id; }
          }
          if (bestTarget && (counts[bestTarget] || 0) < TARGET_CAP) {
            candidates.push({ card: c, from: tid, to: bestTarget, score: bestScore });
          }
        }
        candidates.sort((a, b) => (b.score - a.score) || String(a.card.id || '').localeCompare(String(b.card.id || '')));
        for (const cand of candidates) {
          if ((counts[cand.from] || 0) <= DONOR_FLOOR) continue;
          if ((counts[cand.to] || 0) >= TARGET_CAP) continue;
          const su = cand.card.topics.filter(t => String(t).startsWith('speaking-unit-'));
          cand.card.topics = [cand.to, ...su];
          if (cand.card.sourceTopics && typeof cand.card.sourceTopics === 'object') {
            for (const k of Object.keys(cand.card.sourceTopics)) {
              cand.card.sourceTopics[k] = [cand.to];
            }
          }
          counts[cand.from]--;
          counts[cand.to] = (counts[cand.to] || 0) + 1;
        }
      }
    }

    if (Array.isArray(data.sources) && vneCardCount > 0) {
      for (const s of data.sources) {
        if (s && isVneId(s.id)) foundVneWaves.add(s.id);
      }
      const wc = Math.max(foundVneWaves.size, Number(data.__kfVneWaveCount || 0));
      if (wc > 0) data.__kfVneWaveCount = wc;
      const wl = wc > 0 ? `${wc} đợt báo chí` : 'nhiều đợt báo chí';
      data.sources = data.sources.filter(s => s && !isVneId(s.id) && s.id !== 'vnexpress-all');
      data.sources.push({
        id: 'vnexpress-all',
        title: `VnExpress International · Tổng hợp (${wl})`,
        category: 'Academic vocabulary',
        originalCount: vneCardCount,
        supplements: 0
      });
    }

    if (typeof data.cardCount === 'number') data.cardCount = data.cards.length;

      // Pass 2: Strict term-only spillover from oversized topics (>1500 cards) into smaller thematic topics (cap 1500, donor floor 1450, strictly idempotent)
      if (Array.isArray(data.cards) && data.cards.length > 5000 && Array.isArray(data.topics)) {
        const SPILL_FLOOR = 1500;
        const SPILL_CAP = 1500;
        const SPILL_RULES = [
          { target: 'finance', rx: /\b(bank|banking|mortgage|loan|credit|debt|savings|household budget|personal finance|interest rate|inflation|recession|pension|insurance|stock market|equity|bond|investor|investment|dividend|bankruptcy|taxpayer|cryptocurrency|fintech|remittance|microfinance|cashless|wallet|overdraft|borrowing|lending|interest-bearing)\b/i },
          { target: 'globalisation', rx: /\b(export|import|tariff|trade war|free trade|supply chain|multinational|cross-border|foreign direct investment|fdi|geopolitic|bilateral|multilateral|customs|outsourcing|offshoring|global market|worldwide|international trade|protectionism|sanction|diplomatic|asean|wto|embargo)\b/i },
          { target: 'work', rx: /\b(worker|employee|employer|workplace|layoff|redundancy|wage|salary|payroll|minimum wage|remote work|hybrid work|gig economy|freelance|unemployment|labor force|labour force|recruitment|hiring|promotion|burnout|overtime|trade union|strike|career|job market|apprenticeship|intern|reskilling|upskilling|workforce)\b/i },
          { target: 'housing', rx: /\b(housing|real estate|property|apartment|condo|mortgage|rent|rental|tenant|landlord|homeowner|homebuyer|eviction|homeless|affordable home|residential|suburban|gentrification|slum|social housing)\b/i },
          { target: 'tourism', rx: /\b(tourist|tourism|hospitality|hotel|resort|airline|aviation|visa|passport|sightseeing|ecotourism|backpacker|itinerary|traveler|traveller|cruise|destination|holidaymaker|souvenir|charter flight)\b/i },
          { target: 'transport', rx: /\b(highway|expressway|metro|subway|railway|railroad|commuter|traffic|congestion|airport|seaport|shipping|logistics|freight|electric vehicle|ev charging|autonomous vehicle|public transit|bus rapid|toll|pedestrian|cycling lane|bike lane|ride-hailing|infrastructure)\b/i },
          { target: 'cities', rx: /\b(urban|city|cities|metropolitan|municipal|downtown|skyline|megacity|urbanization|urbanisation|zoning|sidewalk|public space|civic|smart city|borough|district|sprawl|inner-city)\b/i },
          { target: 'crime', rx: /\b(crime|criminal|fraud|scam|embezzlement|bribery|corruption|money laundering|cybercrime|phishing|ransomware|hacking|theft|robbery|smuggling|trafficking|prosecution|indictment|verdict|prison|detention|law enforcement|police|judiciary|courtroom|litigation|penalty|crackdown|illegal|illicit)\b/i },
          { target: 'equality', rx: /\b(inequality|discrimination|gender gap|pay gap|minority|marginalized|marginalised|disadvantaged|social mobility|inclusivity|diversity|human rights|civil rights|poverty|low-income|welfare|social safety net|empowerment|vulnerable group|underrepresented|prejudice|bias|equity)\b/i },
          { target: 'energy', rx: /\b(solar|wind power|renewable|hydropower|nuclear power|fossil fuel|coal|crude oil|natural gas|electricity|power grid|power plant|battery|megawatt|kilowatt|decarboniz|biofuel|geothermal|energy transition|net-zero|clean energy|green hydrogen|lng|petroleum)\b/i },
          { target: 'oceans-water', rx: /\b(ocean|marine|sea level|coral|reef|coastal|maritime|fishery|fisheries|aquaculture|seafood|tide|offshore|waterway|river|estuary|mangrove|watershed|freshwater|desalination|salinity|seawater|aquifer|groundwater|shipping lane|seaport|oil spill|marine plastic)\b/i },
          { target: 'wildlife', rx: /\b(wildlife|endangered|biodiversity|poaching|habitat|species|ecosystem|conservation|deforestation|reforestation|fauna|flora|predator|mammal|migratory|sanctuary|national park|extinction|animal welfare)\b/i },
          { target: 'speaking-weather-seasons', rx: /\b(typhoon|hurricane|cyclone|monsoon|heatwave|drought|flooding|flash flood|storm|rainfall|precipitation|el nino|la nina|cold snap|blizzard|wildfire|landslide|extreme weather|temperature|seasonal|humidity|forecast)\b/i },
          { target: 'food', rx: /\b(agriculture|agricultural|farming|farmer|crop|harvest|livestock|poultry|fertilizer|pesticide|organic food|food security|nutrition|malnutrition|obesity|diet|dietary|processed food|ultra-processed|restaurant|cuisine|beverage|dairy|grain|rice|coffee|agribusiness|famine)\b/i },
          { target: 'science', rx: /\b(research|researcher|laboratory|experiment|clinical trial|genome|genetic|dna|biotech|quantum|physics|chemistry|astronomy|spacecraft|satellite|observatory|peer-reviewed|hypothesis|breakthrough|molecular|neuroscience|stem cell|microbiology|archaeolog)\b/i },
          { target: 'media', rx: /\b(social media|journalism|journalist|newsroom|broadcast|advertising|advertisement|propaganda|misinformation|disinformation|fake news|algorithmic feed|influencer|content creator|podcast|streaming|tabloid|censorship|press freedom|publicity|viral|clickbait)\b/i },
          { target: 'family', rx: /\b(family|parent|parenting|childcare|childhood|sibling|elderly care|nursing home|intergenerational|marriage|divorce|upbringing|maternity|paternity|juvenile|adolescent|teenager|household|caregiver|kinship)\b/i },
          { target: 'population-migration', rx: /\b(demographic|aging population|ageing population|birth rate|fertility rate|life expectancy|migration|migrant|immigrant|emigrant|refugee|asylum|brain drain|depopulation|overpopulation|census|urban-rural migration|diaspora|resettlement)\b/i },
          { target: 'sport', rx: /\b(athlete|athletic|championship|tournament|olympic|marathon|fitness|workout|exercise|sedentary|stadium|coach|referee|doping|sportsmanship|league|training regimen|physical activity|cardiovascular fitness)\b/i },
          { target: 'arts', rx: /\b(museum|gallery|exhibition|sculpture|painting|architecture|concert|symphony|cinema|film|theater|theatre|literature|novel|poetry|aesthetic|artistic|craftsmanship|performing arts|orchestra)\b/i },
          { target: 'culture', rx: /\b(heritage|tradition|traditional|custom|ritual|festival|folklore|cultural identity|indigenous|multicultural|subculture|etiquette|monument|historic site|unesco|ancestral|gastronomy)\b/i },
          { target: 'language-communication', rx: /\b(language|linguistic|bilingual|multilingual|dialect|accent|translation|interpreter|literacy|rhetoric|persuasion|negotiation|public speaking|interpersonal|miscommunication|jargon|slang|mother tongue|vernacular|proficiency)\b/i }
        ];
        const validSet = new Set(data.topics.filter(t => t && t.id && !String(t.id).startsWith('speaking-unit-')).map(t => t.id));
        const spCounts = Object.create(null);
        const byPrimary = new Map();
        for (const c of data.cards) {
          if (!c || !Array.isArray(c.topics) || !c.topics.length) continue;
          const prim = c.topics.find(tid => tid && !String(tid).startsWith('speaking-unit-'));
          if (!prim) continue;
          spCounts[prim] = (spCounts[prim] || 0) + 1;
          if (!byPrimary.has(prim)) byPrimary.set(prim, []);
          byPrimary.get(prim).push(c);
        }
        const oversized = [...byPrimary.keys()]
          .filter(tid => (spCounts[tid] || 0) > SPILL_CAP)
          .sort((a, b) => (spCounts[b] || 0) - (spCounts[a] || 0) || a.localeCompare(b));
        for (const donorId of oversized) {
          const pool = (byPrimary.get(donorId) || []).slice().sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
          for (const c of pool) {
            if ((spCounts[donorId] || 0) <= SPILL_FLOOR) break;
            const term = String(c.term || '');
            if (!term) continue;
            let dest = null;
            for (const rule of SPILL_RULES) {
              if (rule.target === donorId) continue;
              if (!validSet.has(rule.target)) continue;
              if ((spCounts[rule.target] || 0) >= SPILL_CAP) continue;
              if (rule.rx.test(term)) { dest = rule.target; break; }
            }
            if (!dest) continue;
            const speakingUnits = Array.isArray(c.topics) ? c.topics.filter(t => String(t || '').startsWith('speaking-unit-')) : [];
            c.topics = speakingUnits.length ? [dest, ...speakingUnits] : [dest];
            if (c.sourceTopics && typeof c.sourceTopics === 'object') {
              for (const k of Object.keys(c.sourceTopics)) {
                if (k === 'pdf-8' && speakingUnits.length) continue;
                c.sourceTopics[k] = [dest];
              }
            }
            spCounts[donorId]--;
            spCounts[dest] = (spCounts[dest] || 0) + 1;
          }
        }
      }

    return data;
  }

  function applyAllExpansionPacks(d) {
    const names = [
      'KFVnExpressPhrases300','KFGuardianPhrases400','KFVnExpressPhrases400','KFVnExpressPhrases500',
      'KFVnExpressPhrases700','KFVnExpressPhrases1000','KFVnExpressPhrasesW6','KFVnExpressPhrasesW7',
      'KFVnExpressPhrasesW8','KFVnExpressPhrasesW9','KFVnExpressPhrasesW10','KFVnExpressPhrasesW11',
      'KFVnExpressPhrasesW12','KFVnExpressPhrasesW13','KFVnExpressPhrasesW14','KFVnExpressPhrasesW15',
      'KFVnExpressPhrasesW16','KFVnExpressPhrasesW17','KFVnExpressPhrasesW18','KFVnExpressPhrasesW19',
      'KFVnExpressPhrasesW20'
    ];
    for (const nm of names) {
      const p = window[nm];
      if (p && typeof p.apply === 'function') d = p.apply(d);
    }
    return consolidateVnExpressWaves(d);
  }

  const IDB_NAME = 'kf_merged_data_cache_v1', IDB_STORE = 'kv', IDB_KEY = 'data_v20261122_6'; let _memMergedCache = null, _memMergedCachePromise = null; function openCacheDB() { return new Promise((resolve, reject) => { try { if (typeof indexedDB === 'undefined') return reject(new Error('No indexedDB')); const req = indexedDB.open(IDB_NAME, 1); req.onupgradeneeded = () => { try { const db = req.result; if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE); } catch {} }; req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); } catch (e) { reject(e); } }); } async function readMergedCache() { if (_memMergedCache && Array.isArray(_memMergedCache.cards) && _memMergedCache.cards.length >= 60005) return _memMergedCache; if (_memMergedCachePromise) return _memMergedCachePromise; _memMergedCachePromise = (async () => { try { const db = await openCacheDB(); const res = await new Promise((resolve) => { try { const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(IDB_KEY); req.onsuccess = () => resolve(req.result || null); req.onerror = () => resolve(null); } catch { resolve(null); } }); if (res && Array.isArray(res.cards) && res.cards.length >= 60005) _memMergedCache = res; return res; } catch { return null; } finally { _memMergedCachePromise = null; } })(); return _memMergedCachePromise; } async function writeMergedCache(data) { if (data && Array.isArray(data.cards) && data.cards.length >= 60005) _memMergedCache = data; try { const db = await openCacheDB(); await new Promise((resolve) => { try { const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(data, IDB_KEY); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false); } catch { resolve(false); } }); } catch {} } function getSingleTopicId() { try { const p = location.pathname || ''; if (p !== '/flashcard' && p !== '/flashcard.html') return null; const sp = new URLSearchParams(location.search || ''); const topic = (sp.get('topic') || '').trim(); if (!topic || topic === 'all') return null; if (sp.get('source') || sp.get('category') || sp.get('plan')) return null; return topic; } catch { return null; } } function buildTopicSlice(data, topicId) { return Object.assign({}, data, { cards: (data && Array.isArray(data.cards) ? data.cards : []).filter(c => c && (c.topicId ? c.topicId === topicId : c.topic === topicId)) }); } async function readTopicCache(topicId) { try { const db = await openCacheDB(); const res = await new Promise((resolve) => { try { const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get('topic_v1_' + topicId); req.onsuccess = () => resolve(req.result || null); req.onerror = () => resolve(null); } catch { resolve(null); } }); if (res && Array.isArray(res.cards)) return res; return null; } catch { return null; } } async function writeTopicCache(topicId, slice) { if (!slice || !Array.isArray(slice.cards)) return false; try { const db = await openCacheDB(); return await new Promise((resolve) => { try { const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(slice, 'topic_v1_' + topicId); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false); } catch { resolve(false); } }); } catch { return false; } } function hookFetchForAntonyms() {
    if (window.fetch && window.fetch.__kfFinalConsolidateV2) return;
    window.__KF_ANTONYM_FETCH_HOOKED__ = true;
    const prevFetch = window.fetch;
    const wrapped = async function (input, init) {
      let u = null; try { u = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href); } catch {} const topicId = getSingleTopicId(); if (u && u.origin === location.origin && u.pathname === '/data.json') { if (topicId) { try { const tc = await readTopicCache(topicId); if (tc && Array.isArray(tc.cards)) { window.__KF_BASE_MERGE_DONE__ = true; return { ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }), json: async () => tc, text: async () => tc, clone() { return this; } }; } } catch {} } try { const cached = await readMergedCache(); if (cached && Array.isArray(cached.cards) && cached.cards.length >= 60005) { window.__KF_BASE_MERGE_DONE__ = true; const out = topicId ? buildTopicSlice(cached, topicId) : cached; if (topicId) Promise.resolve(writeTopicCache(topicId, out)).catch(() => {}); return { ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }), json: async () => out, text: async () => out, clone() { return this; } }; } } catch {} if (window.__KF_BASE_MERGE_READY__ && typeof window.__KF_BASE_MERGE_READY__.then === 'function') { try { await window.__KF_BASE_MERGE_READY__; } catch {} } } const response = await prevFetch.apply(this, arguments);
      try {
        const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
        if (url.origin === location.origin && url.pathname === '/data.json' && response.ok) {
          const prevJson = response.json.bind(response);
          Object.defineProperty(response, 'json', {
            configurable: true,
            value: async () => { if (window.__KF_BASE_MERGE_READY__ && typeof window.__KF_BASE_MERGE_READY__.then === 'function') { try { await window.__KF_BASE_MERGE_READY__; } catch {} } const merged = applyAllExpansionPacks(applyAntonymsToData(await prevJson())); window.__KF_BASE_MERGE_DONE__ = true; try { if (merged && Array.isArray(merged.cards) && merged.cards.length >= 60005) Promise.resolve(writeMergedCache(merged)).catch(() => {}); } catch {} const tid = getSingleTopicId(); if (tid) { const slice = buildTopicSlice(merged, tid); try { Promise.resolve(writeTopicCache(tid, slice)).catch(() => {}); } catch {} return slice; } return merged; }
          });
        }
      } catch {}
      return response;
    };
    wrapped.__kfFinalConsolidateV2 = true;
    window.fetch = wrapped;
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
      const r = await fetch('/vnexpress-phrases-300.js?v=20261120-v300-r3', { cache: 'force-cache', credentials: 'same-origin' });
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
      const r = await fetch('/guardian-phrases-400.js?v=20261120-g2', { cache: 'force-cache', credentials: 'same-origin' });
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
      const r = await fetch('/vnexpress-phrases-400.js?v=20261120-v400-r2', { cache: 'force-cache', credentials: 'same-origin' });
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
      const r = await fetch('/vnexpress-phrases-500.js?v=20261120-v500-r2', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-500.js')();
    } catch (err) {
      console.warn('[KhangFlash] Không nạp được vnexpress-phrases-500.js:', err);
    }
  }


  /* KF_LOAD_VNEXPRESS_700 */
  async function loadVnExpressPhrases700() {
    if (window.KFVnExpressPhrases700 && window.KFVnExpressPhrases700.version === '2026.11.20-v700-band9-r3') return;
    if (window.__KF_VNEXPRESS700_READY__) { await window.__KF_VNEXPRESS700_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-700.js?v=20261120-v700-r3', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-700.js')();
    } catch (err) {
      console.warn('[KhangFlash] Không nạp được vnexpress-phrases-700.js:', err);
    }
  }


  /* KF_LOAD_VNEXPRESS_1000 */
  async function loadVnExpressPhrases1000() {
    if (window.KFVnExpressPhrases1000 && window.KFVnExpressPhrases1000.version === '2026.11.20-v1000-band9-r2') return;
    if (window.__KF_VNEXPRESS1000_READY__) { await window.__KF_VNEXPRESS1000_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-1000.js?v=20261120-v1000-r2', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-1000.js')();
    } catch (err) {
      console.warn('[KhangFlash] Không nạp được vnexpress-phrases-1000.js:', err);
    }
  }

  /* Preserve saved day assignments. Rebalancing is an explicit user action.
   * Deleting a plan without interleavedV2 here rebuilt it from only unseen cards
   * on each navigation, removing completed cards from the day's denominator.
   * Keep both localStorage and IndexedDB plans intact, including legacy plans.
   */

  let loaded = false;

  /* KF_LOAD_VNEXPRESS_W6_W9 */
  async function loadVnExpressPhrasesW6() {
    if (window.KFVnExpressPhrasesW6 && window.KFVnExpressPhrasesW6.version === '2026.11.20-w6-band9-r1') return;
    if (window.__KF_VNEXPRESSW6_READY__) { await window.__KF_VNEXPRESSW6_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-w6.js?v=20261120-w6-r1', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w6.js')();
    } catch (err) { console.warn('[KhangFlash] Không nạp được vnexpress-phrases-w6.js:', err); }
  }
  async function loadVnExpressPhrasesW7() {
    if (window.KFVnExpressPhrasesW7 && window.KFVnExpressPhrasesW7.version === '2026.11.20-w7-band9-r1') return;
    if (window.__KF_VNEXPRESSW7_READY__) { await window.__KF_VNEXPRESSW7_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-w7.js?v=20261120-w7-r1', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w7.js')();
    } catch (err) { console.warn('[KhangFlash] Không nạp được vnexpress-phrases-w7.js:', err); }
  }
  async function loadVnExpressPhrasesW8() {
    if (window.KFVnExpressPhrasesW8 && window.KFVnExpressPhrasesW8.version === '2026.11.20-w8-band9-r1') return;
    if (window.__KF_VNEXPRESSW8_READY__) { await window.__KF_VNEXPRESSW8_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-w8.js?v=20261120-w8-r1', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w8.js')();
    } catch (err) { console.warn('[KhangFlash] Không nạp được vnexpress-phrases-w8.js:', err); }
  }
  async function loadVnExpressPhrasesW9() {
    if (window.KFVnExpressPhrasesW9 && window.KFVnExpressPhrasesW9.version === '2026.11.21-w9-band9-r1') return;
    if (window.__KF_VNEXPRESSW9_READY__) { await window.__KF_VNEXPRESSW9_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-w9.js?v=20261121-w9-r1', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w9.js')();
    } catch (err) { console.warn('[KhangFlash] Không nạp được vnexpress-phrases-w9.js:', err); }
  }

  async function loadVnExpressPhrasesW10() {
    if (window.KFVnExpressPhrasesW10 && window.KFVnExpressPhrasesW10.version === '2026.11.21-w10-band9-r1') return;
    if (window.__KF_VNEXPRESSW10_READY__) { await window.__KF_VNEXPRESSW10_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-w10.js?v=20261121-w10-r1', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w10.js')();
    } catch (err) { console.warn('[KhangFlash] Không nạp được vnexpress-phrases-w10.js:', err); }
  }

  async function loadVnExpressPhrasesW11() {
    if (window.KFVnExpressPhrasesW11 && window.KFVnExpressPhrasesW11.version === '2026.11.21-w11-band9-r1') return;
    if (window.__KF_VNEXPRESSW11_READY__) { await window.__KF_VNEXPRESSW11_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-w11.js?v=20261121-w11-r1', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w11.js')();
    } catch (err) { console.warn('[KhangFlash] Không nạp được vnexpress-phrases-w11.js:', err); }
  }

  async function loadVnExpressPhrasesW12() {
    if (window.KFVnExpressPhrasesW12 && window.KFVnExpressPhrasesW12.version === '2026.11.21-w12-band9-r1') return;
    if (window.__KF_VNEXPRESSW12_READY__) { await window.__KF_VNEXPRESSW12_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-w12.js?v=20261121-w12-r1', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w12.js')();
    } catch (err) { console.warn('[KhangFlash] Không nạp được vnexpress-phrases-w12.js:', err); }
  }

  async function loadVnExpressPhrasesW13() {
    if (window.KFVnExpressPhrasesW13 && window.KFVnExpressPhrasesW13.version === '2026.11.21-w13-band9-r1') return;
    if (window.__KF_VNEXPRESSW13_READY__) { await window.__KF_VNEXPRESSW13_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-w13.js?v=20261121-w13-r1', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w13.js')();
    } catch (err) { console.warn('[KhangFlash] Không nạp được vnexpress-phrases-w13.js:', err); }
  }

  async function loadVnExpressPhrasesW14() {
    if (window.KFVnExpressPhrasesW14 && window.KFVnExpressPhrasesW14.version === '2026.11.21-w14-band9-r1') return;
    if (window.__KF_VNEXPRESSW14_READY__) { await window.__KF_VNEXPRESSW14_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-w14.js?v=20261121-w14-r1', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w14.js')();
    } catch (err) { console.warn('[KhangFlash] Không nạp được vnexpress-phrases-w14.js:', err); }
  }

  async function loadVnExpressPhrasesW15() {
    if (window.KFVnExpressPhrasesW15 && window.KFVnExpressPhrasesW15.version === '2026.11.21-w15-band9-r1') return;
    if (window.__KF_VNEXPRESSW15_READY__) { await window.__KF_VNEXPRESSW15_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-w15.js?v=20261121-w15-r1', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w15.js')();
    } catch (err) { console.warn('[KhangFlash] Không nạp được vnexpress-phrases-w15.js:', err); }
  }

  async function loadVnExpressPhrasesW16() {
    if (window.KFVnExpressPhrasesW16 && window.KFVnExpressPhrasesW16.version === '2026.11.21-w16-band9-r1') return;
    if (window.__KF_VNEXPRESSW16_READY__) { await window.__KF_VNEXPRESSW16_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-w16.js?v=20261121-w16-r1', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w16.js')();
    } catch (err) { console.warn('[KhangFlash] Không nạp được vnexpress-phrases-w16.js:', err); }
  }

  async function loadVnExpressPhrasesW17() {
    if (window.KFVnExpressPhrasesW17 && window.KFVnExpressPhrasesW17.version === '2026.11.21-w17-band9-r1') return;
    if (window.__KF_VNEXPRESSW17_READY__) { await window.__KF_VNEXPRESSW17_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-w17.js?v=20261121-w17-r1', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w17.js')();
    } catch (err) { console.warn('[KhangFlash] Không nạp được vnexpress-phrases-w17.js:', err); }
  }

  async function loadVnExpressPhrasesW18() {
    if (window.KFVnExpressPhrasesW18 && window.KFVnExpressPhrasesW18.version === '2026.11.21-w18-band9-r1') return;
    if (window.__KF_VNEXPRESSW18_READY__) { await window.__KF_VNEXPRESSW18_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-w18.js?v=20261121-w18-r1', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w18.js')();
    } catch (err) { console.warn('[KhangFlash] Không nạp được vnexpress-phrases-w18.js:', err); }
  }

  async function loadVnExpressPhrasesW19() {
    if (window.KFVnExpressPhrasesW19 && window.KFVnExpressPhrasesW19.version === '2026.11.21-w19-band9-r1') return;
    if (window.__KF_VNEXPRESSW19_READY__) { await window.__KF_VNEXPRESSW19_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-w19.js?v=20261121-w19-r1', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w19.js')();
    } catch (err) { console.warn('[KhangFlash] Không nạp được vnexpress-phrases-w19.js:', err); }
  }

  async function loadVnExpressPhrasesW20() {
    if (window.KFVnExpressPhrasesW20 && window.KFVnExpressPhrasesW20.version === '2026.11.21-w20-band9-r1') return;
    if (window.__KF_VNEXPRESSW20_READY__) { await window.__KF_VNEXPRESSW20_READY__; return; }
    try {
      const r = await fetch('/vnexpress-phrases-w20.js?v=20261121-w20-r1', { cache: 'force-cache', credentials: 'same-origin' });
      if (!r.ok) return;
      const code = await r.text();
      if (code.trim()) new Function('"use strict";\n' + code + '\n//# sourceURL=vnexpress-phrases-w20.js')();
    } catch (err) { console.warn('[KhangFlash] Không nạp được vnexpress-phrases-w20.js:', err); }
  }

  async function loadAll() {
   if (window.__KF_STATIC_TOPIC_ID__) { loaded = true; if (typeof window.__KF_RESOLVE_BASE_MERGE__ === 'function') window.__KF_RESOLVE_BASE_MERGE__(); return; }
    if (loaded) return;
    loaded = true; if (isVocabPage) { try { const topicId = getSingleTopicId(); if (topicId) { const tc = await readTopicCache(topicId); if (tc && Array.isArray(tc.cards)) { window.__KF_BASE_MERGE_DONE__ = true; if (typeof window.__KF_RESOLVE_BASE_MERGE__ === 'function') window.__KF_RESOLVE_BASE_MERGE__(); return; } } const cached = await readMergedCache(); if (cached && Array.isArray(cached.cards) && cached.cards.length >= 60005) { if (topicId) Promise.resolve(writeTopicCache(topicId, buildTopicSlice(cached, topicId))).catch(() => {}); window.__KF_BASE_MERGE_DONE__ = true; if (typeof window.__KF_RESOLVE_BASE_MERGE__ === 'function') window.__KF_RESOLVE_BASE_MERGE__(); return; } } catch {} }
    hookRelationsShow(); 
    loadTask1Expansion200();
    try {
      let code = '';
      if (window.__KF_LIVE_PREFETCH__) {
        code = await window.__KF_LIVE_PREFETCH__;
      }
      if (!code) {
        const r = await fetch('/live-override-custom.js?v=20261124-progress1', { cache: 'force-cache', credentials: 'same-origin' });
        if (!r.ok) {
          console.warn('[KhangFlash] Không tải được /live-override-custom.js (HTTP ' + r.status + ')');
          return;
        }
        code = await r.text();
      }
      if (!code.trim()) return; code = code.replace(/count>50000/g, 'count>500000').replace(/\|\|count!==p\.curriculum\.initialCards/g, '');
          const prevKVoice = window.KVoice, prevKVoiceUI = window.KVoiceUI;
      new Function('"use strict";\n' + code + '\n//# sourceURL=live-override-custom.js')(); if (prevKVoice) window.KVoice = prevKVoice; if (prevKVoiceUI) window.KVoiceUI = prevKVoiceUI; { const d = document.getElementById('voice-dialog'); if (d && /Piper/i.test(d.textContent || '')) d.remove(); }
      if (window.KFExpandedBaseReady && typeof window.KFExpandedBaseReady.then === 'function') {
        await window.KFExpandedBaseReady;
      }
      if (prevKVoice) window.KVoice = prevKVoice; if (prevKVoiceUI) window.KVoiceUI = prevKVoiceUI; { const d = document.getElementById('voice-dialog'); if (d && /Piper/i.test(d.textContent || '')) d.remove(); }
      if (prevKVoice && typeof prevKVoice.settings === 'function' && !window.__KF_VOICE_CAPTURE__) { window.__KF_VOICE_CAPTURE__ = true; document.addEventListener('click', ev => { const b = ev.target && ev.target.closest && ev.target.closest('button,a,[role="button"]'); const btn = (ev.target && ev.target.closest && ev.target.closest('#voice-settings-button,[data-td-action="voice"],[data-td-action="voice-settings"],[data-action="voice-settings"],[data-bb="voices"]')) || (b && !b.closest('#voice-dialog') && ((b.textContent||'').includes('Chọn giọng') || b.matches('#voice-settings-button,[data-td-action="voice"],[data-td-action="voice-settings"],[data-action="voice-settings"],[data-bb="voices"]')) ? b : null); if (!btn) return; ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); window.KVoice = prevKVoice; if (prevKVoiceUI) window.KVoiceUI = prevKVoiceUI; const d = document.getElementById('voice-dialog'); if (d) d.remove(); prevKVoice.settings(); }, true); } hookFetchForAntonyms();
      await Promise.all([loadVnExpressPhrases300(), loadGuardianPhrases400(), loadVnExpressPhrases400(), loadVnExpressPhrases500(), loadVnExpressPhrases700(), loadVnExpressPhrases1000(), loadVnExpressPhrasesW6(), loadVnExpressPhrasesW7(), loadVnExpressPhrasesW8(), loadVnExpressPhrasesW9(), loadVnExpressPhrasesW10(), loadVnExpressPhrasesW11(), loadVnExpressPhrasesW12(), loadVnExpressPhrasesW13(), loadVnExpressPhrasesW14(), loadVnExpressPhrasesW15(), loadVnExpressPhrasesW16(), loadVnExpressPhrasesW17(), loadVnExpressPhrasesW18(), loadVnExpressPhrasesW19(), loadVnExpressPhrasesW20()]);
      hookFetchForAntonyms();
      setTimeout(hookFetchForAntonyms, 0);
      setTimeout(hookFetchForAntonyms, 200);
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
//   const isVocabPage = /^\/(flashcard|flashcards|library|games|due|dashboard)(?:\.html)?\/?$/.test(location.pathname);
  if (isVocabPage) {
    loadAll();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => (typeof requestIdleCallback === 'function' ? requestIdleCallback(() => loadAll(), { timeout: 1500 }) : setTimeout(loadAll, 500)), { once: true });
  } else {
    (typeof requestIdleCallback === 'function' ? requestIdleCallback(() => loadAll(), { timeout: 1500 }) : setTimeout(loadAll, 500));
  }
})();

/* KF_SENTENCE_RESCUE_PRO_UI_V1_START */
(() => {
  'use strict';
  if (typeof document === 'undefined' || /^\/admin-live(?:\.html)?\/?$/.test(location.pathname)) return;
  const PRO_STYLE_ID = 'kf-sr-pro-theme-v1';

  const cssText = `
/* 1. Mode Picker Card ("Cứu từ · Nhớ câu") */
#kf-sr-mode-card {
  position: relative;
  overflow: hidden;
  border: 1.5px solid rgba(167, 139, 250, 0.42) !important;
  background: linear-gradient(155deg, #2d1b69 0%, #3b1d7a 48%, #251357 100%) !important;
  box-shadow: 0 14px 32px -12px rgba(15, 10, 42, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.14) !important;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease !important;
}
#kf-sr-mode-card:hover {
  transform: translateY(-4px);
  border-color: rgba(110, 231, 183, 0.72) !important;
  box-shadow: 0 20px 38px -12px rgba(16, 185, 129, 0.32), 0 0 0 1px rgba(110, 231, 183, 0.3) !important;
}
#kf-sr-mode-card .sr-mode-visual {
  position: relative !important;
  overflow: hidden !important;
  border-radius: 16px !important;
  background:
    radial-gradient(circle at 18% 20%, rgba(52, 211, 153, 0.48) 0%, transparent 52%),
    radial-gradient(circle at 86% 82%, rgba(96, 165, 250, 0.5) 0%, transparent 55%),
    radial-gradient(rgba(255, 255, 255, 0.16) 1px, transparent 1px),
    linear-gradient(135deg, #0f172a 0%, #132a46 52%, #0f3a3e 100%) !important;
  background-size: 100% 100%, 100% 100%, 14px 14px, 100% 100% !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 10px 24px -10px rgba(0, 0, 0, 0.55) !important;
}
#kf-sr-mode-card .sr-mode-visual::before {
  content: '';
  position: absolute;
  inset: -40% auto auto -25%;
  width: 140px;
  height: 140px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(110, 231, 183, 0.35), transparent 70%);
  pointer-events: none;
}
#kf-sr-mode-card .sr-mini-sentence {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.95) !important;
  color: #0f172a !important;
  border: 1px solid rgba(255, 255, 255, 0.9) !important;
  border-radius: 14px !important;
  box-shadow: 0 14px 28px -10px rgba(2, 6, 23, 0.55), 0 0 0 1px rgba(16, 185, 129, 0.22) !important;
  transform: rotate(-2.5deg) !important;
  transition: transform 0.22s ease !important;
}
#kf-sr-mode-card:hover .sr-mini-sentence {
  transform: rotate(-0.8deg) scale(1.02) !important;
}
#kf-sr-mode-card .sr-mini-sentence em {
  font-style: normal !important;
  background: linear-gradient(90deg, #d1fae5 0%, #bae6fd 100%) !important;
  color: #065f46 !important;
  border-bottom: 2px solid #10b981 !important;
  border-radius: 6px !important;
  padding: 1px 6px !important;
  font-weight: 700 !important;
}
#kf-sr-mode-card .sr-mode-visual > i {
  position: relative;
  z-index: 2;
  font-style: normal !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 3px 9px !important;
  border-radius: 999px !important;
  background: rgba(15, 23, 42, 0.62) !important;
  color: #a7f3d0 !important;
  border: 1px solid rgba(110, 231, 183, 0.45) !important;
  backdrop-filter: blur(6px);
}
#kf-sr-mode-card .cb-mode-enter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(250, 204, 21, 0.14);
  border: 1px solid rgba(250, 204, 21, 0.35);
}

/* 2. Gameplay Shell & Layered Atmospheric Themes (#kf-sr-root) */
#kf-sr-root[data-sr-theme="mint"] {
  --sr-ring: rgba(16, 185, 129, 0.24);
  --sr-stage-bg:
    radial-gradient(circle at 14% 18%, rgba(52, 211, 153, 0.26) 0%, transparent 46%),
    radial-gradient(circle at 88% 22%, rgba(56, 189, 248, 0.22) 0%, transparent 48%),
    radial-gradient(circle at 50% 100%, rgba(16, 185, 129, 0.16) 0%, transparent 55%),
    radial-gradient(rgba(15, 118, 110, 0.13) 1px, transparent 1px),
    linear-gradient(180deg, #ecfdf5 0%, #dff6ee 52%, #d4efe7 100%);
  --sr-btn-grad: linear-gradient(135deg, #10b981 0%, #0d9488 100%);
  --sr-card-top: linear-gradient(90deg, #10b981 0%, #38bdf8 100%);
}
#kf-sr-root[data-sr-theme="sky"] {
  --sr-ring: rgba(37, 99, 235, 0.22);
  --sr-stage-bg:
    radial-gradient(circle at 15% 18%, rgba(56, 189, 248, 0.28) 0%, transparent 46%),
    radial-gradient(circle at 85% 25%, rgba(129, 140, 248, 0.24) 0%, transparent 48%),
    radial-gradient(circle at 50% 100%, rgba(59, 130, 246, 0.16) 0%, transparent 55%),
    radial-gradient(rgba(30, 64, 175, 0.12) 1px, transparent 1px),
    linear-gradient(180deg, #eff6ff 0%, #e0efff 52%, #d6e7fc 100%);
  --sr-btn-grad: linear-gradient(135deg, #2563eb 0%, #0284c7 100%);
  --sr-card-top: linear-gradient(90deg, #3b82f6 0%, #818cf8 100%);
}
#kf-sr-root[data-sr-theme="lavender"] {
  --sr-ring: rgba(124, 58, 237, 0.22);
  --sr-stage-bg:
    radial-gradient(circle at 16% 18%, rgba(167, 139, 250, 0.28) 0%, transparent 46%),
    radial-gradient(circle at 86% 24%, rgba(244, 114, 182, 0.2) 0%, transparent 48%),
    radial-gradient(circle at 50% 100%, rgba(139, 92, 246, 0.16) 0%, transparent 55%),
    radial-gradient(rgba(91, 33, 182, 0.12) 1px, transparent 1px),
    linear-gradient(180deg, #f5f3ff 0%, #ebe5ff 52%, #e2dafc 100%);
  --sr-btn-grad: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
  --sr-card-top: linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%);
}
#kf-sr-root[data-sr-theme="peach"] {
  --sr-ring: rgba(234, 88, 12, 0.22);
  --sr-stage-bg:
    radial-gradient(circle at 16% 18%, rgba(251, 146, 60, 0.26) 0%, transparent 46%),
    radial-gradient(circle at 86% 24%, rgba(244, 63, 94, 0.18) 0%, transparent 48%),
    radial-gradient(circle at 50% 100%, rgba(249, 115, 22, 0.14) 0%, transparent 55%),
    radial-gradient(rgba(154, 52, 18, 0.11) 1px, transparent 1px),
    linear-gradient(180deg, #fff7ed 0%, #ffedd5 52%, #fde4d2 100%);
  --sr-btn-grad: linear-gradient(135deg, #ea580c 0%, #e11d48 100%);
  --sr-card-top: linear-gradient(90deg, #f97316 0%, #f43f5e 100%);
}

#kf-sr-root .kf-sr-shell {
  border-radius: 22px !important;
  border: 1.5px solid var(--sr-border-soft) !important;
  box-shadow: 0 22px 48px -18px rgba(15, 23, 42, 0.32), 0 0 0 1px rgba(255, 255, 255, 0.5) inset !important;
}
#kf-sr-root .kf-sr-header {
  padding: 11px 16px !important;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, var(--sr-bg-frame) 100%) !important;
  border-bottom: 1px solid var(--sr-border-soft) !important;
}
#kf-sr-root .kf-sr-stage {
  background: var(--sr-stage-bg) !important;
  background-size: 100% 100%, 100% 100%, 100% 100%, 20px 20px, 100% 100% !important;
  min-height: 270px;
}
#kf-sr-root .kf-sr-subbar {
  padding: 6px 16px !important;
  background: rgba(255, 255, 255, 0.62) !important;
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(15, 23, 42, 0.06) !important;
}
#kf-sr-root .kf-sr-card {
  border-radius: 18px !important;
  border: 1.5px solid rgba(255, 255, 255, 0.9) !important;
  background: rgba(255, 255, 255, 0.94) !important;
  backdrop-filter: blur(10px);
  box-shadow: 0 18px 36px -14px rgba(15, 23, 42, 0.22), 0 0 0 1.5px var(--sr-border-soft) !important;
  padding: 14px 18px 16px !important;
  overflow: hidden;
}
#kf-sr-root .kf-sr-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3.5px;
  background: var(--sr-card-top);
}
#kf-sr-root .kf-sr-card.is-rescued {
  background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%) !important;
  box-shadow: 0 18px 36px -12px rgba(22, 163, 74, 0.3), 0 0 0 2px #22c55e !important;
}
#kf-sr-root .kf-sr-card.is-missed {
  background: linear-gradient(180deg, #fef2f2 0%, #fee2e2 100%) !important;
  box-shadow: 0 18px 36px -12px rgba(220, 38, 38, 0.28), 0 0 0 2px #ef4444 !important;
}
#kf-sr-root .kf-sr-sentence {
  font-size: clamp(1rem, 1.45vw, 1.15rem) !important;
  line-height: 1.6 !important;
  color: #0f172a !important;
  font-weight: 500 !important;
  padding-top: 4px;
}
#kf-sr-root .kf-sr-blank {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, var(--sr-accent-soft) 100%) !important;
  border: 1px solid var(--sr-border-soft) !important;
  border-bottom: 2.5px solid var(--sr-accent) !important;
  border-radius: 8px !important;
  padding: 1px 8px !important;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.06);
}
#kf-sr-root .kf-sr-floor {
  height: 5px !important;
  background: repeating-linear-gradient(90deg, #ef4444 0px, #ef4444 14px, transparent 14px, transparent 24px) !important;
  box-shadow: 0 -4px 14px rgba(239, 68, 68, 0.35);
  opacity: 0.78 !important;
}
#kf-sr-root .kf-sr-dock {
  padding: 13px 16px !important;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, var(--sr-bg-dock) 100%) !important;
  border-top: 1px solid var(--sr-border-soft);
}
#kf-sr-root .kf-sr-input {
  padding: 10px 14px !important;
  border-radius: 13px !important;
  border: 1.5px solid var(--sr-border-strong) !important;
  font-size: 14.5px !important;
  box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.05);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}
#kf-sr-root .kf-sr-input:focus {
  border-color: var(--sr-accent) !important;
  box-shadow: 0 0 0 4px var(--sr-ring) !important;
}
#kf-sr-root .kf-sr-btn-primary {
  background: var(--sr-btn-grad) !important;
  border-radius: 12px !important;
  padding: 8px 15px !important;
  box-shadow: 0 6px 14px -6px rgba(15, 23, 42, 0.45);
  transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease;
}
#kf-sr-root .kf-sr-btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.06);
  box-shadow: 0 10px 18px -8px rgba(15, 23, 42, 0.5);
}
#kf-sr-root .kf-sr-btn-soft {
  background: rgba(255, 255, 255, 0.88) !important;
  border: 1px solid var(--sr-border-soft) !important;
  border-radius: 12px !important;
  padding: 8px 12px !important;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.05);
  transition: transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
}
#kf-sr-root .kf-sr-btn-soft:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #ffffff !important;
  border-color: var(--sr-border-strong) !important;
}
#kf-sr-root #kf-sr-btn-speak {
  background: var(--sr-accent-soft) !important;
  color: var(--sr-accent) !important;
  border: 1px solid var(--sr-border-soft) !important;
  border-radius: 8px !important;
  padding: 3px 10px !important;
  transition: filter 0.15s ease;
}
#kf-sr-root #kf-sr-btn-speak:hover {
  filter: brightness(0.95);
}
#kf-sr-root .kf-sr-overlay {
  background: rgba(15, 23, 42, 0.42) !important;
  backdrop-filter: blur(6px) !important;
}
`;

  function applyProTheme() {
    let st = document.getElementById(PRO_STYLE_ID);
    if (!st) {
      st = document.createElement('style');
      st.id = PRO_STYLE_ID;
      st.textContent = cssText;
    }
    (document.head || document.documentElement).appendChild(st);
  }

  applyProTheme();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyProTheme, { once: true });
  }
  window.addEventListener('load', applyProTheme, { once: true });
})();
/* KF_SENTENCE_RESCUE_PRO_UI_V1_END */
