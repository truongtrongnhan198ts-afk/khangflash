'use strict';
window.KSyncOutbox=(()=>{
 const name='tidian-pending-reviews-v1',prefix=name+':';let opening;
 function database(){if(!window.indexedDB)return Promise.reject(Error('indexedDB unavailable'));return opening||(opening=new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('items',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>{opening=null;reject(r.error);};r.onblocked=()=>{opening=null;reject(Error('Kho lưu tạm đang bị khóa.'));};}));}
 async function idb(action,value){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('items',action==='list'?'readonly':'readwrite'),s=tx.objectStore('items');const r=action==='list'?s.getAll():action==='put'?s.put(value):action==='removeIf'?s.get(value.id):s.delete(value);let result;r.onsuccess=()=>{result=r.result;if(action==='removeIf'&&r.result?.token===value.token)s.delete(value.id);};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Lưu tạm bị gián đoạn.'));});}
 function localRows(){const rows=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key?.startsWith(prefix))continue;try{const r=JSON.parse(localStorage.getItem(key));if(r&&typeof r.id==='string')rows.push(r);}catch{}}return rows;}
 let lastCreated=0;
 async function jobs(scope,channel){let rows=[];try{rows=await idb('list');}catch{}try{rows.push(...localRows());}catch{}const byId=new Map();for(const row of rows)if(row.scope===scope&&row.channel===channel&&typeof row.key==='string'&&typeof row.token==='string'&&row.body?.account_key===scope){const old=byId.get(row.id);if(!old||row.created>old.created)byId.set(row.id,row);}return [...byId.values()].sort((a,b)=>a.created-b.created);}
 return{
 async putJob(scope,channel,key,body,token=crypto.randomUUID(),created){if(!scope||body.account_key!==scope)throw Error('Chưa xác định tài khoản.');lastCreated=Math.max(Date.now(),lastCreated+1);const row={id:'job:'+scope+':'+channel+':'+key,scope,channel,key,body,token,created:created||lastCreated};try{await idb('put',row);try{const old=JSON.parse(localStorage.getItem(prefix+row.id));if(old?.created<=row.created)localStorage.removeItem(prefix+row.id);}catch{}}catch{localStorage.setItem(prefix+row.id,JSON.stringify(row));}return row;},
 listJobs:jobs,
 async removeJob(row){try{await idb('removeIf',row);}catch{}try{const old=JSON.parse(localStorage.getItem(prefix+row.id));if(old?.token===row.token)localStorage.removeItem(prefix+row.id);}catch{}},
 async put(scope,body){if(!scope||body.account_key!==scope)throw Error('Chưa xác định tài khoản để lưu tạm.');const row={id:scope+':'+body.event_id,scope,body,created:Date.now()};try{await idb('put',row);}catch{localStorage.setItem(prefix+row.id,JSON.stringify(row));}return row;},
 async list(scope){let rows=[];try{rows=await idb('list');}catch{}try{rows=rows.concat(localRows());}catch{}const result=new Map();for(const r of rows)if(r.scope===scope&&r.body?.account_key===scope&&r.body?.action==='review'&&Array.isArray(r.body.reviews)&&typeof r.body.event_id==='string')result.set(r.id,r);return [...result.values()].sort((a,b)=>a.created-b.created);},
 async remove(scope,eventId){const id=scope+':'+eventId;try{await idb('remove',id);}catch{}try{localStorage.removeItem(prefix+id);}catch{}}
 };
})();
