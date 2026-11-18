'use strict';
window.GrammarPractice=(()=>{
 const sceneSeen=new Set();
 function round(pool,state=KPractice.getState()){
  const seen=new Map(state.questions.map(q=>[q.qid,q]));const contexts=new Map();for(const q of state.questions)if(q.context_id){const old=contexts.get(q.context_id)||{count:0,date:''};old.count+=q.seen;if(q.last_seen>old.date)old.date=q.last_seen;contexts.set(q.context_id,old);}
  const score=q=>{const p=seen.get(q.practiceId),c=contexts.get(q.contextId);return (p?.seen||0)*100+(c?.count||0)*10+(sceneSeen.has(q.contextId)?10000:0)+(c?.date&&Date.now()-Date.parse(c.date)<7*86400000?1000:0)+Math.random();};
  const ordered=pool.map(q=>({q,score:score(q)})).sort((a,b)=>a.score-b.score).map(x=>x.q);
  const slots=[q=>q.practiceKind==='theory-contrast',q=>q.type==='repair',q=>q.type==='order',q=>(q.type==='mcq'||q.type==='exact')&&!q.practiceKind,q=>q.practiceKind!=='theory-contrast'];
  let answer=null,visits=0;
  function find(index,chosen,used){if(++visits>20000)return false;if(index===5){answer=chosen;return true;}for(const q of ordered){if(!slots[index](q)||used.has(q.contextId)||chosen.some(x=>x.practiceId===q.practiceId))continue;if(find(index+1,[...chosen,q],new Set([...used,q.contextId])))return true;}return false;}
  find(0,[],new Set());if(!answer)throw Error('Chưa có đủ ngữ cảnh khác nhau cho bài này.');for(const q of answer)sceneSeen.add(q.contextId);return answer.sort(()=>Math.random()-.5).map(q=>({...q,options:q.options?[...q.options].sort(()=>Math.random()-.5):undefined}));
 }
 return{round};
})();
