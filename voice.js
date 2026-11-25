'use strict';
window.KVoice=(()=>{
 const synth=window.speechSynthesis,escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let prefs={accent:'en-GB',rate:1,selected:{},tone:{},source:{},adjustments:{}},generation=0,lastSpeech=null;
 try{const p=JSON.parse(localStorage.getItem('khang-voice')||'null');if(p){if(['en-GB','en-US'].includes(p.accent))prefs.accent=p.accent;if(Number.isFinite(p.rate)&&p.rate>=.75&&p.rate<=1.15)prefs.rate=p.rate;if(p.selected&&typeof p.selected==='object')prefs.selected=p.selected;if(p.tone&&typeof p.tone==='object')prefs.tone=p.tone;if(p.source&&typeof p.source==='object')prefs.source=p.source;if(p.adjustments&&typeof p.adjustments==='object'&&!Array.isArray(p.adjustments))prefs.adjustments=p.adjustments;}}catch{}
 for(const region of ['en-GB','en-US'])if(!['browser','microsoft'].includes(prefs.source[region]))prefs.source[region]='microsoft';
 let prepareTimer=null,preparedTexts=[],prepareEpoch=0;
 const localAccount=()=>window.KStore?.get()?.accountKey||'guest';
 function prepare(texts,region=prefs.accent){
  preparedTexts=Array.isArray(texts)?texts:preparedTexts;clearTimeout(prepareTimer);const epoch=++prepareEpoch;
  if(source(region)==='microsoft'){
   const id=currentMicrosoft(region).id,pitch=controls(region).pitch,account=localAccount(),items=[...new Set(preparedTexts.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))].slice(0,4);
   const valid=()=>epoch===prepareEpoch&&source(region)==='microsoft'&&currentMicrosoft(region)?.id===id&&controls(region).pitch===pitch&&localAccount()===account;
   // Current word/example first; then the next card. The shared scheduler reserves capacity for explicit playback.
   prepareTimer=setTimeout(()=>{let cursor=0;const worker=async()=>{while(valid()&&cursor<items.length){const text=items[cursor++];try{await microsoftAudio(text,id,account,undefined,undefined,pitch,true,valid);}catch{}}};void Promise.allSettled([worker(),worker()]);},0);return;
  }
 }
 const source=region=>prefs.source[region]==='browser'?'browser':'microsoft';
 const tones={neutral:{name:'Trung tính · giữ giọng gốc',pitch:1},deep:{name:'Trầm · cao độ thấp hơn',pitch:.85},bright:{name:'Sáng · cao độ cao hơn',pitch:1.12}};
 const save=()=>{try{localStorage.setItem('khang-voice',JSON.stringify(prefs));}catch{}};
 const lang=v=>String(v.lang).replaceAll('_','-').toLowerCase();
 const score=v=>/natural|neural|premium|enhanced/i.test(v.name)?100:/google/i.test(v.name)?80:/siri/i.test(v.name)?70:/microsoft/i.test(v.name)?50:20;
 const list=accent=>(synth?.getVoices()||[]).filter(v=>lang(v)===accent.toLowerCase()&&!/^Microsoft (?:David|Mark|Zira)(?:\s|$)/i.test(v.name)).sort((a,b)=>score(b)-score(a)||a.name.localeCompare(b.name));
 const microsoftVoices=[{id:'microsoft-sonia',name:'Sonia',gender:'Nữ',region:'en-GB'},{id:'microsoft-ryan',name:'Ryan',gender:'Nam',region:'en-GB'},{id:'microsoft-guy',name:'Guy',gender:'Nam',region:'en-US'},{id:'microsoft-christopher',name:'Christopher (Chris)',gender:'Nam',region:'en-US'}];
 const matchesMicrosoft=(v,p)=>lang(v)===p.region.toLowerCase()&&new RegExp('(?:^|[\\s(,_-])'+p.id.replace('microsoft-','')+'(?:Neural)?(?=$|[\\s),_-])','i').test(v.name+' '+v.voiceURI);
 const microsoftVoice=p=>list(p.region).find(v=>matchesMicrosoft(v,p))||null;
 const requestedMicrosoft=region=>microsoftVoices.find(p=>p.region===region&&p.id===prefs.selected[region]);
 const choose=accent=>{const preset=requestedMicrosoft(accent);if(preset)return microsoftVoice(preset);const voices=list(accent);return voices.find(v=>v.voiceURI===prefs.selected[accent])||voices[0]||null;};
 const currentMicrosoft=region=>source(region)==='microsoft'?(requestedMicrosoft(region)||microsoftVoices.find(p=>p.region===region)):null;
 const presets={neutral:{name:'Giọng gốc',pitch:0,rate:1,volume:1},soft:{name:'Mềm · nhẹ nhàng',pitch:-4,rate:.95,volume:.8},masculine:{name:'Nam tính · trầm và vững',pitch:-16,rate:.95,volume:1,needsPitch:true},deep:{name:'Trầm',pitch:-24,rate:.9,volume:1,needsPitch:true},calm:{name:'Bình tĩnh · chậm rãi',pitch:-6,rate:.85,volume:.9},bright:{name:'Sáng · linh hoạt',pitch:12,rate:1.05,volume:1,needsPitch:true},formal:{name:'Trang trọng · Formal',pitch:-6,rate:.9,volume:1},warm:{name:'Ấm áp · Đồng cảm',pitch:-8,rate:.92,volume:.85},authoritative:{name:'Quyết đoán · Chuyên gia',pitch:-12,rate:.96,volume:1},inspirational:{name:'Truyền cảm hứng',pitch:6,rate:1.07,volume:1},playful:{name:'Hóm hỉnh · Cởi mở',pitch:10,rate:1.06,volume:.95},serious:{name:'Nghiêm túc · Serious',pitch:-10,rate:.93,volume:1},casual:{name:'Thân mật · Casual',pitch:2,rate:1.02,volume:.9},respectful:{name:'Tôn trọng · Respectful',pitch:-3,rate:.94,volume:.9},irreverent:{name:'Phá cách · Irreverent',pitch:8,rate:1.1,volume:1},factual:{name:'Khách quan · Matter-of-fact',pitch:0,rate:1,volume:1},enthusiastic:{name:'Nhiệt huyết · Enthusiastic',pitch:10,rate:1.1,volume:1}};
 const adjustmentKey=region=>source(region)+':'+region+':'+(source(region)==='microsoft'?currentMicrosoft(region).id:(choose(region)?.voiceURI||'unavailable'));
 function controls(region=prefs.accent){const saved=prefs.adjustments[adjustmentKey(region)]||{},legacy=tones[prefs.tone[region]]?.pitch||1;return {pitch:Number.isFinite(saved.pitch)?Math.max(-30,Math.min(30,Math.round(saved.pitch))):Math.round((legacy-1)*100),rate:Number.isFinite(saved.rate)?Math.max(.75,Math.min(1.15,saved.rate)):prefs.rate,volume:Number.isFinite(saved.volume)?Math.max(.5,Math.min(1,saved.volume)):1,preset:typeof saved.preset==='string'&&presets[saved.preset]?saved.preset:'custom'};}
 function setControls(values,region=prefs.accent){prefs.adjustments[adjustmentKey(region)]={...controls(region),...values};save();}
 function playerControls(player,region=prefs.accent){const c=controls(region);player.playbackRate=c.rate;player.volume=c.volume;player.preservesPitch=true;}
 const deviceVoices=()=>[...list('en-GB'),...list('en-US')];
 const deviceValue=v=>'browser:'+encodeURIComponent(v.voiceURI);
 function selectMainVoice(value,region){
  if(typeof value!=='string')return false;
  const preset=microsoftVoices.find(p=>p.id===value);
  if(preset){region=preset.region;accent(region);prefs.source[region]='microsoft';prefs.selected[region]=preset.id;}
  else if(value.startsWith('browser:')){const voice=deviceVoices().find(v=>deviceValue(v)===value);if(!voice)return false;region=lang(voice)==='en-gb'?'en-GB':'en-US';accent(region);prefs.source[region]='browser';prefs.selected[region]=voice.voiceURI;}
  else return false;save();update();return true;
 }

 const microsoftMemory=new Map(),microsoftJobs=new Map();
 function rememberMicrosoft(key,blob){let bytes=0;for(const value of microsoftMemory.values())bytes+=value.size;while(microsoftMemory.size&&(microsoftMemory.size>=100||bytes+blob.size>24*1024*1024)){const first=microsoftMemory.keys().next().value;bytes-=microsoftMemory.get(first).size;microsoftMemory.delete(first);}microsoftMemory.set(key,blob);}
 // One background download leaves a slot for a user's explicit playback request.
 const microsoftQueue=[];let microsoftActive=0,microsoftBackgroundActive=0;
 function pumpMicrosoft(){
  for(let i=microsoftQueue.length-1;i>=0;i--){const q=microsoftQueue[i];if(q.job.background&&!q.job.isCurrent()){microsoftQueue.splice(i,1);q.reject(Error('Stale audio prefetch'));}}
  while(microsoftActive<2){
   const foreground=microsoftQueue.findIndex(q=>!q.job.background),index=foreground>=0?foreground:microsoftBackgroundActive<1&&microsoftQueue.length?0:-1;
   if(index<0)return;const q=microsoftQueue.splice(index,1)[0],background=q.job.background;
   microsoftActive++;if(background)microsoftBackgroundActive++;
   Promise.resolve().then(q.work).then(q.resolve,q.reject).finally(()=>{microsoftActive--;if(background)microsoftBackgroundActive--;pumpMicrosoft();});
  }
 }
 function runMicrosoft(job,work){return new Promise((resolve,reject)=>{microsoftQueue.push({job,work,resolve,reject});pumpMicrosoft();});}
 async function microsoftAudio(text,id,account,signal,onStream,pitch=0,background=false,isCurrent=()=>true){
  const identity=JSON.stringify([account,id,text,...(pitch?[pitch]:[])]);
  if(microsoftMemory.has(identity))return {blob:microsoftMemory.get(identity),source:'memory'};
  const existing=microsoftJobs.get(identity);if(existing){if(!background){existing.background=false;pumpMicrosoft();}else if(existing.background)existing.isCurrent=isCurrent;existing.subscribe(onStream);return existing.promise;}
  // Register before any await: a click and prefetch always share one request, including disk lookup.
  const job={background,isCurrent,promise:null,body:null,listeners:[],subscribe(fn){if(!fn)return;if(this.body){const parts=this.body.tee();this.body=parts[1];fn(parts[0]);}else this.listeners.push(fn);}};
  job.subscribe(onStream);
  job.promise=(async()=>{
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity))),b=>b.toString(16).padStart(2,'0')).join(''),key=location.origin+'/__microsoft_audio_v1__/'+hash;
   let disk=null;try{disk=await caches.open('tidian-microsoft-audio-v1');const hit=await disk.match(key);if(hit){const blob=await hit.blob();rememberMicrosoft(identity,blob);return {blob,source:'disk'};}}catch{}
   return runMicrosoft(job,async()=>{
   const streaming=!!window.MediaSource?.isTypeSupported('audio/mpeg'),sample=text==='Learning a little every day can make a lasting difference.';
   // Playback cancellation does not abort shared prefetch/cache work.
   const response=await fetch(sample?'/api/tidians/microsoft-tts?voice='+encodeURIComponent(id)+(pitch?'&pitch='+pitch:'')+(streaming?'&stream=1':''):'/api/tidians/microsoft-tts',sample?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voice:id,stream:streaming,pitch})});
   if(!response.ok){const error=await response.json().catch(()=>null);throw Error(error?.error||'Chưa kết nối được giọng Microsoft.');}
   let content=response;if(streaming&&response.headers.get('X-Tidian-Stream')==='1'&&response.body){const parts=response.body.tee();job.body=parts[0];for(const fn of job.listeners.splice(0))job.subscribe(fn);content=new Response(parts[1],{headers:response.headers});}
   const blob=await content.blob();if(!blob.type.startsWith('audio/')||blob.size<300||blob.size>3000000)throw Error('Âm thanh Microsoft không hợp lệ.');
   rememberMicrosoft(identity,blob);
   // Storage maintenance must never hold up playback or the next prefetch.
   if(disk&&blob.size<=2000000)void (async()=>{try{await disk.put(key,new Response(blob,{headers:{'Content-Type':'audio/mpeg'}}));const keys=await disk.keys();for(const old of keys.slice(0,Math.max(0,keys.length-100)))await disk.delete(old);}catch{}})();
   return {blob,source:'generated'};
   });
  })();microsoftJobs.set(identity,job);
  try{return await job.promise;}finally{if(microsoftJobs.get(identity)===job){microsoftJobs.delete(identity);if(job.body)void job.body.cancel().catch(()=>{});}}
 }
 let streamCancel=null;
 function playMicrosoftStream(body,ticket,region=prefs.accent){
  const reader=body.getReader(),media=new window.MediaSource();if(localUrl)URL.revokeObjectURL(localUrl);localUrl=URL.createObjectURL(media);
  const player=new window.Audio(localUrl);audio=player;playerControls(player,region);
  return new Promise(resolve=>{
   let settled=false,cancelled=false,buffer=null,rejectOpen=null;
   const settle=ok=>{if(!settled){settled=true;clearTimeout(startTimer);resolve(ok);}};
   const cancel=()=>{cancelled=true;void reader.cancel().catch(()=>{});rejectOpen?.(Error('Cancelled'));try{if(buffer?.updating)buffer.abort();}catch{}settle(false);};streamCancel=cancel;
   const startTimer=setTimeout(()=>{cancel();if(ticket===generation)notice('Giọng Microsoft phản hồi chậm. Thử đọc lại.');},25000);
   player.onplaying=()=>{if(ticket===generation)settle(true);else cancel();};
   player.onerror=()=>{cancel();if(ticket===generation)notice('Chưa phát được luồng audio. Thử đọc lại để dùng bản đã lưu.');};
   player.onended=()=>{if(audio===player)audio=null;if(streamCancel===cancel)streamCancel=null;};
   const opened=new Promise((ready,reject)=>{rejectOpen=reject;media.addEventListener('sourceopen',()=>{if(cancelled||ticket!==generation)return reject(Error('Cancelled'));try{buffer=media.addSourceBuffer('audio/mpeg');ready();}catch(error){reject(error);}},{once:true});});
   void (async()=>{
    try{
     await opened;let requested=false;
     while(!cancelled&&ticket===generation){const {done,value}=await reader.read();if(done)break;if(!value?.length)continue;
      await new Promise((ready,reject)=>{const clear=()=>{buffer.removeEventListener('updateend',ok);buffer.removeEventListener('error',bad);buffer.removeEventListener('abort',bad);};const ok=()=>{clear();ready();},bad=()=>{clear();reject(Error('Audio stream stopped'));};buffer.addEventListener('updateend',ok,{once:true});buffer.addEventListener('error',bad,{once:true});buffer.addEventListener('abort',bad,{once:true});try{buffer.appendBuffer(value);}catch(error){clear();reject(error);}});
      if(!requested&&!paused){requested=true;void Promise.resolve(player.play()).catch(()=>{if(!paused)settle(false);});}
     }
     if(!cancelled&&ticket===generation&&media.readyState==='open')media.endOfStream();
    }catch(error){if(!cancelled&&ticket===generation)notice('Luồng audio bị gián đoạn. Bấm đọc để thử lại.');cancel();}
   })();
  });
 }
 async function microsoftSpeak(text,region,ticket){
  const started=Date.now(),preset=currentMicrosoft(region);if(!preset)return false;
  notice('Đang lấy giọng Microsoft '+preset.name+'…');controller=new AbortController();
  let streamed=false,streamPlayback=null,resolveStarted;const began=new Promise(resolve=>resolveStarted=resolve);
  const metrics=(ok,source)=>{const status=document.getElementById('voice-notice')?.dataset;if(ticket===generation&&status){status.phase=ok?'playing':'error';status.readyMs=String(Date.now()-started);status.audioSource=source;status.voice=preset.id;if(ok)document.getElementById('voice-notice').hidden=true;}};
  const completed=microsoftAudio(text,preset.id,localAccount(),controller.signal,body=>{
   if(ticket!==generation){void body.cancel().catch(()=>{});return;}streamed=true;streamPlayback=playMicrosoftStream(body,ticket,region).then(ok=>{if(ok){metrics(true,'stream');resolveStarted(true);}return ok;});
  },controls(region).pitch).then(async result=>{
   if(ticket!==generation)return false;if(streamed&&await streamPlayback)return true;
   if(localUrl)URL.revokeObjectURL(localUrl);localUrl=URL.createObjectURL(result.blob);const ok=await play(localUrl,ticket,region);metrics(ok,result.source);return ok;
  }).catch(error=>{if(ticket===generation)notice(error.message||'Chưa phát được giọng Microsoft.');resolveStarted(false);return false;});
  return Promise.race([began,completed]);
 }

 function notice(text,offerDevice=false){let out=document.getElementById('voice-notice');if(!out){out=document.createElement('div');out.id='voice-notice';out.setAttribute('role','status');document.body.appendChild(out);}out.textContent=text;if(out.dataset)out.dataset.message=text;out.hidden=false;document.getElementById('kf-kokoro-voice-dialog-fallback')?.remove();if(offerDevice&&list(prefs.accent).length&&out.appendChild){const b=document.createElement('button');b.type='button';b.dataset.voiceFallback=prefs.accent;b.textContent='Dùng giọng thiết bị tạm thời';b.style.marginLeft='12px';out.appendChild(b);const status=document.getElementById('voice-preview-status');if(document.getElementById('kf-kokoro-voice-dialog')?.open&&status){const action=b.cloneNode(true);action.id='kf-kokoro-voice-dialog-fallback';status.after(action);}}}
 function wait(){if(!synth||synth.getVoices().length)return Promise.resolve();return new Promise(resolve=>{let timer;const done=()=>{clearTimeout(timer);synth.removeEventListener('voiceschanged',done);resolve();};synth.addEventListener('voiceschanged',done);timer=setTimeout(done,1600);});}
 function accent(value){if(['en-GB','en-US'].includes(value)){const changed=prefs.accent!==value;prefs.accent=value;save();if(changed&&typeof CustomEvent==='function')window.dispatchEvent?.(new CustomEvent('kvoice-accent-change',{detail:{accent:value}}));}return prefs.accent;}
 function update(){const region=prefs.accent==='en-GB'?'UK':'US',label='Giọng đọc: '+(region==='UK'?'Giọng Anh (UK)':'Giọng Mỹ (US)');document.querySelectorAll('[data-td-action="voice"]').forEach(b=>{const span=b.querySelector('span');if(span&&span.textContent!==region)span.textContent=region;if(b.title!=='Chọn giọng đọc · '+region)b.title='Chọn giọng đọc · '+region;if(b.getAttribute('aria-label')!==label)b.setAttribute('aria-label',label);});}
 let audio=null,controller=null,paused=false;
 function stop(){streamCancel?.();streamCancel=null;paused=false;generation++;controller?.abort();controller=null;if(audio){audio.pause();audio.removeAttribute?.('src');audio.load?.();audio=null;}synth?.cancel();}
 function pause(){paused=true;if(audio)audio.pause();else synth?.pause();}
 function resume(){paused=false;if(audio)return audio.play();synth?.resume();}
 async function play(src,ticket,region=prefs.accent){
  if(ticket!==generation||typeof window.Audio!=='function')return false;
  const player=new window.Audio(src);audio=player;playerControls(player,region);
  if(paused){player.onended=()=>{if(audio===player)audio=null;};return true;}
  return new Promise(resolve=>{let settled=false;const done=value=>{if(!settled){settled=true;clearTimeout(timer);resolve(value);}};
   const timer=setTimeout(()=>{if(audio===player){player.pause();audio=null;}done(false);},5000);
   player.onerror=()=>{if(audio===player)audio=null;done(false);};player.onended=()=>{if(audio===player)audio=null;};
   try{Promise.resolve(player.play()).then(()=>{if(ticket!==generation||settled||audio!==player){player.pause();done(false);}else{const n=document.getElementById('voice-notice');if(n)n.hidden=true;done(true);}}).catch(()=>done(false));}catch{done(false);}
  });
 }
 async function speak(text,region=prefs.accent){stop();const oldNotice=document.getElementById('voice-notice');if(oldNotice){oldNotice.textContent='';oldNotice.hidden=true;}const ticket=generation;const clean=String(text??'').trim();if(!clean)return false;lastSpeech={text:clean,region};const mode=source(region);if(mode==='microsoft')return microsoftSpeak(clean,region,ticket);if(ticket!==generation)return false;if(!synth){notice('Trình duyệt chưa hỗ trợ giọng đọc.');return false;}synth.cancel();await wait();if(ticket!==generation)return false;const voice=choose(region);if(!voice&&requestedMicrosoft(region)){notice('Trình duyệt này chưa cung cấp Microsoft '+requestedMicrosoft(region).name+'. Mở phần Chọn giọng để chọn lại; không tự thay bằng giọng khác.');return false;}if(!voice){notice(`Chưa có giọng ${region==='en-GB'?'UK':'US'} trên trình duyệt này. Mở Chọn giọng để kiểm tra; không dùng giọng vùng khác thay thế.`);return false;}const u=new SpeechSynthesisUtterance(clean);u.voice=voice;u.lang=voice.lang;const c=controls(region);u.rate=c.rate;u.pitch=1+c.pitch/100;u.volume=c.volume;u.onerror=e=>{if(!['canceled','interrupted'].includes(e.error))notice('Không phát được giọng '+voice.name+'. Thử giọng khác trong Chọn giọng.');};const n=document.getElementById('voice-notice');if(n)n.hidden=true;synth.speak(u);update();return true;}
 function renderSettings(){
  const dialog=document.getElementById('kf-kokoro-voice-dialog');if(!dialog)return;
  const region=prefs.accent,mode=source(region),voices=list(region),selected=choose(region),natural=currentMicrosoft(region),devices=deviceVoices(),mainValue=natural?.id||(selected?deviceValue(selected):'device-unavailable'),mainName=natural?.name||selected?.name||'giọng thiết bị';
  const c=controls(region);const active=document.activeElement?.id,customOpen=dialog.querySelector?.('#voice-personalize')?.open,advanced=dialog.querySelector?.('details:not(#voice-personalize)')?.open;
  dialog.innerHTML=`<header class="voice-header"><div><h2 id="kf-kokoro-voice-dialog-title">Chọn giọng đọc</h2><p>Bấm nghe thử để tìm giọng bạn thích.</p></div><button type="button" class="voice-close" data-voice-close aria-label="Đóng bảng chọn giọng">×</button></header>
   <div class="voice-accent-row"><span>Phát âm</span><div class="voice-segment" role="group" aria-label="Phát âm">${[['en-GB','Anh · UK'],['en-US','Mỹ · US']].map(([id,label])=>`<button type="button" id="voice-accent-${id}" data-voice-accent="${id}" aria-pressed="${region===id}">${label}</button>`).join('')}</div></div>
   <fieldset class="voice-choices"><legend>Chọn giọng đọc <span>Trực tuyến · Thiết bị</span></legend><div class="voice-advanced-fields"><div><label for="kf-kokoro-voice-local">Tất cả nguồn giọng</label><select id="kf-kokoro-voice-local"><optgroup label="Microsoft · Trực tuyến · UK / US">${microsoftVoices.map(p=>`<option value="${p.id}" ${mainValue===p.id?'selected':''}>${p.name} · ${p.gender} · ${p.region==='en-GB'?'UK':'US'}</option>`).join('')}</optgroup>${devices.length?`<optgroup label="Giọng thiết bị · Do trình duyệt cung cấp">${devices.map(v=>`<option value="${escape(deviceValue(v))}" ${mainValue===deviceValue(v)?'selected':''}>${escape(v.name)} · ${lang(v)==='en-gb'?'UK':'US'}</option>`).join('')}</optgroup>`:''}${mode==='browser'&&!selected?'<option value="device-unavailable" selected disabled>Thiết bị chưa có giọng phù hợp · chọn giọng khác ở trên</option>':''}</select></div><button type="button" class="voice-sample" data-kf-kokoro-voice-local-use aria-pressed="${mode!=='browser'||!!selected}">Đang dùng giọng này</button><button type="button" class="voice-sample" data-kf-kokoro-voice-local-preview>▶ Nghe thử</button></div><p class="voice-help">Chọn mọi nguồn ngay trong ô trên. Sonia / Ryan là UK; Guy / Christopher là US. Các giọng Microsoft đọc trực tuyến và tự chuyển đúng vùng. Giọng thiết bị chỉ gồm những giọng trình duyệt cung cấp.</p></fieldset>
   <div class="voice-speed-row"><span>Tốc độ</span><div class="voice-speeds" role="group" aria-label="Tốc độ đọc">${[.8,.9,1,1.1].map(r=>`<button type="button" id="voice-speed-${r}" data-voice-speed="${r}" aria-pressed="${c.rate===r}">${r}×</button>`).join('')}</div></div>
   <details class="voice-advanced" id="voice-personalize" ${customOpen?'open':''}><summary>Chỉnh chất giọng · ${escape(mainName)}</summary><div class="voice-advanced-fields"><div><label for="voice-preset">Mức chỉnh sẵn</label><select id="voice-preset"><option value="custom" ${c.preset==='custom'?'selected':''}>Tự chỉnh</option>${Object.entries(presets).map(([id,p])=>`<option value="${id}" ${c.preset===id?'selected':''}>${p.name}</option>`).join('')}</select></div><button type="button" class="voice-sample" data-voice-reset>Khôi phục giọng gốc</button><div><label for="voice-pitch">Cao độ · <output id="voice-pitch-value">${c.pitch===0?'Giọng gốc':c.pitch<0?'Trầm hơn '+Math.abs(c.pitch):'Sáng hơn '+c.pitch}</output></label><input id="voice-pitch" data-voice-control="pitch" type="range" min="-30" max="30" step="1" value="${c.pitch}"><p class="voice-help">Trầm hơn ↔ Sáng hơn</p></div><div><label for="voice-rate">Tốc độ · <output id="voice-rate-value">${c.rate.toFixed(2)}×</output></label><input id="voice-rate" data-voice-control="rate" type="range" min="0.75" max="1.15" step="0.01" value="${c.rate}"></div><div><label for="voice-volume">Âm lượng · <output id="voice-volume-value">${Math.round(c.volume*100)}%</output></label><input id="voice-volume" data-voice-control="volume" type="range" min="0.5" max="1" step="0.01" value="${c.volume}"></div></div><p class="voice-help">Lưu riêng cho từng giọng. Các mức chỉnh kết hợp cao độ, tốc độ và âm lượng; “nam tính” làm giọng trầm hơn, không đổi người nói. ${mode==='browser'?'Mức thay đổi cao độ phụ thuộc giọng và trình duyệt.':''} Tên tông là gợi ý phối thông số, không đổi câu từ hay tạo sự hài hước. Chưa điều khiển riêng cảm xúc, điểm dừng hay nhấn từ khóa. Bấm Nghe thử để kiểm tra.</p></details>
   <details class="voice-advanced" ${advanced||mode==='browser'?'open':''}><summary>Cài đặt nguồn${mode==='browser'?' · Giọng thiết bị':' · Microsoft trực tuyến'}</summary><div class="voice-advanced-fields"><div><label for="voice-source">Nguồn đang dùng</label><select id="voice-source">${`<option value="microsoft" ${mode==='microsoft'?'selected':''}>Microsoft · Trực tuyến · ${region==='en-GB'?'Sonia / Ryan':'Guy / Christopher'}</option>`}<option value="browser" ${mode==='browser'?'selected':''}>Giọng thiết bị · Trình duyệt cung cấp</option></select></div><div ${mode!=='browser'?'hidden':''}><label for="voice-browser">Chỉ giọng thiết bị · ${region==='en-GB'?'UK':'US'}</label><select id="voice-browser" data-voice-region="${region}" ${voices.length?'':'disabled'}>${voices.length?voices.map(v=>`<option value="${escape(v.voiceURI)}" ${v===selected?'selected':''}>${escape(v.name)}</option>`).join(''):'<option value="">Chưa có giọng phù hợp</option>'}</select></div></div><p class="voice-help">Ô “Chỉ giọng thiết bị” không chứa các giọng Microsoft trực tuyến. Để chọn mọi nguồn, dùng ô “Tất cả nguồn giọng” phía trên.</p>${mode==='browser'?`<button type="button" class="voice-sample" data-voice-preview="${region}">▶ Nghe thử giọng thiết bị</button>`:''}</details>
   <footer class="voice-footer"><div><p id="voice-preview-status" class="voice-help" role="status" aria-live="polite">${natural?'Đang chọn Microsoft '+natural.name+' · '+(region==='en-GB'?'UK':'US')+' · Trực tuyến.':'Đang dùng '+(selected?.name||'giọng thiết bị chưa có')+'.'}</p><small>Tự động lưu lựa chọn</small></div><div class="voice-actions"><button class="voice-stop" type="button" data-voice-stop aria-label="Dừng nghe thử">Dừng</button><button class="hub-button" type="button" data-voice-close>Xong</button></div></footer>`;
  if(active)dialog.querySelector?.(`[id="${active}"]`)?.focus();
 }
 const uiVersion='20261124-voice1';
 function voiceDialog(dialog){const heading=dialog.querySelector?.('h2,h1')?.textContent||'';return dialog.id==='kf-kokoro-voice-dialog'||/^Giọng đọc.*UK.*US.*tự nhiên/iu.test(heading.trim())||!!dialog.querySelector?.('#voice-accent,#ai-voice-en-GB,#ai-voice-en-US');}
 function cleanVoiceDialogs(){let current=null,reopen=false;for(const dialog of document.querySelectorAll('dialog')){if(!voiceDialog(dialog))continue;const valid=dialog.id==='kf-kokoro-voice-dialog'&&dialog.dataset?.kvoiceUi===uiVersion&&dialog.querySelector('#kf-kokoro-voice-local');if(valid&&!current){current=dialog;continue;}reopen ||= !!dialog.open;if(dialog.open)dialog.close?.();dialog.remove();}return reopen;}
 function settings(){
  if(window.KVoiceUI?.engine)window.KVoice=window.KVoiceUI.engine;
  cleanVoiceDialogs();let dialog=document.getElementById('kf-kokoro-voice-dialog');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='kf-kokoro-voice-dialog';dialog.dataset.kvoiceUi=uiVersion;dialog.className='td-modal';dialog.setAttribute('aria-labelledby','kf-kokoro-voice-dialog-title');dialog.addEventListener('close',stop);dialog.addEventListener('cancel',stop);document.body.appendChild(dialog);}
  renderSettings();if(!dialog.open)dialog.showModal();
  return Promise.resolve();
 }
 function closeSettings(){stop();prepare(preparedTexts);for(const dialog of document.querySelectorAll('dialog'))if(voiceDialog(dialog)){if(dialog.open)dialog.close?.();if(dialog.id!=='kf-kokoro-voice-dialog'||dialog.dataset?.kvoiceUi!==uiVersion)dialog.remove();}}
 // All entry points, including older handlers, use one owner for this dialog.
 document.addEventListener('click',event=>{const button=event.target.closest?.('button,a,[role="button"]');if(!button||button.disabled||!button.matches('[data-td-action="voice"],[data-td-action="voice-settings"],[data-action="voice-settings"],[data-bb="voices"],#voice-settings-button'))return;event.preventDefault();event.stopImmediatePropagation();settings();},true);
 let repairQueued=false;
 function repairVoiceUi(){repairQueued=false;if(cleanVoiceDialogs())settings();update();}
 function queueRepair(){if(repairQueued)return;repairQueued=true;Promise.resolve().then(repairVoiceUi);}
 if(typeof MutationObserver==='function'&&document.body)new MutationObserver(queueRepair).observe(document.body,{childList:true,subtree:true,characterData:true});
 window.addEventListener('pageshow',repairVoiceUi);window.addEventListener('focus',repairVoiceUi);repairVoiceUi();
 window.KVoiceUI={version:uiVersion,open:settings,close:closeSettings};

 document.addEventListener('change',e=>{const target=e.target,region=prefs.accent;if(target.id==='kf-kokoro-voice-local'){stop();selectMainVoice(target.value,region);renderSettings();prepare(preparedTexts);}if(target.id==='voice-source'&&['browser','microsoft'].includes(target.value)){stop();prefs.source[region]=target.value;if(target.value==='microsoft')prefs.selected[region]=(requestedMicrosoft(region)||microsoftVoices.find(p=>p.region===region)).id;if(target.value==='browser'&&requestedMicrosoft(region))prefs.selected[region]=list(region)[0]?.voiceURI||'';save();renderSettings();prepare(preparedTexts);}if(target.dataset.voiceRegion){stop();prefs.selected[target.dataset.voiceRegion]=target.value;save();update();renderSettings();}if(target.id==='voice-preset'&&presets[target.value]){stop();const p=presets[target.value];setControls({pitch:p.pitch,rate:p.rate,volume:p.volume,preset:target.value});renderSettings();prepare(preparedTexts);}if(target.dataset.voiceTone&&tones[target.value]){prefs.tone[target.dataset.voiceTone]=target.value;save();}});
 function adjustRange(e){const el=e.target,key=el.dataset?.voiceControl;if(!['pitch','rate','volume'].includes(key))return;const value=Number(el.value);if(!Number.isFinite(value))return;stop();setControls({[key]:value,preset:'custom'});const c=controls(),out=document.getElementById('voice-'+key+'-value');if(out)out.textContent=key==='pitch'?(c.pitch===0?'Giọng gốc':c.pitch<0?'Trầm hơn '+Math.abs(c.pitch):'Sáng hơn '+c.pitch):key==='rate'?c.rate.toFixed(2)+'×':Math.round(c.volume*100)+'%';const preset=document.getElementById('voice-preset');if(preset)preset.value='custom';document.querySelectorAll('[data-voice-speed]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.voiceSpeed)===c.rate)));if(e.type==='change'&&key==='pitch')prepare(preparedTexts);}
 document.addEventListener('input',adjustRange);document.addEventListener('change',adjustRange);
 document.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;if(b.dataset.voiceFallback&&lastSpeech){const region=b.dataset.voiceFallback;prefs.source[region]='browser';save();renderSettings();await speak(lastSpeech.text,region);return;}
  if(b.hasAttribute('data-kf-kokoro-voice-local-use')||b.hasAttribute('data-kf-kokoro-voice-local-preview')){stop();const region=prefs.accent,value=document.getElementById('kf-kokoro-voice-local')?.value;if(!selectMainVoice(value,region))return;const chosenRegion=prefs.accent,name=currentMicrosoft(chosenRegion)?.name||choose(chosenRegion)?.name||'giọng thiết bị';renderSettings();if(b.hasAttribute('data-kf-kokoro-voice-local-preview')){const playing=speak('Learning a little every day can make a lasting difference.',prefs.accent),ticket=generation;const ok=await playing;if(ticket===generation){const status=document.getElementById('voice-preview-status');if(status)status.textContent=ok?'Đã yêu cầu phát thử '+name+'.':document.getElementById('voice-notice')?.textContent||'Chưa phát được giọng đã chọn.';}}return;}
  if(b.dataset.voiceAccent){stop();accent(b.dataset.voiceAccent);update();renderSettings();prepare(preparedTexts);}
  if(b.hasAttribute('data-voice-reset')){stop();setControls({pitch:0,rate:1,volume:1,preset:'neutral'});renderSettings();}if(b.dataset.voiceSpeed){stop();setControls({rate:Number(b.dataset.voiceSpeed),preset:'custom'});renderSettings();}
  if(b.dataset.voicePreview){

   const dialog=document.getElementById('kf-kokoro-voice-dialog'),status=document.getElementById('voice-preview-status'),n=document.getElementById('voice-notice');if(n)n.textContent='';
   const buttons=dialog?.querySelectorAll('[data-voice-sample],[data-voice-preview]')||[];
   buttons.forEach(x=>x.disabled=true);if(status)status.textContent=`Đang chuẩn bị giọng thiết bị…`;
   const playing=speak('Learning a little every day can make a lasting difference.',prefs.accent),ticket=generation;
   try{const ok=await playing;if(ticket===generation&&status?.isConnected)status.textContent=ok?`Đã phát thử giọng thiết bị.`:document.getElementById('voice-notice')?.dataset?.message||document.getElementById('voice-notice')?.textContent||'Chưa phát được. Bấm nghe thử để thử lại.';}finally{buttons.forEach(x=>x.disabled=false);}
  }
  if(b.hasAttribute('data-voice-stop')){stop();const status=document.getElementById('voice-preview-status');if(status)status.textContent='Đã dừng nghe thử.';document.querySelectorAll('#kf-kokoro-voice-dialog [data-voice-sample],#kf-kokoro-voice-dialog [data-voice-preview]').forEach(x=>x.disabled=false);}
  if(b.hasAttribute('data-voice-close'))closeSettings();
 });
 synth?.addEventListener('voiceschanged',()=>{update();if(document.getElementById('kf-kokoro-voice-dialog')?.open)renderSettings();});window.addEventListener('pagehide',stop);
 return{speak,stop,pause,resume,accent,settings,update,list,choose,prepare};
})();
function __syncVoiceCss(){try{let out='';for(const sheet of [...document.styleSheets]){let rules;try{rules=sheet.cssRules;}catch{continue;}if(!rules)continue;for(const r of [...rules]){const t=r.cssText||'';if(t.includes('#voice-dialog')||t.includes('#voice-local')){out+=t.replaceAll('#voice-dialog','#kf-kokoro-voice-dialog').replaceAll('#voice-local','#kf-kokoro-voice-local')+'\n';}}}let st=document.getElementById('kf-kokoro-voice-css');if(!st){st=document.createElement('style');st.id='kf-kokoro-voice-css';document.head.appendChild(st);}const fallback='#kf-kokoro-voice-dialog{margin:auto!important;max-width:min(560px,calc(100vw - 24px))!important;width:100%!important;padding:24px!important;border-radius:18px!important;}\n';st.textContent=fallback+out;}catch{}}__syncVoiceCss();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',__syncVoiceCss,{once:true});setTimeout(__syncVoiceCss,800);

if(window.KVoiceUI?.version==='20261124-voice1')window.KVoiceUI.engine=window.KVoice;try{const __lk=o=>o?new Proxy(o,{set:()=>true,defineProperty:()=>true}):o,__kv=__lk(window.KVoice),__kui=__lk(window.KVoiceUI);if(__kv){Object.defineProperty(window,'KVoice',{get:()=>__kv,set:()=>{},configurable:false});if(__kui)Object.defineProperty(window,'KVoiceUI',{get:()=>__kui,set:()=>{},configurable:false});window.addEventListener('click',ev=>{const b=ev.target&&ev.target.closest&&ev.target.closest('button,a,[role="button"]');if(!b||b.closest('#kf-kokoro-voice-dialog'))return;if(b.matches('#voice-settings-button,[data-td-action="voice"],[data-td-action="voice-settings"],[data-action="voice-settings"],[data-bb="voices"]')||((b.textContent||'').includes('Chọn giọng'))){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();const old=document.getElementById('kf-kokoro-voice-dialog');if(old&&/Piper/i.test(old.textContent||''))old.remove();try{__syncVoiceCss();}catch{}if(typeof __kv?.settings==='function')__kv.settings();}},true);}}catch{}
