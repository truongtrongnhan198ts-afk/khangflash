'use strict';
(() => {
 const sidebar=document.getElementById('sidebar');
 if(!sidebar)return;
 const update=()=>{
  const history=[...sidebar.querySelectorAll('nav a[href]')].find(link=>
   /^\/history(?:\.html)?\/?$/.test(new URL(link.href,location.href).pathname));
  if(!history)return;
  const existing=sidebar.querySelector('nav a[href="/ielts-speaking.html"]');
  if(existing){history.remove();return;}
  history.href='/ielts-speaking.html';
  const label=[...history.querySelectorAll('span')].find(span=>span.textContent.trim()==='Lịch sử làm bài');
  if(label)label.textContent='IELTS Speaking';
  else {
   const text=[...history.childNodes].find(child=>child.nodeType===3&&child.textContent.trim());
   if(text)text.textContent='IELTS Speaking';
   else history.append(document.createTextNode('IELTS Speaking'));
  }
  history.setAttribute('aria-label','IELTS Speaking');
  history.title='IELTS Speaking';
  const active=document.body.dataset.page==='ielts-speaking';
  history.classList.toggle('active',active);
  if(active)history.setAttribute('aria-current','page');
  else history.removeAttribute('aria-current');
 };
 new MutationObserver(update).observe(sidebar,{childList:true,subtree:true});
 update();
})();
