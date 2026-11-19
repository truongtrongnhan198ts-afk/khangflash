// Work only with the server-sanitized test DOM. Keep shared instructions, options,
// tables and diagrams: an isolated blank is not a meaningful IELTS question.
export function questionContext(reader,number){
 const groups=[...reader.querySelectorAll('[data-rl-from]')].filter(x=>!x.querySelector('[data-rl-from]'));
 const start=groups.find(x=>+x.dataset.rlFrom<=number&&+x.dataset.rlTo>=number)||groups.filter(x=>+x.dataset.rlFrom<=number).at(-1);
 if(!start)return null;
 const clone=reader.cloneNode(true),all=[...clone.querySelectorAll('[data-rl-from]')].filter(x=>!x.querySelector('[data-rl-from]'));
 const a=all[groups.indexOf(start)],next=all[groups.indexOf(start)+1];
 clone.querySelectorAll('.rl-source-selected').forEach(x=>x.classList.remove('rl-source-selected'));
 clone.querySelectorAll('mark.rl-evidence').forEach(x=>x.replaceWith(x.textContent));
 // Trim at every ancestor so table/list wrappers remain structurally valid.
 if(next){for(let n=next;n&&n!==clone;n=n.parentNode)while(n.nextSibling)n.nextSibling.remove();next.remove();}
 for(let n=a;n&&n!==clone;n=n.parentNode)while(n.previousSibling)n.previousSibling.remove();
 // The next reading passage can precede its first question header.
 const headings=[...clone.querySelectorAll('h1,h2,h3,h4,h5,p')];
 const last=+(start.dataset.rlTo||number),numberPattern=new RegExp('(?:^|\\s|\\()'+last+'[.)](?!\\d)\\s*');
 const passage=headings.find((x,index)=>{const text=x.textContent.trim();if(/^READING PASSAGE\s*\d/i.test(text))return true;if(text.length<3||text.length>180||/^(?:Questions?|List of|Options|Words|Names|Choose|Answer)/i.test(text))return false;const bold=x.querySelector('strong,b');if(!bold||!(bold.textContent.trim()===text||(bold.textContent.trim().length>=3&&text.startsWith(bold.textContent.trim()))))return false;const questionBefore=headings.slice(0,index).some(p=>numberPattern.test(p.textContent));const proseAfter=headings.slice(index+1,index+4).some(p=>p.textContent.length>250&&!p.hasAttribute('data-rl-from'));return questionBefore&&proseAfter;});
 if(passage){for(let n=passage;n&&n!==clone;n=n.parentNode)while(n.nextSibling)n.nextSibling.remove();passage.remove();}
 return{html:clone.innerHTML,from:+start.dataset.rlFrom,to:Math.max(+start.dataset.rlTo,number)};
}

// One native source view per active Listening part; keep every shared option,
// map and table in that part, and stop before the next part's first question.
export function listeningPartHtml(reader,part){
 const from=(part-1)*10+1,to=part*10,clone=reader.cloneNode(true),groups=[...clone.querySelectorAll('[data-rl-from]')].filter(x=>!x.querySelector('[data-rl-from]'));
 const start=groups.find(x=>+x.dataset.rlFrom===from)||groups.find(x=>+x.dataset.rlFrom<=from&&+x.dataset.rlTo>=from),next=groups.find(x=>+x.dataset.rlFrom>to);
 if(!start)return '<p class="rl-error">Chưa xác định được ranh giới câu hỏi của Part '+part+'. Mở đề nguồn để đối chiếu.</p>';
 if(next){for(let n=next;n&&n!==clone;n=n.parentNode)while(n.nextSibling)n.nextSibling.remove();next.remove();}
 for(let n=start;n&&n!==clone;n=n.parentNode)while(n.previousSibling)n.previousSibling.remove();
 return clone.innerHTML;
}

// A Reading desk shows its passage, while the original questions are rendered
// independently in the answer pane. Review keeps the complete source document.
export function readingPassageHtml(reader,part){
 const from=part===1?1:part===2?14:27,clone=reader.cloneNode(true),groups=[...clone.querySelectorAll('[data-rl-from]')].filter(x=>!x.querySelector('[data-rl-from]'));
 const end=groups.find(x=>+x.dataset.rlFrom===from)||groups.find(x=>+x.dataset.rlFrom<=from&&+x.dataset.rlTo>=from);if(!end)return{html:reader.innerHTML,isolated:false};
 let start=null;
 if(part>1){const blocks=[...clone.querySelectorAll('p,h1,h2,h3,h4,h5,h6,td')],endAt=blocks.findIndex(x=>x===end||x.contains(end)),last=from-1,rx=new RegExp('(?:^|\\s|\\()'+last+'[.)](?!\\d)\\s*');let lastQuestion=-1;for(let i=0;i<endAt;i++)if(rx.test(blocks[i].textContent))lastQuestion=i;
  start=blocks.slice(Math.max(0,lastQuestion+1),endAt).find((x,i,remaining)=>{const text=x.textContent.trim(),bold=x.querySelector('strong,b');return text.length>2&&text.length<180&&!/^(?:Questions?|List of|Options|Choose|Answer|Names|Words)/i.test(text)&&(x.tagName.startsWith('H')||(bold&&(bold.textContent.trim()===text||(bold.textContent.trim().length>=3&&text.startsWith(bold.textContent.trim())))))&&remaining.slice(i+1,i+5).some(p=>p.textContent.length>250&&!p.hasAttribute('data-rl-from'));});
  if(!start)return{html:reader.innerHTML,isolated:false};
 }
 for(let n=end;n&&n!==clone;n=n.parentNode)while(n.nextSibling)n.nextSibling.remove();end.remove();
 if(start)for(let n=start;n&&n!==clone;n=n.parentNode)while(n.previousSibling)n.previousSibling.remove();
 return{html:clone.innerHTML,isolated:true};
}
