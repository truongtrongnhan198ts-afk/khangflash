'use strict';
window.KWordFlash=(()=>{
 let game=null,timer=null,generation=0;
 const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function cancel(){generation++;clearTimeout(timer);timer=null;}
 function reset(){cancel();game=null;document.documentElement.classList.remove('wordflash-light-mode');}
 function round(g){
  cancel();const terms=new Set(),meanings=new Set();g.cards=[];
  for(const c of g.remaining){const t=normalize(c.term),d=normalize(definition(c));if(!t||!d||terms.has(t)||meanings.has(d))continue;terms.add(t);meanings.add(d);g.cards.push(c);if(g.cards.length===g.level)break;}
  const ids=new Set(g.cards.map(c=>c.id));g.remaining=g.remaining.filter(c=>!ids.has(c.id));
  let order=shuffle(g.cards);if(order.length>1&&order.every((c,i)=>c.id===g.cards[i].id))order=[...order.slice(1),order[0]];
  g.answers=order.map(c=>({card:c,draft:'',wrong:false,hinted:false,saved:false,invalid:false,eventId:crypto.randomUUID(),occurredAt:null}));
  Object.assign(g,{phase:'ready',pos:0,error:'',saving:false});
 }
 function ensure(){if(!game){game={remaining:mixedReview?KFlashGames.groupCards():shuffle(pool.filter(c=>!sessionDone.has(c.id))),level:2,round:1};round(game);}return game;}
 function later(g,fn,ms){cancel();const token=generation;timer=setTimeout(()=>{if(token!==generation||game!==g||mode!=='wordflash')return;timer=null;fn();},ms);}
 function expose(g){g.phase='show';g.pos=0;step(g);}
 function step(g){
  draw();const c=g.cards[g.pos];
  later(g,()=>{g.pos++;if(g.pos<g.cards.length)step(g);else{g.phase='gap';draw();later(g,()=>{g.phase='recall';draw();focus();},2000);}},c.term.length>24?1600:1000);
 }
 function focus(){document.querySelector('.wf-answer:not(:disabled)')?.focus({preventScroll:true});}
 function intro(g){return `<div class="wf-intro"><span class="wf-orbit" aria-hidden="true">✦</span><p class="wf-kicker">NHÌN · GIỮ LẠI · GỌI TÊN</p><h2>${g.cards.length} từ. Một chuỗi trí nhớ.</h2><p>Mỗi từ xuất hiện khoảng 1 giây, cụm dài 1,6 giây. Sau 2 giây trống, gõ tiếng Anh theo nghĩa Việt được đảo thứ tự.</p><div class="wf-steps"><span><b>01</b> Quan sát</span><span><b>02</b> Giữ trong đầu</span><span><b>03</b> Tự nhớ lại</span></div><button class="wf-primary" data-wf="start">${g.phase==='paused'?'Xem lại chuỗi từ đầu':'Bắt đầu chớp từ'} →</button><small>Không cần nhớ thứ tự. Không giới hạn thời gian trả lời.</small></div>`;}
 function display(g){const showing=g.phase==='show';return `<div class="wf-display"><p class="wf-kicker">${showing?'QUAN SÁT · '+(g.pos+1)+' / '+g.cards.length:'GIỮ LẠI TRONG ĐẦU'}</p><div class="wf-dots" aria-hidden="true">${g.cards.map((_,i)=>`<i class="${showing&&i===g.pos?'on':''}"></i>`).join('')}</div><div class="wf-word" lang="en" aria-live="off">${showing?e(g.cards[g.pos].term):'<span class="wf-gap">···</span>'}</div><p class="wf-caption">${showing?'Nhìn từ, nhớ nghĩa.':'Sắp đến lượt bạn.'}</p><button class="wf-secondary" data-wf="pause">Tạm dừng</button></div>`;}
 function recall(g){return `<form id="wf-form"><div class="wf-form-head"><p class="wf-kicker">GỌI LẠI TỪ TRÍ NHỚ</p><h2>Nghĩa đã đổi chỗ. Bạn còn nhớ từ?</h2><p>Điền theo nghĩa, không theo thứ tự vừa thấy.</p></div><div class="wf-answers">${g.answers.map((r,i)=>`<div class="wf-answer-row ${r.saved?'is-saved':''}"><label for="wf-answer-${i}"><span class="wf-index">${String(i+1).padStart(2,'0')}</span><span lang="vi">${e(definition(r.card))}</span></label><div class="wf-input-wrap"><input id="wf-answer-${i}" class="wf-answer" data-wf-index="${i}" value="${e(r.draft)}" maxlength="500" autocomplete="off" autocapitalize="none" spellcheck="false" aria-invalid="${!!r.invalid}" aria-describedby="wf-note-${i}" ${r.saved||g.saving?'disabled':''} placeholder="Từ tiếng Anh…"><button type="button" class="wf-hint" data-wf-hint="${i}" ${r.saved||g.saving?'disabled':''}>Gợi ý chữ</button></div><p id="wf-note-${i}" class="wf-note">${r.saved?'✓ Đã lưu':r.hinted?'Gợi ý: '+e(r.card.term.slice(0,r.reveal||1))+'…':r.invalid?'Chưa đúng — giữ nguyên để bạn sửa.':' '}</p></div>`).join('')}</div><div class="wf-form-bottom"><p role="status">${e(g.error||(g.saving?'Đang lưu kết quả…':'Gõ sai không xóa câu trả lời. Dùng gợi ý được ghi nhận riêng.'))}</p><button class="wf-primary" ${g.saving?'disabled':''}>${g.saving?'Đang lưu…':g.error?'Thử lưu lại':'Kiểm tra chuỗi'}</button></div></form>`;}
 function summary(g){const perfect=g.answers.every(r=>!r.wrong&&!r.hinted);return `<div class="wf-summary"><span class="wf-orbit" aria-hidden="true">${perfect?'✧':'↗'}</span><p class="wf-kicker">HOÀN THÀNH VÒNG ${g.round}</p><h2>${perfect?'Bạn giữ trọn chuỗi từ.':'Đã nhớ lại. Tiếp tục củng cố.'}</h2><div class="wf-results"><strong>${g.answers.filter(r=>!r.wrong&&!r.hinted).length}<small>Tự nhớ chính xác</small></strong><strong>${g.answers.filter(r=>r.wrong||r.hinted).length}<small>Cần củng cố</small></strong></div><div class="wf-word-list">${g.answers.map(r=>`<p><b lang="en">${e(r.card.term)}</b><span>${e(definition(r.card))}</span></p>`).join('')}</div><p>${mixedReview?'Kết quả đã lưu. Tiếp tục sang game khác trong Tổng hợp.':g.remaining.length?(perfect?'Vòng sau: tối đa '+Math.min(4,g.level+1)+' từ.':'Vòng sau: tối đa '+Math.max(2,g.level-1)+' từ để giữ nhịp. '):'Đã hoàn thành bộ từ đang chọn.'}</p>${mixedReview?'<button class="wf-primary" data-wf="mixed-next">Tiếp tục Tổng hợp →</button>':g.remaining.length?'<button class="wf-primary" data-wf="next">Chuỗi tiếp theo →</button>':'<button class="wf-primary" data-mode="learn">Về lật thẻ</button>'}</div>`;}
 function draw(){
  const g=game;if(!g||mode!=='wordflash')return;document.documentElement.classList.add('wordflash-light-mode');
  $('stage').innerHTML=`<section class="word-flash"><header class="wf-header"><div><p class="wf-kicker">${mixedReview?'TỔNG HỢP · CHỚP CHUỖI TỪ':'TIDIAN PLAYGROUND · FLASH RECALL'}</p><h1>Chớp chuỗi <em>từ.</em></h1><p>Một thoáng nhìn. Một lần tự nhớ.</p></div><div class="wf-badge"><span>VÒNG ${String(g.round).padStart(2,'0')}</span><strong>${g.cards.length} từ</strong></div></header><div class="wf-paper">${!g.cards.length?'<div class="wf-intro"><h2>Không còn từ phù hợp.</h2><button class="wf-primary" data-mode="learn">Về lật thẻ</button></div>':g.phase==='ready'||g.phase==='paused'?intro(g):g.phase==='show'||g.phase==='gap'?display(g):g.phase==='recall'?recall(g):summary(g)}</div><footer class="wf-footer"><span>${mixedReview?'✦ Một chuỗi 2 từ · xong vòng sẽ chuyển game.':'✦ Bắt đầu 2 từ · tăng dần đến 4 khi tự nhớ đúng cả chuỗi.'}</span><span>Chỉ phần trả lời mới ghi nhận tiến độ.</span></footer></section>${window.TDUi?.modes?.(mixedReview?'mixed':'wordflash')||''}`;
 }
 function render(){ensure();draw();}
 async function submit(){
  const g=game;if(!g||g.phase!=='recall'||g.saving)return;
  const ready=[];let invalid=false;
  for(const r of g.answers){if(r.saved)continue;if(!r.draft.trim()){invalid=true;continue;}const ok=[r.card.term,...(r.card.aliases||[])].some(a=>normalize(a)===normalize(r.draft));if(!ok){r.wrong=true;r.invalid=true;invalid=true;}else{r.invalid=false;ready.push(r);}}
  // Keep the actual inputs and drafts intact on wrong answers; save a full valid chain together.
  if(invalid){for(let i=0;i<g.answers.length;i++){const r=g.answers[i],input=$('wf-answer-'+i);input?.setAttribute('aria-invalid',String(!!r.invalid));$('wf-note-'+i).textContent=r.invalid?'Chưa đúng — sửa phần đã gõ.':!r.draft.trim()?'Điền từ trước khi kiểm tra.':r.hinted?'Gợi ý: '+r.card.term.slice(0,r.reveal||1)+'…':' ';}return;}
  g.saving=true;g.error='';draw();
  try{await Promise.all(ready.map(async r=>{r.occurredAt ||= new Date().toISOString();await acceptReview(setProgress(r.card.id,r.wrong?'review':'known',r.wrong?1:r.hinted?2:3,r.eventId,r.occurredAt,{correct:!r.wrong,hinted:r.hinted,mode:'write'}));r.saved=true;}));if(game===g)g.phase='summary';}
  catch{if(game===g)g.error='Chưa lưu xong. Câu trả lời được giữ lại; bấm Thử lưu lại.';}
  finally{g.saving=false;if(game===g)draw();}
 }
 document.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b||b.disabled||mode!=='wordflash'||!game||game.saving)return;const g=game;
  if(b.hasAttribute('data-wf-hint')){const i=Number(b.dataset.wfHint),r=g.answers[i];if(g.phase!=='recall'||!r||r.saved)return;r.hinted=true;r.reveal=Math.min(r.card.term.length,(r.reveal||0)+1);$('wf-note-'+i).textContent='Gợi ý: '+r.card.term.slice(0,r.reveal)+'…';return;}
  switch(b.dataset.wf){case'mixed-next':if(mixedReview&&g.phase==='summary')move(1);return;case'start':if((g.phase==='ready'||g.phase==='paused')&&g.cards.length)expose(g);break;case'pause':if(['show','gap'].includes(g.phase)){cancel();g.phase='paused';draw();}break;case'next':if(g.phase!=='summary'||!g.remaining.length)return;g.level=g.answers.every(r=>!r.wrong&&!r.hinted)?Math.min(4,g.level+1):Math.max(2,g.level-1);g.round++;round(g);draw();break;}
 });
 document.addEventListener('input',ev=>{if(!ev.target.matches('.wf-answer')||mode!=='wordflash'||!game||game.phase!=='recall'||game.saving)return;const i=Number(ev.target.dataset.wfIndex),r=game.answers[i];if(!r||r.saved)return;r.draft=ev.target.value;r.invalid=false;ev.target.setAttribute('aria-invalid','false');});
 document.addEventListener('submit',ev=>{if(ev.target.id==='wf-form'){ev.preventDefault();submit();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&game&&['show','gap'].includes(game.phase)){cancel();game.phase='paused';draw();}});
 window.addEventListener('pagehide',reset);
 return{render,reset,busy:()=>!!game?.saving,inspect:()=>game};
})();
