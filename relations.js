'use strict';
window.KRelations=(()=>{
 let bank={},current=null,loadError=false,loaded=false;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const unique=a=>[...new Map(a.filter(x=>typeof x==='string'&&x.trim()).map(x=>[x.trim().toLowerCase(),x.trim()])).values()];
 function originals(c,type){return unique(c.variants.flatMap(v=>String(v[type]||'').split(/\s*[·;\n]\s*/))).filter(w=>w.toLowerCase()!==c.term.toLowerCase());}
 function dialog(){let d=document.getElementById('relations-dialog');if(!d){d=document.createElement('dialog');d.id='relations-dialog';d.className='td-modal';document.body.appendChild(d);}return d;}
 function draw(){
  if(!current)return;
  const {card,type}=current,own=originals(card,type),record=bank[card.term.toLowerCase()];
  // A source-file relation is not evidence of a correct lexical relationship.
  // Only the audited allowlist may enter the visible list, including on first load.
  const list=record?.method==='verified'?unique(record[type]||[]).filter(x=>x.toLowerCase()!==card.term.toLowerCase()).slice(0,5):[];
  const name=type==='synonyms'?'Đồng / gần nghĩa':'Trái nghĩa';
  const state=record?.lookup?.[type]?.status;
  let status='';
  if(loadError)status='Không tải được dữ liệu đã kiểm tra. Hãy tải lại trang.';
  else if(!loaded)status='Đang tải dữ liệu đã kiểm tra…';
  else if(record?.method==='review-pending')status='Chưa xác minh được từ / cụm phù hợp với nghĩa của thẻ này; không thêm mục suy đoán.';
  else if(record?.method==='grammar')status='Đây là cấu trúc / bài tập ngữ pháp; không áp dụng danh sách đồng nghĩa và trái nghĩa.';
  else if(!list.length&&state==='unavailable')status=`Chưa xác minh được ${type==='synonyms'?'đồng nghĩa':'trái nghĩa'} phù hợp: không đọc được kết quả từ nguồn đối chiếu.`;
  else if(!list.length)status=`Không tìm thấy ${type==='synonyms'?'từ / cụm đồng nghĩa':'từ / cụm trái nghĩa'} phù hợp với nghĩa của thẻ trong kết quả đã đối chiếu.`;
  else if(list.length<5)status='Chỉ hiển thị các mục đã kiểm tra phù hợp với nghĩa của thẻ; không thêm mục để đủ 5.';
  dialog().setAttribute('aria-labelledby','relations-title');
  dialog().innerHTML=`<header class="rel-header"><div><span class="rel-eyebrow">${type==='synonyms'?'SYNONYM':'ANTONYM'}</span><h2 id="relations-title">${name}</h2></div><button class="rel-close" data-rel-close aria-label="Đóng">×</button></header><section class="rel-term"><strong>${esc(card.term)}</strong><p>${esc(card.definition)}</p></section><div class="rel-list-heading"><span>${type==='synonyms'?'Cách diễn đạt gần nghĩa':'Trái nghĩa'}</span><span role="status">${list.length}/5</span></div><ol class="rel-list">${list.map((w,i)=>`<li><span class="rel-number">${i+1}</span><div><strong>${esc(w)}</strong>${own.some(y=>y.toLowerCase()===w.toLowerCase())?'<small>File gốc</small>':''}</div></li>`).join('')}</ol>${status?`<p class="rel-status">${esc(status)}</p>`:''}<aside class="rel-note"><strong>Lưu ý cách dùng</strong><p>${esc(record?.notes?.[type]||record?.note||'Chỉ dùng các mục đã xác minh theo đúng nghĩa của thẻ.')}</p></aside><footer class="rel-footer"><div>${(record?.sources||[]).filter(s=>s.kind===type&&/^https:\/\//.test(s.url)).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join('')}</div><button class="rel-done" data-rel-close>Đóng</button></footer>`;
 }
 const ready=fetch('relations-data.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('load');return r.json();}).then(data=>{if(data.version!==3)throw Error('outdated');bank=data.entries||{};loaded=true;draw();}).catch(()=>{loadError=true;draw();});
 function show(card,type){current={card,type};draw();dialog().showModal();}
 document.addEventListener('click',e=>{if(e.target.closest('[data-rel-close]')){dialog().close();current=null;}});
 return{show,originals,ready};
})();
