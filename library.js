'use strict';
const pickingFlashcards=document.body.dataset.page==='flashcard-picker';
const le=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let bank,state,group=new URLSearchParams(location.search).get('group')||'topics',search=new URLSearchParams(location.search).get('q')||'';
const lookup=new URLSearchParams(location.search).get('lookup')==='1';
let resultLimit=50;
let learnedLimit=100;
const normalizeSearch=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/\s+/g,' ').trim();
function learnedEntries(){
  if(!bank||!state)return [];
  const cardById=new Map(bank.cards.map(c=>[c.id,c]));
  const items=[];
  for(const p of (state.cards||[])){
    if(!p||p.status!=='known')continue;
    const card=cardById.get(p.card_id);
    if(!card||card.studyKind==='grammar')continue;
    items.push({card,progress:p});
  }
  items.sort((a,b)=>String(b.progress.updated_at||b.progress.last_reviewed||'').localeCompare(String(a.progress.updated_at||a.progress.last_reviewed||'')));
  return items;
}
function formatDateVi(iso){
  if(!iso||!/^\d{4}-\d{2}-\d{2}$/.test(String(iso)))return '—';
  const parts=String(iso).split('-');
  return parts[2]+'/'+parts[1]+'/'+parts[0];
}
function learnedDeckCardHtml(entries){
  const total=entries.length;
  const preview=entries.slice(0,4).map(x=>x.card.term);
  const tiles=preview.length
    ? preview.map(t=>`<div class="word-tile"><i></i>${le(t)}</div>`).join('')
    : '<div class="word-tile"><i></i>Chưa có từ nào — bấm Nhớ khi học</div>';
  return `<a class="deck" href="${pickingFlashcards?'flashcards.html':'library.html'}?group=learned" data-open-learned="1" style="background:#9ce3c5;color:#12251d"><h2>Từ vựng đã học / đã nhớ</h2><p>Tự động lưu mọi từ bạn đã bấm Nhớ hoặc Nhớ rồi để xem lại và ôn bất cứ lúc nào.</p><div class="deck-meta">${total.toLocaleString('vi-VN')} THẺ ĐÃ NHỚ</div><div class="deck-art">${tiles}</div><span class="deck-link-label">Mở danh sách đã nhớ</span><div class="deck-grid-lines"></div></a>`;
}
function learnedSectionHtml(entries){
  const q=normalizeSearch(search);
  const filtered=q
    ? entries.filter(({card})=>normalizeSearch(card.term+' '+card.definition+' '+(card.variants||[]).map(v=>v.definition||'').join(' ')).includes(q))
    : entries;
  if(!entries.length){
    return `<div class="empty-hub"><strong>Chưa có từ vựng nào trong mục Đã học / Đã nhớ.</strong><p style="margin-top:8px;opacity:.85">Mỗi khi bạn học Flashcard và bấm <b>Nhớ</b> hoặc <b>Nhớ rồi</b>, từ đó sẽ tự động được thêm vào đây.</p><p style="margin-top:14px"><a class="hub-button" href="${pickingFlashcards?'flashcards.html':'library.html'}?group=topics">Chọn bộ Flashcard để học</a></p></div>`;
  }
  const rows=filtered.slice(0,learnedLimit).map(({card,progress},idx)=>{
    const v=(card.variants||[]).find(x=>x.source!=='forumflash')||(card.variants||[])[0]||{};
    const def=v.definition||card.definition||'';
    const ex=v.example||'';
    const dueTxt=progress.due?formatDateVi(progress.due):'—';
    const repsTxt=(progress.reps||1)+' lần';
    return `<tr><td style="opacity:.7">${idx+1}</td><td><strong>${le(card.term)}</strong>${card.partOfSpeech?`<br><small style="opacity:.75">${le(card.partOfSpeech)}</small>`:''}</td><td>${le(def)}${ex?`<p style="margin:4px 0 0;font-size:12px;opacity:.75">${le(ex)}</p>`:''}</td><td style="white-space:nowrap">Ôn: <strong>${le(dueTxt)}</strong><br><small style="opacity:.75">Đã nhớ · ${le(repsTxt)}</small></td><td style="white-space:nowrap"><a href="flashcard.html?card=${encodeURIComponent(card.id)}&status=all#study">Mở thẻ</a></td></tr>`;
  }).join('');
  return `<section aria-label="Từ vựng đã học và đã nhớ"><p style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 14px"><a class="hub-button" href="flashcard.html?topic=all&status=known&includeDone=1#study">Ôn tập ${entries.length.toLocaleString('vi-VN')} từ đã nhớ bằng Flashcard</a> <span class="collection-count" style="margin:0">Hiển thị ${Math.min(filtered.length,learnedLimit).toLocaleString('vi-VN')} / ${filtered.length.toLocaleString('vi-VN')} từ${q?' khớp tìm kiếm':''} · Mới nhớ nhất xếp trên cùng</span></p>${filtered.length?`<table class="source-table"><thead><tr><th>#</th><th>Từ / cụm từ</th><th>Nghĩa và ví dụ</th><th>Lịch ôn</th><th>Thẻ</th></tr></thead><tbody>${rows}</tbody></table>${filtered.length>learnedLimit?'<p style="margin-top:12px"><button class="hub-button" data-more-learned>Xem thêm 100 từ</button></p>':''}`:'<div class="empty-hub">Không có từ đã nhớ nào khớp từ khóa tìm kiếm.</div>'}</section>`;
}
function wordResults(){const q=normalizeSearch(search);if(!q||group==='learned')return lookup?'<p class="collection-count">Nhập từ/cụm tiếng Anh hoặc nghĩa tiếng Việt để tra trong toàn bộ thư viện.</p>':'';const hits=bank.cards.filter(c=>c.studyKind!=='grammar'&&normalizeSearch(c.term+' '+c.definition+' '+c.variants.map(v=>v.definition||'').join(' ')).includes(q)).sort((a,b)=>(normalizeSearch(b.term)===q)-(normalizeSearch(a.term)===q));return `<section aria-label="Kết quả tra từ"><p class="collection-count">${hits.length} từ/cụm phù hợp trong toàn bộ thư viện</p>${hits.length?`<table class="source-table"><thead><tr><th>Từ / cụm từ</th><th>Nghĩa và ví dụ</th><th>Flashcard</th></tr></thead><tbody>${hits.slice(0,resultLimit).map(c=>{const v=c.variants.find(v=>v.source!=='forumflash')||c.variants[0]||{};return `<tr><td><strong>${le(c.term)}</strong></td><td>${le(v.definition||c.definition)}${v.example?`<p>${le(v.example)}</p>`:''}</td><td><a href="flashcard.html?card=${encodeURIComponent(c.id)}&status=all#study">Mở thẻ</a></td></tr>`;}).join('')}</tbody></table>${hits.length>resultLimit?'<button class="hub-button" data-more-words>Xem thêm 50 kết quả</button>':''}`:'<div class="empty-hub">Không tìm thấy trong thư viện hiện tại. Thử từ ngắn hơn hoặc nghĩa tiếng Việt.</div>'}</section>`;}
const groups=[['topics','Chủ đề',null],['learned','Đã học / Đã nhớ',null],['academic','Academic','Academic vocabulary'],['topic','Topic Collocations','Topic collocations'],['prep','Giới từ','Giới từ'],['verb','Verb Collocations','Verb collocations'],['idioms','Idiom',null],['phrasal','Phrasal Verbs','Phrasal verbs'],['speaking','Speaking','Speaking vocabulary'],['writing','Writing Task 2','Writing Task 2'],['grammar','Ngữ pháp','Ngữ pháp'],['forumflash','ForumFlash',null]];
const colors=['#bd95f3','#a1d4e9','#bde3bd','#ff823d','#ffc32f','#c0cce9','#efb6a3','#b4d0f8'];
function sources(){if(group==='topics'||group==='idioms'||group==='learned')return bank.sources;return group==='forumflash'?bank.sources.filter(s=>s.id==='forumflash'):bank.sources.filter(s=>s.category===groups.find(g=>g[0]===group)?.[2]||bank.cards.some(c=>c.learningCategory===groups.find(g=>g[0]===group)?.[2]&&c.variants.some(v=>v.source===s.id)));}
function deckCards(tid,srcs){return bank.cards.filter(c=>c.studyKind!=='grammar'&&srcs.some(s=>c.sourceTopics[s.id]?.includes(tid))&&(!c.learningCategory||['topics','idioms','forumflash'].includes(group)||c.learningCategory===groups.find(g=>g[0]===group)?.[2])&&(group!=='idioms'||c.label==='Idiom · Speaking'));}
function deckHtml(title,description,cards,index,url){if(window.TDUi)return TDUi.deck(title,description,cards,index,url,state);const learned=cards.filter(c=>state.cards.some(p=>p.card_id===c.id&&p.status==='known')).length;const rate=cards.length?Math.round(learned/cards.length*100):0;const words=cards.filter(c=>!['Điền giới từ','Đoạn mẫu'].includes(c.label)).slice(0,3);const art=index%3===1?`<div class="deck-art letters">${(words[0]?.term.split(' ')[0]||'IELTS').slice(0,8).toUpperCase().split('').map(c=>`<span class="letter-tile">${le(c)}</span>`).join('')}</div>`:index%3===2?`<div class="deck-stat">${rate}%<small>đã học ${learned} / ${cards.length} thẻ</small></div>`:`<div class="deck-art">${words.map(w=>`<div class="word-tile"><i></i>${le(w.term)}</div>`).join('')}</div>`;return `<a class="deck" href="${url}" style="background:${colors[index%colors.length]}"><h2>${le(title)}</h2><p>${le(description)}</p><div class="deck-meta">${cards.length.toLocaleString('vi-VN')} THẺ · ${rate}% ĐÃ HỌC</div>${art}<span class="deck-link-label">Mở bộ thẻ</span><div class="deck-grid-lines"></div></a>`;}
function render(){
  const srcs=sources();
  const learnedList=learnedEntries();
  const category=groups.find(g=>g[0]===group)?.[1]||'Chủ đề';
  let decks=[];
  if(group==='learned'){
    decks=[];
  }else if(group==='grammar'){
    decks=srcs.map((s,i)=>({title:s.title,description:s.id==='pdf-2'?'Đảo ngữ, câu chẻ, phân từ và các cấu trúc nâng cao.':s.id==='pdf-15'?'154 cấu trúc và ví dụ: khi nào to + V-ing, khi nào to + V.':'Bảng đối chiếu ngắn gọn, nghĩa và ghi chú cách dùng.',cards:bank.cards.filter(c=>c.studyKind==='grammar'&&c.variants.some(v=>v.source===s.id)),url:'grammar.html?source='+s.id}));
  }else if(group==='speaking'&&bank.sources.find(s=>s.id==='pdf-8')?.units){
    const speaking=bank.sources.find(s=>s.id==='pdf-8');
    decks=speaking.units.map(u=>({title:u.title,description:'15 mục · 5 mục gốc + 10 bổ sung · trang '+u.page,cards:u.cards.map(id=>bank.cards.find(c=>c.id===id)),url:'flashcard.html?topic='+u.id+'#study'}));
  }else{
    decks=bank.topics.filter(t=>!t.id.startsWith('speaking-unit-')).map(t=>({title:t.title,description:t.description,cards:deckCards(t.id,srcs),url:'flashcard.html?topic='+t.id+(group==='topics'?'':group==='idioms'?'&category=idioms':group==='forumflash'?'&source=forumflash':'&category='+encodeURIComponent(groups.find(g=>g[0]===group)[2]))+'#study'})).filter(d=>d.cards.length);
  }
  decks=decks.filter(d=>(d.title+' '+d.description).toLowerCase().includes(search.toLowerCase()));
  const ids=new Set(decks.flatMap(d=>d.cards.map(c=>c.id)));
  const sourceTitle=group==='learned'?'Tự động lưu mọi từ bạn đã bấm Nhớ / Nhớ rồi':group==='topics'?'Tất cả tài liệu + ForumFlash':category;
  const dueCount=state.cards.filter(p=>p.due<=state.today&&bank.cards.some(c=>c.id===p.card_id&&c.studyKind!=='grammar')).length;
  document.getElementById('hub-content').innerHTML=`${pickingFlashcards?`<p style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><a class="hub-button" href="due.html">Thẻ đến hạn ôn · ${dueCount}</a> <a class="hub-button alt" href="flashcard.html?lesson=today#study">Học từ vựng hôm nay</a> <button type="button" class="hub-button alt" data-group="learned">Từ vựng đã học / đã nhớ · ${learnedList.length.toLocaleString('vi-VN')}</button></p>`:''}<div class="collection-tabs" role="tablist" aria-label="Nhóm bộ từ">${groups.map(([id,title])=>`<button role="tab" aria-selected="${group===id}" data-group="${id}" class="${group===id?'active':''}">${title}${id==='learned'?' · '+learnedList.length.toLocaleString('vi-VN'):''}</button>`).join('')}</div><div class="page-title library-heading"><div><h1>${lookup?'Tra từ vựng.':group==='learned'?'Từ vựng đã học / đã nhớ.':group==='grammar'?'Ngữ pháp của Khang.':pickingFlashcards?'Chọn bộ Flashcard.':'Bộ từ của Khang.'}</h1><p>${le(sourceTitle)}${group==='learned'?'':' · Bản trong file của mày được ưu tiên khi trùng mục.'}</p></div><input class="collection-search" id="deck-search" type="search" placeholder="${group==='learned'?'Tìm trong từ đã học / đã nhớ…':'Tìm từ, nghĩa hoặc chủ đề…'}" aria-label="Tìm từ, nghĩa hoặc chủ đề" value="${le(search)}"></div>${group==='learned'?learnedSectionHtml(learnedList):wordResults()}${group==='learned'?'':`<p class="collection-count" ${lookup?'hidden':''}>${decks.length} bộ · ${ids.size.toLocaleString('vi-VN')} thẻ riêng biệt${group==='speaking'?' · 450 mục / 30 chủ đề: 150 mục gốc + 300 bổ sung; 3 lượt từ gốc trùng giữ đủ phiên bản nguồn.':''}${group==='topics'?' · Gộp các tập cùng loại; giữ nguyên mọi nguồn và ví dụ.':''}</p><section class="deck-grid" ${lookup?'hidden':''}>${group==='topics'&&window.TDUi?TDUi.personal():''}${group==='topics'?learnedDeckCardHtml(learnedList):''}${decks.map((d,i)=>deckHtml(d.title,d.description,d.cards,i,d.url)).join('')||'<div class="empty-hub">Không có bộ phù hợp.</div>'}</section><details class="library-source-list" id="source-files" ${lookup?'hidden':''}><summary class="source-list-toggle">Tài liệu trong nhóm này · ${srcs.length} nguồn</summary><table class="source-table"><thead><tr><th>Tài liệu</th><th>Mục gốc</th><th>Học / mở file</th></tr></thead><tbody>${srcs.map(s=>`<tr><td>${le(s.title)}${s.supplements?'<br><small>+ '+s.supplements+' bài ôn bổ sung</small>':''}</td><td>${s.originalCount.toLocaleString('vi-VN')}</td><td><a href="flashcard.html?source=${s.id}&topic=all#study">Học</a> · ${s.file?`<a href="${le(s.file)}" target="_blank" rel="noopener">File gốc</a>`:s.id==='speaking-expansion'?'Mục bổ sung theo 30 unit':'<a href="https://forumflash.vercel.app/" target="_blank" rel="noopener">Trang gốc</a>'}</td></tr>`).join('')}</tbody></table><p style="font-size:12px;color:var(--muted);line-height:1.8">4.000 lượt mục của ForumFlash có từ lặp giữa các chủ đề. Một thẻ gộp có thể thuộc nhiều bộ. Nghĩa, ví dụ và chú thích của từng tài liệu vẫn xem được ở phần nguồn trên thẻ.</p></details>`}`;
  if(group==='grammar'){document.querySelectorAll('.side-nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href').includes('group=grammar')));}
}
document.addEventListener('click',e=>{
  const learnedLink=e.target.closest('[data-open-learned]');
  if(learnedLink){
    e.preventDefault();
    group='learned';
    search='';
    learnedLimit=100;
    history.replaceState(null,'',(pickingFlashcards?'flashcards.html':'library.html')+'?group=learned');
    render();
    return;
  }
  const b=e.target.closest('[data-group]');
  if(b){
    group=b.dataset.group;
    search='';
    learnedLimit=100;
    history.replaceState(null,'',(pickingFlashcards?'flashcards.html':'library.html')+'?group='+group+(lookup?'&lookup=1':''));
    render();
  }
});
document.addEventListener('input',e=>{if(e.target.id==='deck-search'){const pos=e.target.selectionStart;search=e.target.value;resultLimit=50;learnedLimit=100;render();const field=document.getElementById('deck-search');field.focus();if(field.setSelectionRange)try{field.setSelectionRange(pos,pos);}catch{}}});
Promise.all([fetch('data.json').then(r=>r.json()),KStore.load(),window.TDUi?.ready]).then(([d,s])=>{
  bank=d;state=s;
  if(!groups.some(g=>g[0]===group))group='topics';
  render();
  if(lookup)document.getElementById('deck-search')?.focus();
  if(window.KStore&&typeof KStore.onChange==='function'){
    KStore.onChange(nextState=>{state=nextState;if(bank)render();});
  }
  window.addEventListener('storage',ev=>{
    if(ev.key==='kf_vercel_study_v1'&&window.KStore&&typeof KStore.refresh==='function'){
      KStore.refresh().catch(()=>{});
    }
  });
}).catch(()=>{document.getElementById('hub-content').innerHTML='<div class="empty-hub">Không tải được bộ từ. <button class="hub-button" onclick="location.reload()">Thử lại</button></div>';});

document.addEventListener('click',e=>{if(e.target.closest('a[href="#source-files"]')){const d=document.getElementById('source-files');if(d)d.open=true;}});

document.addEventListener('click',e=>{if(e.target.closest('[data-more-words]')){resultLimit+=50;render();}});
document.addEventListener('click',e=>{if(e.target.closest('[data-more-learned]')){learnedLimit+=100;render();}});
