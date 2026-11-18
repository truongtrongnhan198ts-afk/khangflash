'use strict';
// Snapshot IDs from today's actual review queue; never sample unrelated words.
window.KDailyWriting=(()=>{
 const contexts={education:'một cuộc trao đổi về cách cải thiện việc học',environment:'một cuộc thảo luận về bảo vệ môi trường',technology:'một cuộc thảo luận về tác động của công nghệ',health:'một cuộc trao đổi về sức khỏe và dịch vụ y tế',work:'một cuộc trao đổi về công việc',employment:'một cuộc trao đổi về việc làm',society:'một cuộc thảo luận về đời sống cộng đồng',crime:'một cuộc thảo luận về phòng chống tội phạm',transport:'một cuộc trao đổi về giao thông',travel:'một cuộc trao đổi về du lịch',family:'một cuộc trao đổi về đời sống gia đình',economy:'một cuộc thảo luận về kinh tế'};
 Object.assign(contexts,{cities:'một cuộc trao đổi về đời sống đô thị',government:'một cuộc thảo luận về chính sách công',media:'một cuộc trao đổi về truyền thông và quảng cáo',culture:'một cuộc trao đổi về văn hóa',globalisation:'một cuộc thảo luận về thương mại quốc tế',science:'một cuộc trao đổi về nghiên cứu khoa học',food:'một cuộc trao đổi về thực phẩm',tourism:'một cuộc trao đổi về du lịch',housing:'một cuộc trao đổi về nhà ở',energy:'một cuộc thảo luận về năng lượng',equality:'một cuộc trao đổi về cơ hội bình đẳng',finance:'một cuộc trao đổi về quản lý tiền bạc',arts:'một cuộc trao đổi về nghệ thuật',sport:'một cuộc trao đổi về thể thao'});
 const valid=id=>typeof id==='string'&&/^[a-f0-9]{14}$/.test(id);
 function remember(cards,state){
  const allowed=new Set(cards.filter(c=>c.studyKind!=='grammar').map(c=>c.id)),due=new Set(state.cards.filter(p=>p.due<=state.today&&allowed.has(p.card_id)).map(p=>p.card_id));
  if(!state.accountKey||state.guest)return cards.filter(c=>due.has(c.id));
  const key='tidian-daily-writing:'+state.accountKey+':'+state.today;
  try{const stored=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(stored))for(const id of stored)if(valid(id))due.add(id);localStorage.setItem(key,JSON.stringify([...due]));}catch{}
  return cards.filter(c=>c.studyKind!=='grammar'&&due.has(c.id));
 }
 function launch(cards,source='all',back='due.html',practice='group'){
  const state=KStore.get(),words=cards.filter(c=>c.studyKind!=='grammar');if(!words.length)return;
  const token=KReviewSession.create(words,{source,back,practice:'daily-writing',date:state.today,accountKey:state.accountKey||''});
  location.href='flashcard.html?'+new URLSearchParams({topic:'all',source,reviewSession:token,mode:'sentence',dailyWriting:'1',...(practice==='feynman'?{practice:'feynman'}:{})})+'#study';
 }
 function situation(c,v,day=''){
  const context=(c.topics||[]).map(t=>contexts[t]).find(Boolean);
  const tasks=['nêu một nhận định cụ thể, kèm một lý do ngắn','mô tả một tình huống cụ thể mà bạn từng gặp hoặc có thể hình dung','đưa ra một ví dụ để giải thích ý của bạn cho người chưa biết chủ đề này','nêu một nhận xét về một thay đổi hoặc sự khác biệt bạn quan sát được'];
  const turn=((Math.floor(Date.parse(day+'T00:00:00Z')/86400000)||0)+parseInt(c.id.slice(-2),16))%tasks.length;
  // Open-ended but bounded to the selected sense. Do not copy an English model answer.
  return `Bạn đang ${context?'tham gia '+context:'giải thích một tình huống thực tế cho người khác'}. Viết một câu tiếng Anh ${tasks[turn]} phù hợp với nghĩa “${String(v.definition||'').trim().slice(0,450)}”. Dùng “${c.term}” hoặc dạng biến đổi ngữ pháp phù hợp; thêm một chi tiết để người đọc hiểu bạn đang nói về điều gì.`;
 }
 const key=c=>'checkpoint:daily-writing:'+KStore.get().today+':'+c.id;
 const timers=new Map();
 function restore(c){const value=window.KPractice?.get?.(key(c));const q=value?.version==='daily-writing-1'&&value.questions?.[0];return q?.cardId===c.id?q:null;}
 function stage(c,s){
  if(KStore.get().guest||!window.KPractice?.stage)return;
  const k=key(c),q={cardId:c.id,situation:s.situation,draft:s.draft,result:s.result,attemptId:s.attemptId||null,attemptOccurredAt:s.attemptOccurredAt||null,saved:!!s.saved};
  const value={version:'daily-writing-1',questions:[q],results:[],step:0};
  KPractice.stage(k,value).catch(()=>{});clearTimeout(timers.get(k));
  timers.set(k,setTimeout(()=>{timers.delete(k);KPractice.value(k,value).catch(()=>{});},900));
 }
 function groupMode(){return new URLSearchParams(location.search).get('practice')==='feynman'?'feynman':typeof dailyWritingSession!=='undefined'&&dailyWritingSession?'group':'single';}
 function dueCards(){if(typeof dailyWritingSession!=='undefined'&&dailyWritingSession)return sessionCards.filter(c=>c.studyKind!=='grammar');const state=KStore.get(),due=new Set(state.cards.filter(c=>c.due<=state.today).map(c=>c.card_id));return typeof sessionCards==='undefined'?[]:sessionCards.filter(c=>c.studyKind!=='grammar'&&due.has(c.id));}
 function practiceSelector(group=false,disabled=false){return `<label class="fg-input-label" for="fg-practice-mode">Chế độ luyện tập</label><select id="fg-practice-mode" style="width:100%;padding:10px 12px;border:1px solid #949aa1;border-radius:10px;background:#fff;color:#1b1d22;font:inherit" ${disabled?'disabled':''}><option value="single" ${!group?'selected':''}>Đặt câu với một thẻ</option><option value="group" ${group?'selected':''} ${!group&&!dueCards().length?'disabled':''}>Dịch câu với nhóm từ cần ôn</option><option value="feynman">Hiểu &amp; Vận dụng · Feynman + SRS</option></select>`;}
 document.addEventListener('change',e=>{if(e.target.id!=='fg-practice-mode'||window.KFlashGames?.busy()||window.KDailyWritingGroups?.busy())return;if(window.KFeynmanDaily?.busy())return;if(e.target.value==='feynman'){const words=dueCards();if(words.length)launch(words,typeof source==='string'?source:'all',location.pathname+location.search,'feynman');else{e.target.value=groupMode();window.alert('Mở ôn tập hôm nay để luyện với các từ đến hạn.');}}else if(e.target.value==='group'){const words=dueCards();if(words.length)launch(words,typeof source==='string'?source:'all',location.pathname+location.search);}else if(e.target.value==='single'){const q=new URLSearchParams(location.search);q.delete('dailyWriting');q.delete('practice');q.set('mode','sentence');location.href='flashcard.html?'+q+'#study';}});
 return{remember,launch,situation,restore,stage,dueCards,practiceSelector};
})();
