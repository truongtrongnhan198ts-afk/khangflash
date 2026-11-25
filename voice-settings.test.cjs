'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {Script}=require('node:vm');

const script=new Script(readFileSync(join(__dirname,'..','voice.js'),'utf8'),{filename:'voice.js'});

function boot(saved={},streaming=false){
 const dialog={id:'kf-kokoro-voice-dialog',dataset:{kvoiceUi:'20261124-voice1'},querySelector:()=>null,showModal(){this.open=true;}};
 const nodes=new Map([[dialog.id,dialog]]);
 const device={name:'Example device',lang:'en-GB',voiceURI:'example-device'};
 const requests=[],urls=[],revoked=[];
 let spoken;
 class MockMediaSource extends EventTarget{
  static isTypeSupported(){return true;}
  readyState='open';
  addSourceBuffer(){
   const buffer=new EventTarget();
   buffer.appendBuffer=()=>queueMicrotask(()=>buffer.dispatchEvent(new Event('updateend')));
   return buffer;
  }
  endOfStream(){this.readyState='ended';}
 }
 const context={
  document:{styleSheets:[],querySelectorAll:()=>[],getElementById:id=>nodes.get(id),createElement:()=>({dataset:{},setAttribute(){}}),
   body:{appendChild:el=>nodes.set(el.id,el)},head:{appendChild(){}},addEventListener(){}},
  localStorage:{getItem:()=>JSON.stringify(saved),setItem(){}},
  speechSynthesis:{getVoices:()=>[device],addEventListener(){},cancel(){},speak(utterance){spoken=utterance;}},
  SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},
  MediaSource:streaming?MockMediaSource:undefined,
  Audio:class{constructor(src){this.src=src;} async play(){this.onplaying?.();} pause(){}},
  URL:{createObjectURL(body){const value='blob:test-'+urls.length;urls.push(value);
    if(body instanceof MockMediaSource)queueMicrotask(()=>body.dispatchEvent(new Event('sourceopen')));
    return value;},revokeObjectURL:value=>revoked.push(value)},
  fetch:async(url,options)=>{requests.push([url,options]);return new Response(new Uint8Array(400),{headers:{
    'Content-Type':'audio/mpeg',...(streaming?{'X-Tidian-Stream':'1'}:{})}});},
  crypto,TextEncoder,AbortController,Response,location:{origin:'https://example.test'},
  setTimeout,clearTimeout,addEventListener(){},
 };
 context.window=context;
 script.runInNewContext(context);
 return {context,dialog,nodes,requests,urls,revoked,spoken:()=>spoken};
}

test('legacy Kokoro selection opens the regional Microsoft voice and keeps the available device voice',()=>{
 const b=boot({accent:'en-US',source:{'en-US':'kokoro'}});
 b.context.KVoice.settings();
 assert.match(b.dialog.innerHTML,/value="microsoft-guy" selected/);
 for(const name of ['sonia','ryan','guy','christopher'])assert.match(b.dialog.innerHTML,new RegExp('value="microsoft-'+name+'"'));
 assert.match(b.dialog.innerHTML,/value="browser:example-device"/);
 assert.doesNotMatch(b.dialog.innerHTML,/Kokoro|value="kokoro"/);
});

test('saved device choice, pace and volume are used by speech synthesis',async()=>{
 const b=boot({source:{'en-GB':'browser'},selected:{'en-GB':'example-device'},
  adjustments:{'browser:en-GB:example-device':{rate:.91,volume:.7,pitch:4}}});
 assert.equal(await b.context.KVoice.speak('Example'),true);
 assert.equal(b.spoken().voice.voiceURI,'example-device');
 assert.equal(b.spoken().rate,.91);
 assert.equal(b.spoken().volume,.7);
 assert.equal(b.requests.length,0);
});

for(const streaming of [false,true]){
 test('Microsoft '+(streaming?'stream':'audio blob')+' plays and releases its URL on stop',async()=>{
  const b=boot({source:{'en-GB':'microsoft'},selected:{'en-GB':'microsoft-ryan'},
   adjustments:{'microsoft:en-GB:microsoft-ryan':{rate:.87,volume:.8}}},streaming);
  b.context.KVoice.settings();
  assert.match(b.dialog.innerHTML,/value="microsoft-ryan" selected/);
  assert.match(b.dialog.innerHTML,/id="voice-rate"[^>]+value="0.87"/);
  assert.match(b.dialog.innerHTML,/id="voice-volume"[^>]+value="0.8"/);
  assert.equal(await b.context.KVoice.speak('Example'),true);
  assert.equal(b.nodes.get('voice-notice').dataset.phase,'playing');
  assert.equal(b.nodes.get('voice-notice').dataset.audioSource,streaming?'stream':'generated');
  assert.equal(JSON.parse(b.requests[0][1].body).voice,'microsoft-ryan');
  b.context.KVoice.stop();
  assert.deepEqual(b.urls,['blob:test-0']);
  assert.deepEqual(b.revoked,b.urls);
 });
}
