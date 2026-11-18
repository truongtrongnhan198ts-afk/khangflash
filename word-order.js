'use strict';
// Token identity is positional: repeated words remain separate pieces.
window.KWordOrder=(()=>{
 const boards=new Map();let drag=null,touch=null,suppressClick=false;
 function board(target){if(!target?.closest)return null;for(const cfg of boards.values())if(target.closest(cfg.built)||target.closest(cfg.bank))return cfg;return null;}
 function move(cfg,id,target,after=false){if(cfg.locked()||!cfg.tokens().some(t=>t.id===id))return;const bank=target.closest(cfg.bank),built=target.closest(cfg.built);if(!bank&&!built)return;const next=cfg.get().filter(x=>x!==id);if(!bank){const token=target.closest('[data-order-id]');if(token&&Number(token.dataset.orderId)===id)return;const at=token?next.indexOf(Number(token.dataset.orderId)):-1;next.splice(at<0?next.length:at+(after?1:0),0,id);}cfg.set(next);cfg.render();}
 function drop(cfg,id,target,x){const token=target.closest?.('[data-order-id]'),rect=token?.getBoundingClientRect();move(cfg,id,target,!!rect&&x>rect.left+rect.width/2);}
 document.addEventListener('dragstart',e=>{const token=e.target.closest?.('[data-order-id]'),cfg=board(token);if(!cfg||cfg.locked())return;drag={cfg,id:Number(token.dataset.orderId)};if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',token.dataset.orderId);}});
 document.addEventListener('dragover',e=>{if(drag&&board(e.target)===drag.cfg&&!drag.cfg.locked()){e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';}});
 document.addEventListener('drop',e=>{if(!drag||board(e.target)!==drag.cfg)return;e.preventDefault();const {cfg,id}=drag;drag=null;drop(cfg,id,e.target,e.clientX);});
 document.addEventListener('dragend',()=>{drag=null;});
 document.addEventListener('pointerdown',e=>{if(!['touch','pen'].includes(e.pointerType))return;const token=e.target.closest?.('[data-order-id]'),cfg=board(token);if(cfg&&!cfg.locked())touch={cfg,id:Number(token.dataset.orderId),x:e.clientX,y:e.clientY,moved:false};});
 document.addEventListener('pointermove',e=>{if(touch&&Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>6){touch.moved=true;e.preventDefault();}},{passive:false});
 document.addEventListener('pointerup',e=>{if(!touch)return;const active=touch;touch=null;if(active.moved){e.preventDefault();suppressClick=true;const target=document.elementFromPoint(e.clientX,e.clientY);if(target&&board(target)===active.cfg)drop(active.cfg,active.id,target,e.clientX);}});
 document.addEventListener('pointercancel',()=>{touch=null;});
 document.addEventListener('click',e=>{if(suppressClick){suppressClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
 document.addEventListener('keydown',e=>{if(!e.altKey||!['ArrowLeft','ArrowRight'].includes(e.key))return;const token=e.target.closest?.('[data-order-id]'),cfg=board(token);if(!cfg||cfg.locked()||!token.closest(cfg.built))return;e.preventDefault();const id=Number(token.dataset.orderId),next=[...cfg.get()],i=next.indexOf(id),j=i+(e.key==='ArrowLeft'?-1:1);if(i<0||j<0||j>=next.length)return;[next[i],next[j]]=[next[j],next[i]];cfg.set(next);cfg.render();document.querySelector(cfg.built+' [data-order-id="'+id+'"]')?.focus();});
 return{bind(key,cfg){boards.set(key,cfg);}};
})();
