'use strict';
window.KKnowledge=(()=>{
 let ready,searchReady;const articles=new Map();
 const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
 async function json(url){const r=await fetch(url);if(!r.ok)throw Error('Chưa tải được nội dung Khám phá. Thử lại.');return r.json();}
 function index(){return ready||(ready=json('/knowledge/index.json?v=191').catch(e=>{ready=null;throw e;}));}
 async function get(id){const data=await index(),meta=data.articles.find(a=>a.id===id);if(!meta)throw Error('Không tìm thấy bài.');if(!articles.has(id))articles.set(id,json('/'+meta.file).then(a=>{if(a.id!==id||!Array.isArray(a.parts)||!Array.isArray(a.words)||!Array.isArray(a.quiz))throw Error('Nội dung bài không hợp lệ.');return a;}).catch(e=>{articles.delete(id);throw e;}));return articles.get(id);}
 async function search(query){const q=norm(query);if(!q)return null;searchReady ||= json('/knowledge/search.json?v=191').catch(e=>{searchReady=null;throw e;});const rows=await searchReady;return new Set(Object.keys(rows).filter(id=>rows[id].includes(q)));}
 return{index,get,search};
})();
