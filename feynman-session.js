'use strict';
// Isolated learning checkpoint. No SRS writes, network calls or automatic mastery claims.
(function (host) {
 const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clone = value => JSON.parse(JSON.stringify(value));
 const normal = value => String(value ?? '').normalize('NFC');
 const own = (text, quote) => typeof quote === 'string' && !!quote.trim() && normal(text).includes(normal(quote));
 const steps = ['recall','explain','write','feedback','reflect','rewrite','done'];
 function create(options) {
  const {account, day, storage, exercise, getContext = () => ({account, day})} = options;
  if (!account || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw Error('Account and study date required');
  const due = new Map((options.dueCards || []).filter(c => c.due === true && c.studyKind !== 'grammar').map(c => [c.id, c]));
  if (!exercise?.id || typeof exercise.sourceVi !== 'string' || !exercise.sourceVi.trim() || !Array.isArray(exercise.ids) || !exercise.ids.length || exercise.ids.length > 3 || new Set(exercise.ids).size !== exercise.ids.length || exercise.ids.some(id => !due.has(id))) throw Error('Exercise must use 1–3 actual due vocabulary cards');
  const targets = exercise.ids.map(id => ({id, term:due.get(id).term, meaning:due.get(id).meaning}));
  if (targets.some(c => !c.term?.trim() || !c.meaning?.trim())) throw Error('Target sense required');
  const identity = JSON.stringify([exercise.id, exercise.sourceVi, targets]);
  const key = 'tidian-feynman:v1:' + JSON.stringify([account, day, exercise.id]);
  let state = {version:1, identity, account, day, step:'recall', revealed:false, difficult:[], explanation:'', draft:'', reflection:'', rewrite:'', modelHidden:false, grade:null, rewriteGrade:null, learningReview:null, learningEdit:null, busy:false, status:'ungraded', pendingAI:true, error:'', memoryConfidence:'not-assessed'};
  let revision = 0;
  const sameContext = () => {const c=getContext();return c.account===account&&c.day===day;};
  const assertContext = () => {if(!sameContext())throw Error('Study account or date changed; reopen today’s session');};
  try {
   const saved=JSON.parse(storage.getItem(key)||'null');
   if(saved?.version===1 && saved.identity===identity && saved.account===account && saved.day===day && steps.includes(saved.step) && ['explanation','draft','reflection','rewrite'].every(k=>typeof saved[k]==='string'&&saved[k].length<=1200) && Array.isArray(saved.difficult) && saved.difficult.every(id=>exercise.ids.includes(id)) && typeof saved.revealed==='boolean' && typeof saved.modelHidden==='boolean') {
    state={...state,...saved,busy:false,error:''};
    // Cached feedback is untrusted; revalidate its binding to this exact answer.
    if(state.grade&&!validGrade(state.grade,state.draft)) {state.grade=null;state.status='ungraded';state.pendingAI=true;state.step=state.draft?'write':'recall';}
    if(!state.grade){state.pendingAI=true;state.status='ungraded';}
    state.memoryConfidence='not-assessed';
    if(state.rewriteGrade&&!validGrade(state.rewriteGrade,state.rewrite))state.rewriteGrade=null;
    state.difficult=state.difficult.slice(0,1); // Older drafts could select multiple; only the first was assessed.
    if(!['explanation','reflection'].includes(state.learningEdit)||state.learningEdit==='explanation'&&!state.difficult.length)state.learningEdit=null;
    if(state.learningReview){for(const k of ['explanation','reflection'])if(!validLearningReview(state.learningReview,k))delete state.learningReview[k];if(!state.learningReview.explanation&&!state.learningReview.reflection)state.learningReview=null;}
    state.pendingAI=!(state.grade&&state.rewriteGrade&&learningComplete());
   }
  } catch {}
  function persist(){assertContext();try {storage.setItem(key,JSON.stringify({...state,busy:false,error:''}));state.error='';return true;}catch{state.error='Chưa lưu được nháp. Giữ trang này mở và sao chép bài trước khi đóng.';return false;}}
  const view=()=>clone({...state,targets,sourceVi:exercise.sourceVi,exerciseId:exercise.id,learningComplete:learningComplete(),contextValid:sameContext()});
  function edit(field,value) {
   assertContext();
   if(state.busy||!['explanation','draft','reflection','rewrite'].includes(field)||typeof value!=='string'||value.length>1200)throw Error('Invalid or locked draft');
   if(field==='draft'&&!['write'].includes(state.step))throw Error('Return to writing before editing the answer');
   if(state[field]===value)return view();
   // A changed first answer needs fresh reasoning and a fresh retrieval attempt.
   if(field==='draft'){state.reflection='';state.rewrite='';state.modelHidden=false;state.grade=null;state.rewriteGrade=null;state.status='ungraded';}
   state[field]=value;if(field==='rewrite')state.rewriteGrade=null;
   if(field==='draft')state.learningReview=null;
   if(['explanation','reflection'].includes(field)&&state.learningReview){delete state.learningReview[field];state.learningReview[field+'Original']=value;}
   state.pendingAI=true;revision++;persist();return view();
  }
  function reveal(){assertContext();state.revealed=true;persist();return view();}
  function difficult(id, selected){assertContext();if(state.busy||state.step!=='recall'||!exercise.ids.includes(id)||!state.revealed)throw Error('Reveal and choose a current target');const next=selected?[id]:[];if(next[0]!==state.difficult[0]){state.explanation='';state.learningReview=null;}state.difficult=next;persist();return view();}
  function next(){
   assertContext();if(state.busy)throw Error('Wait for assessment');
   if(state.step==='recall'){if(!state.revealed)throw Error('Try recalling, then reveal meanings');state.step=state.difficult.length?'explain':'write';}
   else if(state.step==='explain'){if(!state.explanation.trim())throw Error('Explain the difficult phrase in your own words');state.step='write';}
   else if(state.step==='feedback')state.step='reflect';
   else if(state.step==='reflect'){if(!state.reflection.trim())throw Error('Write your reasoning first');state.step='rewrite';state.modelHidden=false;}
   else if(state.step==='rewrite'){if(!state.modelHidden||!state.rewrite.trim())throw Error('Hide the reference and write again');state.step='done';state.completedAt ||= new Date().toISOString();}
   else throw Error('This step needs an explicit action');
   persist();return view();
  }
  function selfReview(){assertContext();if(state.step!=='write'||!state.draft.trim()||state.busy)throw Error('Write an answer first');state.step='feedback';state.grade=null;state.status='ungraded';state.pendingAI=true;persist();return view();}
  function revise(){assertContext();if(state.busy)throw Error('Wait for assessment');state.step='write';state.grade=null;state.rewriteGrade=null;state.learningReview=null;state.status='ungraded';state.pendingAI=true;revision++;persist();return view();}
  function hideModel(){assertContext();if(state.step!=='rewrite')throw Error('Not at recall step');state.modelHidden=true;persist();return view();}
  function payload(requestId){return {requestId,exerciseId:exercise.id,sourceVi:exercise.sourceVi,targets:clone(targets),sentence:state.draft.trim(),explanation:state.explanation,explanationTargetId:state.difficult[0]||null};}
  function validGrade(g,answer) {
   if(!g||g.exerciseId!==exercise.id||g.sourceVi!==exercise.sourceVi||g.original!==answer.trim()||g.assessmentVersion!==6||g.reviewed!==true||typeof g.feedback!=='string'||!g.feedback.trim()||typeof g.correctUsage!=='boolean'||typeof g.needsClarification!=='boolean'||g.correctUsage&&g.needsClarification||typeof g.contextFit?.matches!=='boolean'||typeof g.contextFit.reason!=='string'||!Array.isArray(g.issues)||!Array.isArray(g.targetFeedback)||g.targetFeedback.length!==targets.length)return false;
   if(g.issues.some(i=>!own(answer,i.original)||!['grammar','vocabulary','collocation','meaning'].includes(i.category)||typeof i.reason!=='string'||!i.reason.trim()||typeof i.replacement!=='string'))return false;
   if(!targets.every((t,i)=>{const x=g.targetFeedback[i];return x?.id===t.id&&typeof x.used==='boolean'&&typeof x.correct==='boolean'&&(!x.correct||x.used)&&typeof x.reason==='string'&&!!x.reason.trim()&&(x.used?own(answer,x.quote):x.quote==='');}))return false;
   const a=g.academicRewrite;
   if(!a||!['learner','source-example','clarification'].includes(a.basis)||typeof a.text!=='string'||typeof a.translation!=='string'||typeof a.reason!=='string'||!a.reason.trim())return false;
   if(a.basis==='clarification')return g.needsClarification===true&&a.text===''&&a.translation==='';
   return !!a.text.trim()&&!!a.translation.trim()&&(a.basis!=='learner'||g.contextFit.matches&&!g.needsClarification);
  }
  async function grade(){
   assertContext();
   if(options.liveEnabled!==true||typeof options.grader!=='function'){state.error='Chưa bật AI cho tính năng này. Bài chưa được chấm; nháp vẫn được giữ.';return view();}
   if(state.step!=='write'||!state.draft.trim()||state.busy)return view();
   const currentRevision=revision,answer=state.draft;
   state.busy=true;state.error='';
   try{
    const g=await options.grader(payload(options.uuid()));
    if(!sameContext()||revision!==currentRevision||state.draft!==answer)return view();
    if(!validGrade(g,answer))throw Error('Phản hồi không khớp bài hoặc thiếu bằng chứng. Chưa ghi nhận kết quả.');
    state.grade=clone(g);state.step='feedback';state.status='graded-answer';
    // Explanation, reflection and rewritten answer still need their own review.
    state.pendingAI=true;state.memoryConfidence='not-assessed';persist();
   }catch(e){if(sameContext())state.error=e.message||'Chưa chấm được. Nháp vẫn được giữ.';}finally{state.busy=false;}
   return view();
  }
  function question(){
   const issue=state.grade?.issues?.[0];
   if(issue)return 'Bạn viết “'+issue.original+'”. Bạn có đồng ý với đề xuất “'+issue.replacement+'” không? Giải thích vì sao dựa vào nghĩa hoặc quy tắc ở chính câu này.';
   if(/\bcan\b/i.test(state.draft))return 'Nếu thay “can” trong câu bạn viết bằng “will”, mức độ khẳng định sẽ thay đổi thế nào? Vì sao bạn chọn cách hiện tại?';
   return 'Chọn một cụm trong câu vừa viết: vì sao nghĩa và cách kết hợp của nó phù hợp ở đây? Nêu một ngữ cảnh dùng cụm đó không phù hợp.';
  }
  function learningComplete(){return !!state.learningReview?.reflection&&(!state.difficult.length||!!state.learningReview?.explanation);}
  function editLearning(field){assertContext();if(state.busy||!['rewrite','done'].includes(state.step)||!['explanation','reflection'].includes(field)||field==='explanation'&&!state.difficult.length)throw Error('Chưa mở được phần cần sửa.');state.learningEdit=field;persist();return view();}
  function closeLearningEdit(){assertContext();if(state.busy)throw Error('Wait for assessment');state.learningEdit=null;persist();return view();}
  function validLearningReview(g,field='both'){
   const id=state.difficult[0]||null;
   if(!g||g.reviewVersion!==1||g.exerciseId!==exercise.id||g.original!==state.draft.trim()||(field!=='reflection'&&g.explanationOriginal!==state.explanation)||(field!=='explanation'&&g.reflectionOriginal!==state.reflection)||g.question!==question()||g.explanationTargetId!==id)return false;
   return (field==='both'?['explanation','reflection']:[field]).every(k=>{const x=g[k],text=state[k],assessed=k==='reflection'||!!id&&!!text.trim();return x&&['accurate','needs-work','not-assessed'].includes(x.verdict)&&typeof x.feedback==='string'&&!!x.feedback.trim()&&Array.isArray(x.evidence)&&x.evidence.length<=3&&x.evidence.every(q=>own(text,q))&&(assessed?x.verdict!=='not-assessed'&&x.evidence.length>0:x.verdict==='not-assessed'&&x.evidence.length===0);});
  }
  async function assess(kind,field='both'){
   assertContext();if(state.busy||!['rewrite','done'].includes(state.step))return view();
   if(options.liveEnabled!==true||!state.modelHidden||!state.rewrite.trim()){state.error='Ẩn mẫu và viết lại trước khi chấm.';return view();}
   if(kind==='rewrite'&&state.rewriteGrade)return view();
   if(kind==='learning'&&!['both','explanation','reflection'].includes(field))throw Error('Unknown review field');
   const needed=kind==='learning'?(field==='both'?['explanation','reflection']:[field]).filter(k=>(k!=='explanation'||state.difficult.length)&&!state.learningReview?.[k]):[];
   if(kind==='learning'&&!needed.length)return view();
   const reviewField=needed.length===1?needed[0]:'both';
   const r=revision,answer=state.rewrite;state.busy=true;state.error='';
   try{
    let g;
    if(kind==='rewrite')g=await options.grader({...payload(options.uuid()),sentence:state.rewrite.trim()});
    else g=await options.reviewer({...payload(options.uuid()),question:question(),reflection:state.reflection,reviewField});
    if(!sameContext()||revision!==r||answer!==state.rewrite)return view();
    if(kind==='rewrite'){if(!validGrade(g,answer))throw Error('Bản chấm không khớp câu viết lại.');state.rewriteGrade=clone(g);}
    else {if(!validLearningReview(g,reviewField))throw Error('Đánh giá chưa khớp lời giải thích hoặc thiếu dẫn chứng.');
     const merged={...state.learningReview,...g};for(const k of ['explanation','reflection'])if(!needed.includes(k)){if(state.learningReview?.[k])merged[k]=state.learningReview[k];else delete merged[k];}
     state.learningReview=clone(merged);
    }
    state.pendingAI=!(state.grade&&state.rewriteGrade&&learningComplete());persist();
   }catch(e){if(sameContext())state.error=e.message||'Chưa chấm được. Nháp vẫn được giữ.';}finally{state.busy=false;}
   return view();
  }
  // Public controller exposes no method to mark a card known or update due dates.
  return {view,edit,reveal,difficult,next,selfReview,revise,hideModel,grade,question,payload,validGrade,validLearningReview,editLearning,closeLearningEdit,gradeRewrite:()=>assess('rewrite'),reviewLearning:(field='both')=>assess('learning',field),key};
 }
 host.KFeynmanSession={create,escapeHTML};
 if(typeof module!=='undefined'&&module.exports)module.exports=host.KFeynmanSession;
})(typeof window==='undefined'?globalThis:window);
