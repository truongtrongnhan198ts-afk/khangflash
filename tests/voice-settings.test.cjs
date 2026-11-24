const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
function boot(saved=new Map()){
 const {window,document}=parseHTML('<html><body></body></html>');
 const events={};const create=document.createElement.bind(document);
 document.createElement=function(tag){const e=create(tag);if(tag==='dialog'){e.showModal=()=>{e.open=true};e.close=()=>{e.open=false};}return e};
 const w={document,console,URL,Map,Set,Promise,Date,Math,JSON,Object,Array,String,Number,Error,RegExp,Proxy,CustomEvent:window.CustomEvent,localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},setTimeout:()=>0,clearTimeout(){},speechSynthesis:{getVoices:()=>[],cancel(){},pause(){},resume(){},addEventListener:(n,fn)=>events[n]=fn},addEventListener(){},dispatchEvent(){}};w.window=w;
 vm.runInNewContext(fs.readFileSync(__dirname+'/../voice.js','utf8'),w);w.KVoice.settings();
 const choose=value=>{const select=document.getElementById('kf-kokoro-voice-local');Object.defineProperty(select,'value',{value,configurable:true});select.dispatchEvent(new window.Event('change',{bubbles:true}));};
 return{w,document,saved,choose,events};
}
test('all 28 Kokoro and four Microsoft voices remain available without browser voices',()=>{
 const b=boot();assert.equal(b.document.querySelectorAll('#kf-kokoro-voice-local option').length,32);assert.equal(b.document.getElementById('voice-personalize').hidden,false);
 b.choose('af_bella');assert.equal(b.w.KVoice.accent(),'en-US');assert.equal(b.document.querySelectorAll('#kf-kokoro-voice-local option').length,32);
 b.events.voiceschanged();assert.equal(b.document.querySelectorAll('#kf-kokoro-voice-local option').length,32);
 const next=boot(b.saved);assert.match(next.document.getElementById('voice-preview-status').textContent,/Bella/);assert.equal(next.w.KVoice.accent(),'en-US');
 next.choose('microsoft-ryan');assert.equal(next.w.KVoice.accent(),'en-GB');assert.match(boot(next.saved).document.getElementById('voice-preview-status').textContent,/Ryan/);
});
test('Kokoro speed and volume controls are visible and stored per voice, pitch remains disabled',()=>{
 const b=boot();b.choose('af_bella');Object.defineProperty(b.document.getElementById('voice-preset'),'value',{value:'custom',writable:true});const rate=b.document.getElementById('voice-rate');rate.value='0.87';rate.dispatchEvent(new (parseHTML('<html></html>').window.Event)('change',{bubbles:true}));
 const next=boot(b.saved);assert.equal(next.document.getElementById('voice-rate').value,'0.87');assert.equal(next.document.getElementById('voice-pitch').disabled,true);next.choose('bf_emma');assert.equal(next.document.getElementById('voice-rate').value,'1');
});
