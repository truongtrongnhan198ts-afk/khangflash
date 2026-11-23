'use strict';
window.FullPlan=(()=>{
 const VERSION='coverage-flex-v2',plus=(s,n)=>new Date(Date.parse(s+'T00:00:00Z')+n*86400000).toISOString().slice(0,10),distance=(a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);
 const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let catalog=null,knowledge=new Map(),loading=null,busy=false,current=null,notice=null;
 const writingKey=id=>'checkpoint:writing:'+id,coverageKey=id=>'checkpoint:coverage-writing:'+id;
 function writingDone(l,get,c=catalog){
  if(l.kind==='task2'){const p=get('checkpoint:task2:'+l.id);if(p?.version!==c.task2ProgressVersion)return false;const checks=['task','thesis','mechanism','reference'];const quiz=p.results?.some(r=>r.id==='practice-complete')&&checks.every(id=>p.results.some(r=>r.id===id&&r.ok===true&&Number.isInteger(r.choice)&&r.choice>=0&&r.choice<3));const essay=p.questions?.[1];const legacy=p.results?.some(r=>r.id==='self-review'&&r.reviewed===true)&&typeof essay?.draft==='string'&&essay.draft.trim().split(/\s+/).length>=250&&essay.checks?.length===4&&essay.checks.every(x=>x===true);return !!(quiz||legacy);}
  const p=get(writingKey(l.id)),valid=p?.version===c?.writingVersion,results=valid?new Set((p.results||[]).filter(r=>Number.isInteger(r.index)&&r.index>=0&&r.index<l.count&&r.reviewed).map(r=>r.index)):new Set();return results.size>=l.count||(results.size>0&&get(coverageKey(l.id))?.questions?.[0]?.read===true);
 }
 async function load(force=false){if(force){loading=null;knowledge=new Map();}return loading||(loading=Promise.all([fetch('/study-catalog.json?v=292').then(r=>{if(!r.ok)throw Error('Chưa tải được danh mục học.');return r.json();}),fetch('/api/knowledge',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),typeof KPractice!=='undefined'?KPractice?.refresh?.()?.catch?.(()=>null):null]).then(([c,k])=>{catalog=c;knowledge=new Map((k&&Array.isArray(k.entries)?k.entries:[]).map(x=>[x.id,x.value]));return c;}).catch(err=>{loading=null;throw err;}))f;}unction noticeHtml(){return notice?`<p id="full-plan-feedback" role="${notice.error?'alert':'status'}" class="fp-plan-feedback">${e(notice.text)}</p>`:'';}
 function syncBuildButtons(){document.querySelectorAll('[data-full-plan-build]').forEach(b=>{b.disabled=busy;});}
 function announce(text,error=false){notice={text,error};const host=document.getElementById('hub-content');if(!host)return;let node=host.querySelector('#full-plan-feedback');if(!node){node=document.createElement('p');node.id='full-plan-feedback';node.className='fp-plan-feedback';host.insertBefore(node,host.firstChild);}node.setAttribute('role',error?'alert':'status');node.textContent=text;syncBuildButtons();}
 function allocationChanges(previous,next){
  const keys=d=>['cards','reading','writing'].flatMap(kind=>(d?.[kind]||[]).map(id=>[kind+':'+id,d.date]));
  const oldAssignments=new Map((previous.days||[]).flatMap(keys));let moved=0,overdue=0;
  for(const [id,date]of next.days.flatMap(keys)){const before=oldAssignments.get(id);if(before&&before!==date){moved++;if(before<next.start)overdue++;}}
  const signature=d=>JSON.stringify(['cards','reading','writing'].map(k=>[...(d?.[k]||[])].sort()).concat([d?.listening||0,d?.news||0]));
  const priorDays=new Map((previous.days||[]).map(d=>[d.date,d]));const changedDays=next.days.filter(d=>signature(d)!==signature(priorDays.get(d.date))).length;
  return{moved,overdue,changedDays};
 }
 function allocationMessage(previous,next){const change=allocationChanges(previous,next);const dates=`Từ ${next.start} đến ${next.curriculum.finish}. Ngày thi ${next.exam} giữ nguyên.`;
  if(!change.changedDays)return 'Đã kiểm tra tiến độ mới nhất. Không có nội dung cần đổi ngày; lịch hiện tại đã khớp. '+dates;
  return `Đã phân bổ lại: ${change.moved} thẻ/bài đổi ngày${change.overdue?`, gồm ${change.overdue} mục từ các ngày bỏ dở`:''}; ${change.changedDays} ngày trong lịch còn lại thay đổi nội dung. ${dates}`;
 }
 function cardCost(c){return c.studyKind==='grammar'?(c.label==='Điền giới từ'?5:12):2+Math.max(0,(c.variants?.length||1)-1)*.3;}
 // Preserve input order and balance estimated minutes, with a lighter seventh day.
 function distribute(items,days,cost,add,from=0,to=days.length,reviewBalance=true){let total=items.reduce((n,x)=>n+cost(x),0),used=0,index=from;const capacities=days.slice(from,to).map((d,i)=>(reviewBalance?((from+i+1)%7===0?.75:1)*Math.max(.2,1-Math.max(0,d.reviewMinutes-35)/360):1)),capacity=capacities.reduce((a,b)=>a+b,0);let boundary=(capacities[0]||1)/capacity*total;
  for(const item of items){if(index<to-1&&used+cost(item)/2>boundary){index++;boundary+=capacities[index-from]/capacity*total;}add(days[index],item,cost(item));used+=cost(item);}
 }
 function build(data,state,old,c= catalog,read=knowledge,get=k=>KPractice.get(k),options={}){
  if(!c)throw Error('Danh mục chưa tải xong.');const duration=distance(state.today,old.exam);if(duration<1)throw Error('Deadline đã qua; cần chọn lại thời hạn.');const horizon=options.contentDays??Math.min(duration,old.curriculum?.finish?distance(state.today,old.curriculum.finish)+1:76);if(!Number.isInteger(horizon)||horizon<1||horizon>duration)throw Error('Đã qua ngày hoàn tất nội dung; các ngày còn lại dành cho tổng ôn.');
  const seen=new Set(state.cards.map(x=>x.card_id)),canonical=id=>window.KStore?.canonical?.(id)||id,unique=new Set();const remaining=data.cards.filter(x=>!seen.has(canonical(x.id))&&!unique.has(canonical(x.id))&&unique.add(canonical(x.id)));
  const cardMap=new Map(data.cards.map(c=>[canonical(c.id),c])),initialReview=Math.max(35,Math.ceil(state.cards.filter(p=>p.due<=state.today).reduce((n,p)=>n+(cardMap.get(p.card_id)?.studyKind==='grammar'?4:.5),0)));
  const days=Array.from({length:duration},(_,i)=>({day:i+1,date:plus(state.today,i),week:Math.floor(i/7)+1,cards:[],references:[],topics:[],variants:0,reading:[],writing:[],reviewMinutes:i===0?initialReview:35,minutes:i===0?initialReview:35,listening:i<horizon?20:30,news:i<horizon&&i%7<3?10:0,reviewOnly:i>=horizon})),active=days.slice(0,horizon);
  function interleaveVocab(items,numDays){
  if(!items.length||numDays<1)return items;
  const byType={idiom:[],colloc:[],core:[]};
  for(const x of items){
   const lbl=String(x.label||'').toLowerCase(),cat=String(x.learningCategory||'').toLowerCase();
   if(lbl.includes('idiom'))byType.idiom.push(x);
   else if(lbl.includes('collocation')||cat.includes('collocation'))byType.colloc.push(x);
   else byType.core.push(x);
  }
  const spreadByTopic=arr=>{
   const b=new Map();
   for(const x of arr){const t=(x.topics&&x.topics[0])||'general';if(!b.has(t))b.set(t,[]);b.get(t).push(x);}
   const qs=[...b.values()],out=[];let idx=0;
   while(qs.some(q=>q.length)){const q=qs[idx%qs.length];if(q.length)out.push(q.shift());idx++;}
   return out;
  };
  const idioms=spreadByTopic(byType.idiom),collocs=spreadByTopic(byType.colloc),cores=spreadByTopic(byType.core);
  const buckets=Array.from({length:numDays},()=>[]);
  const deal=(arr)=>{for(let i=0;i<arr.length;i++)buckets[Math.floor(i*numDays/arr.length)].push(arr[i]);};
  deal(cores);deal(collocs);deal(idioms);
  // Within each day, interleave core, colloc, and idiom smoothly so idioms never clump together
  const ordered=[];
  for(const dayArr of buckets){
   const dIdiom=[],dCol=[],dCore=[];
   for(const x of dayArr){
    const lbl=String(x.label||'').toLowerCase(),cat=String(x.learningCategory||'').toLowerCase();
    if(lbl.includes('idiom'))dIdiom.push(x);
    else if(lbl.includes('collocation')||cat.includes('collocation'))dCol.push(x);
    else dCore.push(x);
   }
   const total=dayArr.length,idStep=dIdiom.length?Math.max(1,Math.floor(total/dIdiom.length)):total+1;
   let ci=0,ki=0,ii=0;
   for(let s=0;s<total;s++){
    if(ii<dIdiom.length&&(s%idStep===Math.floor(idStep/2)||(ci>=dCore.length&&ki>=dCol.length)))ordered.push(dIdiom[ii++]);
    else if(s%2===0&&ci<dCore.length)ordered.push(dCore[ci++]);
    else if(ki<dCol.length)ordered.push(dCol[ki++]);
    else if(ci<dCore.length)ordered.push(dCore[ci++]);
    else if(ii<dIdiom.length)ordered.push(dIdiom[ii++]);
   }
  }
  return ordered;
 }
 const vocabOrdered=interleaveVocab(remaining.filter(x=>x.studyKind!=='grammar'),active.length);
 const gramOrdered=remaining.filter(x=>x.studyKind==='grammar');
 for(const list of [vocabOrdered,gramOrdered])distribute(list,active,()=>1,(d,x,m)=>{d.cards.push(canonical(x.id));d.variants+=x.variants.length;d.minutes+=cardCost(x);},0,active.length,false);
  const articles=c.reading.filter(a=>!read.get(a.id)?.read),buckets=new Map();for(const a of articles){if(!buckets.has(a.topic))buckets.set(a.topic,[]);buckets.get(a.topic).push(a);}const ordered=[];while([...buckets.values()].some(b=>b.length))for(const b of buckets.values())if(b.length)ordered.push(b.shift());
  const readingDay=new Map();distribute(ordered,active,a=>a.minutes,(d,a,m)=>{d.reading.push(a.id);d.minutes+=m;readingDay.set(a.id,d);});
  // Existing full completion is respected; a representative exercise never marks all Writing questions complete.
  const pending=c.writing.filter(l=>!writingDone(l,get,c)),task2=pending.filter(l=>l.kind==='task2'),taskTopics=new Map();
  for(const l of task2){if(!taskTopics.has(l.topic))taskTopics.set(l.topic,[]);taskTopics.get(l.topic).push(l);}const orderedTask2=[];
  while([...taskTopics.values()].some(a=>a.length))for(const a of taskTopics.values())if(a.length)orderedTask2.push(a.shift());
  // Keep Task 2 counts even from the first content day; legacy writing balances around their real cost.
  distribute(orderedTask2,active,()=>1,(d,l)=>{d.writing.push(l.id);d.minutes+=l.modelMinutes+l.practiceMinutes;},0,active.length,false);
  for(const l of pending.filter(l=>l.kind!=='task2')){const matched=readingDay.get(l.articleId),start=l.step>=5?Math.min(21,horizon-1):l.step===4?Math.min(14,horizon-1):0;let d=matched;if(!d){const available=active.slice(start);d=available.reduce((best,x)=>x.minutes/((x.day%7===0)?.75:1)<best.minutes/((best.day%7===0)?.75:1)?x:best,available[0]);}d.writing.push(l.id);d.minutes+=l.modelMinutes+l.practiceMinutes;}
  for(const d of days){d.reviewOnly=!d.cards.length&&!d.reading.length&&!d.writing.length;d.minutes=Math.ceil(d.minutes+d.listening+d.news);}
  return{custom:true,interleavedV2:true,learningUpgrade:'20261013',band:old.band,duration,learningDays:horizon,reserve:duration-horizon,start:state.today,end:plus(old.exam,-1),exam:old.exam,total:remaining.length,variants:remaining.reduce((n,c)=>n+c.variants.length,0),days,curriculum:{version:VERSION,finish:plus(state.today,horizon-1),mode:'all-models-representative-writing',readingTotal:articles.length,writingTotal:pending.length,catalogReading:c.reading.length,catalogWriting:c.writing.length,...(c.task2Version?{task2Version:c.task2Version,task2Total:task2.length,catalogTask2:c.task2Count}:{}),catalogQuestions:c.writing.reduce((n,l)=>n+l.count,0),initialCards:remaining.length,created:state.today}};
 }
 function resize(data,state,old,band,duration){if(!Number.isInteger(duration)||duration<1||duration>730)throw Error('Chọn từ 1 đến 730 ngày.');const exam=plus(state.today,duration),same=old?.curriculum&&old.exam===exam,defaultReserve=duration>=30?14:duration>=14?3:0,reserve=Math.min(duration-1,old?.curriculum&&Number.isInteger(old.reserve)?old.reserve:defaultReserve),contentDays=same?Math.max(1,Math.min(duration,distance(state.today,old.curriculum.finish)+1)):duration-reserve;return build(data,state,{...old,band,exam},catalog,knowledge,k=>KPractice.get(k),{contentDays});}
 const exerciseUrl=l=>l.kind==='task2'?'/writing?view=task2&task2='+encodeURIComponent(l.id):'/writing?'+new URLSearchParams({step:String(l.step),lesson:l.id,q:String(l.representative+1)}),modelsUrl=l=>l.kind==='task2'?exerciseUrl(l):'/writing?'+new URLSearchParams({step:String(l.step),lesson:l.id,view:'models'});
 function progress(d,state){const seen=new Set(state.cards.map(x=>x.card_id)),map=new Map(catalog.writing.map(l=>[l.id,l]));return{cards:d.cards.filter(id=>seen.has(id)).length,reading:d.reading.filter(id=>knowledge.get(id)?.read).length,writing:d.writing.filter(id=>map.has(id)&&writingDone(map.get(id),k=>KPractice.get(k))).length,listening:!!KPractice.get('saved:curriculum-listening:'+d.date)?.saved,news:!d.news||!!KPractice.get('saved:curriculum-news:'+d.date)?.saved};}
 function done(d,state){const p=progress(d,state);return p.cards===d.cards.length&&p.reading===d.reading.length&&p.writing===d.writing.length&&p.listening&&p.news;}
 function readingList(d){const map=new Map(catalog.reading.map(a=>[a.id,a]));return d.reading.map(id=>{const a=map.get(id);return a?`<p>${knowledge.get(id)?.read?'✓ ':''}<a href="knowledge.html#${encodeURIComponent(id)}">${e(a.title)}</a> · đọc Anh–Việt, tự tóm tắt và làm kiểm tra hiểu bài</p>`:'';}).join('');}
 function writingList(d){const map=new Map(catalog.writing.map(l=>[l.id,l]));return d.writing.map(id=>{const l=map.get(id);return l?.kind==='task2'?`<p class="fp-task2-lesson">${writingDone(l,k=>KPractice.get(k))?'✓ ':''}<strong>IELTS Task 2 · ${e(l.title)}</strong><br><small>Dàn ý → phân tích → 4 câu tự kiểm tra · khoảng ${l.modelMinutes+l.practiceMinutes} phút</small><br><a href="${e(modelsUrl(l))}">Học và làm bài tập</a> · <a href="/writing?step=5&amp;lesson=${e('t2-translate-'+l.id)}">Luyện dịch cả bài</a></p>`:l?`<p>${writingDone(l,k=>KPractice.get(k))?'✓ ':''}<strong>Bước ${l.step} · ${e(l.title)}</strong><br><a href="${e(modelsUrl(l))}">Đọc đủ ${l.count} mẫu</a> · <a href="${e(exerciseUrl(l))}">Tự viết phần đại diện</a></p>`:'';}).join('');}
 function savedWordCounts(data,state){const states=[...knowledge.values()].flatMap(value=>value.words||[]);return{total:states.length,due:states.filter(w=>(w.due||state.today)<=state.today).length,unavailable:false};}
 function tasks(d,data,state){const byId=new Map(data.cards.map(c=>[c.id,c])),seen=new Set(state.cards.map(c=>c.card_id)),p=progress(d,state),writingMap=new Map(catalog.writing.map(l=>[l.id,l]));const vocab=d.cards.filter(id=>byId.get(id)?.studyKind!=='grammar'),grammar=d.cards.filter(id=>byId.get(id)?.studyKind==='grammar'),due=state.cards.filter(x=>x.due<=state.today),dueVocab=due.filter(x=>byId.get(x.card_id)?.studyKind!=='grammar'),pendingRead=d.reading.find(id=>!knowledge.get(id)?.read),pendingWriting=d.writing.map(id=>writingMap.get(id)).find(l=>l?.kind==='task2'&&!writingDone(l,k=>KPractice.get(k)))||d.writing.map(id=>writingMap.get(id)).find(l=>l&&!writingDone(l,k=>KPractice.get(k)));
  const savedWords=savedWordCounts(data,state);const reviewHref=dueVocab.length?'flashcard.html?status=due&mode=learn':due.length?'grammar.html?status=due':'due.html';const article=pendingRead||d.reading[0],writing=pendingWriting||writingMap.get(d.writing[0]),modelsRead=writing&&KPractice.get(coverageKey(writing.id))?.questions?.[0]?.read;
  return[{id:'review',name:'Ôn đến hạn',count:due.length+' thẻ cần ôn',note:'Ôn trước để giữ kiến thức đã học.',href:reviewHref,done:!due.length,cta:'Ôn ngay'},
   {id:'vocab',name:'Flashcard',count:vocab.filter(id=>seen.has(id)).length+'/'+vocab.length+' từ hôm nay',note:'Nhớ nghĩa, đối chiếu ví dụ, tự đặt câu.',href:'flashcard.html?day='+d.day+'&mode=learn',done:vocab.every(id=>seen.has(id)),cta:'Học từ vựng'},
   {id:'grammar',name:'Ngữ pháp',count:grammar.filter(id=>seen.has(id)).length+'/'+grammar.length+' mục hôm nay',note:'Đọc quy tắc rồi làm 5 câu luyện tập.',href:'grammar.html?day='+d.day,done:grammar.every(id=>seen.has(id)),cta:'Học ngữ pháp'},
   {id:'saved-words',name:'Ôn từ đã lưu',count:savedWords.due+' từ đến hạn',note:savedWords.total+' cụm đã lưu từ bài đọc. Nhớ: giãn 1–3–7–14 ngày. Quên: ôn ngày mai.',href:'knowledge.html?tab=words&filter=due&source=knowledge',done:!savedWords.unavailable&&!savedWords.due,cta:'Ôn ngay'},
   {id:'reading',name:'Reading · Khám phá',count:p.reading+'/'+d.reading.length+' bài đã đọc',note:'Đọc, tự tóm tắt và kiểm tra hiểu bài.',href:article?'knowledge.html#'+encodeURIComponent(article):'knowledge.html',done:p.reading===d.reading.length,cta:'Đọc bài tiếp theo'},
   {id:'writing',name:'Writing',count:p.writing+'/'+d.writing.length+' bài đã bao quát',note:d.writing.some(id=>writingMap.get(id)?.kind==='task2')?`${d.writing.filter(id=>writingMap.get(id)?.kind==='task2'&&writingDone(writingMap.get(id),k=>KPractice.get(k))).length}/${d.writing.filter(id=>writingMap.get(id)?.kind==='task2').length} bài IELTS Task 2 · Học phân tích và làm 4 câu tự kiểm tra. Luyện dịch có tiến độ riêng.`:'Đọc đủ mẫu, tự viết phần đại diện.',href:writing?(modelsRead?exerciseUrl(writing):modelsUrl(writing)):'writing.html',done:p.writing===d.writing.length,cta:writing?.kind==='task2'?'Học IELTS Task 2':modelsRead?'Tự viết ngay':'Mở bài Writing'},
   {id:'listening',name:'Listening',count:d.listening+' phút nghe chủ động',note:'Nghe, ghi ý chính, đối chiếu transcript.',href:'podcasts.html',done:p.listening,cta:'Nghe ngay'},
   ...(d.news?[{id:'news',name:'Đọc báo',count:d.news+' phút đọc & tóm tắt',note:'Tìm ý chính, bằng chứng và kiểm tra nguồn.',href:'news.html',done:p.news,cta:'Đọc báo ngay'}]:[])];
 }
 function todayHtml(plan,data,state,expanded=false){const d=plan.days[Math.max(0,Math.min(plan.days.length-1,distance(plan.start,state.today)))],list=tasks(d,data,state),next=list.find(t=>!t.done),completed=list.filter(t=>t.done).length,date=state.today.split('-').reverse().join('/'),minutes=Math.floor(d.minutes/60)+' giờ '+d.minutes%60+' phút';
  const mark=(kind,label)=>{const saved=KPractice.get('saved:curriculum-'+kind+':'+d.date)?.saved;return `<button class="fp-check" data-curriculum-check="${kind}" data-date="${d.date}" aria-pressed="${!!saved}">${saved?'✓ Đã '+label:'Đánh dấu đã '+label}</button>`;};
  const compact=document.body.dataset.page==='dashboard',byId=new Map(data.cards.map(c=>[c.id,c])),vocabTotal=plan.days.reduce((n,x)=>n+x.cards.filter(id=>byId.get(id)?.studyKind!=='grammar').length,0),grammarTotal=plan.curriculum.initialCards-vocabTotal;
  const coverage=`<p class="fp-coverage">Phân bổ cả lịch: <strong>${vocabTotal.toLocaleString('vi-VN')} từ vựng mới + ${grammarTotal} thẻ ngữ pháp</strong> trong ${plan.learningDays} ngày nội dung. Các số trên thẻ là chỉ tiêu riêng hôm nay; thẻ đến hạn được ôn thêm, không tính là từ mới. ${d.reviewMinutes>35?'Hôm nay có nhiều thẻ đến hạn nên thời gian tổng có thể cao hơn các ngày sau.':''}</p>`;
  return `<${compact?'details':'section'} id="curriculum-today" data-study-date="${e(state.today)}" class="fp-today ${compact?'fp-compact':''}" ${compact&&expanded?'open':''} aria-labelledby="${compact?'fp-summary-title':'fp-title'}">${compact?`<summary class="fp-summary"><span class="fp-summary-icon" aria-hidden="true">▤</span><span class="fp-summary-copy"><strong id="fp-summary-title">Học hôm nay</strong><span>Ngày ${d.day} · ${completed}/${list.length} phần đã xong · ${e(list.find(t=>t.id==='vocab')?.count)}</span></span><span class="fp-summary-action">Mở bài học <span aria-hidden="true">⌄</span></span></summary>`:''}<div class="fp-expanded"><header class="fp-hero"><div><p class="fp-eyebrow">HÔM NAY · ${e(date)} <span>Ngày ${d.day}/${plan.days.length}</span></p><h1 id="fp-title">Học hôm nay.</h1><p class="fp-subtitle">Mở bài và bắt đầu ngay. Tiến độ từng phần được giữ theo tài khoản.</p><div class="fp-badges"><span>${completed}/${list.length} phần đã xong</span><span>${e(minutes)} dự kiến</span><span>Deadline ${e(plan.exam.split('-').reverse().join('/'))}</span></div></div><div class="fp-hero-action"><a class="fp-start" data-return-task="${e(next?.id||'review')}" href="${e(next?.href||'due.html')}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>${next?'Bắt đầu học':'Ôn lại hôm nay'}</a><small>${next?'Bắt đầu bằng '+e(next.name):'Bạn đã hoàn thành các phần hôm nay.'}</small>${document.body.dataset.page==='dashboard'?'<a class="fp-schedule-link" href="schedule.html">Xem toàn bộ lịch học →</a>':''}</div></header>${coverage}<div class="fp-grid">${list.map((t,i)=>`<article class="fp-card ${t.done?'is-done':''}" data-today-task="${t.id}"><div class="fp-card-top"><span class="fp-index">${String(i+1).padStart(2,'0')}</span><span class="fp-state">${t.done?'✓ Đã xong':'Cần hoàn thành'}</span></div>${t.id==='saved-words'?'<p class="fp-origin">KHÁM PHÁ KIẾN THỨC</p>':''}<h2>${e(t.name)}</h2><p class="fp-count">${e(t.count)}</p><p class="fp-note">${e(t.note)}</p><a class="fp-task-link" href="${e(t.href)}">${t.done?'Xem lại':e(t.cta)} <span aria-hidden="true">↗</span></a>${t.id==='listening'?mark('listening','nghe & tự kiểm tra'):t.id==='news'?mark('news','đọc báo'):''}</article>`).join('')}</div><div class="fp-resources"><section class="fp-resource"><header><h2>Bài đọc hôm nay</h2><span>${d.reading.length} bài</span></header><div class="fp-resource-list">${readingList(d)||'<p>Hôm nay ưu tiên ôn các bài đã đọc và chữa lỗi đọc hiểu.</p>'}</div></section><section class="fp-resource"><header><h2>Writing hôm nay</h2><span>${d.writing.length} bài</span></header><div class="fp-resource-list">${writingList(d)||'<p>Ôn bài đã làm, viết bấm giờ và đối chiếu phần cần sửa.</p>'}</div></section></div></div></${compact?'details':'section'}>`;
 }
 let mountTicket=0;
 function mountToday(plan,data,state){if(!plan?.curriculum)return;const root=document.getElementById('hub-content');if(!root)return;const ticket=++mountTicket,expanded=!!root.querySelector('#curriculum-today[open]');root.querySelector('#curriculum-today')?.remove();root.querySelector('#today-loading')?.remove();const show=()=>{if(ticket!==mountTicket||!root.isConnected)return;current={plan,data,state};root.insertAdjacentHTML('afterbegin',todayHtml(plan,data,state,expanded));window.fitOverview?.();};if(catalog){show();return;}root.insertAdjacentHTML('afterbegin','<p id="today-loading" role="status">Đang tải bài học hôm nay…</p>');load().then(()=>{if(ticket!==mountTicket)return;root.querySelector('#today-loading')?.remove();show();}).catch(()=>{if(ticket!==mountTicket)return;const p=root.querySelector('#today-loading');if(p)p.innerHTML='Chưa tải được bài học hôm nay. <button class="hub-button" data-today-retry>Thử lại</button>';});}
 function refreshSurface(){if(!current)return;if(document.body.dataset.page==='dashboard')mountToday(current.plan,current.data,current.state);else render(current.plan,current.data,current.state);}

 function dayActions(d,plan,data,state){if(d.date>state.today||done(d,state))return '';const next=tasks(d,data,state).find(t=>!['review','saved-words'].includes(t.id)&&!t.done);return `<div class="fp-day-actions"><div class="fp-day-action-buttons"><button class="hub-button fp-day-redistribute" data-full-plan-build ${busy?'disabled':''} aria-label="Phân bổ lại phần chưa hoàn thành · Ngày ${d.day}">↻ Phân bổ lại phần chưa hoàn thành</button><a class="hub-button ghost fp-day-resume" href="${e(next?.href||'due.html')}" aria-label="Tiếp tục ôn · Ngày ${d.day}">Tiếp tục ôn →</a></div><small>Phân bổ lại: chia toàn bộ phần chưa hoàn thành của kế hoạch đến hạn cũ. Tiếp tục ôn: mở phần còn thiếu của ngày ${d.day}${next?' · '+e(next.name):''}.</small><p class="fp-day-action-message" role="status"></p></div>`;}
 function dayHtml(d,plan,state){const p=progress(d,state),finished=done(d,state);return `<article class="plan-task" id="plan-day-${d.day}"><div><strong>Ngày ${d.day}</strong><p>${e(d.date)}</p></div><div><h3>${finished?'✓ Đã hoàn thành':d.reviewOnly?'Tổng ôn & kiểm tra':'Đọc → vận dụng → tự kiểm tra'}</h3><p>${d.minutes} phút dự kiến, gồm ${d.reviewMinutes} phút dự trù ôn; nếu ôn thực tế lâu hơn, cần cộng thêm.</p><p>${p.cards}/${d.cards.length} thẻ mới · ${p.reading}/${d.reading.length} bài Khám phá · ${p.writing}/${d.writing.length} bài Writing bao quát</p>${dayActions(d,plan,current.data,state)}<p><a href="flashcard.html?day=${d.day}">Flashcard ngày này</a> · <a href="grammar.html?day=${d.day}">Ngữ pháp ngày này</a> · <a href="due.html">Ôn đến hạn</a> · <a href="knowledge.html?tab=words&filter=due&source=knowledge">Ôn từ đã lưu</a> · <a href="history.html?tab=errors">Chữa lỗi</a></p><details><summary>Reading · ${d.reading.length} bài</summary>${readingList(d)||'<p>Ôn bài đã đọc, giải thích lại ý chính và kiểm tra phần sai.</p>'}</details><details><summary>Writing · ${d.writing.length} bài · Task 2 và luyện dịch</summary>${writingList(d)||'<p>Viết bấm giờ, đối chiếu lập luận, ngữ pháp và sửa các bài đã làm.</p>'}</details><p><a href="podcasts.html">Listening · ${d.listening} phút</a>: nghe lần đầu không nhìn transcript, ghi ý chính; nghe lại đối chiếu và nhại 2–3 phút.</p><button class="hub-button ghost" data-curriculum-check="listening" data-date="${d.date}" aria-pressed="${p.listening}">${p.listening?'✓ Đã nghe và tự kiểm tra':'Đánh dấu đã nghe và tự kiểm tra'}</button>${d.news?`<p><a href="news.html">Đọc báo · ${d.news} phút</a>: một bài, nêu ý chính, bằng chứng và kiểm tra nguồn.</p><button class="hub-button ghost" data-curriculum-check="news" data-date="${d.date}" aria-pressed="${p.news}">${p.news?'✓ Đã đọc báo':'Đánh dấu đã đọc báo'}</button>`:''}<p>Ngữ pháp: học quy tắc và hoàn thành 5 câu của bài. Dùng game ôn thẻ sai; cuối phiên tự nói 2 phút bằng cụm đã học. Cuối tuần ưu tiên chữa lỗi.</p></div></article>`;}
 function render(plan,data,state){current={plan,data,state};if(plan.curriculum&&typeof activeSchedule!=='undefined')activeSchedule={plan,library:data,stats:state};if(!plan.curriculum){const host=document.querySelector('.plan-overview');if(host&&!document.getElementById('full-plan-offer'))host.insertAdjacentHTML('afterend',`<section class="plan-week" id="full-plan-offer"><h2>Bao quát toàn bộ trong 76 ngày</h2><p>Giữ deadline hiện tại; phân bổ toàn bộ flashcard chưa học, Khám phá và mọi bài Writing. Đọc đủ mẫu + tự viết đại diện; Listening và đọc báo có nhiệm vụ từng ngày.</p><button class="hub-button" data-full-plan-build ${busy?'disabled':''}>Sắp xếp toàn bộ trong 76 ngày</button><p id="full-plan-message" role="status"></p></section>`);return false;}
  const host=document.getElementById('hub-content');if(!catalog){host.innerHTML='<p role="status">Đang tải lịch bao quát và tiến độ…</p>';load().then(()=>render(plan,data,state)).catch(err=>{host.innerHTML='<p role="alert">'+e(err.message)+'</p><button class="hub-button" data-full-plan-retry>Thử tải lại</button>';});return true;}
  const active=plan.days[Math.max(0,Math.min(plan.days.length-1,distance(plan.start,state.today)))],total=plan.days.reduce((n,d)=>n+d.minutes,0),covered=plan.days.filter(d=>d.date<=plan.curriculum.finish),average=Math.ceil(covered.reduce((n,d)=>n+d.minutes,0)/covered.length),budget=KPractice.get('preferences')?.minutes||150;
  const overdue=plan.days.filter(d=>d.date<state.today&&!done(d,state));host.innerHTML=`${noticeHtml()}${todayHtml(plan,data,state)}<details class="fp-plan-info"><summary>Thông tin kế hoạch · Hoàn tất nội dung ${e(plan.curriculum.finish)}</summary><div class="plan-overview"><section class="plan-focus"><small>DEADLINE GIỮ NGUYÊN · ${e(plan.exam)}</small><h1>Bao quát toàn bộ.<br>${plan.learningDays} ngày nội dung.</h1><p>Hoàn tất phân bổ nội dung vào ${e(plan.curriculum.finish)} · ${plan.reserve} ngày còn lại đến deadline dành cho tổng ôn.</p><p>${plan.curriculum.initialCards} thẻ chưa học · ${plan.curriculum.readingTotal} bài Khám phá · ${plan.curriculum.writingTotal} bài Writing cần bao quát khi lập lịch${plan.curriculum.task2Version?`, gồm ${plan.curriculum.task2Total} bài IELTS Task 2`:""}.</p><p>Phạm vi thư viện: ${plan.curriculum.catalogReading} bài Khám phá, ${plan.curriculum.catalogWriting} bài Writing / ${plan.curriculum.catalogQuestions} câu/phần luyện. Task 2: học dàn ý, phân tích và hoàn thành 4 câu tự kiểm tra; luyện dịch cả bài có tiến độ riêng. Writing cũ: đọc đủ mẫu, tự viết ít nhất một phần đại diện mỗi bài; không coi là đã tự viết tất cả câu.</p><button class="hub-button" data-full-plan-build ${busy?'disabled':''}>Phân bổ lại phần chưa hoàn thành</button><p id="full-plan-message" role="status"></p></section><section class="plan-today"><small>HÔM NAY · ${e(state.today)}</small><h2>Khoảng ${Math.floor(average/60)} giờ ${average%60} phút/ngày</h2><p>Ước tính theo độ dài bài, đọc song ngữ, viết và đối chiếu; cần đo lại theo tốc độ thực tế. ${average>budget?'Cao hơn thời gian '+budget+' phút/ngày đang đặt. Lịch vẫn giữ đủ nội dung, không tự cắt bớt.':''}</p><p>${state.cards.filter(p=>p.due<=state.today).length} thẻ đang đến hạn. Ngày hôm nay: ${active.cards.length} thẻ · ${active.reading.length} bài đọc · ${active.writing.length} bài Writing. ${overdue.length} ngày trước còn nhiệm vụ chưa hoàn thành.</p><p>Ôn đến hạn và chữa lỗi trước, chia Reading/Writing thành nhiều phiên. Nếu quá tải, tăng thời gian hoặc điều chỉnh phạm vi; dồn bài không bảo đảm ghi nhớ.</p><p><a class="hub-button" href="due.html">Ôn đến hạn</a> <a class="hub-button ghost" href="history.html?tab=errors">Chữa lỗi</a></p></section></div><p>Đọc bài Khám phá cùng bài Writing tương ứng trong ngày để dùng lại nội dung. Nguồn báo/podcast cập nhật liên tục: lịch giao lượt luyện hằng ngày, không tính mọi tin/tập tương lai vào danh mục cố định. Tiến độ thẻ và ngày ôn cũ được giữ nguyên.</p></details>${overdue.length?'<details class="plan-week"><summary>Học bù · '+overdue.length+' ngày chưa xong</summary><p>Chọn tiếp tục phần còn thiếu của ngày cũ hoặc phân bổ lại phần chưa hoàn thành đến đúng hạn cũ.</p>'+overdue.map(d=>'<section class="fp-overdue-day"><div class="fp-overdue-label"><strong>Ngày '+d.day+'</strong><span>'+e(d.date)+'</span></div>'+dayActions(d,plan,data,state)+'</section>').join('')+'</details>':''}${Array.from({length:Math.ceil(plan.duration/7)},(_,i)=>{const week=plan.days.slice(i*7,(i+1)*7);return`<details class="plan-week" ><summary>Tuần ${i+1} · ${week[0].date} — ${week.at(-1).date}</summary>${week.map(d=>dayHtml(d,plan,state)).join('')}</details>`;}).join('')}`;return true;
 }
 async function ensureTask2(data,state,old){
  if(state.guest||!old?.curriculum||old.exam<=state.today)return old;
  await load();if(!catalog.task2Version||old.curriculum.task2Version===catalog.task2Version)return old;
  const latest=await KStore.refresh();if(latest.guest)throw Error('Đăng nhập để bổ sung Task 2 vào lịch.');
  const plan=build(data,latest,old),r=await fetch('/api/learning-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan,intent:'integrate-task2',expected_exam:old.exam})}),out=await r.json();if(!r.ok)throw Error(out.error||'Chưa bổ sung được Task 2 vào lịch.');KPlan.accept(out.plan);return out.plan;
 }
 async function apply(button){
  if(busy||!current)return;const {plan:previous,data}=current;busy=true;const origLabel=button?button.textContent:'';if(button){button.disabled=true;button.textContent='Đang phân bổ lại…';}announce('Đang tải tiến độ mới nhất và phân bổ lại phần chưa hoàn thành…');
  let activeData=data;const withTimeout=(p,ms)=>Promise.race([Promise.resolve(p),new Promise((_,rej)=>setTimeout(()=>rej(Error('timeout')),ms))]);try{if(!catalog||!loading)await withTimeout(load(!catalog),8000);const state=KStore.get()||current.state;const plan=build(activeData,state,previous);
  try{if(typeof window.__KF_SAVE_LEARNING_PLAN__==='function')window.__KF_SAVE_LEARNING_PLAN__(plan);}catch{}try{fetch('/api/learning-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan,expected_exam:previous.exam})}).catch(()=>{});}catch{}KPlan.accept(plan);window.studyPlan=plan;current={plan,data:activeData,state};notice={text:allocationMessage(previous,plan),error:false};render(plan,activeData,state);(document.getElementById('hub-content')||document.getElementById('full-plan-feedback'))?.scrollIntoView?.({behavior:'smooth',block:'start'});}catch(err){const msg='Chưa thay đổi lịch. '+(err&&err.message?err.message:String(err));announce(msg,true);const btn=document.querySelector('[data-full-plan-build]')||(button&&button.isConnected?button:null);if(btn){const wrap=btn.closest('.fp-actions,.fp-focus,.plan-week,.fp-plan-info')||btn.parentElement;if(wrap){let b=wrap.querySelector('.fp-inline-alert');if(!b){b=document.createElement('div');b.className='fp-inline-alert';b.setAttribute('role','alert');b.style.cssText='margin-top:8px;padding:10px 12px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-weight:600;font-size:14px;';(btn.closest('.fp-day-action-buttons')||btn).insertAdjacentElement('afterend',b);}b.textContent=msg;}}document.getElementById('full-plan-feedback')?.scrollIntoView?.({block:'nearest'});}finally{const btn=document.querySelector('[data-full-plan-build]')||(button&&button.isConnected?button:null);if(btn){btn.disabled=false;if(origLabel&&btn.textContent==='Đang phân bổ lại…')btn.textContent=origLabel;}busy=false;syncBuildButtons();}
 }
 document.addEventListener('click',async event=>{if(event.target.closest('[data-today-retry]')){loading=null;refreshSurface();return;}const buildButton=event.target.closest('[data-full-plan-build]');if(buildButton){await apply(buildButton);return;}if(event.target.closest('[data-full-plan-retry]')){loading=null;refreshSurface();return;}const b=event.target.closest('[data-curriculum-check]');if(!b||b.disabled)return;b.disabled=true;try{const key='saved:curriculum-'+b.dataset.curriculumCheck+':'+b.dataset.date;await KPractice.value(key,{saved:!KPractice.get(key)?.saved});refreshSurface();}catch{b.textContent='Chưa lưu được · thử lại';}finally{b.disabled=false;}});
     
 function rebalancePlan(plan,data){
  if(!plan||!Array.isArray(plan.days)||!data?.cards?.length||plan.interleavedV2)return plan;
  const canonical=id=>window.KStore?.canonical?.(id)||id;
  const byId=new Map(data.cards.map(c=>[canonical(c.id),c]));
  const activeDays=plan.days.filter(d=>!d.reviewOnly&&Array.isArray(d.cards)&&d.cards.length);
  if(!activeDays.length)return plan;
  const allVocab=[],allGram=[],daySizes=activeDays.map(d=>d.cards.length);
  for(const d of activeDays){
   for(const rawId of d.cards){
    const id=canonical(rawId),c=byId.get(id);
    if(c&&c.studyKind==='grammar')allGram.push(id);
    else if(c)allVocab.push(c);
   }
  }
  if(!allVocab.length)return plan;
  const byType={idiom:[],colloc:[],core:[]};
  for(const x of allVocab){
   const lbl=String(x.label||'').toLowerCase(),cat=String(x.learningCategory||'').toLowerCase();
   if(lbl.includes('idiom'))byType.idiom.push(x);
   else if(lbl.includes('collocation')||cat.includes('collocation'))byType.colloc.push(x);
   else byType.core.push(x);
  }
  const spread=arr=>{
   const b=new Map();
   for(const x of arr){const t=(x.topics&&x.topics[0])||'general';if(!b.has(t))b.set(t,[]);b.get(t).push(x);}
   const qs=[...b.values()],out=[];let idx=0;
   while(qs.some(q=>q.length)){const q=qs[idx%qs.length];if(q.length)out.push(q.shift());idx++;}
   return out;
  };
  const numDays=activeDays.length,buckets=Array.from({length:numDays},()=>[]);
  const deal=arr=>{for(let i=0;i<arr.length;i++)buckets[Math.floor(i*numDays/arr.length)].push(arr[i]);};
  deal(spread(byType.core));deal(spread(byType.colloc));deal(spread(byType.idiom));
  const gramBuckets=Array.from({length:numDays},()=>[]);
  for(let i=0;i<allGram.length;i++)gramBuckets[Math.floor(i*numDays/allGram.length)].push(allGram[i]);
  for(let di=0;di<numDays;di++){
   const dayArr=buckets[di],dIdiom=[],dCol=[],dCore=[];
   for(const x of dayArr){
    const lbl=String(x.label||'').toLowerCase(),cat=String(x.learningCategory||'').toLowerCase();
    if(lbl.includes('idiom'))dIdiom.push(x);
    else if(lbl.includes('collocation')||cat.includes('collocation'))dCol.push(x);
    else dCore.push(x);
   }
   const total=dayArr.length,idStep=dIdiom.length?Math.max(1,Math.floor(total/dIdiom.length)):total+1;
   let ci=0,ki=0,ii=0;const out=[];
   for(let s=0;s<total;s++){
    if(ii<dIdiom.length&&(s%idStep===Math.floor(idStep/2)||(ci>=dCore.length&&ki>=dCol.length)))out.push(canonical(dIdiom[ii++].id));
    else if(s%2===0&&ci<dCore.length)out.push(canonical(dCore[ci++].id));
    else if(ki<dCol.length)out.push(canonical(dCol[ki++].id));
    else if(ci<dCore.length)out.push(canonical(dCore[ci++].id));
    else if(ii<dIdiom.length)out.push(canonical(dIdiom[ii++].id));
   }
   activeDays[di].cards=[...out,...gramBuckets[di]];
  }
  plan.interleavedV2=true;
  return plan;
 }

 return{load,build,resize,rebalancePlan,ensureTask2,render,mountToday,todayHtml,tasks,savedWordCounts,writingDone,coverageKey,exerciseUrl,modelsUrl,version:VERSION};
})();
