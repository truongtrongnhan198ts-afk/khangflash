(function () {
  'use strict';

  const LABELS = {
    COUNTABLE: {
      text: 'Danh từ đếm được (Countable)',
      bg: '#eaf4ec',
      color: '#235334',
      border: '#b7d9be'
    },
    UNCOUNTABLE: {
      text: 'Danh từ không đếm được (Uncountable)',
      bg: '#fef6e4',
      color: '#8a5200',
      border: '#ebd19c'
    },
    BOTH: {
      text: 'Đếm được & Không đếm được (Countable & Uncountable)',
      bg: '#ebf2fe',
      color: '#1e4b8f',
      border: '#bfd4f7'
    }
  };

  const BOTH = new Set([
    'ability', 'action', 'activity', 'analysis', 'art', 'beauty', 'benefit', 'business',
    'change', 'character', 'choice', 'climate', 'coffee', 'comfort', 'communication',
    'community', 'company', 'competition', 'concern', 'conflict', 'connection', 'cost',
    'crime', 'crisis', 'culture', 'custom', 'danger', 'debate', 'debt', 'decision',
    'delay', 'demand', 'design', 'desire', 'detail', 'development', 'diet', 'difference',
    'difficulty', 'discussion', 'disease', 'disorder', 'distance', 'duty', 'economy',
    'effect', 'effort', 'emotion', 'environment', 'error', 'experience', 'experiment',
    'failure', 'faith', 'fashion', 'feeling', 'fire', 'fish', 'food', 'force', 'freedom',
    'friendship', 'fruit', 'glass', 'government', 'growth', 'habit', 'hair', 'history',
    'home', 'hope', 'identity', 'illness', 'image', 'impact', 'improvement', 'income',
    'industry', 'injury', 'insight', 'institution', 'instruction', 'interest',
    'investment', 'iron', 'issue', 'job', 'judgement', 'judgment', 'justice', 'land',
    'language', 'law', 'life', 'light', 'loss', 'love', 'luxury', 'manner', 'market',
    'marriage', 'material', 'meaning', 'medicine', 'memory', 'metal', 'mind', 'mistake',
    'mood', 'movement', 'nature', 'need', 'noise', 'opportunity', 'order', 'organization',
    'organisation', 'pain', 'paper', 'passion', 'peace', 'perception', 'performance',
    'personality', 'philosophy', 'plastic', 'pleasure', 'policy', 'population', 'power',
    'practice', 'pressure', 'pride', 'privacy', 'production', 'profit', 'property',
    'protection', 'quality', 'rain', 'reading', 'reality', 'reason', 'recognition',
    'recovery', 'reform', 'relation', 'religion', 'reputation', 'resistance', 'resource',
    'respect', 'responsibility', 'rest', 'return', 'revenue', 'reward', 'risk', 'room',
    'sacrifice', 'sale', 'salt', 'science', 'security', 'sense', 'service', 'shelter',
    'shock', 'shortage', 'silence', 'skill', 'sleep', 'smell', 'smoke', 'society',
    'soil', 'sound', 'space', 'speech', 'spirit', 'sport', 'state', 'stone', 'storage',
    'strain', 'strength', 'stress', 'structure', 'struggle', 'study', 'style',
    'substance', 'success', 'support', 'survival', 'suspicion', 'talent', 'talk', 'taste',
    'tax', 'tea', 'technology', 'temperature', 'tension', 'theory', 'therapy', 'thought',
    'threat', 'time', 'tolerance', 'touch', 'tourism', 'trade', 'tradition', 'tragedy',
    'training', 'transport', 'travel', 'treatment', 'trouble', 'trust', 'truth',
    'understanding', 'unity', 'use', 'value', 'variety', 'victory', 'view', 'violence',
    'virtue', 'vision', 'voice', 'volume', 'war', 'waste', 'water', 'wealth', 'weather',
    'weight', 'wind', 'wine', 'wood', 'work', 'worry', 'writing', 'youth'
  ]);

  const UNCOUNTABLE = new Set([
    'accommodation', 'advice', 'affordability', 'accessibility', 'aggression', 'aging',
    'ageing', 'agriculture', 'air', 'alcohol', 'anger', 'anxiety', 'apathy', 'applause',
    'architecture', 'assistance', 'attendance', 'attention', 'autonomy', 'availability',
    'awareness', 'baggage', 'behaviour', 'behavior', 'bias', 'biodiversity', 'blood',
    'boredom', 'bravery', 'bread', 'bureaucracy', 'burnout', 'butter', 'caffeine',
    'capitalism', 'carbon', 'cash', 'cattle', 'censorship', 'chaos', 'charity', 'cheese',
    'chemistry', 'childcare', 'childhood', 'cholesterol', 'citizenship', 'clarity',
    'cleanliness', 'clothing', 'clutter', 'coal', 'cohesion', 'collaboration', 'commerce',
    'compassion', 'competence', 'complacency', 'compliance', 'comprehension',
    'concentration', 'concrete', 'conduct', 'confidence', 'conformity', 'congestion',
    'connectivity', 'consensus', 'conservation', 'consistency', 'consumerism',
    'consumption', 'contamination', 'contentment', 'continuity', 'cooperation',
    'coordination', 'corruption', 'cotton', 'courage', 'coverage', 'creativity',
    'credibility', 'criticism', 'cruelty', 'curiosity', 'currency', 'cutlery',
    'cybersecurity', 'damage', 'data', 'debris', 'decay', 'deception', 'deforestation',
    'degradation', 'democracy', 'denial', 'density', 'dependence', 'dependency',
    'depletion', 'depression', 'deprivation', 'desertification', 'despair', 'destruction',
    'determination', 'deterioration', 'deterrence', 'devastation', 'dignity', 'diligence',
    'dirt', 'disappointment', 'discipline', 'discomfort', 'discontent', 'discrimination',
    'disgust', 'dishonesty', 'disinformation', 'disparity', 'displacement', 'disposal',
    'disrespect', 'disruption', 'dissatisfaction', 'distress', 'distrust', 'diversity',
    'documentation', 'dominance', 'doubt', 'drainage', 'drought', 'dust', 'e-commerce',
    'ecology', 'economics', 'education', 'effectiveness', 'efficiency', 'electricity',
    'empathy', 'employment', 'empowerment', 'encouragement', 'endurance', 'energy',
    'enforcement', 'engagement', 'engineering', 'enjoyment', 'enrolment', 'enrollment',
    'entertainment', 'enthusiasm', 'entrepreneurship', 'envy', 'equality', 'equipment',
    'equity', 'erosion', 'ethics', 'etiquette', 'evidence', 'evolution', 'exhaustion',
    'existence', 'expansion', 'expenditure', 'expertise', 'exploitation', 'exposure',
    'extinction', 'fame', 'fatigue', 'fear', 'feedback', 'fertility', 'fiction', 'filth',
    'finance', 'fitness', 'flexibility', 'flour', 'fluency', 'fog', 'footage', 'footwear',
    'foresight', 'forestry', 'forgiveness', 'fraud', 'freight', 'friction', 'fuel',
    'fulfilment', 'fulfillment', 'fun', 'funding', 'furniture', 'garbage', 'gasoline',
    'gender', 'generosity', 'genetics', 'gentrification', 'geography', 'globalisation',
    'globalization', 'gold', 'goodwill', 'gossip', 'governance', 'graffiti', 'grammar',
    'gratitude', 'gravity', 'greed', 'grief', 'guidance', 'guilt', 'happiness',
    'harassment', 'hardship', 'hardware', 'harm', 'harmony', 'hatred', 'health',
    'healthcare', 'heat', 'heating', 'help', 'heritage', 'homework', 'honesty', 'honey',
    'hospitality', 'hostility', 'housework', 'housing', 'humility', 'humour', 'humor',
    'hunger', 'hygiene', 'hypocrisy', 'ice', 'ignorance', 'illiteracy', 'imagination',
    'immigration', 'immunity', 'impatience', 'implementation', 'importance', 'inaction',
    'inclusion', 'incompetence', 'inconvenience', 'independence', 'indifference',
    'individualism', 'industrialisation', 'industrialization', 'inequality', 'inertia',
    'inflation', 'influence', 'information', 'infrastructure', 'ingenuity', 'inheritance',
    'injustice', 'ink', 'innocence', 'innovation', 'insecurity', 'insomnia',
    'inspiration', 'instability', 'insurance', 'integration', 'integrity', 'intellect',
    'intelligence', 'intensity', 'interaction', 'interdependence', 'interference',
    'intimacy', 'intolerance', 'intuition', 'involvement', 'irony', 'irrigation',
    'isolation', 'jargon', 'jealousy', 'jewellery', 'jewelry', 'journalism', 'junk',
    'kindness', 'knowledge', 'labour', 'labor', 'laughter', 'laundry', 'leadership',
    'learning', 'leather', 'legislation', 'legitimacy', 'leisure', 'liberty', 'lighting',
    'linguistics', 'literacy', 'literature', 'litter', 'livability', 'liveability',
    'livestock', 'logic', 'loneliness', 'longevity', 'loyalty', 'luck', 'luggage',
    'lumber', 'machinery', 'magic', 'mail', 'maintenance', 'malnutrition',
    'manageability', 'management', 'mankind', 'manpower', 'manufacturing', 'marketing',
    'materialism', 'mathematics', 'maths', 'maturity', 'meat', 'media', 'mediation',
    'medication', 'meditation', 'mentorship', 'merchandise', 'mercy', 'methane',
    'migration', 'milk', 'mindfulness', 'mining', 'misconduct', 'misery', 'misfortune',
    'misinformation', 'mismanagement', 'mobility', 'modernisation', 'modernization',
    'modesty', 'moisture', 'momentum', 'money', 'monotony', 'morale', 'morality',
    'mortality', 'motivation', 'mud', 'multiculturalism', 'music', 'mythology',
    'nationalism', 'necessity', 'neglect', 'negligence', 'nepotism', 'networking',
    'neutrality', 'news', 'nitrogen', 'nonsense', 'nostalgia', 'nourishment', 'novelty',
    'numeracy', 'nursing', 'nutrition', 'obedience', 'obesity', 'objectivity',
    'obsolescence', 'oil', 'oppression', 'optimism', 'originality', 'outrage',
    'overconsumption', 'overcrowding', 'overfishing', 'overpopulation', 'oversight',
    'overtime', 'overwork', 'ownership', 'oxygen', 'ozone', 'pace', 'packaging', 'panic',
    'paperwork', 'parenthood', 'parenting', 'participation', 'pasta', 'patience',
    'patriotism', 'pedagogy', 'perfection', 'permission', 'persecution', 'perseverance',
    'persistence', 'personnel', 'persuasion', 'pessimism', 'petrol', 'petroleum',
    'philanthropy', 'photography', 'physics', 'piracy', 'pity', 'plagiarism', 'planning',
    'poetry', 'poison', 'polarisation', 'polarization', 'politeness', 'politics',
    'pollution', 'popularity', 'pork', 'postage', 'pottery', 'poultry', 'poverty',
    'practicality', 'pragmatism', 'praise', 'precision', 'prejudice', 'prestige',
    'prevalence', 'prevention', 'privatisation', 'privatization', 'probability',
    'procrastination', 'procurement', 'productivity', 'proficiency', 'profitability',
    'progress', 'progression', 'prohibition', 'proliferation', 'propaganda',
    'prosperity', 'protectionism', 'protein', 'proximity', 'psychology', 'publicity',
    'punctuation', 'punishment', 'purity', 'racism', 'radiation', 'rage', 'rainfall',
    'rapport', 'rationality', 'readiness', 'realism', 'recidivism', 'reconciliation',
    'recreation', 'recruitment', 'recycling', 'redistribution', 'redundancy',
    'rehabilitation', 'relevance', 'reliability', 'relief', 'reluctance', 'remorse',
    'renovation', 'repetition', 'research', 'resentment', 'resilience', 'restoration',
    'restraint', 'retail', 'retention', 'retirement', 'rhetoric', 'rice', 'rigidity',
    'rigour', 'rigor', 'robotics', 'romance', 'rubbish', 'safety', 'salinity', 'sand',
    'sanitation', 'sarcasm', 'satisfaction', 'scarcity', 'scenery', 'scepticism',
    'skepticism', 'seafood', 'secrecy', 'sediment', 'segregation', 'self-awareness',
    'self-confidence', 'self-control', 'self-discipline', 'self-esteem',
    'self-reliance', 'self-sufficiency', 'selfishness', 'sensitivity', 'serenity',
    'sewage', 'sexism', 'shame', 'shipping', 'shopping', 'shyness', 'sickness',
    'sightseeing', 'significance', 'silicon', 'silk', 'silver', 'simplicity',
    'sincerity', 'slang', 'slavery', 'smog', 'smoking', 'smuggling', 'snow', 'snowfall',
    'soap', 'socialism', 'software', 'solidarity', 'solitude', 'sorrow', 'soup',
    'sovereignty', 'spam', 'specialisation', 'specialization', 'speculation', 'spending',
    'spirituality', 'sprawl', 'stability', 'staff', 'stagnation', 'stamina',
    'standardisation', 'standardization', 'starvation', 'stationery', 'steam', 'steel',
    'stigma', 'stimulation', 'straw', 'strife', 'subsistence', 'suffering',
    'sufficiency', 'sugar', 'sunlight', 'sunshine', 'supervision', 'supremacy',
    'surveillance', 'susceptibility', 'sustainability', 'sweat', 'sympathy', 'synergy',
    'syntax', 'tact', 'taxation', 'teaching', 'teamwork', 'telecommuting',
    'telemedicine', 'terminology', 'terrain', 'terrorism', 'testimony', 'theft',
    'thirst', 'thrift', 'thunder', 'timber', 'timing', 'toast', 'tobacco', 'toxicity',
    'traffic', 'tranquillity', 'tranquility', 'transparency', 'transportation', 'trash',
    'trauma', 'treason', 'truancy', 'tuition', 'turbulence', 'turmoil', 'turnover',
    'tyranny', 'ubiquity', 'uncertainty', 'underemployment', 'underfunding',
    'unemployment', 'unfairness', 'uniformity', 'unrest', 'upbringing', 'upheaval',
    'upkeep', 'urbanisation', 'urbanization', 'urgency', 'usage', 'usefulness', 'utility',
    'validity', 'vandalism', 'vanity', 'vegetation', 'velocity', 'ventilation',
    'versatility', 'viability', 'vibrancy', 'vigilance', 'vigour', 'vigor', 'vinegar',
    'visibility', 'vitality', 'vocabulary', 'volatility', 'volunteering',
    'vulnerability', 'warmth', 'wear', 'welfare', 'well-being', 'wellbeing', 'wheat',
    'wildlife', 'willpower', 'wisdom', 'wit', 'wool', 'workforce', 'workload', 'worship',
    'worth', 'xenophobia', 'yoga', 'zeal', 'zinc'
  ]);

  const COUNTABLE_RAW = [
    'fee', 'rate', 'price', 'tax', 'fine', 'loan', 'grant', 'fund', 'budget', 'wage',
    'salary', 'bonus', 'pension', 'bill', 'ticket', 'voucher', 'discount', 'refund',
    'deposit', 'share', 'stock', 'bond', 'asset', 'factor', 'element', 'component',
    'feature', 'trait', 'aspect', 'dimension', 'trend', 'pattern', 'shift', 'gap',
    'barrier', 'hurdle', 'obstacle', 'limitation', 'shortcoming', 'flaw', 'pitfall',
    'dilemma', 'paradox', 'challenge', 'problem', 'crisis', 'threat', 'hazard',
    'incident', 'accident', 'case', 'example', 'instance', 'sample', 'model', 'system',
    'network', 'platform', 'channel', 'tool', 'device', 'gadget', 'machine', 'vehicle',
    'building', 'facility', 'campus', 'library', 'hospital', 'clinic', 'school',
    'university', 'college', 'course', 'class', 'lesson', 'subject', 'curriculum',
    'degree', 'diploma', 'certificate', 'qualification', 'exam', 'test', 'grade',
    'score', 'result', 'outcome', 'project', 'program', 'programme', 'initiative',
    'campaign', 'plan', 'scheme', 'strategy', 'approach', 'method', 'technique',
    'measure', 'step', 'stage', 'phase', 'level', 'tier', 'standard', 'guideline',
    'protocol', 'regulation', 'rule', 'statute', 'ban', 'cap', 'limit', 'quota',
    'threshold', 'criterion', 'metric', 'indicator', 'index', 'ratio', 'percentage',
    'figure', 'number', 'statistic', 'record', 'report', 'survey', 'study', 'trial',
    'thesis', 'essay', 'article', 'journal', 'book', 'chapter', 'topic', 'theme',
    'argument', 'claim', 'proposal', 'suggestion', 'recommendation', 'solution',
    'remedy', 'cure', 'vaccine', 'drug', 'symptom', 'syndrome', 'epidemic', 'pandemic',
    'outbreak', 'ecosystem', 'habitat', 'species', 'organism', 'pollutant', 'emission',
    'footprint', 'resource', 'fuel', 'source', 'product', 'good', 'service', 'subsidy',
    'tariff', 'sanction', 'monopoly', 'startup', 'venture', 'enterprise', 'company',
    'corporation', 'firm', 'industry', 'sector', 'city', 'town', 'village', 'suburb',
    'district', 'region', 'province', 'country', 'nation', 'community', 'neighbourhood',
    'neighborhood', 'household', 'family', 'generation', 'cohort', 'demographic',
    'minority', 'majority', 'citizen', 'resident', 'worker', 'employee', 'employer',
    'student', 'learner', 'teacher', 'educator', 'professor', 'graduate', 'candidate',
    'expert', 'scholar', 'researcher', 'scientist', 'policymaker', 'official', 'leader',
    'manager', 'entrepreneur', 'investor', 'consumer', 'customer', 'client', 'user',
    'patient', 'doctor', 'nurse', 'immigrant', 'migrant', 'refugee', 'tourist',
    'commuter', 'driver', 'pedestrian', 'victim', 'offender', 'criminal', 'individual',
    'person', 'adult', 'child', 'teenager', 'adolescent', 'senior', 'parent', 'peer',
    'colleague', 'mentor', 'friend', 'neighbour', 'neighbor', 'incentive', 'deterrent',
    'catalyst', 'milestone', 'benchmark', 'breakthrough', 'setback', 'backlash',
    'drawback', 'downside', 'upside', 'advantage', 'disadvantage', 'consequence',
    'ramification', 'implication', 'impact', 'benefit', 'burden', 'role', 'task',
    'post', 'career', 'profession', 'occupation', 'skill', 'ability', 'habit',
    'lifestyle', 'routine', 'event', 'festival', 'ceremony', 'tradition', 'ritual',
    'monument', 'landmark', 'artifact', 'artefact'
  ];

  const COUNTABLE = new Set(
    COUNTABLE_RAW.filter(function (w) {
      return !BOTH.has(w) && !UNCOUNTABLE.has(w);
    })
  );

  const LINKING_PREPS = new Set([
    'of', 'in', 'on', 'for', 'to', 'with', 'from', 'by', 'at',
    'between', 'among', 'against', 'over', 'under', 'into'
  ]);

  const VERB_PREFIXES = [
    'to ', 'be ', 'get ', 'make ', 'take ', 'give ', 'have ', 'do ', 'go ', 'come ',
    'put ', 'set ', 'keep ', 'turn ', 'bring ', 'carry ', 'break ', 'cut ', 'hold ',
    'run ', 'fall ', 'look ', 'pay ', 'play ', 'raise ', 'build ', 'create ',
    'develop ', 'promote ', 'foster ', 'enhance ', 'improve ', 'reduce ', 'increase ',
    'address ', 'tackle ', 'mitigate ', 'curb ', 'adopt ', 'implement ', 'enforce ',
    'rely ', 'depend ', 'result ', 'lead ', 'contribute ', 'cope ', 'deal ', 'engage ',
    'strive ', 'avoid ', 'prevent ', 'protect ', 'preserve ', 'maintain ', 'ensure ',
    'achieve ', 'gain ', 'lose ', 'lack ', 'face ', 'overcome ', 'resolve ', 'solve ',
    'embrace ', 'support ', 'encourage ', 'discourage ', 'undermine ', 'erode ',
    'exacerbate ', 'alleviate ', 'pose ', 'exert ', 'undergo ', 'trigger ', 'spark ',
    'fuel ', 'boost ', 'hinder ', 'impede ', 'hamper ', 'disrupt ', 'threaten ',
    'endanger ', 'damage ', 'harm '
  ];

  const SKIP_KEYWORDS = [
    'thành ngữ', 'idiom', 'proverb', 'tục ngữ',
    '(v)', 'động từ', 'verb', 'phrasal', 's + ', 'be + ', 'to + v',
    '(adj)', 'tính từ', '(adv)', 'trạng từ', '(prep)', '(conj)'
  ];

  function getFrontTextWithoutBadge(front) {
    var clone = front.cloneNode(true);
    var badges = clone.querySelectorAll('[data-kf-countability]');
    for (var i = 0; i < badges.length; i++) {
      badges[i].remove();
    }
    return (clone.textContent || '').trim();
  }

  function shouldSkip(front, term, posText) {
    if (!term) return true;
    var words = term.split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > 5) return true;

    var termLower = term.toLowerCase();
    var posLower = posText.toLowerCase();
    var frontLower = getFrontTextWithoutBadge(front).toLowerCase();

    for (var i = 0; i < SKIP_KEYWORDS.length; i++) {
      var kw = SKIP_KEYWORDS[i];
      if (frontLower.indexOf(kw) !== -1 || posLower.indexOf(kw) !== -1) {
        return true;
      }
    }

    for (var j = 0; j < VERB_PREFIXES.length; j++) {
      if (termLower.indexOf(VERB_PREFIXES[j]) === 0) {
        return true;
      }
    }

    var termAndPos = termLower + ' ' + posLower.replace(/\(từ\s*\/\s*cụm từ\)/g, '');
    if (
      termAndPos.indexOf('/') !== -1 ||
      termAndPos.indexOf('?') !== -1 ||
      termAndPos.indexOf('!') !== -1 ||
      /\b(sb|sth|someone|something)\b/i.test(termAndPos) ||
      /\bone['’]s\b/i.test(termAndPos)
    ) {
      return true;
    }

    return false;
  }

  function extractHeadNoun(term) {
    var cleaned = term.replace(/[.,;:]+$/g, '').trim();
    var words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;

    var prepIdx = -1;
    for (var i = 0; i < words.length; i++) {
      var wClean = words[i].toLowerCase().replace(/^[^a-z-]+|[^a-z-]+$/g, '');
      if (LINKING_PREPS.has(wClean)) {
        prepIdx = i;
        break;
      }
    }

    var rawHead = null;
    if (prepIdx === 0) {
      return null;
    } else if (prepIdx > 0) {
      rawHead = words[prepIdx - 1];
    } else {
      rawHead = words[words.length - 1];
    }

    var head = rawHead.toLowerCase().replace(/^[^a-z-]+|[^a-z-]+$/g, '');
    return head || null;
  }

  function lookupWord(word) {
    if (BOTH.has(word)) return 'BOTH';
    if (UNCOUNTABLE.has(word)) return 'UNCOUNTABLE';
    if (COUNTABLE.has(word)) return 'COUNTABLE';
    return null;
  }

  function classifyNoun(head, posText) {
    if (!head) return null;

    var direct = lookupWord(head);
    if (direct) return direct;

    var candidates = [];
    if (head.length > 3 && head.slice(-3) === 'ies') {
      candidates.push(head.slice(0, -3) + 'y');
    }
    if (head.length > 2 && head.slice(-2) === 'es') {
      candidates.push(head.slice(0, -2));
      candidates.push(head.slice(0, -1));
    }
    if (head.length > 1 && head.slice(-1) === 's' && head.slice(-2) !== 'ss') {
      candidates.push(head.slice(0, -1));
    }

    for (var i = 0; i < candidates.length; i++) {
      var found = lookupWord(candidates[i]);
      if (found) return found;
    }

    if (/\(n\)|danh từ/i.test(posText)) {
      return 'COUNTABLE';
    }

    return null;
  }

  function updateFront(front) {
    var termEl = front.querySelector('[data-td="term"]');
    var posEl = front.querySelector('[data-word-pos]');
    var term = termEl ? (termEl.textContent || '').trim() : '';
    var posText = posEl ? (posEl.textContent || '').trim() : '';

    var sig = term + '||' + posText;
    var existing = front.querySelector('[data-kf-countability]');

    if (shouldSkip(front, term, posText)) {
      if (existing) existing.remove();
      front.removeAttribute('data-kf-countability-sig');
      return;
    }

    var head = extractHeadNoun(term);
    var kind = classifyNoun(head, posText);

    if (!kind) {
      if (existing) existing.remove();
      front.removeAttribute('data-kf-countability-sig');
      return;
    }

    if (existing && front.getAttribute('data-kf-countability-sig') === sig + '||' + kind) {
      return;
    }

    if (existing) existing.remove();

    var cfg = LABELS[kind];
    var badge = document.createElement('span');
    badge.setAttribute('data-kf-countability', kind);
    badge.textContent = cfg.text;
    badge.style.display = 'inline-block';
    badge.style.fontSize = '12px';
    badge.style.fontWeight = '600';
    badge.style.lineHeight = '1.3';
    badge.style.padding = '3px 10px';
    badge.style.borderRadius = '999px';
    badge.style.border = '1px solid ' + cfg.border;
    badge.style.backgroundColor = cfg.bg;
    badge.style.color = cfg.color;
    badge.style.marginTop = '6px';
    badge.style.marginBottom = '4px';

    var anchor = posEl || termEl;
    if (anchor && anchor.parentNode) {
      anchor.insertAdjacentElement('afterend', badge);
    } else {
      front.appendChild(badge);
    }
    front.setAttribute('data-kf-countability-sig', sig + '||' + kind);
  }

  var obs = null;

  function scanAll() {
    if (obs) obs.disconnect();
    try {
      var fronts = document.querySelectorAll('[data-td="front"]');
      for (var i = 0; i < fronts.length; i++) {
        updateFront(fronts[i]);
      }
    } finally {
      if (obs && document.body) {
        obs.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }
    }
  }

  function init() {
    if (!document.body) return;
    obs = new MutationObserver(function () {
      scanAll();
    });
    scanAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
