import fs from 'node:fs';

const terms = new Map();
const cardsById = new Map();
const normalize = value => value.toLowerCase().replace(/[’‘]/g, "'").trim().replace(/\s+/g, ' ');
const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const addCard = card => {
  if (card.studyKind === 'grammar' || typeof card.term !== 'string') return;
  const key = normalize(card.term);
  if (!key) return;
  cardsById.set(card.id, key);
  if (!terms.has(key)) terms.set(key, new Set());
};

for (const path of ['data.json', ...fs.readdirSync('static-data/topics').filter(f => f.endsWith('.json')).map(f => 'static-data/topics/' + f)]) {
  for (const card of read(path).cards) addCard(card);
}

function collect(phrase) {
  if (typeof phrase !== 'string' || phrase.length > 110) return;
  const display = phrase.trim();
  const key = normalize(display);
  if (!/^[\p{L}\p{N}' -]+$/u.test(key)) return;
  const words = key.split(' ');
  for (let start = 0; start < words.length; start++) {
    for (let end = start + 1; end <= words.length; end++) {
      const extra = words.length - (end - start);
      if (extra < 1 || extra > 4) continue;
      const options = terms.get(words.slice(start, end).join(' '));
      if (!options || options.size >= 4 || [...options].some(p => normalize(p) === key)) continue;
      options.add(display);
    }
  }
}
const sample = terms.get('primary education');
for (const phrase of ['access to primary education', 'complete primary education', 'free primary education', 'compulsory primary education']) sample.add(phrase);

for (const name of fs.readdirSync('example-explanations').filter(f => /^[\da-f]{2}\.json$/.test(f))) {
  for (const row of Object.values(read('example-explanations/' + name))) {
    for (const chunk of row.chunks || []) collect(chunk.phrase);
  }
}
for (const term of terms.keys()) collect(term);

function shard(key) {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return (hash >>> 0) % 32;
}
const rows = Array.from({length: 32}, () => Object.create(null));
const coverage = [0, 0, 0, 0, 0];
for (const [term, options] of terms) {
  coverage[options.size]++;
  if (options.size) rows[shard(term)][term] = [...options];
}
const curated = new Set();
for (const line of fs.readFileSync('flashcard-collocations-curated.txt', 'utf8').trim().split(/\r?\n/)) {
  const [id, ...phrases] = line.split('|');
  const term = cardsById.get(id);
  if (!term || curated.has(id) || phrases.length !== 4 ||
      phrases.some(phrase => !phrase.trim() || normalize(phrase) === term) ||
      new Set(phrases.map(normalize)).size !== 4) {
    throw new Error('Invalid curated collocations for card ' + id);
  }
  curated.add(id);
  rows[shard(term)]['card:' + id] = phrases;
}
fs.mkdirSync('flashcard-collocations', {recursive: true});
rows.forEach((row, i) => fs.writeFileSync(`flashcard-collocations/${i}.json`, JSON.stringify(row) + '\n'));
console.log({terms: terms.size, coverage, curatedCards: curated.size});
