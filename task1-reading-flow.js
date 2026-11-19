'use strict';
window.Task1ReadingFlow=(()=>{
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rich=s=>esc(s).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
 const unique=xs=>[...new Set(xs.filter(Boolean).map(s=>s.trim()))];
 const paragraphNote=(lesson,p)=>{
  const plan=lesson.outline.find(x=>x.part===p.part);
  const chosen=unique([p.sentences[0]?.selection,p.sentences.at(-1)?.comparison]);
  return unique([...chosen,plan?.avoid]).map(esc).join(' ');
 };
 function languageNotes(lesson){
  const candidates=lesson.paragraphs.slice(1).flatMap(p=>p.sentences);
  const selected=[candidates[0],candidates[Math.floor(candidates.length/2)],candidates.at(-1)].filter(Boolean);
  return selected.map(s=>`<p><strong>${esc(s.vocabulary)}</strong> ${esc(s.grammar)} ${esc(s.transfer)}</p>`).join('');
 }
 function render({root,lesson,header,practice,save}){
  if(!lesson.visual||!lesson.paragraphs?.length)throw Error('Bài học chưa đủ nội dung.');
  if(lesson.id==='t1-line-08')return window.Task1Line08Flow.render({root,lesson,header,practice,save});
  practice=practice.replace('Luyện dịch cả bài','Luyện viết cả bài').replace('Bắt đầu luyện dịch','Bắt đầu luyện viết').replace('Gõ bản dịch tiếng Anh; bấm từ ẩn để mở gợi ý, rồi đối chiếu với mẫu. Cách diễn đạt khác vẫn có thể đúng.','Gõ bài tiếng Anh với biểu đồ bên cạnh; mở bản tiếng Việt hoặc gợi ý khi cần, rồi đối chiếu với mẫu.');
  document.body.classList.add('t1-flow08-page');
  if(root.querySelector('.t1-flow08-article')){root.querySelector('#flow08-practice-content').innerHTML=practice;root.querySelector('#t1-save').innerHTML=save;return;}
  const chart=`<aside class="t1-flow08-chart-panel" data-visual-kind="${esc(lesson.visual.kind)}" aria-label="Đề bài, biểu đồ và dữ liệu"><h2>Đề bài & biểu đồ</h2><p class="t1-deep-prompt" lang="en">${esc(lesson.prompt)}</p><figure class="t1-deep-figure"><h3>${esc(lesson.visual.title)}</h3><div class="t1-chart">${window.Task1Visuals.render(lesson.visual)}</div><figcaption>${esc(lesson.visual.unit||lesson.visual.note||'')}</figcaption></figure><div class="t1-deep-data">${lesson.visual.kind==='table'||lesson.visual.kind==='process'?'':window.Task1Visuals.dataTable(lesson.visual)}</div><p class="t1-deep-source">${esc(lesson.source.note)}</p></aside>`;
  const observations=`<section class="t1-deep-section t1-flow08-observations"><h2>Những điều cần nhìn ra</h2>${['Đơn vị','Nổi bật','Ưu tiên'].map(label=>{const a=lesson.analysis.find(x=>x.label===label);return a?`<p><strong>${esc(label)}.</strong> ${esc(a.text)}</p>`:'';}).join('')}</section>`;
  const outline=`<section class="t1-deep-section" id="flow08-02"><h2>Từ lựa chọn đến bố cục</h2><ol class="t1-flow08-outline">${lesson.outline.map(x=>`<li><strong>${esc(x.part)}</strong><span>${esc(x.content)} ${esc(x.why)}</span></li>`).join('')}</ol></section>`;
  const pairs=lesson.paragraphs.map((p,i)=>`<section class="t1-flow08-pair" aria-label="${esc(p.part)}"><h3 class="t1-flow08-part-label">${esc(p.part)}</h3><p class="t1-flow08-model-text" lang="en">${p.sentences.map(s=>esc(s.en)).join(' ')}</p>${i===0?`<p class="t1-flow08-intro-note" lang="vi">${esc(p.sentences[0].purpose)}</p>`:`<article class="t1-deep-paragraph-note" id="flow08-note-${i}"><h4>Vì sao viết như vậy?</h4><p lang="vi">${paragraphNote(lesson,p)}</p></article>`}</section>`).join('');
  const model=`<section id="flow08-03"><header class="t1-flow08-model-heading"><h2>Bài mẫu & giải thích</h2><p>${lesson.wordCount} từ · Tiếng Anh và giải thích tiếng Việt theo từng đoạn</p><p class="t1-deep-source">Bài mẫu hướng tới Band 8–9; không phải điểm số được đánh giá độc lập.</p></header><div class="t1-deep-model t1-flow08-notes" aria-label="Bài mẫu hoàn chỉnh kèm giải thích">${pairs}<article class="t1-deep-paragraph-note t1-flow08-language" id="flow08-note-4"><h3>Ngôn ngữ · Từ dữ liệu đến cách diễn đạt</h3>${languageNotes(lesson)}</article></div><div class="t1-deep-translation-option"><button type="button" id="flow08-translation-toggle" aria-controls="flow08-translation" aria-expanded="false">Xem bản dịch</button><div id="flow08-translation" class="t1-deep-translation" lang="vi" hidden>${lesson.paragraphs.map(p=>`<p>${p.sentences.map(s=>esc(s.vi)).join(' ')}</p>`).join('')}</div></div></section>`;
  root.innerHTML=header+`<main class="t1-flow08-shell"><header class="t1-flow08-heading"><a data-t1-nav href="/writing?view=task1">← Thư viện Task 1</a><h1>${esc(lesson.title)}</h1><p>${esc(lesson.skill)}</p><a data-t1-nav class="t1-flow08-writing-shortcut" href="/writing?step=5&amp;lesson=${esc('t1-translate-'+lesson.id)}">Luyện viết với biểu đồ ↗</a></header><div class="t1-flow08-layout">${chart}<article class="t1-flow08-article t1-flow08-reading"><div class="t1-flow08-core">${observations}${outline}${model}</div><section class="t1-deep-section t1-flow08-practice" aria-labelledby="flow08-practice-title"><p class="t1-flow08-kicker">SAU KHI ĐỌC · KHÔNG BẮT BUỘC</p><h2 id="flow08-practice-title">Thử vận dụng khi bạn muốn</h2><p>Toàn bộ kiến thức đã hiển thị ở trên; bạn có thể dừng tại đây hoặc luyện dịch cả bài và làm bốn câu kiểm tra.</p><p id="t1-save" role="status">${save}</p><div id="flow08-practice-content">${practice}</div></section></article></div></main>`;
  const toggle=root.querySelector('#flow08-translation-toggle'),translation=root.querySelector('#flow08-translation');toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));translation.hidden=!open;toggle.textContent=open?'Ẩn bản dịch':'Xem bản dịch';});
 }
 return{render};
})();
