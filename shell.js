// Load optional live presentation settings independently of the study shell.
(()=>{if(/^\/admin-live(?:\.html)?\/?$/.test(location.pathname)||window.__KF_LIVE_OVERRIDE_BOOTED__||document.querySelector('script[src*="live-override.js"]'))return;const script=document.createElement('script');script.src='/live-override.js?v=333-large-admin';script.async=true;document.head.appendChild(script);})();
'use strict';
// Remove the retired floating reader, including copies inserted after page load.
// Card pronunciation and its UK/US settings use different labels and stay intact.
(()=>{
 const selector='button,a,[role="button"]';
 const retired=el=>/^[^\p{L}]*Giọng đọc\s*\+$/u.test((el.textContent||'').replace(/\s+/g,' ').trim());
 function removeReader(root){
  if(root.nodeType===3){const control=root.parentElement?.closest(selector);if(control&&retired(control))control.remove();return;}
  if(root.nodeType!==1)return;
  const controls=[...(root.matches(selector)?[root]:[]),...root.querySelectorAll(selector)];
  for(const control of controls)if(retired(control))control.remove();
 }
 removeReader(document.body);
 if(typeof MutationObserver==='function')new MutationObserver(records=>{
  for(const record of records){
   if(record.type==='characterData')removeReader(record.target);
   else for(const node of record.addedNodes){removeReader(node);if(node.parentElement?.matches(selector))removeReader(node.parentElement);}
  }
 }).observe(document.body,{childList:true,subtree:true,characterData:true});
})();
const activePage=document.body.dataset.page||'dashboard';
const links=[['dashboard','dashboard.html','Tổng quan','Tổng quan'],['library','library.html','Bộ từ','Bộ từ'],['flashcard','flashcards.html','Flashcard','Flashcard'],['due','due.html','Flashcard','Thẻ đến hạn ôn'],['games','games.html','Thống kê','Games'],['grammar','grammar.html','Sổ ghi chú','Ngữ pháp'],['writing','writing.html','Sổ ghi chú','Writing'],['ielts-readlis','ielts-readlis.html','Sổ ghi chú','IELTS Read–Lis'],['schedule','schedule.html','Lịch sử làm bài','Lịch học'],['knowledge','knowledge.html','Sổ ghi chú','Khám phá kiến thức'],['history','history.html','Lịch sử làm bài','Lịch sử làm bài']];
(window.TDUi?.ready||Promise.resolve()).then(()=>{const icons=window.TDUi?.icons()||{};const icon=(name)=>icons[name]||icons['Flashcard']||'';document.getElementById('sidebar').innerHTML=`<a class="side-brand" href="dashboard.html"><img src="tid-assets/logo.webp" alt="The IELTS Dictionary"><div><strong>The IELTS</strong><small>DICTIONARY</small></div></a><div class="sidebar-tools-top"><button class="theme-button" id="theme-toggle" aria-label="Chế độ sáng / tối">${icon('Chế độ sáng / tối')||'☼'}</button><button class="sidebar-toggle" id="sidebar-toggle" aria-label="Mở menu học tập" title="Mở / thu gọn menu" aria-expanded="false" aria-controls="sidebar-menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div><div class="side-intro"><small>${activePage==='flashcard'?'FLASHCARD · ÔN TẬP':'TỔNG QUAN · TIẾN ĐỘ LUYỆN ĐỀ'}</small><strong>${activePage==='flashcard'?'Lật thẻ, nhớ từ lâu hơn':'Chào Khang, hôm nay luyện đề nhé!'}</strong></div><div class="side-lookup"><label class="side-search" for="side-word-search">${icon('Tra từ vựng...')}<input id="side-word-search" type="search" placeholder="Tra từ vựng…" aria-label="Tra từ tiếng Anh hoặc tiếng Việt" autocomplete="off" aria-controls="side-word-results" aria-expanded="false"></label><div id="side-word-results" class="side-word-results" hidden></div></div><p class="side-label">HỌC TẬP</p><nav class="side-nav" id="sidebar-menu" aria-label="Các phần học">${links.map(([id,url,key,name])=>`<a href="${url}" title="${name}" class="${(activePage===id||(activePage==='flashcard-picker'&&id==='flashcard'))?'active':''}" aria-label="${name}" ${(activePage===id||(activePage==='flashcard-picker'&&id==='flashcard'))?'aria-current="page"':''}><span class="nav-icon">${icon(key)}</span><span class="nav-label">${name}</span>${id==='due'?'<span class="due-notification-badge" hidden aria-hidden="true"></span>':''}</a>`).join('')}</nav><div class="side-bottom"><span class="side-avatar">…</span><span class="side-profile-name">Đang kiểm tra tài khoản…</span></div>`;
 const profile=document.querySelector('.side-bottom');
 async function refreshSession(){
  try{
   const response=await fetch('/api/session',{credentials:'same-origin',cache:'no-store'});
   if(!response.ok)throw Error('session');
   const session=await response.json();
   const name=session.authenticated?session.displayName:'Chế độ khách · Đăng nhập';
   profile.replaceChildren();
   const avatar=document.createElement('span');avatar.className='side-avatar';avatar.textContent=session.authenticated?Array.from(name)[0].toUpperCase():'↗';
   const label=document.createElement('span');label.className='side-profile-name';label.textContent=name;
   const link=document.createElement('a');link.style.cssText='display:flex;align-items:center;gap:12px;color:inherit;text-decoration:none';
   link.href='/signin-with-chatgpt?return_to='+encodeURIComponent(location.pathname+location.search+location.hash);link.target='_top';
   link.title=session.authenticated?'Đã đăng nhập: '+name:'Kết nối tài khoản ChatGPT với trang này';link.setAttribute('aria-label',link.title);
   if(session.authenticated){profile.title=link.title;profile.append(avatar,label);}else{link.append(avatar,label);profile.append(link);}
  }catch{profile.querySelector('.side-profile-name')?.replaceChildren(document.createTextNode('Chưa kiểm tra được tài khoản'));}
 }
 refreshSession();
 window.addEventListener('focus',refreshSession);
 const wordInput=document.getElementById('side-word-search'),wordBox=document.getElementById('side-word-results');
 const wordEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const wordNorm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/\s+/g,' ').trim();
 let wordData,wordLoading,wordVersion=0,wordLimit=20;
 async function searchWords(){const version=++wordVersion,q=wordNorm(wordInput.value);wordBox.hidden=!q;wordInput.setAttribute('aria-expanded',String(!!q));if(!q)return;
 wordBox.innerHTML='<p role="status">Đang tìm…</p>';
 try{if(!wordData){wordLoading ||= fetch('/data.json').then(r=>{if(!r.ok)throw Error('data');return r.json();}).then(d=>d.cards.filter(c=>c.studyKind!=='grammar').map(c=>({card:c,key:wordNorm(c.term+' '+c.definition+' '+c.variants.map(v=>v.definition||'').join(' ')),term:wordNorm(c.term)}))).catch(e=>{wordLoading=null;throw e;});wordData=await wordLoading;}if(version!==wordVersion)return;
 const hits=wordData.filter(x=>x.key.includes(q)).sort((a,b)=>(b.term===q)-(a.term===q)||(b.term.startsWith(q))-(a.term.startsWith(q)));
 wordBox.innerHTML=`<p role="status">${hits.length} kết quả</p>${hits.slice(0,wordLimit).map(({card:c})=>{const v=c.variants.find(v=>v.source!=='forumflash')||c.variants[0]||{};return `<details class="side-word-hit"><summary><strong>${wordEscape(c.term)}</strong><span>${wordEscape(v.definition||c.definition)}</span></summary>${v.example?`<p>${wordEscape(v.example)}</p>`:''}<a href="flashcard.html?card=${encodeURIComponent(c.id)}&status=all#study">Mở thẻ này</a></details>`;}).join('')}${!hits.length?'<p>Không tìm thấy trong thư viện. Thử từ ngắn hơn hoặc nghĩa tiếng Việt.</p>':''}${hits.length>wordLimit?'<button type="button" data-side-more>Xem thêm</button>':''}`;
 }catch{if(version===wordVersion)wordBox.innerHTML='<p role="status">Không tải được dữ liệu. <button type="button" data-side-retry>Thử lại</button></p>';}}
 wordInput.addEventListener('input',()=>{wordLimit=20;searchWords();});wordInput.addEventListener('focus',()=>{if(wordInput.value.trim())searchWords();});wordInput.addEventListener('keydown',e=>{if(e.key==='Escape'){++wordVersion;wordBox.hidden=true;wordInput.setAttribute('aria-expanded','false');}});
 wordBox.addEventListener('click',e=>{if(e.target.closest('[data-side-more]')){wordLimit+=20;searchWords();}if(e.target.closest('[data-side-retry]'))searchWords();});
 document.addEventListener('click',e=>{if(!e.target.closest('.side-lookup')){++wordVersion;wordBox.hidden=true;wordInput.setAttribute('aria-expanded','false');}});
 try{if(localStorage.getItem('khangflash.theme')==='light'){document.body.classList.add('theme-light');document.body.classList.remove('dark');}}catch{}
 document.getElementById('theme-toggle').onclick=()=>{document.body.classList.toggle('theme-light');document.body.classList.toggle('dark',!document.body.classList.contains('theme-light'));try{localStorage.setItem('khangflash.theme',document.body.classList.contains('theme-light')?'light':'dark');}catch{}};
 const side=document.getElementById('sidebar'),toggle=document.getElementById('sidebar-toggle');
 const setExpanded=value=>{side.classList.toggle('expanded',value);toggle.setAttribute('aria-expanded',String(value));toggle.setAttribute('aria-label',value?'Thu gọn menu học tập':'Mở menu học tập');if(!value){++wordVersion;wordBox.hidden=true;wordInput.setAttribute('aria-expanded','false');}};
 toggle.onclick=()=>setExpanded(!side.classList.contains('expanded'));
 if(window.matchMedia&&window.matchMedia('(hover: hover) and (min-width: 601px)').matches){
  let hoverTimer=0;
  side.addEventListener('mouseenter',()=>{clearTimeout(hoverTimer);setExpanded(true);});
  side.addEventListener('mouseleave',()=>{clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{if(document.activeElement!==wordInput&&wordBox.hidden)setExpanded(false);},140);});
 }
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&side.classList.contains('expanded')){setExpanded(false);toggle.focus();}});
 document.addEventListener('click',event=>{if(side.classList.contains('expanded')&&!side.contains(event.target)&&!event.target.closest('.side-word-results'))setExpanded(false);});

 if(window.KStore){
  let bank=null,lastCount=-1;const dueLink=document.querySelector('.side-nav a[href="due.html"]');
  function updateDue(state){if(!bank)return;const valid=new Set(bank.cards.map(c=>c.id));const due=new Set(state.cards.filter(c=>valid.has(c.card_id)&&c.due<=state.today).map(c=>c.card_id));const count=due.size,vocabulary=bank.cards.filter(c=>c.studyKind!=='grammar'&&due.has(c.id)).length,grammar=count-vocabulary,breakdown=`${vocabulary} từ vựng · ${grammar} bài ngữ pháp`;dueLink.classList.toggle('has-due-notification',count>0);const badge=dueLink.querySelector('.due-notification-badge');badge.hidden=!count;badge.textContent=count>99?'99+':String(count);const label=count?`Thẻ đến hạn ôn · ${breakdown}`:'Thẻ đến hạn ôn · Không có mục đến hạn';dueLink.title=label;dueLink.setAttribute('aria-label',label);if(lastCount!==breakdown){lastCount=breakdown;const live=document.getElementById('due-notification-status');live.textContent=count?`${breakdown} đến hạn cần ôn.`:'Không còn mục đến hạn ôn.';}}
  const live=document.createElement('span');live.id='due-notification-status';live.className='due-notification-sr';live.setAttribute('role','status');live.setAttribute('aria-live','polite');document.getElementById('sidebar').appendChild(live);
  KStore.onChange(updateDue);
  Promise.all([fetch('study-badge-catalog.json?v=317').then(r=>{if(!r.ok)throw Error('data');return r.json();}),KStore.load()]).then(([data])=>{bank=data;updateDue(KStore.get());}).catch(()=>{});
  const refreshDue=()=>{if(document.visibilityState!=='hidden')KStore.refresh?.().catch(()=>{});};
  document.addEventListener('visibilitychange',refreshDue);window.addEventListener('focus',refreshDue);window.addEventListener('pageshow',e=>{if(e.persisted)refreshDue();});setInterval(refreshDue,60000);
 }
});
