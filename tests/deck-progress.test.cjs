const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
async function ui(){const {document}=parseHTML('<html><body></body></html>');const w={document,window:null,fetch:async url=>({ok:true,text:async()=>'',json:async()=>url.includes('deck-templates')?JSON.parse(fs.readFileSync(__dirname+'/../tid-assets/deck-templates.json','utf8')):{}}),WeakMap,Map,Set,console};w.window=w;vm.runInNewContext(fs.readFileSync(__dirname+'/../reference-ui.js','utf8'),w);await w.TDUi.ready;return w.TDUi;}
test('small saved progress stays visible in every deck template, including review cards',async()=>{
 const u=await ui(),cards=Array.from({length:2020},(_,id)=>({id:String(id),term:'word '+id})),state={cards:[{card_id:'0',status:'known'},{card_id:'1',status:'known'},{card_id:'2',status:'review'}]};
 const p=u.deckProgress(cards,state);assert.equal(p.known,2);assert.equal(p.review,1);assert.equal(p.learned,3);assert.equal(p.rate,'<0,1');
 for(let i=0;i<12;i++){const html=u.deck('Education','test',cards,i,'flashcard.html',state);assert.match(html,/Đã học 3\/2020 · Nhớ 2 · Cần ôn 1/);assert.match(html,/&lt;0,1% THUỘC/);assert.doesNotMatch(html,/\{\{PROGRESS\}\}/);}
});
test('zero, complete and nearly complete decks never misreport the fraction',async()=>{const u=await ui();assert.equal(u.deckProgress([],{}).rate,'0');const cards=Array.from({length:60000},(_,id)=>({id:String(id)})),state={cards:cards.map(c=>({card_id:c.id,status:'known'}))};assert.equal(u.deckProgress(cards,state).rate,'100');state.cards.pop();assert.equal(u.deckProgress(cards,state).rate,'99,9');state.cards=[{card_id:'0',status:'known'}];assert.equal(u.deckProgress(cards,state).rate,'<0,1');});
