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
let clip=null, grading=null;
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
 el('stop').disabled=recorder?.state!=='recording';
 el('prev').disabled=busy()||index===0;
 el('next').disabled=busy()||deck[0]===2||index===deck.length-3;
 el('grade').disabled=busy()||!clip||!!grading;
}
function clearClip(){
 grading?.abort();grading=null;clip=null;
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
    clearClip();
    const type=capture.mimeType||parts[0].type;
    clip=new Blob(parts,{type});
    recordingUrl=URL.createObjectURL(clip);
    el('audio').src=recordingUrl;el('audio').hidden=false;
    el('download').href=recordingUrl;el('download').download='khangflash-speaking.'+(type.includes('mp4')?'m4a':type.includes('ogg')?'ogg':'webm');el('download').hidden=false;
    el('status').textContent='Đã thu xong. Bạn có thể nghe lại hoặc tải bản thu.';
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
el('stop').onclick=()=>{if(recorder?.state==='recording'){recorder.stop();el('stop').disabled=true;}};
el('timer').onclick=()=>{
 if(timerEnd||el('timer').textContent==='Đặt lại đồng hồ'){resetTimer();return;}
 begin(deck[0]===2?60:45,deck[0]===2?'Chuẩn bị':'Thời gian luyện');
};
el('prev').onclick=()=>{if(index&&!busy()){index--;question();}};
el('next').onclick=()=>{if(deck[0]!==2&&index<deck.length-3&&!busy()){index++;question();}};
el('part').onchange=list;el('search').oninput=list;
window.addEventListener('pagehide',()=>{if(recorder?.state==='recording')recorder.stop();});
list();


function encodeAudio(blob){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result).split(',')[1]);
  reader.onerror=()=>reject(Error('Chưa đọc được bản thu.'));
  reader.readAsDataURL(blob);
 });
}
const criteria={
 fluency_coherence:'Trôi chảy và mạch lạc',
 lexical_resource:'Từ vựng',
 grammatical_range_accuracy:'Ngữ pháp',
 pronunciation:'Phát âm'
};
el('grade').onclick=async()=>{
 if(!clip||grading||busy())return;
 if(clip.size>3*1024*1024){
  el('grade-status').textContent='Bản thu vượt 3 MB. Hãy thu một đoạn ngắn hơn.';
  return;
 }
 const request=new AbortController(), selected=clip;
 const question=[el('question').textContent,...Array.from(el('cues').children,item=>item.textContent)].join(' ');
 grading=request;buttons();el('result').replaceChildren();
 el('grade-status').textContent='Đang chấm bản thu…';
 try{
  const audioBase64=await encodeAudio(selected);
  if(request.signal.aborted)return;
  const response=await fetch('/api/ielts-speaking',{
   method:'POST',headers:{'Content-Type':'application/json'},signal:request.signal,
   body:JSON.stringify({audioBase64,mimeType:selected.type,part:deck[0],question})
  });
  const value=await response.json().catch(()=>null);
  if(!response.ok||!value)throw Error(value?.error||'Không gọi được API chấm bài (HTTP '+response.status+').');
  if(grading!==request)return;
  const result=[node('h3','Band ước tính · '+Number(value.overall_band).toFixed(1))];
  for(const [id,label] of Object.entries(criteria)){
   const score=value.scores[id];result.push(node('h4',label+' · '+score.band),node('p',score.feedback));
  }
  result.push(node('h4','Bản chép lời'),node('p',value.transcript));
  if(value.model_answer)result.push(node('h4','Câu trả lời gợi ý'),node('p',value.model_answer));
  el('result').replaceChildren(...result);el('grade-status').textContent='Đã chấm xong.';
 }catch(error){
  if(grading===request)el('grade-status').textContent=error.message;
 }finally{
  if(grading===request){grading=null;buttons();}
 }
};
