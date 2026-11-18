'use strict';
// Completed assessed checkpoints record activity only; no SRS or mastery writes.
window.KFeynmanDaily=(()=>{
 let current=null,ui=null,rootPaper=null,syncError='',syncing=false;
 const timers=new Map();
 const active=()=>typeof dailyWritingSession!=='undefined'&&dailyWritingSession&&mode==='sentence'&&new URLSearchParams(location.search).get('practice')==='feynman';
 const context=()=>({account:KStore.get().accountKey,day:KStore.get().today});
 const prefix=()=> 'checkpoint:feynman:'+context().day+':';
 const bank=()=>sessionCards.filter(c=>c.studyKind!=='grammar');
 const checkpointKey=id=>prefix()+id;
 const pointer=()=> 'tidian-feynman-current:'+context().account+':'+context().day;
 function readRows(){return (KPractice.getState().values||[]).filter(r=>r.key.startsWith('checkpoint:feynman:')).map(r=>KPractice.get(r.key)?.questions?.[0]).filter(Boolean);}
 function used(){const ids=new Set(window.KDailyWritingGroups?.consumed()||[]);for(const row of readRows())if(row.day===context().day)for(const x of row.grade?.targetFeedback||[])if(x.used===true)ids.add(x.id);return ids;}
 const seen=()=>new Set(readRows().filter(r=>r.step==='done').map(r=>r.sourceVi));
 function same(c){const s=context();return s.account===c.account&&s.day===c.day&&!KStore.get().guest&&c.exercise.ids.every((id,i)=>{const card=bank().find(x=>x.id===id);return card&&variant(card).definition===c.meanings[i];});}
 function serialized(s,c=current){return {version:'feynman-1',questions:[{...s,busy:false,error:'',updatedAt:Date.now(),sourceVi:c.exercise.sourceVi,exerciseId:c.exercise.id,ids:c.exercise.ids}],results:[],step:0};}
 function banner(){const right=document.querySelector('#stage .td-study-controls');if(!right)return;right.querySelector('[data-fy-sync]')?.remove();const p=document.createElement('p');p.dataset.fySync='';p.className=syncError?'fg-error':'fg-key';p.setAttribute('role','status');p.textContent=syncError|| (syncing?'Đang đồng bộ nháp…':'Nháp được giữ trên thiết bị và trong tài khoản.');right.append(p);}
 async function flush(c,s){if(!same(c))return;syncing=true;banner();try{await KPractice.value(checkpointKey(c.exercise.id),serialized(s,c));if(!same(c))return;syncError='';if(s.step==='done'&&!s.pendingAI&&!c.activityRefreshed){await KStore.refresh();c.activityRefreshed=true;}}catch{if(same(c))syncError='Chưa đồng bộ được nháp. Bản trên thiết bị vẫn được giữ; dùng “Lưu lại” hoặc nút lưu của hệ thống.';}finally{if(same(c)){syncing=false;banner();}}}
 function queue(c,s){if(!same(c))throw Error('Tài khoản hoặc ngày đã thay đổi.');const value=serialized(s,c),key=checkpointKey(c.exercise.id);KPractice.stage(key,value).catch(()=>{syncError='Chưa ghi được hàng đợi đồng bộ; giữ trang mở.';banner();});clearTimeout(timers.get(key));timers.set(key,setTimeout(()=>{timers.delete(key);flush(c,s);},900));}
 function chooseExercise(){
  const rows=readRows().filter(r=>r.day===context().day&&r.account===context().account&&r.step!=='done');let id;try{id=localStorage.getItem(pointer());}catch{}
  const unfinished=rows.find(r=>r.exerciseId===id)||rows[0];
  if(unfinished&&Array.isArray(unfinished.ids)&&unfinished.ids.every(id=>bank().some(c=>c.id===id))){const entry=KWritingPrompts.entries.find(e=>e.id===unfinished.exerciseId);if(entry&&entry.sentenceVi===unfinished.sourceVi)return {id:entry.id,sourceVi:entry.sentenceVi,ids:unfinished.ids};}
  // Browser-local unfinished drafts survive a failed remote sync/reload.
  if(id){const entry=KWritingPrompts.entries.find(e=>e.id===id);if(entry){const cards=entry.targets.map(t=>bank().find(c=>c.term===t.term&&variant(c).definition===t.meaning));if(cards.every(Boolean)){try{const k='tidian-feynman:v1:'+JSON.stringify([context().account,context().day,id]),saved=JSON.parse(localStorage.getItem(k)||'null');if(saved?.step&&saved.step!=='done')return {id,sourceVi:entry.sentenceVi,ids:cards.map(c=>c.id)};}catch{}}}}
  const batch=KWritingPrompts.choose(bank(),used(),c=>variant(c).definition,seen());if(!batch.length)return null;return {id:KWritingPrompts.id(batch),sourceVi:KWritingPrompts.sentence(batch,c=>variant(c).definition),ids:batch.map(c=>c.id)};
 }
 async function request(c,phase,payload){
  if(!same(c))throw Error('Phiên học đã thay đổi.');
  const r=await fetch('/api/tidians/feynman',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(130000),body:JSON.stringify({...payload,phase,day:c.day})});
  let g;try{g=await r.json();}catch{throw Error('Dịch vụ chưa trả phản hồi hợp lệ. Nháp vẫn được giữ.');}
  if(!same(c))throw Error('Phiên học đã thay đổi.');if(!r.ok)throw Error(g.error||'Chưa chấm được. Nháp vẫn được giữ.');
  if(g.requestId!==payload.requestId)throw Error('Phản hồi thuộc lượt chấm khác.');return g;
 }
 function ensure(){
  if(current)return;const exercise=chooseExercise();if(!exercise)return;
  const c={...context(),exercise,meanings:exercise.ids.map(id=>variant(bank().find(x=>x.id===id)).definition),session:null};current=c;
  const storage={getItem:k=>{const disk=localStorage.getItem(k),remote=KPractice.get(checkpointKey(exercise.id))?.questions?.[0];if(!remote)return disk;let local;try{local=JSON.parse(disk);}catch{}return !local||Number(remote.updatedAt)>Number(local.updatedAt)?JSON.stringify(remote):disk;},setItem:(k,v)=>{const s=JSON.parse(v);s.updatedAt=Date.now();localStorage.setItem(k,JSON.stringify(s));queue(c,s);}};
  c.session=KFeynmanSession.create({account:c.account,day:c.day,getContext:context,storage,dueCards:bank().map(x=>({id:x.id,term:x.term,meaning:variant(x).definition,due:true,studyKind:x.studyKind})),exercise,liveEnabled:true,uuid:()=>crypto.randomUUID(),grader:p=>request(c,'grade',p),reviewer:p=>request(c,'review',p)});
  try{localStorage.setItem(pointer(),exercise.id);}catch{}
 }
 function render(){
  if(!active())return false;ensure();const root=document.getElementById('stage');window.KFlashGames?.reset();
  if(current&&!same(current)){ui?.destroy();current=null;root.innerHTML='<div class="empty-state">Ngày hoặc tài khoản đã thay đổi. <a href="due.html">Mở lại ôn tập hôm nay</a></div>';return true;}
  if(!current){ui?.destroy();ui=null;const q=new URLSearchParams(location.search);q.delete('practice');root.innerHTML='<div class="empty-state"><strong>Chưa có nhóm mới phù hợp với các từ còn lại.</strong><p>Các bản nháp đã lưu vẫn được giữ. Tiếp tục ôn theo lịch hoặc luyện ở chế độ hiện có.</p><a class="download-button" href="'+KFeynmanSession.escapeHTML('flashcard.html?'+q+'#study')+'">Dịch nhóm từ</a> <a class="download-button" href="due.html">Về ôn tập</a></div>';return true;}
  const c=current;
  if(ui&&rootPaper?.isConnected){ui.render();banner();return true;}
  ui?.destroy();const card=bank().find(x=>x.id===c.exercise.ids[0]);root.innerHTML=tdFrame(card,variant(card));const paper=root.querySelector('[data-td="card-flip"]'),controls=root.querySelector('.td-study-controls');
  if(!paper||!controls)throw Error('Chưa tải được khung học.');rootPaper=paper;paper.removeAttribute('data-action');paper.removeAttribute('role');paper.removeAttribute('tabindex');paper.classList.add('fg-paper');root.querySelector('.td-study-board')?.classList.add('fg-board','fg-sentence');
  for(const b of root.querySelectorAll('[data-action="prev"],[data-action="next"],[data-rating]'))b.disabled=true;
  const template=document.createElement('div');template.innerHTML=KDailyWriting.practiceSelector(true,false);template.querySelector('option[value="group"]').removeAttribute('selected');template.querySelector('option[value="feynman"]').setAttribute('selected','');
  ui=KFeynmanView.mount({paper,controls,session:c.session,selector:template.innerHTML,onChange:s=>{if(s.contextValid&&s.step==='done'){clearTimeout(timers.get(checkpointKey(c.exercise.id)));flush(c,s);}setTimeout(banner,0);},onNext:async()=>{if(c.session.view().step!=='done')return;await flush(c,c.session.view());if(syncError)return;try{localStorage.removeItem(pointer());}catch{}ui?.destroy();ui=null;current=null;render();}});
  banner();return true;
 }
 return {active,render,busy:()=>active()&&!!current?.session?.view().busy};
})();
