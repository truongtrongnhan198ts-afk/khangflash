'use strict';
const decks=[
 [1,'Daily routines','What part of your day do you enjoy most?','Has your routine changed in recent years?','Do you prefer planning your day in advance?'],
 [1,'Public transport','How do you usually travel around your city?','What do you like about public transport?','Would you change anything about your commute?'],
 [1,'Learning languages','When do you use English outside class?','What helps you remember new words?','Which language would you like to learn next?'],
 [2,'A useful app','Describe an app that helped you solve a problem.',['How you found it','What problem you had','How you used the app','Explain why it was useful']],
 [2,'A quiet place','Describe a quiet place where you like to spend time.',['Where the place is','How you discovered it','What you do there','Explain how you feel there']],
 [2,'A skill you learned','Describe a skill you learned from another person.',['What the skill was','Who taught you','How you practised','Explain how you use it now']],
 [3,'Technology and habits','How has technology changed the way people organise their day?','Who should help people develop healthy digital habits?','Will workplaces become less dependent on screens in the future?'],
 [3,'Cities and transport','What makes a public transport system attractive?','Should cities prioritise cyclists over private cars?','How might transport needs differ between age groups?'],
 [3,'Education and practical skills','Which skills should schools teach alongside academic subjects?','What can people learn more effectively from a mentor?','How should employers support lifelong learning?']
];
const el=id=>document.getElementById('speaking-'+id);
let clip=null, grading=null, attempt=null;
let feedbackSession=null;
const audioLimit=3*1024*1024;
const fileTypes={wav:'audio/wav',mp3:'audio/mpeg',webm:'audio/webm'};
const extensions={'audio/wav':'wav','audio/mpeg':'mp3','audio/webm':'webm','audio/mp4':'m4a','audio/ogg':'ogg'};
const openHistory=new Promise((resolve,reject)=>{
 const request=indexedDB.open('khangflash-speaking-recordings',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('recordings',{keyPath:'id'});
 request.onsuccess=()=>resolve(request.result);
 request.onerror=()=>reject(request.error);
});
async function historyRequest(mode,operation){
 const db=await openHistory;
 return new Promise((resolve,reject)=>{
  const transaction=db.transaction('recordings',mode);
  const request=operation(transaction.objectStore('recordings'));
  transaction.oncomplete=()=>resolve(request.result);
  transaction.onabort=()=>reject(transaction.error);
 });
}
function extension(audio){return extensions[audio.type.split(';')[0]]||'webm';}
function exportAttempt(entry){
 return encodeAudio(entry.audio).then(audioBase64=>{
  const backup=new Blob([JSON.stringify({...entry,audio:undefined,mimeType:entry.audio.type,audioBase64})],{type:'application/json'});
  const url=URL.createObjectURL(backup);
  const link=node('a','');link.href=url;link.download='khangflash-speaking-'+entry.id+'.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
 });
}
async function refreshHistory(){
 try{
  const entries=await historyRequest('readonly',store=>store.getAll());
  entries.sort((a,b)=>b.createdAt-a.createdAt);
  el('history-status').textContent=entries.length?'':'Chưa có bản thu đã lưu.';
  el('history').replaceChildren(...entries.map(entry=>{
   const item=node('li','');
   const caption='Part '+entry.part+' · '+entry.topic+' · '+new Date(entry.createdAt).toLocaleString('vi-VN');
   const open=node('button','Mở bản thu');open.type='button';
   open.onclick=()=>{
    if(busy())return;
    const previousDeck=decks.find(d=>d[0]===entry.part&&d[1]===entry.topic&&d[entry.index+2]===entry.question);
    if(!previousDeck){el('history-status').textContent='Không tìm thấy câu hỏi của bản thu.';return;}
    deck=previousDeck;index=entry.index;question();
    showClip(entry);
    if(entry.result)renderResult(entry.result);
    el('practice').hidden=false;el('practice').focus();el('practice').scrollIntoView({block:'start'});
   };
   const backup=node('button','Xuất audio và kết quả');backup.type='button';
   backup.onclick=()=>exportAttempt(entry).catch(()=>{el('history-status').textContent='Chưa xuất được bản thu.';});
   const remove=node('button','Xóa bản thu');remove.type='button';
   remove.onclick=async()=>{
    if(attempt?.id===entry.id&&grading)return;
    if(!confirm('Xóa bản thu này khỏi lịch sử trên thiết bị?'))return;
    try{
     await historyRequest('readwrite',store=>store.delete(entry.id));
     if(attempt?.id===entry.id){clearClip();buttons();}
     await refreshHistory();
    }catch{el('history-status').textContent='Chưa xóa được bản thu.';}
   };
   const band=!entry.result?'Chưa chấm':Number.isFinite(entry.result.overall_band)?'Band '+entry.result.overall_band.toFixed(1):'Có nhận xét · Chưa đủ dữ liệu ước tính band';
   item.append(node('p',caption+' · '+band),node('p',entry.question),open,backup,remove);
   return item;
  }));
 }catch{el('history-status').textContent='Không mở được lịch sử bản thu trên thiết bị.';}
}
async function saveAttempt(entry){
 try{
  await historyRequest('readwrite',store=>store.put(entry));
  await refreshHistory();
 }catch{el('history-status').textContent='Không lưu được bản thu. Bạn vẫn có thể tải audio xuống.';}
}
function showClip(entry){
 clearClip();attempt=entry;clip=entry.audio;
 recordingUrl=URL.createObjectURL(clip);
 el('audio').src=recordingUrl;el('audio').hidden=false;
 el('download').href=recordingUrl;el('download').download='khangflash-speaking.'+extension(clip);el('download').hidden=false;
 el('status').textContent='Bạn có thể nghe lại, tải xuống hoặc chấm bản thu.';
 buttons();
}
function selectClip(audio){
 const entry={id:crypto.randomUUID(),createdAt:Date.now(),part:deck[0],topic:deck[1],index,question:deck[index+2],audio};
 showClip(entry);
 saveAttempt(entry);
}
let deck,index=0,clock,timerEnd=0,phase,recorder,recordingUrl,requesting=false;
function node(tag,text){const item=document.createElement(tag);item.textContent=text;return item;}
function list(){
 const part=el('part').value, query=el('search').value.trim().toLowerCase();
 const visible=decks.filter(d=>(part==='all'||String(d[0])===part)&&d[1].toLowerCase().includes(query));
 el('count').textContent=visible.length?visible.length+' chủ đề':'Không tìm thấy chủ đề phù hợp.';
 el('decks').replaceChildren(...visible.map(d=>{
  const card=node('article','');card.className='speaking-deck';
  const button=node('button','Luyện chủ đề');button.type='button';
  button.setAttribute('aria-label','Luyện chủ đề '+d[1]);
  button.onclick=()=>{if(busy())return;deck=d;index=0;question();el('practice').hidden=false;el('practice').focus();el('practice').scrollIntoView({block:'start'});};
  card.append(node('small','PART '+d[0]),node('h3',d[1]),node('p',d[0]===2?'1 phút chuẩn bị · 2 phút nói':'3 câu hỏi luyện nói'),button);
  return card;
 }));
}
function busy(){return requesting||!!recorder;}
function buttons(){
 el('record').disabled=busy()||!canRecord;
 el('file').disabled=busy();
 el('stop').disabled=recorder?.state!=='recording';
 el('prev').disabled=busy()||index===0;
 el('next').disabled=busy()||deck[0]===2||index===deck.length-3;
 el('grade').disabled=busy()||!clip||!!grading;
}
function clearClip(){
 clearFeedback();
 el('grade').textContent='Chấm bản thu bằng AI';
 grading?.abort();grading=null;clip=null;attempt=null;
 el('grade').disabled=true;
 el('grade-status').textContent='';
 el('result').replaceChildren();
 if(recordingUrl)URL.revokeObjectURL(recordingUrl);
 recordingUrl=null;
 el('audio').removeAttribute('src');el('audio').hidden=true;
 el('download').removeAttribute('href');el('download').hidden=true;
}
function showTime(s){
 el('clock').textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
}
function resetTimer(){
 clearInterval(clock);clock=null;phase=deck[0]===2?'prepare':'practice';timerEnd=0;
 el('clock-label').textContent=phase==='prepare'?'Chuẩn bị':'Thời gian luyện';
 showTime(phase==='prepare'?60:0);
 el('timer').textContent='Bắt đầu tính giờ';
}
function begin(seconds,label){
 clearInterval(clock);timerEnd=Date.now()+seconds*1000;el('clock-label').textContent=label;showTime(seconds);
 el('timer').textContent='Đặt lại đồng hồ';
 clock=setInterval(()=>{
  const remaining=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));showTime(remaining);
  if(remaining)return;
  clearInterval(clock);clock=null;
  if(phase==='prepare'){
   phase='speak';el('status').textContent='Hết thời gian chuẩn bị. Bạn có thể thu âm khi bắt đầu nói.';
   begin(120,'Trả lời');
  } else {
   timerEnd=0;el('status').textContent='Đã hết thời gian luyện.';el('timer').textContent='Đặt lại đồng hồ';
  }
 },250);
}
function question(){
 clearClip();resetTimer();
 el('position').textContent='PART '+deck[0]+(deck[0]===2?' · CUE CARD':' · CÂU '+(index+1)+' / '+(deck.length-2));
 el('topic').textContent=deck[1];el('question').textContent=deck[index+2];
 el('cues').replaceChildren(...(deck[0]===2?deck[3].map(c=>node('li',c)):[]));
 el('status').textContent=canRecord?'':'Trình duyệt này chưa hỗ trợ thu âm trên trang.';
 buttons();
}
const canRecord=!!navigator.mediaDevices?.getUserMedia&&typeof MediaRecorder==='function';
el('record').onclick=async()=>{
 if(busy()||!canRecord)return;
 requesting=true;buttons();let stream;
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:true});
  const capture=new MediaRecorder(stream),parts=[];
  capture.ondataavailable=event=>{if(event.data.size)parts.push(event.data);};
  capture.onstop=()=>{
   stream.getTracks().forEach(track=>track.stop());recorder=null;
   if(parts.length){
    const type=capture.mimeType||parts[0].type;
    selectClip(new Blob(parts,{type}));
   }else el('status').textContent='Không có dữ liệu âm thanh. Hãy thử thu lại.';
   buttons();
  };
  capture.start();recorder=capture;
  el('status').textContent='Đang thu âm. Bấm Dừng thu khi bạn trả lời xong.';
 }catch{
  stream?.getTracks().forEach(track=>track.stop());
  el('status').textContent='Chưa mở được mic. Kiểm tra quyền micro rồi thử lại.';
 }finally{requesting=false;buttons();}
};
el('file').onchange=()=>{
 const file=el('file').files[0];
 el('file').value='';
 if(!file||busy())return;
 const type=fileTypes[file.name.split('.').pop().toLowerCase()];
 if(!type||!file.size||file.size>audioLimit){
  el('status').textContent='Chọn file WAV, MP3 hoặc WebM có dữ liệu và không vượt 3 MB.';
  return;
 }
 selectClip(file.slice(0,file.size,type));
};
el('stop').onclick=()=>{if(recorder?.state==='recording'){recorder.stop();el('stop').disabled=true;}};
el('timer').onclick=()=>{
 if(timerEnd||el('timer').textContent==='Đặt lại đồng hồ'){resetTimer();return;}
 begin(deck[0]===2?60:45,deck[0]===2?'Chuẩn bị':'Thời gian luyện');
};
el('prev').onclick=()=>{if(index&&!busy()){index--;question();}};
el('next').onclick=()=>{if(deck[0]!==2&&index<deck.length-3&&!busy()){index++;question();}};
el('part').onchange=list;el('search').oninput=list;
window.addEventListener('pagehide',()=>{if(recorder?.state==='recording')recorder.stop();feedbackSession?.controller.abort();});
list();
refreshHistory();

function encodeAudio(blob){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result).split(',')[1]);
  reader.onerror=()=>reject(Error('Chưa đọc được bản thu.'));
  reader.readAsDataURL(blob);
 });
}
function measureRecording(audio){
 const frameSize=Math.max(1,Math.round(audio.sampleRate*0.02));
 const frameMs=1000*frameSize/audio.sampleRate;
 const levels=new Float32Array(Math.ceil(audio.length/frameSize));
 let hasSound=false;
 for(let channel=0;channel<audio.numberOfChannels;channel++){
  const samples=audio.getChannelData(channel);
  for(let frame=0;frame<levels.length;frame++){
   const start=frame*frameSize,end=Math.min(start+frameSize,samples.length);
   let energy=0;
   for(let sample=start;sample<end;sample++){
    const value=samples[sample];
    if(Math.abs(value)>0.0001)hasSound=true;
    energy+=value*value;
   }
   levels[frame]=Math.max(levels[frame],Math.sqrt(energy/(end-start)));
  }
 }
 const sorted=levels.slice().sort();
 const threshold=Math.max(0.0001,sorted[Math.floor(sorted.length*0.95)]*0.04);
 const active=level=>level>threshold;
 const first=levels.findIndex(active),last=levels.findLastIndex(active);
 let pauseCount=0,maxPauseMs=0,quietFrames=0;
 for(let frame=first+1;first>=0&&frame<=last;frame++){
  if(!active(levels[frame])){
   quietFrames++;
   continue;
  }
  const quietMs=quietFrames*frameMs;
  if(quietMs>=500){
   pauseCount++;
   maxPauseMs=Math.max(maxPauseMs,quietMs);
  }
  quietFrames=0;
 }
 return {silent:!hasSound,durationSec:audio.duration,
  ...(first>=0?{pauseCount,maxPauseMs:Math.round(maxPauseMs)}:{})};
}

async function inspectRecording(blob,measure=false){
 const Context=window.AudioContext||window.webkitAudioContext;
 if(!Context)return null;
 let decoder;
 try{
  decoder=new Context();
  const audio=await decoder.decodeAudioData(await blob.arrayBuffer());
  if(measure&&audio.duration>0&&audio.duration<=900)return measureRecording(audio);
  for(let channel=0;channel<audio.numberOfChannels;channel++){
   if(audio.getChannelData(channel).some(sample=>Math.abs(sample)>0.0001))return {silent:false};
  }
  return {silent:true};
 }catch{
  return null;
 }finally{
  if(decoder)await decoder.close().catch(()=>{});
 }
}
async function isSilent(blob){
 return (await inspectRecording(blob))?.silent===true;
}
const criteria={
 fluency_coherence:'Trôi chảy và mạch lạc',
 lexical_resource:'Từ vựng',
 grammatical_range_accuracy:'Ngữ pháp',
 pronunciation:'Phát âm'
};
el('grade').onclick=async()=>{
 if(!clip||grading||busy())return;
 if(clip.size>audioLimit){
  el('grade-status').textContent='Bản thu vượt 3 MB. Hãy thu một đoạn ngắn hơn.';
  return;
 }
 const request=new AbortController(), selected=clip, entry=attempt;
 const question=[entry.question,...Array.from(el('cues').children,item=>item.textContent)].join(' ');
 grading=request;buttons();clearFeedback();el('result').replaceChildren();
 el('grade').textContent='Chấm bản thu bằng AI';
 el('grade-status').textContent='Đang chấm bản thu…';
 try{
  const recording=await inspectRecording(selected,true);
  if(request.signal.aborted)return;
  if(recording?.silent)throw Error('Bản thu không có âm thanh. Hãy kiểm tra micro hoặc chọn một file khác.');
  const audioBase64=await encodeAudio(selected);
  if(request.signal.aborted)return;
  const value=await speakingRequest({action:'evaluate',audioBase64,mimeType:selected.type,part:entry.part,question,
   durationSec:recording?.durationSec,pauseCount:recording?.pauseCount,maxPauseMs:recording?.maxPauseMs},request.signal);
  if(grading!==request)return;
  renderResult(value);
  entry.result=value;
  await saveAttempt(entry);
 }catch(error){
  if(grading===request){
   el('grade-status').textContent=error.message;
   el('grade').textContent='Thử chấm lại';
  }
 }finally{
  if(grading===request){grading=null;buttons();}
 }
};

const relevanceLabels={on_topic:'Đúng trọng tâm',partially_off_topic:'Trả lời một phần',off_topic:'Lạc đề'};

async function speakingRequest(payload,signal){
 const response=await fetch('/api/ielts-speaking',{
  method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify(payload)
 });
 const result=await response.json().catch(()=>null);
 if(!response.ok||!result)throw Error(result?.error||'Không nhận được kết quả. Bạn có thể thử lại.');
 return result;
}

function clearFeedback(){
 feedbackSession?.controller.abort();
 feedbackSession=null;
 el('coach').hidden=true;
 el('chat-history').replaceChildren();
 el('chat-message').value='';
 el('chat-status').textContent='';
 el('chat-send').disabled=false;
}

function correctionCard(correction,signal){
 const card=node('article','');
 card.append(node('h4',correction.spoken||'Câu cần luyện'),node('p',correction.explanation_vi||correction.issue||''),
  node('p','Câu gợi ý: '+correction.upgrade));
 const toggle=node('button','Nói lại câu này');toggle.type='button';
 const controls=node('div','');controls.hidden=true;
 const status=node('p','');status.setAttribute('role','status');
 const input=node('input','');input.type='file';input.accept='.wav,.mp3,.webm';input.setAttribute('aria-label','Chọn audio luyện lại');
 const record=node('button','Thu âm câu này');record.type='button';record.disabled=!canRecord;
 const stop=node('button','Dừng và chấm');stop.type='button';stop.disabled=true;
 let capture=null;
 async function submitAudio(audio){
  async function asPcmWav(source){
   const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
   if(!Offline)return source;
   try{
    const decoder=new Offline(1,1,16000);
    const decoded=await decoder.decodeAudioData(await source.arrayBuffer());
    if(!decoded.length||decoded.duration>30)return source;
    const samples=decoded.getChannelData(0);
    const buffer=new ArrayBuffer(44+2*samples.length), view=new DataView(buffer);
    function write(offset,value){for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));}
    write(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);write(8,'WAVE');write(12,'fmt ');
    view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
    view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
    write(36,'data');view.setUint32(40,samples.length*2,true);
    for(let i=0;i<samples.length;i++)view.setInt16(44+2*i,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);
    return new Blob([buffer],{type:'audio/wav'});
   }catch{return source;}
  }
  input.disabled=true;record.disabled=true;
  status.textContent='Đang chấm câu luyện lại…';
  try{
   if(!audio.size||audio.size>audioLimit)throw Error('Chọn bản thu có dữ liệu và không vượt 3 MB.');
   if(await isSilent(audio))throw Error('Bản thu không có âm thanh.');
   const preparedAudio=await asPcmWav(audio);
   const audioBase64=await encodeAudio(preparedAudio);
   if(signal.aborted)return;
   const verdict=await speakingRequest({action:'retry_drill',audioBase64,mimeType:preparedAudio.type,
    originalSpoken:correction.spoken,issue:correction.issue,targetUpgrade:correction.upgrade},signal);
   status.textContent=(verdict.passed?'Đạt':'Chưa đạt')+' · '+verdict.score_10+'/10. '+verdict.feedback_vi;
   if(verdict.heard)status.append(node('span',' Nghe được: '+verdict.heard));
   if(verdict.next_tip_vi)status.append(node('span',' '+verdict.next_tip_vi));
   const pronunciation=verdict.pronunciation_assessment;
   if(Number.isFinite(pronunciation?.accuracy)){
    status.append(node('p','Độ chính xác phát âm (Azure): '+pronunciation.accuracy+'/100.'));
    const missed=(pronunciation.words||[]).filter(word=>word.accuracy<75).slice(0,5);
    if(missed.length)status.append(node('p','Từ cần luyện: '+missed.map(word=>word.word+' ('+word.accuracy+'/100)').join(', ')));
   }
  }catch(error){if(!signal.aborted)status.textContent=error.message;}
  finally{input.disabled=false;record.disabled=!canRecord;}
 }
 input.onchange=()=>{
  const file=input.files[0];input.value='';
  if(!file)return;
  const format=fileTypes[file.name.split('.').pop().toLowerCase()];
  if(!format){status.textContent='Chọn file WAV, MP3 hoặc WebM.';return;}
  submitAudio(file.slice(0,file.size,format));
 };
 record.onclick=async()=>{
  let stream;
  input.disabled=true;record.disabled=true;
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:true});
   const release=()=>stream.getTracks().forEach(track=>track.stop());
   if(signal.aborted){release();return;}
   const chunks=[];
   capture=new MediaRecorder(stream);
   const abort=()=>{if(capture?.state==='recording')capture.stop();release();};
   signal.addEventListener('abort',abort,{once:true});
   capture.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
   capture.onstop=()=>{
    const type=capture.mimeType||chunks[0]?.type;
    release();signal.removeEventListener('abort',abort);capture=null;stop.disabled=true;
    if(!signal.aborted)submitAudio(new Blob(chunks,{type}));
   };
   capture.start();stop.disabled=false;status.textContent='Đang thu câu luyện lại…';
  }catch{
   stream?.getTracks().forEach(track=>track.stop());
   if(!signal.aborted){status.textContent='Chưa mở được mic. Bạn có thể chọn file audio.';record.disabled=false;input.disabled=false;}
  }
 };
 stop.onclick=()=>{if(capture?.state==='recording'){stop.disabled=true;capture.stop();}};
 toggle.setAttribute('aria-expanded','false');
 toggle.onclick=()=>{
  controls.hidden=!controls.hidden;
  toggle.setAttribute('aria-expanded',String(!controls.hidden));
 };
 controls.append(record,stop,input,status);
 card.append(toggle,controls);
 return card;
}

el('chat-form').onsubmit=async event=>{
 event.preventDefault();
 const session=feedbackSession, input=el('chat-message'), button=el('chat-send');
 const message=input.value.trim();
 if(!session||!message||button.disabled)return;
 button.disabled=true;el('chat-status').textContent='Giám khảo đang trả lời…';
 try{
  const {reply}=await speakingRequest({action:'chat',message,question:session.question,
   evaluation:session.evaluation,chatHistory:session.history.slice(-8)},session.controller.signal);
  if(feedbackSession!==session)return;
  session.history.push({role:'user',text:message},{role:'assistant',text:reply});
  const replyNode=node('p','Giám khảo: '+reply);replyNode.style.whiteSpace='pre-wrap';
  el('chat-history').append(node('p','Bạn: '+message),replyNode);
  if(input.value.trim()===message)input.value='';
  el('chat-status').textContent='';
 }catch(error){
  if(feedbackSession===session)el('chat-status').textContent=error.message;
 }finally{
  if(feedbackSession===session)button.disabled=false;
 }
};

function renderEvidence(id,evidence,signal){
 const paragraph=node('p','Dẫn chứng: '+evidence);
 if(id!=='fluency_coherence'&&id!=='pronunciation')return paragraph;
 const timestamp=evidence.match(/^\s*(\d{1,2}):([0-5]\d)\s*[·–—-]\s*(\S.*)$/u);
 if(!timestamp)return paragraph;
 const seconds=Number(timestamp[1])*60+Number(timestamp[2]);
 const audio=el('audio');
 const button=node('button','Nghe lại từ '+timestamp[1]+':'+timestamp[2]);
 button.type='button';
 function canSeek(){
  if(audio.error)return false;
  if(Number.isFinite(audio.duration))return seconds<audio.duration;
  for(let i=0;i<audio.seekable.length;i++){
   if(audio.seekable.start(i)<=seconds&&seconds<audio.seekable.end(i))return true;
  }
  return false;
 }
 const update=()=>{
  paragraph.textContent='Dẫn chứng: '+timestamp[3];
  if(canSeek())paragraph.append(' ',button);
 };
 button.addEventListener('click',async()=>{
  if(signal.aborted||!canSeek())return;
  try{
   audio.currentTime=seconds;
   await audio.play();
  }catch{
   if(!signal.aborted)el('grade-status').textContent='Chưa phát được đoạn này. Bạn có thể mở trình phát để nghe lại.';
  }
 },{signal});
 for(const event of ['loadedmetadata','durationchange','progress','error']){
  audio.addEventListener(event,update,{signal});
 }
 update();
 return paragraph;
}

function renderResult(value){
 clearFeedback();
 const question=[attempt.question,...Array.from(el('cues').children,item=>item.textContent)].join(' ');
 feedbackSession={question,evaluation:value,history:[],controller:new AbortController()};
 el('coach').hidden=false;
 const heading=Number.isFinite(value.overall_band)?'Band ước tính · '+value.overall_band.toFixed(1):'Nhận xét cho câu này';
 const result=[node('h3',heading)];
 if(value.assessment_note)result.push(node('p',value.assessment_note));
 if(value.relevance==='off_topic'&&Number.isFinite(value.overall_band)){
  result.push(node('p','Quy tắc luyện tập KhangFlash: bài lạc đề có band tối đa 4.5.'));
 }
 if(relevanceLabels[value.relevance]){
  result.push(node('p',relevanceLabels[value.relevance]+(value.relevance_reason?' · '+value.relevance_reason:'')));
 }
 if(value.relevance_evidence)result.push(node('p','Đoạn lệch trọng tâm: “'+value.relevance_evidence+'”'));
 for(const [id,label] of Object.entries(criteria)){
  const score=value.scores[id];
  const band=Number.isFinite(score.band)?score.band:'Chưa đủ căn cứ';
  result.push(node('h4',label+' · '+band),node('p',score.feedback));
  if(typeof score.evidence==='string'&&score.evidence)result.push(renderEvidence(id,score.evidence,feedbackSession.controller.signal));
 }
 result.push(node('h4','Bản chép lời'),node('p',value.transcript));
 if(typeof value.paraphrase==='string'&&value.paraphrase){
  const paraphrase=node('p',value.paraphrase);paraphrase.lang='en';
  result.push(node('h4','Nói lại cho tự nhiên'),paraphrase);
  if(value.paraphrase_note_vi)result.push(node('p',value.paraphrase_note_vi));
 }
 if(value.examiner_followup){
  const followup=node('p',value.examiner_followup);followup.lang='en';
  result.push(node('h4','Câu hỏi luyện tiếp'),followup);
 }
 if(value.model_answer)result.push(node('h4','Câu trả lời gợi ý'),node('p',value.model_answer));
 const corrections=Array.isArray(value.corrections)?value.corrections.filter(item=>item?.upgrade):[];
 if(corrections.length){
  result.push(node('h3','Sửa lỗi và luyện lại'),...corrections.map(item=>correctionCard(item,feedbackSession.controller.signal)));
 }
 el('result').replaceChildren(...result);el('grade-status').textContent='Đã chấm xong.';
}
