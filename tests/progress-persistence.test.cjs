/* Run: NODE_PATH=<directory containing linkedom and fake-indexeddb> node --test tests/progress-persistence.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom'),{IDBFactory}=require('fake-indexeddb');
const root=require('node:path').resolve(__dirname,'..');
const code=name=>fs.readFileSync(root+'/'+name,'utf8');
function storage(seed={}){const m=new Map(Object.entries(seed));return{fail:false,get length(){return m.size},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null,setItem(k,v){if(this.fail&&k.startsWith('kf_vercel_'))throw Object.assign(Error('quota'),{name:'QuotaExceededError'});m.set(k,String(v))},removeItem:k=>m.delete(k)};}
function browser(ls=storage(),idb=new IDBFactory(),network,path="/news"){
 const {document,window:dom}=parseHTML('<html><head></head><body data-page="news"><p id="news-status"></p><div id="news-list"></div><select id="news-topic"><option value="all">All</option></select><select id="news-source"><option value="all">All</option></select><input id="news-full"><button id="news-refresh"></button></body></html>');
 const listeners={};
 const w={document,Document:dom.Document,localStorage:ls,indexedDB:idb,location:{origin:'https://test.khangflash',href:'https://test.khangflash'+path,pathname:path,search:'',hash:''},URL,URLSearchParams,Request,Response,Headers,Date,Intl,Map,Set,Promise,Math,JSON,Object,Array,String,Number,Boolean,Error,RegExp,crypto:globalThis.crypto,navigator:{},console,CustomEvent:dom.CustomEvent,MutationObserver:dom.MutationObserver,queueMicrotask,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},confirm:()=>false,addEventListener:(n,fn)=>(listeners[n]||=[]).push(fn),dispatchEvent:e=>{for(const fn of listeners[e.type]||[])fn(e)},fetch:network|| (async()=>new Response('{}',{status:404})),KReviewSession:{complete(){}}};
 w.window=w;const context=vm.createContext(w);const run=name=>vm.runInContext(code(name),context,{filename:name});
 run('local-api-shim.js');run('sync-outbox.js');run('store.js');run('practice-core.js');
 return {w,context,run,ls,idb,async json(path,body){const r=await w.fetch(path,body?{method:'POST',body:JSON.stringify(body)}:undefined);return{r,data:await r.json()}}};
}
test('reviews keep FSRS state, history, activity and due across reload; retries are idempotent',async()=>{
 const b=browser();await b.w.KStore.load();
 await b.w.KStore.review([{id:'real-card',status:'known',rating:3}],'Flashcard',1,1,'event-good');
 let s=(await b.json('/api/study')).data;let c=s.cards.find(c=>c.card_id==='real-card');
 assert.equal(c.reps,1);assert.equal(c.interval,3);assert.equal(c.fsrs_d,5);assert.equal(c.fsrs_s,3.2);assert.match(c.due,/^\d{4}-\d{2}-\d{2}$/);assert.equal(s.history.length,1);assert.equal(s.learningActivity[0].count,1);
 const before=JSON.stringify(c);let r=await b.json('/api/study',{action:'review',event_id:'event-good',reviews:[{id:'real-card',rating:3}]});assert.equal(r.data.duplicate,true);
 const reload=browser(b.ls,b.idb);await reload.w.KStore.load();await reload.w.KStore.refresh();
 assert.equal(JSON.stringify(reload.w.KStore.get().cards.find(c=>c.card_id==='real-card')),before);
 await reload.w.KStore.review([{id:'real-card',status:'review',rating:1}],'Flashcard',0,1,'event-forget');
 s=(await reload.json('/api/stats')).data;c=s.cards.find(c=>c.card_id==='real-card');assert.equal(c.reps,0);assert.equal(c.interval,1);assert.equal(c.status,'review');assert.equal(c.lapses,1);assert.equal(s.history.length,2);
 const third=browser(b.ls,b.idb);assert.equal((await third.json('/api/study')).data.cards[0].due,c.due);
});
test('news metadata and completion survive KPractice reload and feed disappearance',async()=>{
 const b=browser();await b.w.KPractice.load();const url='https://www.bbc.com/news/articles/test-progress',key='media:'+b.w.KPractice.id(url),date=(await b.json('/api/study')).data.today;
 await b.w.KPractice.value(key,{read:true,url,title:'Article test',source:'BBC',completed:true,readAt:new Date().toISOString(),readDate:date});
 assert.equal(b.w.KPractice.getState().values.find(x=>x.key===key).value.read,true);
 await b.w.KPractice.value('saved:curriculum-news:'+date,{saved:true});
 const reload=browser(b.ls,b.idb);await reload.w.KPractice.load();assert.equal(reload.w.KPractice.get(key).title,'Article test');assert.equal(reload.w.KPractice.get(key).readDate,date);assert.equal(reload.w.KPractice.get('saved:curriculum-news:'+date).saved,true);
 reload.run('news.js');vm.runInContext('newsRender()',reload.context);assert.match(reload.w.document.getElementById('news-read-history').textContent,/Article test/);
});
test('quota failures return 503, never fall through to network success, and retain outbox for recovery',async()=>{
 let calls=0;const b=browser(undefined,undefined,async()=>{calls++;return new Response('{"ok":true}')});await b.w.KStore.load();b.ls.fail=true;
 await assert.rejects(b.w.KStore.review([{id:'retry-card',rating:3}],'Flashcard',1,1,'quota-event'));
 assert.equal(calls,0);assert.equal((await b.w.KSyncOutbox.list('khangflash-local')).length,1);
 assert.equal((await b.json('/api/study')).data.cards.length,0);
 b.ls.fail=false;const reload=browser(b.ls,b.idb);await reload.w.KStore.load();await reload.w.KStore.flush();await reload.w.KStore.refresh();assert.equal(reload.w.KStore.get().cards[0].card_id,'retry-card');assert.equal((await reload.w.KSyncOutbox.list('khangflash-local')).length,0);
});
test('migrates old cache, unkeyed history and legacy backup without deleting sources or crossing accounts',async()=>{
 const cache={guest:false,accountKey:'khangflash-local',cards:[{card_id:'old',status:'known',reps:4,interval:12,due:'2026-12-01',fsrs_d:4.5,fsrs_s:12}],history:[{date:'2026-11-22',type:'Flashcard',count:1},{date:'2026-11-23',type:'Flashcard',count:2}]};
 const ls=storage({'kf_kstore_fast_v1':JSON.stringify(cache),'kf_local_srs_backup_v5':JSON.stringify({legacy:{status:'review',due:'2026-11-25',reps:1}})}),original=ls.getItem('kf_kstore_fast_v1');
 const b=browser(ls);let s=(await b.json('/api/study')).data;assert.equal(s.cards.length,2);assert.equal(s.history.length,2);assert.equal(s.cards.find(c=>c.card_id==='old').fsrs_s,12);assert.equal(ls.getItem('kf_kstore_fast_v1'),original);assert.ok(ls.getItem('kf_local_srs_backup_v5'));
 const alien=browser(storage({'kf_kstore_fast_v1':JSON.stringify({...cache,accountKey:'other-account'})}));assert.equal((await alien.json('/api/study')).data.cards.length,0);
 assert.equal((await b.json('/api/study',{account_key:'other-account',reviews:[{id:'bad'}]})).r.status,409);
});
test('handles Request POST bodies and leaves failed practice jobs durable',async()=>{
 const b=browser();await b.w.KPractice.load();const r=await b.w.fetch(new Request('https://test.khangflash/api/practice',{method:'POST',body:JSON.stringify({action:'value',key:'saved:request',value:{saved:true}})}));assert.equal(r.status,200);
 assert.equal((await b.json('/api/practice')).data.values.find(v=>v.key==='saved:request').value.saved,true);
 b.ls.fail=true;await assert.rejects(b.w.KPractice.value('media:quota',{read:true,url:'https://bbc.com/test'}));assert.equal((await b.w.KSyncOutbox.listJobs('khangflash-local','practice')).length,1);
 b.ls.fail=false;const reload=browser(b.ls,b.idb);await reload.w.KPractice.load();assert.equal(reload.w.KPractice.get('media:quota').read,true);
});
test('legacy repair hooks do not wipe reviews or override FSRS after authoritative storage starts',async()=>{
 const b=browser();await b.w.KStore.load();await b.w.KSyncOutbox.put('khangflash-local',{action:'review',event_id:'pending',account_key:'khangflash-local',reviews:[{id:'local_accepted'}]});
 const tail=code('live-override-custom.js').slice(code('live-override-custom.js').indexOf('(function () {\n  "use strict";\n\n  var PATCH_VER'));
 vm.runInContext(tail,b.context);await b.w.KFInvalidCardRepair.runFullRepair();assert.equal((await b.w.KSyncOutbox.list('khangflash-local')).length,1);
 await b.w.KStore.review([{id:'local_accepted',rating:4}],'Flashcard',1,1,'genuine');const c=(await b.json('/api/study')).data.cards[0];assert.equal(c.fsrs_s,8);assert.equal(c.interval,8);
});
test('grammar attempts, Writing checkpoints, saved items and podcast position survive reload',async()=>{
 const b=browser();await b.w.KPractice.load();
 await b.w.KPractice.attempt({id:'grammar-attempt',kind:'grammar',cardId:'grammar-card',contextId:'lesson',question:'at a pace',actual:'in',answer:'at',ok:false});
 await b.w.KPractice.value('checkpoint:task2:essay',{version:'test',questions:[{draft:'preserved essay draft'}],results:[{id:'task',ok:true}]});
 await b.w.KPractice.value('saved:word',{saved:true});
 await b.w.KPractice.value('media:podcast',{read:false,title:'Episode',seconds:137.5,updated:Date.now()});
 const reload=browser(b.ls,b.idb);await reload.w.KPractice.load();let s=reload.w.KPractice.getState();
 assert.equal(s.questions[0].seen,1);assert.equal(s.questions[0].mistakes,1);assert.equal(s.questions[0].card_id,'grammar-card');assert.equal(s.questions[0].context_id,'lesson');
 assert.equal(reload.w.KPractice.get('checkpoint:task2:essay').questions[0].draft,'preserved essay draft');assert.equal(reload.w.KPractice.get('media:podcast').seconds,137.5);assert.equal(reload.w.KPractice.get('saved:word').saved,true);
 await reload.json('/api/practice',{action:'attempt',value:{id:'grammar-attempt',qid:s.questions[0].qid,ok:false}});s=(await reload.json('/api/practice')).data;assert.equal(s.questions[0].seen,1,'attempt replay cannot inflate counters');
});
test('knowledge read/bookmark/note/word state returns account and revision, rejects stale overwrites',async()=>{
 const b=browser(),account=(await b.json('/api/knowledge')).data.accountKey;assert.equal(account,'khangflash-local');
 const value={read:true,saved:true,note:'Keep this note',words:[{id:'word',due:'2026-12-01'}]};
 const saved=await b.json('/api/knowledge',{id:'article',revision:0,account_key:account,value});assert.equal(saved.data.revision,1);
 const reload=browser(b.ls,b.idb);assert.deepEqual((await reload.json('/api/knowledge')).data.entries[0].value,value);
 const stale=await reload.json('/api/knowledge',{id:'article',revision:0,value:{read:false}});assert.equal(stale.r.status,409);assert.equal((await reload.json('/api/knowledge')).data.entries[0].value.read,true);
});
test('news notebook notes/words survive reload and appear in notebook aggregation',async()=>{
 const b=browser(),url='https://bbc.com/news/test-notes';let r=await b.json('/api/news/notebook?url='+encodeURIComponent(url));assert.equal(r.data.revision,0);assert.equal(r.data.accountKey,'khangflash-local');
 r=await b.json('/api/news/notebook',{url,title:'Notes test',revision:0,notes:'Original note',words:[{term:'word',meaning:'nghĩa'}],account_key:r.data.accountKey});assert.equal(r.r.status,200);assert.equal(r.data.revision,1);
 const reload=browser(b.ls,b.idb);r=await reload.json('/api/news/notebook?url='+encodeURIComponent(url));assert.equal(r.data.notes,'Original note');assert.equal(r.data.words[0].term,'word');assert.equal((await reload.json('/api/practice/notebook')).data.articles[0].notes,'Original note');
 assert.equal((await reload.json('/api/news/notebook',{url,revision:0,notes:'stale'})).r.status,409);
 assert.equal((await reload.json('/api/practice/notebook',{id:'saved-word',word:'term',meaning:'saved'})).r.status,200);
 assert.equal((await reload.json('/api/practice/notebook')).data.entries[0].meaning,'saved');
});
test('learning-plan persistence and revision conflicts fail honestly on storage failure',async()=>{
 const b=browser();await b.w.KPractice.load();await b.w.KPractice.value('key',{saved:true});
 assert.equal((await b.json('/api/practice',{action:'value',key:'key',revision:0,value:{saved:false}})).r.status,409);
 const plan={start:'2026-11-24',exam:'2027-02-22',days:[{day:1,cards:['one']}],thematic:true};await b.json('/api/learning-plan',{plan});
 const reload=browser(b.ls,b.idb);assert.deepEqual((await reload.json('/api/learning-plan')).data.plan,plan);
 reload.ls.fail=true;assert.equal((await reload.json('/api/learning-plan',{plan:{days:[]}})).r.status,503);reload.ls.fail=false;
 assert.deepEqual((await reload.json('/api/learning-plan')).data.plan,plan);
});
test('corrupt existing progress is preserved rather than replaced with an empty snapshot',async()=>{
 const raw='{"cards":[damaged',ls=storage({'kf_vercel_study_v1':raw}),b=browser(ls);assert.equal((await b.json('/api/study')).r.status,503);assert.equal(ls.getItem('kf_vercel_study_v1'),raw);
});
test('a rendering listener failure cannot turn a persisted practice value into a failed save',async()=>{
 const b=browser();await b.w.KPractice.load();b.w.console={...console,error(){}};b.w.KPractice.onChange(()=>{throw Error('render failure')});await b.w.KPractice.value('saved:listener',{saved:true});assert.equal(b.w.KPractice.hasPending(),false);assert.equal((await b.w.KSyncOutbox.listJobs('khangflash-local','practice')).length,0);
});
test('warm vocabulary cache can resolve bootstrap even after the DONE flag was already set',async()=>{
 const b=browser(undefined,undefined,undefined,'/due');b.w.__KF_BASE_MERGE_DONE__=true;b.w.__KF_RESOLVE_BASE_MERGE__();
 assert.equal(await Promise.race([b.w.__KF_BASE_MERGE_READY__.then(()=>true),new Promise(r=>setTimeout(()=>r(false),100))]),true);
});
test('saved legacy day assignments survive reload and ensureGoal after three flashcard ratings',async()=>{
 const b=browser(undefined,undefined,undefined,'/schedule');await b.w.KStore.load();
 const plan={custom:true,band:7,duration:1,start:'2026-11-24',exam:'2026-11-25',days:[{day:1,cards:['a','b','c','d']}],total:4};
 await b.json('/api/learning-plan',{plan});
 const data={cards:['a','b','c','d'].map(id=>({id,variants:[],topics:[]})),topics:[]};
 b.run('learning-plan.js');await b.w.KPlan.ensureGoal(data,b.w.KStore.get());assert.equal(JSON.stringify(b.w.KPlan.get()),JSON.stringify(plan));
 await b.w.KStore.review(['a','b','c'].map(id=>({id,rating:4})));const reload=browser(b.ls,b.idb);await reload.w.KStore.load();reload.run('learning-plan.js');await reload.w.KPlan.ensureGoal(data,reload.w.KStore.get());
 const day=reload.w.KPlan.effective(plan).days[0],seen=new Set(reload.w.KStore.get().cards.map(c=>c.card_id));assert.equal(day.cards.length,4);assert.equal(day.cards.filter(id=>seen.has(id)).length,3);assert.equal(reload.w.KPlan.get().band,7);
 // Loader migrations may never erase the persisted plan while moving to a new layout.
 const loader=code('live-override.js');assert.doesNotMatch(loader,/localStorage\.removeItem\(['"]kf_vercel_plan_v1['"]\)/);assert.doesNotMatch(loader,/indexedDB\.deleteDatabase\(['"]kf-device-learning-plan-v1['"]\)/);
});
test('portable backup exports and restores all progress channels, plans and manual completion',async()=>{
 const source=browser();await source.w.KStore.load();await source.w.KPractice.load();
 await source.w.KStore.review([{id:'backup-word',rating:4}],'Flashcard',1,1,'backup-review');
 await source.w.KPractice.value('checkpoint:writing:backup',{questions:[{draft:'A draft to preserve'}]});
 await source.json('/api/knowledge',{id:'reading-backup',value:{read:true,note:'Saved note',words:[{word:'resilience'}]}});
 await source.json('/api/news/notebook?url=https://example.com/backup',{url:'https://example.com/backup',notes:'Article notes',words:[{word:'evidence'}]});
 const plan={custom:true,days:[{day:1,cards:['backup-word','next-word']}],exam:'2027-02-23'};
 await source.json('/api/learning-plan',{plan});source.ls.setItem('kf_fp_manual_done_v1',JSON.stringify({'2026-11-25':{'0':1,'7':1}}));
 const exported=await source.json('/api/backup'),backup=exported.data;assert.equal(exported.r.status,200);assert.equal(backup.format,'khangflash-progress');assert.ok(backup.exportedAt);assert.equal(backup.data.study.cards[0].card_id,'backup-word');
 backup.data.devicePlan={schema:1,accountKey:'khangflash-local',plan};
 const target=browser();await target.w.KStore.load();const before=target.ls.getItem('kf_vercel_study_v1');const preview=await target.json('/api/backup',{action:'preview',backup});assert.ok(preview.data.summary.reduce((n,r)=>n+r.missing,0)>0);assert.equal(target.ls.getItem('kf_vercel_study_v1'),before);assert.equal(target.ls.getItem('kf_vercel_practice_v1'),null);
 const result=await target.json('/api/backup',{action:'merge',backup});assert.equal(result.r.status,200);assert.match(result.data.message,/Đã bổ sung/);
 const reload=browser(target.ls,target.idb);await reload.w.KStore.load();await reload.w.KPractice.load();assert.equal(reload.w.KStore.get().cards[0].due,backup.data.study.cards[0].due);assert.equal(reload.w.KPractice.get('checkpoint:writing:backup').questions[0].draft,'A draft to preserve');assert.equal((await reload.json('/api/knowledge')).data.entries[0].value.note,'Saved note');assert.equal((await reload.json('/api/news/notebook?url=https://example.com/backup')).data.notes,'Article notes');assert.equal((await reload.json('/api/learning-plan')).data.plan.exam,plan.exam);assert.equal((await reload.json('/api/backup')).data.data.devicePlan.plan.exam,plan.exam);assert.equal(JSON.parse(target.ls.getItem('kf_fp_manual_done_v1'))['2026-11-25']['7'],1);
 const again=await reload.json('/api/backup',{action:'merge',backup});assert.equal(again.data.summary.reduce((n,r)=>n+r.missing,0),0);
});
test('backup preview reports conflicts and merge preserves newer work and existing plans',async()=>{
 const b=browser();await b.w.KStore.load();await b.w.KPractice.load();await b.w.KStore.review([{id:'keep',rating:3}]);await b.w.KPractice.value('draft',{text:'current draft'});await b.json('/api/learning-plan',{plan:{days:[{cards:['keep']}],exam:'2027-02-23'}});
 const backup=(await b.json('/api/backup')).data,original=b.ls.getItem('kf_vercel_study_v1');backup.data.study.cards[0].due='2000-01-01';backup.data.practice.values[0].value.text='old draft';backup.data.plan.plan.exam='2000-01-01';
 const preview=await b.json('/api/backup',{action:'preview',backup});assert.ok(preview.data.summary.reduce((n,r)=>n+r.conflicts,0)>=3);await b.json('/api/backup',{action:'merge',backup});assert.equal(b.ls.getItem('kf_vercel_study_v1'),original);assert.equal((await b.json('/api/practice')).data.values[0].value.text,'current draft');assert.equal((await b.json('/api/learning-plan')).data.plan.exam,'2027-02-23');
});
test('invalid, cross-account and quota-failed imports never report success or overwrite progress',async()=>{
 const b=browser();await b.w.KStore.load();const backup=(await b.json('/api/backup')).data;
 assert.equal((await b.json('/api/backup',{action:'merge',backup:{}})).r.status,400);backup.accountKey='other';assert.equal((await b.json('/api/backup',{action:'merge',backup})).r.status,409);backup.accountKey='khangflash-local';backup.data.study.cards=[{card_id:'new',due:'2027-01-01',status:'known'}];backup.data.plan={plan:{days:'broken'}};assert.equal((await b.json('/api/backup',{action:'merge',backup})).r.status,400);assert.equal((await b.json('/api/study')).data.cards.length,0);
 delete backup.data.plan;b.ls.fail=true;assert.equal((await b.json('/api/backup',{action:'merge',backup})).r.status,503);b.ls.fail=false;assert.equal((await b.json('/api/study')).data.cards.length,0);
 b.ls.setItem('kf_fp_manual_done_v1','{broken');assert.equal((await b.json('/api/backup')).r.status,503);assert.equal(b.ls.getItem('kf_fp_manual_done_v1'),'{broken');
});
test('knowledge saved words refresh on reopening notebook and keep review dates across reload',async()=>{
 const network=async url=>new Response(/\.js(?:\?|$)/.test(String(url))?'':JSON.stringify({cards:[],sources:[]}));
 const prepare=async b=>{b.w.KKnowledge={index:async()=>({articles:[{id:'article'}]}),get:async()=>({id:'article',title:'Reading test',words:[{term:'old saved phrase',meaning:'old meaning',example:'An old example.'},{term:'new saved phrase',meaning:'new meaning',example:'A new example.'}]})};const root=b.w.document.createElement('div');root.id='unified-notebook';b.w.document.body.append(root);b.run('unified-notebook.js');await b.w.KNotebook.mount();};
 const b=browser(undefined,undefined,network);await b.json('/api/knowledge',{id:'article',value:{read:true,note:'Keep my note',words:[{id:0,stage:0,due:'2026-11-24'}]}});await prepare(b);assert.equal(b.w.KNotebook.items().length,1);
 await b.json('/api/knowledge',{id:'article',revision:1,value:{read:true,note:'Keep my note',words:[{id:0,stage:0,due:'2026-11-24'},{id:1,stage:0,due:b.w.KStore.get().today}]}});await b.w.KNotebook.mount();assert.equal(b.w.KNotebook.items().length,2);
 const item=b.w.KNotebook.items().find(x=>x.index===1),today=b.w.KPractice.getState().today;await b.w.KNotebook.rate(item,true);const due=new Date(Date.parse(today+'T00:00:00Z')+86400000).toISOString().slice(0,10);assert.equal(item.state.due,due);
 const reload=browser(b.ls,b.idb,network);await prepare(reload);const restored=reload.w.KNotebook.items().find(x=>x.index===1);assert.equal(restored.state.due,due);assert.equal(restored.meaning,'new meaning');assert.equal(restored.example,'A new example.');assert.equal((await reload.json('/api/knowledge')).data.entries[0].value.note,'Keep my note');
});
