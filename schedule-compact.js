/* KhangFlash schedule: presentation and existing-plan counts only. */
(() => {
'use strict';
if (document.body.dataset.page !== 'schedule' || window.KFScheduleCompact) return;
window.KFScheduleCompact = { version: '20261123-compact2' };
const setText = (node, text) => { if (node && node.textContent !== text) node.textContent = text; };
const TODAY_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' });
const todayKey = () => TODAY_FMT.format(new Date());
function context() {
try { return typeof activeSchedule !== 'undefined' ? activeSchedule : null; } catch { return null; }
}
let cachedLibCardsRef = null, cardsById = new Map();
let cachedStatsCardsRef = null, doneCardIds = new Set();
let cachedPlanDaysRef = null, daysByNum = new Map();
function getCardsById(ctx) {
const arr = ctx?.library?.cards;
if (arr !== cachedLibCardsRef) {
cachedLibCardsRef = arr;
cardsById = Array.isArray(arr) ? new Map(arr.map(c => [String(c.id), c])) : new Map();
}
return cardsById;
}
function getDoneCardIds(ctx) {
const arr = ctx?.stats?.cards || null;
if (arr !== cachedStatsCardsRef) {
cachedStatsCardsRef = arr;
doneCardIds = Array.isArray(arr) ? new Set(arr.map(c => String(c.card_id))) : new Set();
}
return doneCardIds;
}
function getDaysByNum(ctx) {
const arr = ctx?.plan?.days || null;
if (arr !== cachedPlanDaysRef) {
cachedPlanDaysRef = arr;
daysByNum = Array.isArray(arr) ? new Map(arr.map(d => [d.day, d])) : new Map();
}
return daysByNum;
}
function model(day, ctx) {
if (!day || !Array.isArray(ctx?.library?.cards)) return null;
const map = getCardsById(ctx);
const dayCards = day.cards || [];
const cards = dayCards.map(id => map.get(String(id))).filter(Boolean);
if (cards.length !== dayCards.length) return null;
const seen = getDoneCardIds(ctx);
let vocab = 0, grammar = 0, vocabPending = 0, grammarPending = 0;
for (let i = 0; i < cards.length; i++) {
const c = cards[i];
const isDone = seen.has(String(c.id));
if (c.studyKind === 'grammar') {
grammar++;
if (!isDone) grammarPending++;
} else {
vocab++;
if (!isDone) vocabPending++;
}
}
return { vocab, grammar, vocabPending, grammarPending };
}
function counts(row, day, ctx, precomputed) {
const m = precomputed !== undefined ? precomputed : model(day, ctx);
if (m) return `Từ vựng · ${m.vocab} từ  /  Ngữ pháp · ${m.grammar} bài` + (Array.isArray(day.reading) ? `  /  Khám phá · ${day.reading.length} bài` : '');
const h = row.querySelector('h3')?.textContent.trim();
return h || 'Mở để xem bài học';
}
function badge(card, text) {
if (!card) return;
let el = card.querySelector('.kfc-count');
if (!el) { el = document.createElement('p'); el.className = 'kfc-count'; card.querySelector('.kf-dt-title')?.after(el); }
setText(el, text);
}
function boardCounts(host, ctx, key) {
const board = host.querySelector('.kf-dt-board');
if (!board) return;
const day = ctx?.plan?.days?.find(d => d.date === key);
const m = model(day, ctx);
if (!m) return;
badge(board.querySelector('.kf-dt-card--vocab'), `${m.vocab} từ vựng • ${m.vocabPending} chưa học`);
badge(board.querySelector('.kf-dt-card--grammar'), `${m.grammar} bài ngữ pháp • ${m.grammarPending} chưa học`);
if (Array.isArray(day.reading)) badge(board.querySelector('.kf-dt-card--reading'), `${day.reading.length} bài đọc • gợi ý hôm nay`);
}
function ensureDetail(row) {
let detail = row.querySelector('.kfc-detail');
if (detail) return detail;
detail = document.createElement('div');
detail.className = 'kfc-detail';
const kids = [];
for (const child of [...row.children]) {
if (child.classList.contains('plan-day-head') || child.classList.contains('kfc-summary')) continue;
kids.push(child);
}
kids.forEach(k => detail.appendChild(k));
row.appendChild(detail);
return detail;
}
function ensurePill(row, open) {
const head = row.querySelector('.plan-day-head');
if (!head) return null;
let pill = head.querySelector('.kfc-toggle');
if (!pill) {
pill = document.createElement('button');
pill.type = 'button';
pill.className = 'kfc-toggle';
pill.addEventListener('click', e => {
e.preventDefault();
e.stopPropagation();
const next = !row.classList.contains('is-open');
row.classList.toggle('is-open', next);
setText(pill, next ? 'Thu gọn' : 'Chi tiết');
pill.setAttribute('aria-expanded', String(next));
});
head.appendChild(pill);
}
setText(pill, open ? 'Thu gọn' : 'Chi tiết');
pill.setAttribute('aria-expanded', String(open));
return pill;
}
function ensureToday(row) {
const head = row.querySelector('.plan-day-head');
if (!head) return;
let b = head.querySelector('.kfc-today');
if (!b) {
b = document.createElement('span');
b.className = 'kfc-today';
b.textContent = 'Hôm nay';
const badgeEl = head.querySelector('.plan-day-badge');
if (badgeEl) badgeEl.after(b); else head.appendChild(b);
}
}
function decorate() {
const host = document.getElementById('hub-content');
const ctx = context();
if (!host || !ctx) return;
if (obs) obs.disconnect();
try {
const daysMap = getDaysByNum(ctx);
const key = todayKey();
if (host.querySelector('.kf-dt-board')) boardCounts(host, ctx, key);
for (const row of host.querySelectorAll('.plan-day-row[data-day]')) {
const n = Number(row.dataset.day);
const day = daysMap.get(n);
if (!day) continue;
const m = model(day, ctx);
const isToday = day.date === key || row.classList.contains('is-today');
if (isToday) ensureToday(row);
let summary = row.querySelector('.kfc-summary');
if (!summary) {
summary = document.createElement('p');
summary.className = 'kfc-summary';
row.querySelector('.plan-day-head')?.after(summary);
}
setText(summary, counts(row, day, ctx, m));
ensureDetail(row);
ensurePill(row, row.classList.contains('is-open'));
if (m) {
const vBtn = row.querySelector('.plan-day-actions a[href*="kind=vocab"], .plan-day-actions button[data-kind="vocab"]');
const gBtn = row.querySelector('.plan-day-actions a[href*="kind=grammar"], .plan-day-actions button[data-kind="grammar"]');
if (vBtn && m.vocabPending > 0) setText(vBtn, `Học ${m.vocabPending} từ`);
if (gBtn && m.grammarPending > 0) setText(gBtn, `Học ${m.grammarPending} bài`);
}
}
} finally {
if (obs) obs.observe(host, { childList: true, subtree: true });
}
}
let pending = false;
function queue() { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; decorate(); }); }
const host = document.getElementById('hub-content');
const obs = host ? new MutationObserver(queue) : null;
if (obs && host) { obs.observe(host, { childList: true, subtree: true }); queue(); }
})();
