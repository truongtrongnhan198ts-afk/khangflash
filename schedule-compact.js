/* KhangFlash schedule: presentation and existing-plan counts only. */
(() => {
  'use strict';
  if (document.body.dataset.page !== 'schedule' || window.KFScheduleCompact) return;
  window.KFScheduleCompact = { version: '20261123-compact1' };
  const setText = (node, text) => { if (node && node.textContent !== text) node.textContent = text; };
  const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
  function context() {
    try { return typeof activeSchedule !== 'undefined' ? activeSchedule : null; } catch { return null; }
  }
  function model(day, ctx) {
    if (!day || !Array.isArray(ctx?.library?.cards)) return null;
    const map = new Map(ctx.library.cards.map(c => [String(c.id), c]));
    const cards = (day.cards || []).map(id => map.get(String(id))).filter(Boolean);
    if (cards.length !== (day.cards || []).length) return null;
    const seen = new Set((ctx.stats?.cards || []).map(c => String(c.card_id)));
    return { vocab: cards.filter(c => c.studyKind !== 'grammar').length, grammar: cards.filter(c => c.studyKind === 'grammar').length, vocabPending: cards.filter(c => c.studyKind !== 'grammar' && !seen.has(String(c.id))).length, grammarPending: cards.filter(c => c.studyKind === 'grammar' && !seen.has(String(c.id))).length };
  }
  function counts(row, day, ctx) {
    const m = model(day, ctx);
    if (m) return `Từ vựng · ${m.vocab} từ   /   Ngữ pháp · ${m.grammar} bài` + (Array.isArray(day.reading) ? `   /   Khám phá · ${day.reading.length} bài` : '') + (Array.isArray(day.writing) ? `   /   Writing · ${day.writing.length} bài` : '');
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
    const day = ctx?.plan?.days?.find(d => d.date === key);
    const board = host.querySelector('.kf-dt-board');
    if (!board) return;
    const card = id => board.querySelector(`[data-dt-id="${id}"]`);
    let tasks = [];
    if (day && ctx.plan.curriculum && window.FullPlan?.tasks) {
      try { tasks = window.FullPlan.tasks(day, ctx.library, ctx.stats); } catch {}
    }
    const known = id => tasks.find(t => t.id === id);
    const remaining = task => {
      if (!task) return null;
      const ratio = task.count.match(/^(\d+)\/(\d+)/);
      return ratio ? `${Math.max(0,Number(ratio[2])-Number(ratio[1]))} ${task.id === 'vocab' ? 'từ' : 'bài'} còn lại` : task.count;
    };
    const m = model(day, ctx);
    const fallback = {
      due: Array.isArray(ctx?.stats?.cards) ? `${ctx.stats.cards.filter(c => c.due && c.due <= key).length} thẻ đến hạn` : 'Chưa tải số lượng',
      vocab: m ? `${m.vocabPending} từ cần học` : 'Chưa tải số lượng',
      grammar: m ? `${m.grammarPending} bài cần học` : 'Chưa tải số lượng',
      knowledge: Array.isArray(day?.reading) ? `${day.reading.length} bài trong ngày` : 'Chưa phân bổ số bài',
      news: Number.isFinite(day?.news) ? `${day.news} phút` : 'Chưa phân bổ số bài',
      listen: Number.isFinite(day?.listening) ? `${day.listening} phút` : 'Chưa phân bổ số bài',
      wt1: 'Chưa phân bổ riêng', wt2: 'Chưa phân bổ riêng'
    };
    for (const [id, taskId] of Object.entries({ due:'review', vocab:'vocab', grammar:'grammar', knowledge:'reading', news:'news', listen:'listening' })) {
      const t = known(taskId); badge(card(id), remaining(t) || fallback[id]);
      const a = card(id)?.querySelector('.kf-dt-go');
      const href = t?.href || (day && id==='vocab' ? `flashcard.html?day=${day.day}&mode=learn` : day && id==='grammar' ? `grammar.html?day=${day.day}` : null);
      if (a && href && a.getAttribute('href') !== href) a.setAttribute('href', href);
    }
    const writing = known('writing');
    const t2 = writing?.note.match(/(\d+)\/(\d+) bài IELTS Task 2/);
    badge(card('wt2'), t2 ? `${Math.max(0,Number(t2[2])-Number(t2[1]))} bài còn lại` : fallback.wt2);
    badge(card('wt1'), fallback.wt1);
  }
  function decorate() {
    const host = document.getElementById('hub-content'); if (!host) return;
    const ctx = context(), key = ctx?.stats?.today || todayKey();
    const rows = [...host.querySelectorAll('.plan-week .plan-task')];
    for (const row of rows) {
      const n = Number((row.querySelector('.kf-day-day,strong')?.textContent || '').match(/Ngày\s+(\d+)/)?.[1]);
      const day = ctx?.plan?.days?.find(d => d.day === n);
      let wrap = row.closest('.kfc-day');
      if (!wrap) {
        wrap = document.createElement('details'); wrap.className = 'kfc-day';
        const sum = document.createElement('summary');
        const date = document.createElement('span'); date.className = 'kfc-date';
        const name = document.createElement('strong'); name.textContent = n ? `Ngày ${n}` : 'Bài học';
        const stamp = document.createElement('span'); stamp.className='kfc-stamp';
        date.append(name,stamp);
        const meta=document.createElement('span');meta.className='kfc-meta';
        const open=document.createElement('span');open.className='kfc-open';open.textContent='Xem bài';
        sum.append(date,meta,open);row.before(wrap);wrap.append(sum,row);
        row.querySelectorAll('p').forEach(p => {
          if (/^(Học nghĩa và cách dùng;|Đọc báo và nghe podcast|Ngữ pháp: học quy tắc)/.test(p.textContent.trim())) p.classList.add('kfc-repeated-help');
        });
      }
      const date = day?.date || row.querySelector('.kf-day-date')?.textContent.trim() || row.querySelector('div:first-of-type>p')?.textContent.trim() || '';
      setText(wrap.querySelector('.kfc-stamp'), date);
      setText(wrap.querySelector('.kfc-meta'), counts(row,day,ctx));
      wrap.classList.toggle('is-today', date === key);
      const m=model(day,ctx);
      if (m) row.querySelectorAll('a.hub-button').forEach(a=>{
        const href=a.getAttribute('href')||'';
        if (/flashcards?\.html\?day=/.test(href)) setText(a,`Từ vựng · ${m.vocab} từ`);
        if (/grammar\.html\?day=/.test(href)) setText(a,`Ngữ pháp · ${m.grammar} bài`);
      });
    }
    const weeks=[...host.querySelectorAll('details.plan-week')].filter(w=>w.querySelector(':scope > .kfc-day,:scope > .plan-completed-day'));
    for (const week of weeks) {
      week.classList.add('kfc-week');
      if (!week.dataset.kfcReady) {
        const dates = [...week.querySelectorAll('.kfc-stamp')].map(s=>s.textContent).filter(Boolean);
        if (dates.length) week.dataset.kfcReady='1';
        week.toggleAttribute('open', dates.includes(key) || [...week.querySelectorAll('.plan-completed-day')].some(d=>d.textContent.includes(key)));
      }
    }
    if (weeks.length && !host.querySelector('.kfc-guide')) {
      const guide=document.createElement('details');guide.className='kfc-guide';
      const s=document.createElement('summary');s.textContent='Hướng dẫn học chung';
      const p=document.createElement('p');p.textContent='Chia từ vựng thành các phiên ngắn. Với ngữ pháp, đọc quy tắc trước rồi làm bài tập. Khi đọc và nghe, tự tóm tắt ý chính rồi kiểm tra lại.';
      guide.append(s,p);weeks[0].before(guide);
    }
    boardCounts(host,ctx,key);
  }
  let pending=false;
  function queue(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;decorate();});}
  const host=document.getElementById('hub-content');
  if(host){new MutationObserver(queue).observe(host,{childList:true,subtree:true});queue();}
})();
