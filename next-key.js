'use strict';
// One physical shortcut; never steal a space that belongs to an answer or an open dialog.
window.KNextKey=(()=>{
 const selectors=['[data-mp="next"]','[data-mp="mixed-next"]','[data-mp="round"]','[data-mp="recall"]','[data-wf="next"]','[data-wf="mixed-next"]','[data-wf="start"]','[data-fg="next"]','[data-sd="advance"]','[data-sd="summary"]','[data-kl="next"]','[data-listen="next"]','[data-doctor="next"]','[data-cb="continue"]','[data-bb="continue"]','[data-action="match-next"]','[data-action="next"]'];
 const visible=b=>!b.disabled&&!b.closest('[hidden],dialog:not([open])')&&b.getClientRects().length>0;
 function next(){const root=document.getElementById('stage')||document.getElementById('hub-content');if(!root)return null;for(const selector of selectors){const b=[...root.querySelectorAll(selector)].find(visible);if(b)return b;}return null;}
 document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.isComposing||e.keyCode===229||e.ctrlKey||e.altKey||e.metaKey||e.shiftKey||!(e.code==='Space'||e.key===' '))return;if(document.querySelector('dialog[open]')||e.target.closest('input:not(:disabled),textarea:not(:disabled),select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]'))return;const b=next();if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)b.click();},true);
 function label(root){for(const selector of selectors)root.querySelectorAll?.(selector).forEach(b=>{if(b.dataset.nextKey)return;b.dataset.nextKey='space';b.title=(b.title?b.title+' · ':'')+'Space để tiếp tục';const k=document.createElement('kbd');k.className='next-key-hint';k.textContent='Space';k.setAttribute('aria-hidden','true');b.append(k);});}
 label(document);if(typeof MutationObserver==='function')new MutationObserver(rows=>{for(const row of rows)for(const n of row.addedNodes)if(n.nodeType===1){if(n.matches(selectors.join(',')))label(n.parentNode);else label(n);}}).observe(document.body,{childList:true,subtree:true});
 return{next};
})();
