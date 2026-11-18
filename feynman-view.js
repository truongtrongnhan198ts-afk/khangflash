'use strict';
(function(host){
 const e=value=>host.KFeynmanSession.escapeHTML(value);
 const titles={recall:'Nhớ trước khi xem',explain:'Giải thích bằng lời của bạn',write:'Dùng các cụm vừa ôn',feedback:'Đối chiếu bài viết',reflect:'Giải thích vì sao',rewrite:'Ẩn mẫu, tự viết lại',done:'Đã lưu lượt luyện'};
 function mount({paper,controls,session,referenceText='',onChange=()=>{},selector='',onNext=()=>{}}){
  const field=(id,label,value,placeholder)=>`<label class="fg-input-label" for="fg-answer">${label}</label><textarea id="fg-answer" data-fy-field="${id}" rows="4" maxlength="1200" placeholder="${placeholder}">${e(value)}</textarea>`;
  const button=(action,text,primary=false,disabled=false)=>`<button type="button" data-feynman="${action}" class="${primary?'fg-primary':''}" ${disabled?'disabled':''}>${text}</button>`;
  let localError='';
  function render(){
   const s=session.view();onChange(s);
   if(!s.contextValid){paper.innerHTML='<h3>Phiên học đã thay đổi</h3>';controls.innerHTML='<p role="alert">Mở lại ôn tập hôm nay để dùng đúng tài khoản và ngày học.</p>';return;}
   const order=['recall','explain','write','feedback','reflect','rewrite','done'];
   const sourceVisible=!['recall','explain'].includes(s.step);
   const reviewFeedback=()=>{
    const labels={explanation:'Giải thích cụm từ',reflection:'Lập luận phản biện'};
    const feedback=['explanation','reflection'].filter(k=>s.learningReview?.[k]).map(k=>'<h3>'+labels[k]+'</h3><p>'+e(({accurate:'Phù hợp','needs-work':'Cần sửa','not-assessed':'Không yêu cầu giải thích'})[s.learningReview[k].verdict])+': '+e(s.learningReview[k].feedback)+'</p>').join('');
    const editor=s.learningEdit;
    if(editor){const target=s.targets.find(t=>t.id===s.difficult[0]);return feedback+'<h3>Sửa '+labels[editor].toLowerCase()+'</h3><p>'+e(editor==='explanation'?'Giải thích '+target.term+' bằng lời của bạn.':session.question())+'</p>'+field('fy-'+editor,labels[editor],s[editor],'Sửa riêng phần này; câu viết và kết quả khác được giữ…')+'<div class="fg-actions">'+button('review-'+editor,s.busy?'Đang chấm…':'Chấm lại '+(editor==='explanation'?'giải thích':'phản biện'),true,s.busy||!!s.learningReview?.[editor])+button('close-learning-edit','Xong',false,s.busy)+'</div>';}
    return feedback+'<div class="fg-actions">'+(s.difficult.length?button('edit-explanation','Sửa giải thích',false,s.busy):'')+button('edit-reflection','Sửa phản biện',false,s.busy)+'</div>';
   };
   const rewriteFeedback=()=>s.rewriteGrade?'<h3>Nhận xét câu viết lại</h3><p>'+e(s.rewriteGrade.feedback)+'</p><p>'+e(s.rewriteGrade.contextFit.reason)+'</p>'+s.rewriteGrade.issues.map(i=>'<p>“'+e(i.original)+'” → “'+e(i.replacement)+'”: '+e(i.reason)+'</p>').join('')+'<p>'+s.rewriteGrade.targetFeedback.map(t=>e(s.targets.find(x=>x.id===t.id).term)+': '+e(t.reason)).join(' · ')+'</p>':'';
   paper.innerHTML=`<div class="fg-paper-inner"><small>HIỂU & VẬN DỤNG · ${order.indexOf(s.step)+1}/${order.length}</small><h3>${sourceVisible?e(s.sourceVi):s.targets.map(t=>e(t.term)).join('<br>')}</h3>${sourceVisible?'<p>'+s.targets.map(t=>'<b>'+e(t.term)+'</b>').join(' · ')+'</p>':''}${s.step==='recall'&&s.revealed?'<dl>'+s.targets.map(t=>'<dt><b>'+e(t.term)+'</b></dt><dd>'+e(t.meaning)+'</dd>').join('')+'</dl>':''}${['recall','explain'].includes(s.step)?'<p>Thử tự nhớ trước. Chỉ dành thêm thời gian giải thích những cụm bạn chưa chắc.</p>':''}</div>`;
   let body='';
   if(s.step==='recall')body=`<p>Nhớ nghĩa và một ngữ cảnh dùng cho từng cụm trước khi xem đáp án.</p>${!s.revealed?button('reveal','Tôi đã thử nhớ — xem nghĩa',true):'<p>Chọn một cụm bạn chưa chắc nhất để giải thích sâu; các cụm còn lại vẫn được luyện trong câu.</p>'+s.targets.map(t=>`<label class="fy-choice"><input type="radio" name="fy-difficult" data-difficult="${e(t.id)}" ${s.difficult.includes(t.id)?'checked':''}> ${e(t.term)}</label>`).join('')+'<label class="fy-choice"><input type="radio" name="fy-difficult" data-difficult="" '+(!s.difficult.length?'checked':'')+'> Tôi đã chắc nghĩa các cụm</label><div class="fg-actions">'+button('next','Tiếp tục →',true)+'</div>'}<p class="fg-key">Đây là tự đánh giá, không phải kết quả chấm AI và không đổi lịch ôn.</p>`;
   if(s.step==='explain'){
    const target=s.targets.find(t=>t.id===s.difficult[0]);
    body=`<p>Giải thích <b>${e(target.term)}</b> cho người chưa học: nghĩa là gì, dùng khi nào và dễ nhầm ở đâu?</p>${field('fy-explanation','Lời giải thích của bạn · tiếng Việt hoặc tiếng Anh',s.explanation,'Giải thích bằng lời đơn giản, không cần chép định nghĩa…')}<div class="fg-actions">${button('next','Dùng vào câu →',true)}</div><p class="fg-key">AI sẽ kiểm tra lời giải thích cùng lập luận của bạn ở bước cuối; chưa có kết luận đúng/sai.</p>`;
   }
   if(s.step==='write')body=`<p>Dịch câu tiếng Việt sang tiếng Anh, kết hợp các cụm được giao.</p>${field('fy-draft','Câu của bạn',s.draft,'Dịch toàn bộ câu trên sang tiếng Anh…')}<div class="fg-actions">${button('grade',s.busy?'Đang chấm…':'Chấm bằng AI',true,s.busy)}${button('self-review','Tự đối chiếu trước',false,s.busy)}</div><p class="fg-key">Chỉ gọi AI khi bạn bấm chấm. Nếu hết hạn mức, bạn vẫn có thể tự luyện và giữ nháp.</p>`;
   if(s.step==='feedback'){
    if(s.grade){const g=s.grade,a=g.academicRewrite;body=`<div class="fg-ai-detail"><h3>Nhận xét toàn bài</h3><p>${e(g.feedback)}</p><p>${e(g.contextFit.reason)}</p>${g.targetFeedback.map(t=>'<p><b>'+e(s.targets.find(x=>x.id===t.id).term)+'</b>: '+e(t.reason)+'</p>').join('')}${g.issues.map(i=>'<p>“'+e(i.original)+'” → “'+e(i.replacement)+'”: '+e(i.reason)+'</p>').join('')}${a.text?'<h3>'+ (a.basis==='source-example'?'Bản dịch tham khảo · Academic':'Viết lại toàn bài · Academic')+'</h3><blockquote>'+e(a.text)+'</blockquote><p>'+e(a.translation)+'</p>':''}<p>${e(a.reason)}</p></div>`;}
    else body=`<p class="fg-key"><b>CHƯA CHẤM AI.</b> Tự kiểm tra câu đã viết; chưa có kết luận đúng/sai.</p><h3>Câu bạn viết</h3><blockquote>${e(s.draft)}</blockquote>${referenceText?'<h3>Bản tham khảo soạn sẵn</h3><blockquote>'+e(referenceText)+'</blockquote>':'<p>Chưa có bản tham khảo cho câu này.</p>'}<p>Tự kiểm tra: đủ ý nguồn chưa? Có thay đổi phủ định hoặc mức độ khẳng định không? Các cụm kết hợp tự nhiên không?</p>`;
    body+='<div class="fg-actions">'+button('revise','Quay lại sửa câu')+button('next','Giải thích lựa chọn →',true)+'</div>';
   }
   if(s.step==='reflect')body=`<p><b>${e(session.question())}</b></p><p class="fg-key">Câu hỏi tự kiểm tra dựa trên bài vừa viết; câu trả lời chưa được AI đánh giá.</p>${field('fy-reflection','Lập luận của bạn',s.reflection,'Nói rõ vì sao, không chỉ nhắc lại đáp án…')}<div class="fg-actions">${button('next','Tự viết lại →',true)}</div>`;
   if(s.step==='rewrite')body=`<p>${s.grade?.academicRewrite?.text||referenceText?'Đọc bản tham khảo lần cuối, sau đó ẩn đi và tự viết lại bằng trí nhớ.':'Đọc lại câu bạn đã viết, sau đó ẩn đi và tự viết lại. Câu này chưa phải đáp án đã được xác nhận.'}</p>${s.modelHidden?'':`<blockquote>${e(s.grade?.academicRewrite?.text||referenceText||s.draft)}</blockquote><div class="fg-actions">${button('hide','Ẩn bản tham khảo',true)}</div>`}${s.modelHidden?(s.learningEdit?'':field('fy-rewrite','Bản viết lại từ trí nhớ',s.rewrite,'Viết lại mà không nhìn câu tiếng Anh trước…'))+'<div class="fg-actions">'+button('grade-rewrite',s.busy?'Đang chấm…':s.rewriteGrade?'Câu viết lại đã chấm':'Chấm câu viết lại',true,s.busy||!!s.rewriteGrade)+button('review-learning',s.busy?'Đang chấm…':s.learningComplete?'Giải thích đã chấm':'Chấm giải thích & phản biện',false,s.busy||s.learningComplete)+button('next','Lưu lượt luyện',false,s.busy)+'</div>'+rewriteFeedback()+reviewFeedback():''}`;
   if(s.step==='done')body='<p>Bài viết, lời giải thích và bản viết lại được giữ trong lượt luyện này.</p><p><b>'+(s.pendingAI?'Còn phần chưa được AI đánh giá':'Đã đánh giá các phần của lượt luyện')+'</b> · Kết quả này chưa chứng minh đã thuộc lâu dài.</p>'+rewriteFeedback()+reviewFeedback()+'<p>Tiếp tục ôn theo lịch hiện tại và thử dùng từ trong tình huống khác ở lượt ôn sau.</p><div class="fg-actions">'+button('revise','Mở lại bài đã viết',false,s.busy)+button('grade-rewrite','Chấm câu viết lại',false,s.busy||!!s.rewriteGrade)+button('review-learning','Chấm giải thích & phản biện',false,s.busy||s.learningComplete)+button('retry-save','Lưu lại',false,s.busy)+button('next-exercise','Nhóm tiếp theo →',true,s.busy)+'</div>';

   controls.innerHTML=`${selector}<h2>${titles[s.step]}</h2><p class="fg-key">Đúng từ đến hạn · hiểu nghĩa · tự dùng được</p><div class="fg-progress"><i style="width:${Math.round(order.indexOf(s.step)/(order.length-1)*100)}%"></i></div>${body}${s.error||localError?'<p class="fg-error" role="alert">'+e(s.error||localError)+'</p>':''}`;
   for(const field of controls.querySelectorAll('textarea,select,input'))field.disabled=s.busy;
  }
  const editHandler=event=>{
   const fields={'fy-explanation':'explanation','fy-draft':'draft','fy-reflection':'reflection','fy-rewrite':'rewrite'};
   const field=fields[event.target.getAttribute('data-fy-field')];if(!field)return;
   const before=session.view(),start=event.target.selectionStart,end=event.target.selectionEnd;
   try{const after=session.edit(field,event.target.value);localError='';
    // Refresh a now-invalid assessment immediately, while keeping the typing cursor.
    if(before.rewriteGrade&&!after.rewriteGrade||['explanation','reflection'].some(k=>before.learningReview?.[k]&&!after.learningReview?.[k])||before.error!==after.error){render();const input=controls.querySelector('[data-fy-field="'+event.target.getAttribute('data-fy-field')+'"]');if(input){input.focus();input.setSelectionRange?.(start,end);}}
   }catch(err){localError=err.message;render();}
  };
  const changeHandler=event=>{const id=event.target.getAttribute('data-difficult');if(id===null)return;try{session.difficult(id||session.view().difficult[0]||session.view().targets[0].id,!!id&&event.target.checked);}catch(err){localError=err.message;}render();};
  const clickHandler=async event=>{
   const action=event.target.closest('[data-feynman]')?.getAttribute('data-feynman');if(!action)return;
   localError='';
   try{
    if(action==='next-exercise'){await onNext();return;}
    else if(action==='retry-save'){onChange(session.view());}
    else if(action==='edit-explanation'||action==='edit-reflection')session.editLearning(action.slice(5));
    else if(action==='close-learning-edit')session.closeLearningEdit();
    else if(action==='review-explanation'||action==='review-reflection'){const pending=session.reviewLearning(action.slice(7));render();await pending;}
    else if(action==='grade-rewrite'||action==='review-learning'){const pending=action==='grade-rewrite'?session.gradeRewrite():session.reviewLearning();render();await pending;}
    else if(action==='grade'){const pending=session.grade();render();await pending;}
    else if(action==='self-review')session.selfReview();
    else if(action==='hide')session.hideModel();
    else if(action==='reveal')session.reveal();
    else if(action==='next')session.next();
    else if(action==='revise')session.revise();
   }catch(err){localError=err.message;}
   render();
  };
  controls.addEventListener('input',editHandler);controls.addEventListener('change',changeHandler);controls.addEventListener('click',clickHandler);
  render();return {render,destroy(){controls.removeEventListener('input',editHandler);controls.removeEventListener('change',changeHandler);controls.removeEventListener('click',clickHandler);}};
 }
 host.KFeynmanView={mount};
})(typeof window==='undefined'?globalThis:window);
