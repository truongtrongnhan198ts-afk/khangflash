import{questionContext}from'./question-context.mjs?v=328';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const flag=(q,flags)=>`<button type="button" data-flag="${q.number}" class="flag ${flags.includes(q.number)?'active':''}" aria-label="Đánh dấu câu ${q.number}" aria-pressed="${flags.includes(q.number)}">⚑</button>`;
function sourceText(container){
 let text='';
 const block=new Set(['P','DIV','LI','UL','OL','TABLE','TR','TD','TH','H1','H2','H3','H4','H5','H6','BLOCKQUOTE']);
 function walk(n){
  if(n.nodeType===3){text+=n.textContent;return;}
  if(n.nodeType!==1)return;
  if(n.tagName==='BR'){text+='\n';return;}
  const line=block.has(n.tagName);
  if(line&&text&&!text.endsWith('\n'))text+='\n';
  for(const c of n.childNodes)walk(c);
  if(line&&!text.endsWith('\n'))text+='\n';
 }
 walk(container);
 return text.replace(/\u00a0/g,' ').replace(/[ \t]+\n/g,'\n').trim();
}
function entry(q,answers,flags,short=false){return`<span class="rl-inline-answer ${short?'rl-short-answer':''}" id="rl-q-${q.number}"><label for="rl-a-${q.number}">${q.number}</label><input id="rl-a-${q.number}" data-answer="${q.number}" aria-label="Đáp án câu ${q.number}" maxlength="80" autocomplete="off" spellcheck="false" value="${esc(answers[q.number]||'')}" ${q.maxWords?`title="Tối đa ${q.maxWords} từ${q.allowNumber?' và/hoặc một số':''}"`:''}>${flag(q,flags)}</span>`;}
function options(q,stem,choices,answers,flags){const actual=String(answers[q.number]||'').toUpperCase();return`<section id="rl-q-${q.number}" class="rl-exercise-question"><div class="rl-exercise-stem"><b class="rl-question-number">${q.number}</b><p>${esc(stem)}</p>${flag(q,flags)}</div><fieldset class="rl-choice-list"><legend class="rl-sr-only">Câu ${q.number}</legend>${choices.map(([letter,text],i)=>`<label><input type="radio" id="rl-a-${q.number}${i?'-'+letter.replace(/\s/g,''):''}" name="rl-answer-${q.number}" data-answer="${q.number}" value="${esc(letter)}" ${actual===letter.toUpperCase()?'checked':''}><span>${esc(letter)}${text?' · '+esc(text):''}</span></label>`).join('')}</fieldset></section>`;}
// Keep statements and their shared instructions together. Only parse choices
// actually printed in the source; never infer options from a scoring key.
function choiceGroup(container,qs,answers,flags){
 if(!qs.length||!qs.every(q=>['tfng','ynng','choice'].includes(q.type)))return null;
 const text=sourceText(container),matches=[...text.matchAll(/(?:^|\n)\s*\(?([1-9]|[1-3]\d|40)[.)]\s*/g)],byNumber=new Map(matches.map((m,i)=>[+m[1],{stem:text.slice(m.index+m[0].length,matches[i+1]?.index??text.length).trim(),index:m.index}]));
 if(!qs.every(q=>byNumber.has(q.number)))return null;
 const parts=[];for(const q of qs){let stem=byNumber.get(q.number).stem,choices;if(q.type==='tfng')choices=['TRUE','FALSE','NOT GIVEN'].map(x=>[x,'']);else if(q.type==='ynng')choices=['YES','NO','NOT GIVEN'].map(x=>[x,'']);else{const opts=[...stem.matchAll(/(?:^|\n)\s*[☐□]?\s*([A-H])(?:[.)]|\s)\s*([^\n]+)/g)];if(opts.length<2||new Set(opts.map(m=>m[1])).size!==opts.length)return null;choices=opts.map((m,i)=>[m[1],stem.slice(m.index+m[0].lastIndexOf(m[2]),opts[i+1]?.index??stem.length).trim()]);stem=stem.slice(0,opts[0].index).trim();if(!stem)return null;}parts.push(options(q,stem,choices,answers,flags));}
 const first=Math.min(...qs.map(q=>byNumber.get(q.number).index)),prefix=text.slice(0,first).trim();return`<div class="rl-exercise-instructions">${esc(prefix)}</div>${parts.join('')}`;
}
function multiChoiceGroup(container,qs,answers,flags,multiGroups){
 const groups=multiGroups.filter(g=>g.numbers.length>1&&g.numbers.every(n=>qs.some(q=>q.number===n)));if(!groups.length||new Set(groups.flatMap(g=>g.numbers)).size!==qs.length)return null;
 const text=sourceText(container),markers=[...text.matchAll(/Questions?\s*(\d{1,2})\s*(?:and|&|[–—-]|to)\s*(\d{1,2})(?!\d)/gi)];let html='';
 for(const g of groups){const marker=markers.find(m=>+m[1]===g.numbers[0]&&+m[2]===g.numbers.at(-1));if(!marker)return null;const next=markers.find(m=>m.index>marker.index),block=text.slice(marker.index,next?.index??text.length),opts=[...block.matchAll(/(?:^|\n)\s*[☐□]?\s*([A-H])(?:[.)]|\s)\s*([^\n]+)/g)];if(opts.length<g.numbers.length||new Set(opts.map(m=>m[1])).size!==opts.length)return null;
 const selected=new Set(g.numbers.map(n=>String(answers[n]||'').toUpperCase()).filter(Boolean)),numbers=g.numbers.join(',');html+=`<section class="rl-exercise-multi"><div class="rl-exercise-instructions">${esc(block.slice(0,opts[0].index).trim())}</div><div class="rl-multi-slots">${g.numbers.map(n=>{const q=qs.find(q=>q.number===n);return`<span id="rl-q-${n}" class="rl-multi-slot"><b>Câu ${n}</b><input type="hidden" id="rl-a-${n}" data-answer="${n}" value="${esc(answers[n]||'')}">${flag(q,flags)}</span>`;}).join('')}</div><fieldset class="rl-choice-list"><legend class="rl-sr-only">Chọn ${g.numbers.length} đáp án cho câu ${g.numbers.join(' và ')}</legend>${opts.map((m,i)=>`<label><input type="checkbox" data-multi-answer="${numbers}" data-choice="${m[1]}" value="${m[1]}" ${selected.has(m[1])?'checked':''}><span>${esc(m[1])} · ${esc(block.slice(m.index+m[0].lastIndexOf(m[2]),opts[i+1]?.index??block.length).trim())}</span></label>`).join('')}</fieldset></section>`;
 }
 return html;
}

function textQuestionGroup(container,qs,answers,flags){
 if(container.querySelector('table,img')||qs.some(q=>['tfng','ynng'].includes(q.type)))return null;
 const text=sourceText(container),matches=[...text.matchAll(/(?:^|\n)\s*\(?([1-9]|[1-3]\d|40)(?:[.)]|\s+)\s*/g)],byNumber=new Map(matches.map((m,i)=>[+m[1],{stem:text.slice(m.index+m[0].length,matches[i+1]?.index??text.length).trim(),index:m.index}]));
 if(!qs.every(q=>byNumber.has(q.number)&&byNumber.get(q.number).stem&&!/^[.…_]/.test(byNumber.get(q.number).stem)))return null;
 const first=Math.min(...qs.map(q=>byNumber.get(q.number).index));return`<div class="rl-exercise-instructions">${esc(text.slice(0,first).trim())}</div>${qs.map(q=>`<section id="rl-q-${q.number}" class="rl-exercise-question"><div class="rl-exercise-stem"><b class="rl-question-number">${q.number}</b><p class="rl-full-stem">${esc(byNumber.get(q.number).stem)}</p>${flag(q,flags)}</div><div class="rl-text-response"><label class="rl-sr-only" for="rl-a-${q.number}">Đáp án câu ${q.number}</label><input id="rl-a-${q.number}" data-answer="${q.number}" aria-label="Đáp án câu ${q.number}" value="${esc(answers[q.number]||'')}" maxlength="80" autocomplete="off" spellcheck="false">${q.maxWords?`<small>Tối đa ${q.maxWords} từ${q.allowNumber?' và/hoặc một số':''}</small>`:''}</div></section>`).join('')}`;
}

function inlineGroup(container,qs,answers,flags){
 const map=new Map(qs.map(q=>[q.number,q])),seen=new Set(),doc=container.ownerDocument,nodes=[];
 function visit(n){if(n.nodeType===3){nodes.push(n);return;}for(const c of n.childNodes||[])visit(c);}visit(container);
 const short=/write\s+(?:the\s+)?correct\s+(?:letter|roman)|which paragraph|choose.*letters/i.test(container.textContent);
 for(const n of nodes){const header=n.parentElement?.closest('[data-rl-from]');if(header&&!header.querySelector('[data-rl-from]'))continue;
  const text=n.textContent,rx=/(^|[\s(])([1-9]|[1-3]\d|40)([.)]?)(?=\s|[.…_]|$)/g,out=[];let cursor=0,m;
  while(m=rx.exec(text)){if(!m[3]&&m.index+m[1].length>0&&!/[\r\n]$/.test(m[1])&&n.parentElement.textContent.trim()!==m[2])continue;const number=+m[2],q=map.get(number);if(!q||seen.has(number))continue;const at=m.index+(m[1]==='('?0:m[1].length),end=m.index+m[0].length,tail=text.slice(end),blank=tail.match(/^\s*[.…_]+\s*/);out.push(doc.createTextNode(text.slice(cursor,at)));const holder=doc.createElement('span');holder.innerHTML=entry(q,answers,flags,short);out.push(holder.firstElementChild);cursor=end+(blank?.[0].length||0);rx.lastIndex=cursor;seen.add(number);}
  if(out.length){out.push(doc.createTextNode(text.slice(cursor)));n.replaceWith(...out);}
 }
 if(seen.size===qs.length)container.querySelectorAll('.rl-source-blank').forEach(x=>x.remove());
 const missing=qs.filter(q=>!seen.has(q.number));if(missing.length){const tail=doc.createElement('div');tail.className='rl-source-answer-fallback';tail.innerHTML='<p>Điền vào các câu trong đề ngay phía trên:</p>'+missing.map(q=>entry(q,answers,flags,short)).join('');container.append(tail);}
 return container.innerHTML;
}
export function exerciseHtml(reader,questions,answers={},flags=[],multiGroups=[]){
 const groups=new Map(),headers=[...reader.querySelectorAll('[data-rl-from]')].filter(x=>!x.querySelector('[data-rl-from]'));for(const q of questions){const header=headers.find(x=>+x.dataset.rlFrom<=q.number&&+x.dataset.rlTo>=q.number)||headers.filter(x=>+x.dataset.rlFrom<=q.number).at(-1);if(!header)return null;const key=headers.indexOf(header);if(!groups.has(key)){const context=questionContext(reader,q.number);if(!context)return null;groups.set(key,{context,qs:[]});}groups.get(key).qs.push(q);}
 return[...groups.values()].map(({context,qs})=>{const container=reader.ownerDocument.createElement('div');container.innerHTML=context.html;const instruction=container.textContent,typed=qs.map(q=>({...q,type:/\bTRUE\b[\s\S]*\bFALSE\b[\s\S]*\bNOT GIVEN\b/i.test(instruction)?'tfng':/\bYES\b[\s\S]*\bNO\b[\s\S]*\bNOT GIVEN\b/i.test(instruction)?'ynng':/choose\s+(?:the\s+)?correct\s+letter/i.test(instruction)?'choice':q.type}));container.querySelectorAll('.rl-source-selected').forEach(x=>x.classList.remove('rl-source-selected'));return`<section class="rl-exercise-group" aria-label="Câu ${qs[0].number} đến ${qs.at(-1).number}">${multiChoiceGroup(container,typed,answers,flags,multiGroups)??choiceGroup(container,typed,answers,flags)??textQuestionGroup(container,typed,answers,flags)??inlineGroup(container,qs,answers,flags)}</section>`;}).join('');
}
